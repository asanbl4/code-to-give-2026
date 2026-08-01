"use client";

/**
 * Client for the staff admin API.
 *
 * Authorization is the caller's Supabase access token, sent as a bearer header.
 * The backend verifies its signature against the project's JWKS and then asks
 * Postgres whether that person holds a staff role.
 *
 * This used to be a shared secret typed into a box and kept in sessionStorage.
 * That token granted service-role access to whoever learned it, could not be
 * revoked for one person, and left no record of who used it.
 */

import { API_URL, type Participant } from "./api";
import { createClient } from "./supabase/client";

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

export class AdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * The current access token, refreshed if it has expired.
 *
 * `getSession()` rather than `getUser()`: this needs the raw token to forward,
 * and the backend is going to verify it anyway. Server-side gating uses
 * `getUser()`, which revalidates — see `lib/supabase/server.ts`.
 */
async function accessToken(): Promise<string> {
  const {
    data: { session },
  } = await createClient().auth.getSession();

  if (!session) {
    throw new AdminError("Your session has ended. Please sign in again.", 401);
  }
  return session.access_token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
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
