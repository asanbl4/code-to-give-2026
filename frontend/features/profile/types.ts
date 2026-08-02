export type ProfileActivityKind = "donation" | "volunteer";
export type ContributionType = "one-time" | "monthly";
export type BadgeTone = "support" | "volunteer" | "community";
export type RecognitionCategory = "volunteer" | "giving";
export type LeaderboardPeriod = "demo-2026";
export type RecognitionVisibility = "public-demo" | "anonymous-demo";

export interface ImpactSummaryMetric {
  id: string;
  label: string;
  value: string;
  helperText: string;
}

export interface DonationImpactRecord {
  id: string;
  programmeInterest: string;
  amountHkd: number;
  contributionType: ContributionType;
  note: string;
}

export interface ContributionSummary {
  oneTimeTotalHkd: number;
  monthlyTotalHkd: number;
  monthlyCount: number;
}

export interface VolunteerImpact {
  totalHours: number;
  activitiesAttended: number;
  interests: string[];
}

export interface ProfileActivity {
  id: string;
  kind: ProfileActivityKind;
  title: string;
  dateLabel: string;
  description: string;
  demoOnly: true;
}

export interface SupporterBadge {
  id: string;
  label: string;
  description: string;
  tone: BadgeTone;
  demoOnly: true;
}

export interface NextMilestone {
  label: string;
  description: string;
  progressLabel: string;
  encouragement: string;
  demoOnly: true;
}

export interface BaseLeaderboardEntry {
  id: string;
  rank: number;
  displayName: string;
  isAnonymous: boolean;
  isCurrentProfile: boolean;
  supportInterest?: string;
  visibilityStatus: RecognitionVisibility;
  demoOnly: true;
}

export interface VolunteerLeaderboardEntry extends BaseLeaderboardEntry {
  category: "volunteer";
  volunteerHours: number;
  activitiesAttended: number;
}

export interface GivingLeaderboardEntry extends BaseLeaderboardEntry {
  category: "giving";
  donationTotalHkd: number;
  contributionCount: number;
}

export interface CommunityRecognitionData {
  period: LeaderboardPeriod;
  volunteerChampions: VolunteerLeaderboardEntry[];
  givingSupporters: GivingLeaderboardEntry[];
}

export interface SupporterProfile {
  demoLabel: string;
  displayName: string;
  initials: string;
  summary: ImpactSummaryMetric[];
  donations: DonationImpactRecord[];
  contributionSummary: ContributionSummary;
  volunteer: VolunteerImpact;
  communityRecognition: CommunityRecognitionData;
  recentActivity: ProfileActivity[];
  badges: SupporterBadge[];
  nextMilestone: NextMilestone;
  shareSummary: string;
}
