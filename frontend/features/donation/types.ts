export type DonationFrequency = "one-time" | "monthly";

export type PresetAmount = 100 | 500 | 1000;

export type DonationAmountMode = "preset" | "custom";

export type DonationInterest =
  | "where-needed-most"
  | "sports"
  | "nutrition"
  | "family-support"
  | "employment-and-life-skills";

export type DonationStep = "selection" | "review" | "thank-you";

export interface DonationStepDefinition {
  value: DonationStep;
  label: string;
}

export interface PresetDonationAmountOption {
  value: PresetAmount;
  label: string;
  impactStatement: string;
}

export interface DonationInterestOption {
  value: DonationInterest;
  label: string;
  description: string;
}

export interface DonationSelection {
  frequency: DonationFrequency;
  amountMode: DonationAmountMode;
  presetAmount: PresetAmount;
  customAmount: string;
  interest: DonationInterest;
}

export interface DonationSummaryDetails {
  frequencyLabel: string;
  amountLabel: string;
  monthlyTotalLabel: string | null;
  interestLabel: string;
  impactStatement: string | null;
}

export interface TrustTransparencyItem {
  title: string;
  description: string;
}
