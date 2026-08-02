"use client";

import { API_URL } from "./api";
import { createClient } from "./supabase/client";

export type VolunteerApplicationStatus =
  | "submitted"
  | "under_review"
  | "account_pending"
  | "onboarding"
  | "assistant_approved"
  | "coach_assessment"
  | "trial_pending"
  | "coach_approved"
  | "rejected"
  | "withdrawn";

export type VolunteerApplication = {
  application_id: string;
  reference: string;
  session_id: string;
  submitted_at: string;
  full_name: string;
  email: string;
  phone: string;
  age_group: "14-15" | "16-17" | "18-plus";
  volunteer_role: "assistant" | "coach";
  interest: string;
  status: VolunteerApplicationStatus;
  receipt_status: "queued" | "sent" | "failed";
  terms_acknowledged: boolean;
  scrc_status: "not_required" | "pending" | "verified" | "rejected";
  identity_verified: boolean;
  guardian_documents_verified: boolean;
  trial_status: "not_required" | "pending" | "passed" | "not_suitable";
  reviewed_at: string | null;
  account_invited_at: string | null;
  approved_at: string | null;
  updated_at: string;
};

export class VolunteerPortalError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function accessToken(): Promise<string> {
  const {
    data: { session },
  } = await createClient().auth.getSession();

  if (!session) {
    throw new VolunteerPortalError("Your session has ended. Please sign in again.", 401);
  }
  return session.access_token;
}

export async function listMyVolunteerApplications(): Promise<VolunteerApplication[]> {
  const response = await fetch(`${API_URL}/api/volunteers/me/applications`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // The HTTP status remains useful when the body is not JSON.
    }
    throw new VolunteerPortalError(message, response.status);
  }

  return response.json();
}
