import type { ImpactSummaryMetric } from "../types";

interface ImpactSummaryCardsProps {
  metrics: ReadonlyArray<ImpactSummaryMetric>;
}

function getMetricVisual(id: string) {
  if (id === "volunteer-hours") {
    return {
      classes: "border-positive/40 bg-gradient-to-br from-positive-soft to-paper text-positive",
      path: "M7 18h10v2H7v-2Zm1-4h8v2H8v-2Zm2-11h4l1 3h4v8h-2V8h-2.4l-1-3h-3.2l-1 3H7v6H5V6h4l1-3Zm2 6a3 3 0 0 1 3 3h-2a1 1 0 1 0-2 0H9a3 3 0 0 1 3-3Z",
      detail: "M5 18c3-5 11-5 14 0",
    };
  }
  if (id === "milestones") {
    return {
      classes: "border-highlight/60 bg-gradient-to-br from-highlight-soft to-paper text-ink",
      path: "M12 2 5 5v6c0 4.4 2.9 8.4 7 10 4.1-1.6 7-5.6 7-10V5l-7-3Zm0 5 1.4 2.8 3.1.4-2.2 2.2.5 3.1-2.8-1.5-2.8 1.5.5-3.1-2.2-2.2 3.1-.4L12 7Z",
      detail: "M7 20h10",
    };
  }
  if (id === "donation-count") {
    return {
      classes: "border-signal/25 bg-gradient-to-br from-signal-soft to-paper text-signal-deep",
      path: "M5 5h14v14H5V5Zm2 2v10h10V7H7Zm2 2h6v2H9V9Zm0 4h4v2H9v-2Z",
      detail: "M4 4h16",
    };
  }
  return {
    classes: "border-signal/25 bg-gradient-to-br from-signal-soft to-paper text-signal-deep",
    path: "M12 21s-7-4.4-9.2-8.6C.9 8.8 3.3 5 7.2 5c2 0 3.6 1 4.8 2.5C13.2 6 14.8 5 16.8 5c3.9 0 6.3 3.8 4.4 7.4C19 16.6 12 21 12 21Z",
    detail: "M7 18h10",
  };
}

export function ImpactSummaryCards({ metrics }: ImpactSummaryCardsProps) {
  return (
    <section aria-labelledby="impact-summary-heading">
      <h2 id="impact-summary-heading" className="text-2xl font-semibold text-ink">
        Impact summary
      </h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const visual = getMetricVisual(metric.id);

          return (
            <article
              key={metric.id}
              className={`relative overflow-hidden rounded-3xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${visual.classes}`}
            >
              <div aria-hidden="true" className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-paper/60" />
              <div aria-hidden="true" className="absolute bottom-3 right-3 h-16 w-16 rounded-full border border-current/10" />
              <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-paper/90 shadow-sm">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
                  <path fill="currentColor" d={visual.path} />
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" d={visual.detail} opacity="0.45" />
                </svg>
              </span>
              <p className="relative mt-4 text-sm font-medium">{metric.label}</p>
              <p className="relative mt-2 text-3xl font-semibold text-ink">{metric.value}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
