import { Card, Section, Tag } from "@/components/ui";
import type { VolunteerImpact } from "../types";

/** Beyond this the row of marks stops reading as a count and starts as noise. */
const MAX_ACTIVITY_MARKS = 24;

export function VolunteerImpactSection({ volunteer }: { volunteer: VolunteerImpact }) {
  const marks = Math.min(volunteer.activitiesAttended, MAX_ACTIVITY_MARKS);

  return (
    <Section
      card
      title="Volunteer impact"
      description="Volunteer participation across community activities and events."
    >
      <dl className="grid gap-4 sm:grid-cols-2">
        <Card as="div" tone="positive">
          <dt className="text-ink-soft">Total volunteer hours</dt>
          <dd className="mt-2 font-display text-3xl font-bold text-ink">{volunteer.totalHours}</dd>
        </Card>
        <Card as="div" tone="positive">
          <dt className="text-ink-soft">Activities attended</dt>
          <dd className="mt-2 font-display text-3xl font-bold text-ink">
            {volunteer.activitiesAttended}
          </dd>
          <div
            className="mt-3 flex flex-wrap gap-1"
            aria-label={`${volunteer.activitiesAttended} activities attended`}
          >
            {Array.from({ length: marks }).map((_, index) => (
              <span key={index} className="h-2.5 w-6 rounded-full bg-positive" />
            ))}
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            {marks === volunteer.activitiesAttended
              ? "Each mark represents one activity."
              : `Showing ${marks} of ${volunteer.activitiesAttended} activities.`}
          </p>
        </Card>
      </dl>

      <div className="mt-6">
        <h3 className="font-display text-lg font-bold text-ink">Volunteering interests</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {volunteer.interests.map((interest) => (
            <li key={interest}>
              <Tag tone="outline">{interest}</Tag>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
