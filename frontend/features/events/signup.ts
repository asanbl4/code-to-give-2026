import { API_URL } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { EventSignupInput, EventSignupResult } from "./types";

export async function createVolunteerAccount(
  email: string,
  password: string,
  fullName: string,
): Promise<string> {
  const supabase = createClient();
  const address = email.trim().toLowerCase();

  // A retry after a failed application submission should reuse the account
  // rather than treating "already registered" as a dead end.
  const existing = await supabase.auth.signInWithPassword({ email: address, password });
  if (existing.data.session) return existing.data.session.access_token;

  const { data, error } = await supabase.auth.signUp({
    email: address,
    password,
    options: { data: { full_name: fullName.trim() } },
  });

  if (error) {
    throw new Error(
      error.status === 422 || error.status === 400
        ? "An account already exists for this email, or the password does not meet the requirements. Sign in to the volunteer portal or use another email."
        : error.message,
    );
  }
  if (!data.session) {
    throw new Error(
      "Email confirmation is enabled in Supabase. Turn off Confirm email in Authentication settings so password accounts work without sending emails.",
    );
  }
  return data.session.access_token;
}

export async function submitEventSignup(
  input: EventSignupInput,
  accessToken: string,
): Promise<EventSignupResult> {
  if (!input.processAcknowledged) {
    throw new Error("The volunteer onboarding process must be acknowledged");
  }

  if (input.ageGroup === "14-15" && input.volunteerRole === "coach") {
    throw new Error("Volunteers aged 14-15 can only apply as volunteer assistants");
  }

  const response = await fetch(`${API_URL}/api/volunteers/applications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      session_id: input.sessionId,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      age_group: input.ageGroup,
      volunteer_role: input.volunteerRole,
      interest: input.interest,
      note: input.note,
      process_acknowledged: input.processAcknowledged,
    }),
  });

  if (!response.ok) {
    let message = "We couldn't submit your application. Please try again.";
    try {
      const body = (await response.json()) as { detail?: string | Array<{ msg?: string }> };
      if (typeof body.detail === "string") message = body.detail;
      if (Array.isArray(body.detail) && body.detail[0]?.msg) message = body.detail[0].msg;
    } catch {
      // Keep the useful fallback when an upstream proxy returned non-JSON.
    }
    throw new Error(message);
  }

  const result = (await response.json()) as {
    application_id: string;
    reference: string;
    session_id: string;
    submitted_at: string;
    age_group: EventSignupResult["ageGroup"];
    volunteer_role: EventSignupResult["volunteerRole"];
  };

  return {
    applicationId: result.reference,
    sessionId: result.session_id,
    submittedAt: result.submitted_at,
    ageGroup: result.age_group,
    volunteerRole: result.volunteer_role,
  };
}
