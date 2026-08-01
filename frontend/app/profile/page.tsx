import type { Metadata } from "next";
import Link from "next/link";
import { DEMO_SUPPORTER_PROFILE } from "@/features/profile/data";
import { CommunityRecognition } from "@/features/profile/components/CommunityRecognition";
import { DonationImpactSection } from "@/features/profile/components/DonationImpactSection";
import { ImpactSummaryCards } from "@/features/profile/components/ImpactSummaryCards";
import { MilestonesSection } from "@/features/profile/components/MilestonesSection";
import { PrivacyAccountNote } from "@/features/profile/components/PrivacyAccountNote";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { RecentActivitySection } from "@/features/profile/components/RecentActivitySection";
import { ShareImpact } from "@/features/profile/components/ShareImpact";
import { VolunteerImpactSection } from "@/features/profile/components/VolunteerImpactSection";

export const metadata: Metadata = {
  title: "Impact Profile — Love 21 Foundation",
  description: "A demo supporter impact profile for Love 21 Foundation.",
};

export default function ProfilePage() {
  const profile = DEMO_SUPPORTER_PROFILE;

  return (
    <main className="min-h-screen bg-[#f7fbf4] font-sans text-zinc-950">
      <header className="border-b border-teal-200 bg-white/85 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="text-base font-semibold text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
          >
            Love 21 Foundation
          </Link>
          <nav aria-label="Profile page links" className="flex flex-wrap gap-2">
            <Link
              href="/donate"
              className="rounded-full border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 motion-reduce:transition-none"
            >
              Back to donate
            </Link>
            <Link
              href="/"
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 motion-reduce:transition-none"
            >
              Back to home
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-12">
        <ProfileHeader profile={profile} />
        <ImpactSummaryCards metrics={profile.summary} />
        <CommunityRecognition recognition={profile.communityRecognition} />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
          <DonationImpactSection
            donations={profile.donations}
            contributionSummary={profile.contributionSummary}
          />
          <VolunteerImpactSection volunteer={profile.volunteer} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentActivitySection activities={profile.recentActivity} />
          <MilestonesSection badges={profile.badges} />
        </div>
        <ShareImpact summary={profile.shareSummary} />
        <PrivacyAccountNote />
      </div>
    </main>
  );
}
