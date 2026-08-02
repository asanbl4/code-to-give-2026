import type { VolunteerImpact } from "../types";

interface VolunteerImpactSectionProps {
  volunteer: VolunteerImpact;
}

export function VolunteerImpactSection({ volunteer }: VolunteerImpactSectionProps) {
  const hourMarkers = Math.min(6, Math.max(1, Math.ceil(volunteer.totalHours / 3)));

  return (
    <section
      aria-labelledby="volunteer-impact-heading"
      className="overflow-hidden rounded-[2rem] border border-teal-100 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 id="volunteer-impact-heading" className="text-2xl font-semibold text-zinc-950">
        Volunteer impact
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        Volunteer participation across community activities and events.
      </p>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-teal-100 bg-teal-50 p-4">
          <svg aria-hidden="true" viewBox="0 0 120 80" className="absolute -right-5 -top-4 h-24 w-36 text-teal-700 opacity-10">
            <path fill="currentColor" d="M22 62c12-30 64-30 76 0H22Zm20-30a18 18 0 1 1 36 0 18 18 0 0 1-36 0Z" />
          </svg>
          <dt className="text-sm text-zinc-600">Total volunteer hours</dt>
          <dd className="mt-2 text-3xl font-semibold text-zinc-950">
            {volunteer.totalHours}
          </dd>
          <div className="mt-4 grid grid-cols-6 gap-1.5" aria-label={`${volunteer.totalHours} volunteer hours recorded`}>
            {Array.from({ length: 6 }).map((_, index) => (
              <span
                key={index}
                className={`h-8 rounded-full border ${
                  index < hourMarkers
                    ? "border-teal-700 bg-teal-600"
                    : "border-teal-100 bg-white"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-600">Visual markers support the exact value shown above.</p>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
          <dt className="text-sm text-zinc-600">Activities attended</dt>
          <dd className="mt-2 text-3xl font-semibold text-zinc-950">
            {volunteer.activitiesAttended}
          </dd>
          <div className="mt-4 flex flex-wrap gap-1.5" aria-label={`${volunteer.activitiesAttended} activities attended`}>
            {Array.from({ length: volunteer.activitiesAttended }).map((_, index) => (
              <span key={index} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-teal-700 ring-1 ring-teal-200">
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
                  <path fill="currentColor" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm3.8 6.2-4.5 4.5-2.2-2.2 1.2-1.2 1 1 3.3-3.3 1.2 1.2Z" />
                </svg>
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-600">Each mark represents one activity.</p>
        </div>
      </dl>

      <div className="mt-6">
        <h3 className="font-semibold text-zinc-950">Volunteering interests</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {volunteer.interests.map((interest) => (
            <li
              key={interest}
              className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm font-medium text-zinc-800"
            >
              {interest}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
