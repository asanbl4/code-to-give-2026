import { Section, StatCard } from "@/components/ui";
import type { ImpactSummaryMetric } from "../types";

export function ImpactSummaryCards({
  metrics,
}: {
  metrics: ReadonlyArray<ImpactSummaryMetric>;
}) {
  return (
    <Section title="Impact summary">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard
            key={metric.id}
            value={metric.value}
            label={metric.label}
            helperText={metric.helperText}
            icon={metric.icon}
            tone={metric.tone}
          />
        ))}
      </div>
    </Section>
  );
}
