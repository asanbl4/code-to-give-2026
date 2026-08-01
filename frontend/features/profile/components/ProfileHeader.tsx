import type { SupporterProfile } from "../types";

interface ProfileHeaderProps {
  profile: SupporterProfile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <section
      aria-labelledby="profile-heading"
      className="relative overflow-hidden rounded-[2rem] border border-teal-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div aria-hidden="true" className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-teal-100" />
      <div aria-hidden="true" className="absolute bottom-6 right-20 h-16 w-16 rounded-full bg-orange-100" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <div
          aria-hidden="true"
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-teal-700 text-2xl font-semibold text-white shadow-sm"
        >
          {profile.initials}
        </div>
        <div>
          <p className="inline-flex rounded-full border border-teal-700 bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">
            {profile.demoLabel}
          </p>
          <h1 id="profile-heading" className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">
            Your Love 21 Impact Profile
          </h1>
          <p className="mt-2 text-lg font-medium text-zinc-700">{profile.displayName}</p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700">
            Track giving, volunteering, community recognition, and milestones in one
            place.
          </p>
        </div>
      </div>
    </section>
  );
}
