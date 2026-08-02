import { API_URL } from "@/lib/api";
import type { EventSignupInput, EventSignupResult } from "./types";

export async function submitEventSignup(input: EventSignupInput): Promise<EventSignupResult> {
  if (!input.processAcknowledged) {
    throw new Error("The volunteer onboarding process must be acknowledged");
  }

  if (input.ageGroup === "14-15" && input.volunteerRole === "coach") {
    throw new Error("Volunteers aged 14-15 can only apply as volunteer assistants");
  }

  const response = await fetch(`${API_URL}/api/volunteers/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
