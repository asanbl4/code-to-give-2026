import type { Metadata } from "next";
import { DonatePageClient } from "./DonatePageClient";
import type { VerifiedDonationPhoto } from "@/features/donation/components/DonationHeroVisual";

export const metadata: Metadata = {
  title: "Donate — Love 21 Foundation",
  description: "A prototype donation journey for Love 21 Foundation.",
};

const VERIFIED_DONATION_PHOTO: VerifiedDonationPhoto = {
  src: "/images/love-21-football-activity.jpeg",
  alt: "Love 21 members and volunteers taking part in an outdoor football activity",
  width: 1024,
  height: 768,
};

export default function DonatePage() {
  return <DonatePageClient photo={VERIFIED_DONATION_PHOTO} />;
}
