import type { VolunteerImpact } from "../types";

interface VolunteerImpactSectionProps {
  volunteer: VolunteerImpact;
}

export function VolunteerImpactSection({ volunteer }: VolunteerImpactSectionProps) {
  return (
    <section
      aria-labelledby="volunteer-impact-heading"
      className="rounded-[2rem] border border-teal-100 bg-white p-6 shadow-sm sm:p-8"
    >
      <h2 id="volunteer-impact-heading" className="text-2xl font-semibold text-zinc-950">
        Volunteer impact
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        Volunteer participation across community activities and events.
      </p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-teal-50 p-4">
          <dt className="text-sm text-zinc-600">Total volunteer hours</dt>
          <dd className="mt-2 text-3xl font-semibold text-zinc-950">
            {volunteer.totalHours}
          </dd>
          <div className="mt-3 h-2 rounded-full bg-white">
            <div className="h-2 w-3/4 rounded-full bg-teal-600" />
          </div>
          <p className="mt-2 text-xs text-zinc-600">Visual marker for hours, exact value shown above.</p>
        </div>
        <div className="rounded-2xl bg-teal-50 p-4">
          <dt className="text-sm text-zinc-600">Activities attended</dt>
          <dd className="mt-2 text-3xl font-semibold text-zinc-950">
            {volunteer.activitiesAttended}
          </dd>
          <div className="mt-3 flex gap-1" aria-label={`${volunteer.activitiesAttended} activities attended`}>
            {Array.from({ length: volunteer.activitiesAttended }).map((_, index) => (
              <span key={index} className="h-2.5 w-6 rounded-full bg-teal-600" />
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
