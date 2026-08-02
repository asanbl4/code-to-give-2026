import type { SupporterProfile } from "../types";

interface ProfileHeaderProps {
  profile: SupporterProfile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <section
      aria-labelledby="profile-heading"
      className="relative overflow-hidden rounded-[2rem] border border-positive/40 bg-gradient-to-br from-paper via-positive-soft/70 to-signal-soft/70 p-5 shadow-sm sm:p-7"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 320 160"
        className="absolute right-0 top-0 h-40 w-80 text-positive opacity-15"
      >
        <circle cx="250" cy="38" r="34" fill="currentColor" />
        <circle cx="286" cy="112" r="48" fill="var(--color-signal)" opacity="0.55" />
        <path
          d="M116 104 C168 44, 230 132, 292 58"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="10"
          opacity="0.55"
        />
        <path
          d="M78 84c9-17 36-12 36 10 0 24-36 42-36 42S42 118 42 94c0-22 27-27 36-10Z"
          fill="var(--color-signal)"
          opacity="0.7"
        />
      </svg>
      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div
          aria-hidden="true"
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-positive text-2xl font-semibold text-white shadow-sm ring-4 ring-white"
        >
          {profile.initials}
        </div>
        <div>
          <p className="inline-flex rounded-full border border-positive bg-paper/80 px-3 py-1 text-sm font-semibold text-positive">
            Demo profile · {profile.demoLabel}
          </p>
          <h1 id="profile-heading" className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Your Love 21 Impact Profile
          </h1>
          <p className="mt-2 text-lg font-medium text-ink-soft">{profile.displayName}</p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft">
            A compact story of giving, volunteering, community recognition, and
            participation milestones using local demonstration data.
          </p>
        </div>
        </div>
        <div className="rounded-3xl border border-white/70 bg-paper/75 p-4 text-sm leading-6 text-ink-soft shadow-sm backdrop-blur">
          <p className="font-semibold text-ink">Impact at a glance</p>
          <p className="mt-2">
            {profile.shareSummary}
          </p>
        </div>
      </div>
    </section>
  );
}
