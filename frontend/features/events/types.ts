export type EventSession = {
  id: string;
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string;
  location: string;
  capacityLabel: string;
  eligibleAgeGroups: readonly VolunteerAgeGroup[];
};

export type VolunteerAgeGroup = "14-15" | "16-17" | "18-plus";
export type VolunteerRole = "assistant" | "coach";
export type VolunteerInterest = "sports" | "creative" | "family" | "nutrition" | "general";

export type EventSignupInput = {
  sessionId: string;
  fullName: string;
  email: string;
  phone: string;
  ageGroup: VolunteerAgeGroup;
  volunteerRole: VolunteerRole;
  interest: VolunteerInterest;
  note: string;
  processAcknowledged: boolean;
};

export type EventSignupResult = {
  applicationId: string;
  sessionId: string;
  submittedAt: string;
  ageGroup: VolunteerAgeGroup;
  volunteerRole: VolunteerRole;
};
