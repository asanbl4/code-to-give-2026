import type { ImpactSummaryMetric } from "../types";

interface ImpactSummaryCardsProps {
  metrics: ReadonlyArray<ImpactSummaryMetric>;
}

function getMetricVisual(id: string) {
  if (id === "volunteer-hours") {
    return {
      classes: "border-teal-200 bg-teal-50 text-teal-800",
      path: "M12 4a4 4 0 0 1 4 4v2h1a3 3 0 0 1 3 3v6h-2v-6a1 1 0 0 0-1-1h-1v2h-2V8a2 2 0 0 0-4 0v6H8v-2H7a1 1 0 0 0-1 1v6H4v-6a3 3 0 0 1 3-3h1V8a4 4 0 0 1 4-4Z",
    };
  }
  if (id === "milestones") {
    return {
      classes: "border-purple-200 bg-purple-50 text-purple-800",
      path: "M12 3 14.7 8.5 21 9.4l-4.5 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2L3 9.4l6.3-.9L12 3Z",
    };
  }
  return {
    classes: "border-orange-200 bg-orange-50 text-orange-800",
    path: "M12 21s-7-4.4-9.2-8.6C.9 8.8 3.3 5 7.2 5c2 0 3.6 1 4.8 2.5C13.2 6 14.8 5 16.8 5c3.9 0 6.3 3.8 4.4 7.4C19 16.6 12 21 12 21Z",
  };
}

export function ImpactSummaryCards({ metrics }: ImpactSummaryCardsProps) {
  return (
    <section aria-labelledby="impact-summary-heading">
      <h2 id="impact-summary-heading" className="text-2xl font-semibold text-zinc-950">
        Impact summary
      </h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const visual = getMetricVisual(metric.id);

          return (
            <article
              key={metric.id}
              className={`relative overflow-hidden rounded-3xl border p-5 shadow-sm ${visual.classes}`}
            >
              <div aria-hidden="true" className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/60" />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white/85">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                  <path fill="currentColor" d={visual.path} />
                </svg>
              </span>
              <p className="relative mt-4 text-sm font-medium">{metric.label}</p>
              <p className="relative mt-2 text-3xl font-semibold text-zinc-950">{metric.value}</p>
              <p className="relative mt-3 text-sm leading-6 text-zinc-700">{metric.helperText}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
