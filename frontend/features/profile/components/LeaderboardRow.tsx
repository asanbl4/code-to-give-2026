import type { GivingLeaderboardEntry, RecognitionCategory, VolunteerLeaderboardEntry } from "../types";

type LeaderboardEntry = VolunteerLeaderboardEntry | GivingLeaderboardEntry;

function formatHkd(amount: number): string {
  return `HK$${amount.toLocaleString("en-HK")}`;
}

function isVolunteerEntry(entry: LeaderboardEntry): entry is VolunteerLeaderboardEntry {
  return entry.category === "volunteer";
}

interface LeaderboardRowProps {
  category: RecognitionCategory;
  entry: LeaderboardEntry;
  labelPrefix?: string;
}

export function LeaderboardRow({ category, entry, labelPrefix = "Rank" }: LeaderboardRowProps) {
  const accentClasses =
    category === "volunteer"
      ? "border-teal-200 bg-teal-50/60"
      : "border-orange-200 bg-orange-50/60";

  return (
    <li
      className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
        entry.isCurrentProfile ? `border-2 ${accentClasses}` : "border-zinc-200 bg-white"
      }`}
    >
      <div className="grid gap-3 text-sm sm:grid-cols-[6rem_minmax(0,1fr)_8rem_8rem] sm:items-center">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {labelPrefix}
          </span>
          <span className="mt-1 block font-semibold text-zinc-950">Rank {entry.rank}</span>
        </div>

        <div>
          <p className="font-semibold text-zinc-950">{entry.displayName}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {entry.isAnonymous && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                Anonymous display
              </span>
            )}
            {entry.isCurrentProfile && (
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-zinc-950 ring-1 ring-zinc-300">
                Your profile
              </span>
            )}
          </div>
          {entry.supportInterest && (
            <p className="mt-2 text-xs text-zinc-600">Interest: {entry.supportInterest}</p>
          )}
        </div>

        {isVolunteerEntry(entry) ? (
          <>
            <div>
              <span className="block text-xs text-zinc-500">Volunteer hours</span>
              <span className="mt-1 block font-semibold text-zinc-950">
                {entry.volunteerHours}
              </span>
            </div>
            <div>
              <span className="block text-xs text-zinc-500">Activities</span>
              <span className="mt-1 block font-semibold text-zinc-950">
                {entry.activitiesAttended}
              </span>
            </div>
          </>
        ) : (
          <>
            <div>
              <span className="block text-xs text-zinc-500">Giving total</span>
              <span className="mt-1 block font-semibold text-zinc-950">
                {formatHkd(entry.donationTotalHkd)}
              </span>
            </div>
            <div>
              <span className="block text-xs text-zinc-500">Contributions</span>
              <span className="mt-1 block font-semibold text-zinc-950">
                {entry.contributionCount}
              </span>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
