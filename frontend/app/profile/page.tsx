import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DEMO_SUPPORTER_PROFILE } from "@/features/profile/data";
import { CommunityRecognition } from "@/features/profile/components/CommunityRecognition";
import { DonationImpactSection } from "@/features/profile/components/DonationImpactSection";
import { ImpactSummaryCards } from "@/features/profile/components/ImpactSummaryCards";
import { MilestonesSection } from "@/features/profile/components/MilestonesSection";
import { NextMilestone } from "@/features/profile/components/NextMilestone";
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
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 font-sans text-zinc-950">
      <Image
        src="/images/love-21-football-activity.jpeg"
        alt=""
        fill
        priority
        aria-hidden="true"
        sizes="100vw"
        className="fixed inset-0 z-0 scale-110 object-cover blur-sm"
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 bg-zinc-950/55 backdrop-blur-[2px]"
      />

      <header className="relative z-10 border-b border-white/20 bg-white/15 px-5 py-4 text-white shadow-sm backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="text-base font-semibold text-white drop-shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            Love 21 Foundation
          </Link>
          <nav aria-label="Profile page links" className="flex flex-wrap gap-2">
            <Link
              href="/donate"
              className="rounded-full border border-white/45 bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
            >
              Back to donate
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/45 bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
            >
              Back to home
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-7 px-5 py-8 sm:px-8 sm:py-10">
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
          <div className="space-y-6">
            <MilestonesSection badges={profile.badges} />
            <NextMilestone milestone={profile.nextMilestone} />
          </div>
        </div>
        <ShareImpact summary={profile.shareSummary} />
        <PrivacyAccountNote />
      </div>
    </main>
  );
}
