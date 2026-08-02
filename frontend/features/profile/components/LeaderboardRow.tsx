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
      ? "border-positive/40 bg-positive-soft/60"
      : "border-signal/25 bg-signal-soft/60";

  return (
    <li
      className={`rounded-2xl border px-3 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-sm motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
        entry.isCurrentProfile ? `border-2 ${accentClasses}` : "border-edge bg-paper"
      }`}
    >
      <div className="grid gap-3 text-sm sm:grid-cols-[5rem_minmax(0,1fr)_7rem_7rem] sm:items-center">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
            {labelPrefix}
          </span>
          <span className="mt-1 inline-flex rounded-full bg-surface-deep px-2 py-1 font-semibold text-ink">
            Rank {entry.rank}
          </span>
        </div>

        <div>
          <p className="font-semibold text-ink">{entry.displayName}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {entry.isAnonymous && (
              <span className="rounded-full bg-surface-deep px-2 py-0.5 text-xs font-medium text-ink-soft">
                Anonymous display
              </span>
            )}
            {entry.isCurrentProfile && (
              <span className="rounded-full bg-paper px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-edge">
                Your profile
              </span>
            )}
          </div>
        </div>

        {isVolunteerEntry(entry) ? (
          <>
            <div>
              <span className="block text-xs text-ink-soft">Volunteer hours</span>
              <span className="mt-1 block font-semibold text-ink">
                {entry.volunteerHours}
              </span>
            </div>
            <div>
              <span className="block text-xs text-ink-soft">Activities</span>
              <span className="mt-1 block font-semibold text-ink">
                {entry.activitiesAttended}
              </span>
            </div>
          </>
        ) : (
          <>
            <div>
              <span className="block text-xs text-ink-soft">Giving total</span>
              <span className="mt-1 block font-semibold text-ink">
                {formatHkd(entry.donationTotalHkd)}
              </span>
            </div>
            <div>
              <span className="block text-xs text-ink-soft">Contributions</span>
              <span className="mt-1 block font-semibold text-ink">
                {entry.contributionCount}
              </span>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
