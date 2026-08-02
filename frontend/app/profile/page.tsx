import type { Metadata } from "next";
import Image from "next/image";
import { PageShell } from "@/components/layout";
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
  title: "Impact Profile",
  description: "A demo supporter impact profile for Love 21 Foundation.",
};

/**
 * The header comes from `PageShell`, not from a `<SiteHeader />` placed here:
 * the header renders `MascotHeaderBadge`, whose `useMascot()` throws outside
 * the `MascotProvider` that `PageShell` sets up. It brings the footer too, and
 * with it the "back to home" this page used to carry twice in its own bar.
 *
 * `width="full"` because the photographic backdrop runs edge to edge; the
 * container inside keeps the content at the site's usual measure.
 */
export default function ProfilePage() {
  const profile = DEMO_SUPPORTER_PROFILE;

  return (
    <PageShell width="full">
      <div className="relative isolate overflow-hidden bg-ink text-ink">
        {/* Scoped to this block rather than `fixed` to the viewport, so the
            photo stays behind the profile instead of sliding under the site
            header and footer. */}
        <Image
          src="/images/love-21-football-activity.jpeg"
          alt=""
          fill
          priority
          aria-hidden="true"
          sizes="100vw"
          className="scale-110 object-cover blur-sm"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-ink/60 backdrop-blur-[2px]" />

        <div className="relative z-10 mx-auto w-full max-w-6xl space-y-7 px-5 py-10 sm:px-8 sm:py-14">
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
      </div>
    </PageShell>
  );
}
