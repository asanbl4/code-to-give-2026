export type EventSession = {
  id: string;
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string;
  location: string;
  capacityLabel: string;
};

export type EventSignupInput = {
  sessionId: string;
  name: string;
  email: string;
  participationType: "volunteer" | "family" | "supporter";
  note: string;
};

export type EventSignupResult = {
  confirmationId: string;
  sessionId: string;
  submittedAt: string;
};
