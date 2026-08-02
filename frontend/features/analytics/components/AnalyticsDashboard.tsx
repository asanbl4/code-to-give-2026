"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { AdminError, admin, type AnalyticsSummary } from "@/lib/admin";
import { RankedTable } from "./RankedTable";
import { TrafficChart } from "./TrafficChart";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function formatDay(day: string | null): string {
  if (!day) return "—";
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * Change against the previous window of the same length.
 *
 * Returns null when there is nothing to compare against. "+100%" from a base of
 * zero is arithmetically true and tells a reader nothing, so the card shows the
 * period as new instead.
 */
function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function StatTile({
  value,
  label,
  helper,
  change,
}: {
  value: string;
  label: string;
  helper?: string;
  change?: number | null;
}) {
  return (
    <div className="rounded-card bg-surface p-4 ring-1 ring-edge">
      <p className="font-display text-3xl font-bold leading-tight text-ink">{value}</p>
      <p className="mt-1 font-bold text-ink">{label}</p>
      {change !== undefined && (
        <p className="mt-1 text-sm text-ink-soft">
          {change === null ? (
            "No earlier period to compare"
          ) : (
            <>
              {/* The arrow carries the direction as well as the sign, so it does
                  not rely on reading a "-" at 14px. Colour is deliberately not
                  used: a fall in traffic is not an error state, and the site's
                  danger token means "something is wrong". */}
              <span aria-hidden="true">{change >= 0 ? "▲" : "▼"}</span>{" "}
              {change >= 0 ? "Up" : "Down"} {Math.abs(change)}% on the previous period
            </>
          )}
        </p>
      )}
      {helper && <p className="mt-1 text-sm text-ink-soft">{helper}</p>}
    </div>
  );
}

/**
 * The staff traffic report.
 *
 * A client component that fetches on mount rather than a server component:
 * every other admin screen authenticates with the caller's Supabase access
 * token from the browser, and reaching the same endpoint server-side would mean
 * a second, different auth path for one page.
 */
export function AnalyticsDashboard() {
  const [days, setDays] = useState<number>(30);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // `stale` guards against the range being changed twice quickly: without it
    // a slow 90-day response can land after a fast 7-day one and repaint the
    // page with figures the buttons say are not being shown.
    let stale = false;

    admin
      .analyticsSummary(days)
      .then((data) => {
        if (stale) return;
        setSummary(data);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (stale) return;
        setError(
          caught instanceof AdminError
            ? caught.message
            : "Could not load analytics. Is the backend running?",
        );
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });

    return () => {
      stale = true;
    };
    // No setState in the body of this effect, only in its callbacks:
    // `react-hooks/set-state-in-effect` rightly flags the synchronous form as a
    // cascading render. `loading` is instead raised by the click that changes
    // the range, which is where the user's intent actually arrives.
  }, [days]);

  const chooseRange = (range: number) => {
    if (range === days) return;
    setLoading(true);
    setDays(range);
  };

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">Site traffic</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Anonymous. No visitor is identified, and staff pages are not counted.
          </p>
        </div>

        <div role="group" aria-label="Date range" className="flex gap-2">
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              aria-pressed={days === range.days}
              onClick={() => chooseRange(range.days)}
              className={cn(
                "min-h-11 rounded-md border-2 px-3 font-bold transition-colors",
                days === range.days
                  ? "border-signal bg-signal-soft text-signal-deep"
                  : "border-edge text-ink-soft hover:text-ink",
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Card tone="danger" className="mt-6">
          <p role="alert" className="font-bold text-danger">
            {error}
          </p>
        </Card>
      )}

      {loading && !summary && <p className="mt-6 text-ink-soft">Loading…</p>}

      {summary && (
        <div className={cn("mt-6 space-y-6", loading && "opacity-60")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              value={summary.visits.toLocaleString("en-GB")}
              label="Visits"
              change={percentChange(summary.visits, summary.previous_visits)}
            />
            <StatTile
              value={summary.page_views.toLocaleString("en-GB")}
              label="Page views"
              change={percentChange(summary.page_views, summary.previous_page_views)}
            />
            <StatTile
              value={formatSeconds(summary.avg_seconds)}
              label="Average time on a page"
              helper="Counted only while the tab is visible"
            />
            <StatTile
              value={formatDay(summary.busiest_day)}
              label="Busiest day"
              helper={`${formatDay(summary.start_day)} – ${formatDay(summary.end_day)}`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TrafficChart title="Visits per day" points={summary.per_day} measure="visits" />
            <TrafficChart
              title="Page views per day"
              points={summary.per_day}
              measure="page_views"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <RankedTable
              title="Most-read pages"
              caption="Which pages people actually spend time on."
              rows={summary.top_pages}
              countLabel="Views"
              showTime
              emptyMessage="No page views recorded in this period yet."
            />
            <RankedTable
              title="Interactions"
              caption="The buttons and flows the site counts, most used first."
              rows={summary.top_events}
              countLabel="Times"
              emptyMessage="No tracked interactions in this period yet."
            />
          </div>

          {summary.devices.length > 0 && (
            <section className="rounded-card bg-paper p-4 ring-1 ring-edge">
              <h3 className="font-bold text-ink">Screen size</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Measured from the browser window, not the device — a desktop browser in a
                narrow window counts as a phone.
              </p>
              <dl className="mt-4 flex flex-wrap gap-6">
                {summary.devices.map((device) => (
                  <div key={device.key}>
                    <dt className="text-sm text-ink-soft capitalize">{device.key}</dt>
                    <dd className="font-display text-2xl font-bold text-ink">
                      {device.visits.toLocaleString("en-GB")}
                      <span className="ml-1 text-sm font-normal text-ink-soft">visits</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
