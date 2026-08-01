import { Card, Tag } from "@/components/ui";
import type { SupporterProfile } from "../types";

export function ProfileHeader({ profile }: { profile: SupporterProfile }) {
  return (
    <Card as="section" panel padding="lg" aria-labelledby="profile-heading">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div
          aria-hidden="true"
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-panel bg-signal font-display text-2xl font-bold text-white"
        >
          {profile.initials}
        </div>
        <div>
          <Tag tone="outline">{profile.demoLabel}</Tag>
          <h1
            id="profile-heading"
            className="mt-3 font-display text-4xl font-bold leading-tight text-ink"
          >
            Your Love 21 Impact Profile
          </h1>
          <p className="mt-2 text-lg font-bold text-ink">{profile.displayName}</p>
          <p className="mt-3 max-w-3xl text-ink-soft">
            Track giving, volunteering, community recognition, and milestones in one place.
          </p>
        </div>
      </div>
    </Card>
  );
}
