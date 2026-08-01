import type { Metadata } from "next";
import { PageShell } from "@/components/layout";
import { CommunityRecognition } from "@/features/profile/components/CommunityRecognition";
import { DonationImpactSection } from "@/features/profile/components/DonationImpactSection";
import { ImpactSummaryCards } from "@/features/profile/components/ImpactSummaryCards";
import { MilestonesSection } from "@/features/profile/components/MilestonesSection";
import { PrivacyAccountNote } from "@/features/profile/components/PrivacyAccountNote";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { RecentActivitySection } from "@/features/profile/components/RecentActivitySection";
import { ShareImpact } from "@/features/profile/components/ShareImpact";
import { VolunteerImpactSection } from "@/features/profile/components/VolunteerImpactSection";
import { DEMO_SUPPORTER_PROFILE } from "@/features/profile/data";

export const metadata: Metadata = {
  title: "Impact Profile",
  description: "A demo supporter impact profile for Love 21 Foundation.",
};

export default function ProfilePage() {
  const profile = DEMO_SUPPORTER_PROFILE;

  return (
    <PageShell>
      <div className="space-y-8">
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
    </PageShell>
  );
}
