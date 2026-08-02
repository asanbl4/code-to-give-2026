import type {
  DonationFrequency,
  DonationInterestOption,
  DonationStepDefinition,
  PresetDonationAmountOption,
  PresetAmount,
  TrustTransparencyItem,
} from "./types";

export const DONATION_STEPS: ReadonlyArray<DonationStepDefinition> = [
  { value: "selection", label: "Choose your gift" },
  { value: "review", label: "Review" },
  { value: "thank-you", label: "Thank you" },
];

export const DONATION_FREQUENCIES: ReadonlyArray<{
  value: DonationFrequency;
  label: string;
  description: string;
}> = [
  {
    value: "one-time",
    label: "One-time",
    description: "Make a single prototype donation selection.",
  },
  {
    value: "monthly",
    label: "Monthly",
    description: "Review the monthly amount and the 12-month total.",
  },
];

export const VERIFIED_IMPACT_BY_AMOUNT: Readonly<Record<PresetAmount, string>> = {
  100: "HK$100 can help support two hours of employment training for a Love 21 member.",
  500: "HK$500 can help provide one sports session for 12 Love 21 members.",
  1000: "HK$1,000 can help provide two counselling sessions for a Love 21 family.",
};

export const PRESET_AMOUNTS: ReadonlyArray<PresetDonationAmountOption> = [
  {
    value: 100,
    label: "HK$100",
    impactStatement: VERIFIED_IMPACT_BY_AMOUNT[100],
  },
  {
    value: 500,
    label: "HK$500",
    impactStatement: VERIFIED_IMPACT_BY_AMOUNT[500],
  },
  {
    value: 1000,
    label: "HK$1,000",
    impactStatement: VERIFIED_IMPACT_BY_AMOUNT[1000],
  },
];

export const INTEREST_AREAS: ReadonlyArray<DonationInterestOption> = [
  {
    value: "where-needed-most",
    label: "Where Needed Most",
    description: "Let Love 21 identify the area of greatest current need.",
  },
  {
    value: "sports",
    label: "Sports",
    description: "Express interest in inclusive sport and movement activities.",
  },
  {
    value: "nutrition",
    label: "Nutrition",
    description: "Express interest in food education and nutrition support.",
  },
  {
    value: "family-support",
    label: "Family Support",
    description: "Express interest in support for families and carers.",
  },
  {
    value: "employment-and-life-skills",
    label: "Employment and Life Skills",
    description: "Express interest in training for work and everyday confidence.",
  },
];

export const TRUST_TRANSPARENCY_ITEMS: ReadonlyArray<TrustTransparencyItem> = [
  {
    title: "Financial transparency",
    description:
      "In a real donation flow, Love 21 would link to confirmed financial reporting or charity information for supporters to review.",
  },
  {
    title: "Secure giving",
    description:
      "This demo does not process payments. A live version would use an approved payment provider for secure transaction handling.",
  },
  {
    title: "Privacy",
    description:
      "This prototype does not collect names, contact details, card details, cookies, analytics, or persistent supporter data.",
  },
  {
    title: "Charity information",
    description:
      "A production page should include verified Love 21 charity details and any required local fundraising disclosures.",
  },
];

export const INITIAL_DONATION_SELECTION = {
  frequency: "one-time",
  amountMode: "preset",
  presetAmount: 500,
  customAmount: "",
  interest: "where-needed-most",
} as const;
