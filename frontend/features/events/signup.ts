import type { EventSignupInput, EventSignupResult } from "./types";

export async function submitEventSignup(input: EventSignupInput): Promise<EventSignupResult> {
  await new Promise((resolve) => setTimeout(resolve, 700));

  return {
    confirmationId: `mock-${input.sessionId}`,
    sessionId: input.sessionId,
    submittedAt: new Date().toISOString(),
  };
}
