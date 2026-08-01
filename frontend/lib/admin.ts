/**
 * Client for the staff admin API.
 *
 * The token is held in sessionStorage and sent as a header. It is deliberately
 * never a NEXT_PUBLIC_ variable: those are inlined into the browser bundle and
 * shipped to every visitor.
 */

import { API_URL, type Participant } from "./api";

export const TOKEN_KEY = "love21.adminToken";

export type AdminParticipant = Participant & {
  consent_given: boolean;
  consented_at: string | null;
  consent_face_recognition: boolean;
  consent_form_reference: string | null;
  consent_recorded_by: string | null;
  is_published: boolean;
  enrolled_faces: number;
};

export type AdminFace = {
  id: string;
  participant_id: string | null;
  box_x: number;
  box_y: number;
  box_w: number;
  box_h: number;
  match_score: number | null;
  status: "suggested" | "confirmed" | "rejected";
  confirmed_by: string | null;
};

export type AdminPhoto = {
  id: string;
  image_url: string | null;
  width: number;
  height: number;
  alt_text: string;
  caption: string | null;
  sort_order: number;
  is_published: boolean;
  faces: AdminFace[];
};

/*
 * The token as an external store, so components read it through
 * useSyncExternalStore rather than copying it into state inside an effect.
 * sessionStorage genuinely is an external system; this is the primitive for it,
 * and it gives correct server rendering for free via the server snapshot.
 */
const tokenListeners = new Set<() => void>();

export function readToken(): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(TOKEN_KEY) ?? "";
}

/** Always "" on the server: nothing is signed in during server rendering. */
export function readTokenOnServer(): string {
  return "";
}

export function subscribeToToken(listener: () => void): () => void {
  tokenListeners.add(listener);
  return () => {
    tokenListeners.delete(listener);
  };
}

export function writeToken(token: string): void {
  if (token) {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    window.sessionStorage.removeItem(TOKEN_KEY);
  }
  tokenListeners.forEach((listener) => listener());
}

export class AdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...init.headers, "X-Admin-Token": readToken() },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // Body was not JSON; the status line is all we have.
    }
    throw new AdminError(detail, response.status);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const admin = {
  status: () => request<{ face_models_available: boolean }>("/api/admin/status"),

  listParticipants: () => request<AdminParticipant[]>("/api/admin/participants"),

  createParticipant: (body: Record<string, unknown>) =>
    request<AdminParticipant>("/api/admin/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  updateParticipant: (id: string, body: Record<string, unknown>) =>
    request<AdminParticipant>(`/api/admin/participants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  enrollFace: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ enrolled: boolean }>(`/api/admin/participants/${id}/enroll`, {
      method: "POST",
      body: form,
    });
  },

  listPhotos: () => request<AdminPhoto[]>("/api/admin/photos"),

  uploadPhoto: (file: File, altText: string, caption: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("alt_text", altText);
    if (caption) form.append("caption", caption);
    return request<AdminPhoto>("/api/admin/photos", { method: "POST", body: form });
  },

  updatePhoto: (id: string, body: Record<string, unknown>) =>
    request<AdminPhoto>(`/api/admin/photos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  deletePhoto: (id: string) => request<void>(`/api/admin/photos/${id}`, { method: "DELETE" }),

  updateFace: (id: string, body: Record<string, unknown>) =>
    request<AdminFace>(`/api/admin/faces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
};
