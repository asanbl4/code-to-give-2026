import type { VolunteerImpact } from "../types";

interface VolunteerImpactSectionProps {
  volunteer: VolunteerImpact;
}

export function VolunteerImpactSection({ volunteer }: VolunteerImpactSectionProps) {
  const hourMarkers = Math.min(6, Math.max(1, Math.ceil(volunteer.totalHours / 3)));

  return (
    <section
      aria-labelledby="volunteer-impact-heading"
      className="overflow-hidden rounded-[2rem] border border-positive/25 bg-paper p-5 shadow-sm sm:p-6"
    >
      <h2 id="volunteer-impact-heading" className="text-2xl font-semibold text-ink">
        Volunteer impact
      </h2>
      <p className="mt-3 text-sm leading-6 text-ink-soft">
        Volunteer participation across community activities and events.
      </p>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-positive/25 bg-positive-soft p-4">
          <svg aria-hidden="true" viewBox="0 0 120 80" className="absolute -right-5 -top-4 h-24 w-36 text-positive opacity-10">
            <path fill="currentColor" d="M22 62c12-30 64-30 76 0H22Zm20-30a18 18 0 1 1 36 0 18 18 0 0 1-36 0Z" />
          </svg>
          <dt className="text-sm text-ink-soft">Total volunteer hours</dt>
          <dd className="mt-2 text-3xl font-semibold text-ink">
            {volunteer.totalHours}
          </dd>
          <div className="mt-4 grid grid-cols-6 gap-1.5" aria-label={`${volunteer.totalHours} volunteer hours recorded`}>
            {Array.from({ length: 6 }).map((_, index) => (
              <span
                key={index}
                className={`h-8 rounded-full border ${
                  index < hourMarkers
                    ? "border-positive bg-positive"
                    : "border-positive/25 bg-paper"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-soft">Visual markers support the exact value shown above.</p>
        </div>
        <div className="rounded-2xl border border-positive/25 bg-positive-soft p-4">
          <dt className="text-sm text-ink-soft">Activities attended</dt>
          <dd className="mt-2 text-3xl font-semibold text-ink">
            {volunteer.activitiesAttended}
          </dd>
          <div className="mt-4 flex flex-wrap gap-1.5" aria-label={`${volunteer.activitiesAttended} activities attended`}>
            {Array.from({ length: volunteer.activitiesAttended }).map((_, index) => (
              <span key={index} className="flex h-8 w-8 items-center justify-center rounded-full bg-paper text-positive ring-1 ring-positive/40">
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
                  <path fill="currentColor" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm3.8 6.2-4.5 4.5-2.2-2.2 1.2-1.2 1 1 3.3-3.3 1.2 1.2Z" />
                </svg>
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-soft">Each mark represents one activity.</p>
        </div>
      </dl>

      <div className="mt-6">
        <h3 className="font-semibold text-ink">Volunteering interests</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {volunteer.interests.map((interest) => (
            <li
              key={interest}
              className="rounded-full border border-positive/40 bg-positive-soft px-3 py-1 text-sm font-medium text-ink"
            >
              {interest}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
