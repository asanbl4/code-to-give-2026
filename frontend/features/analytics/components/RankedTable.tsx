"use client";

import type { AnalyticsKeyCount } from "@/lib/admin";

interface RankedTableProps {
  title: string;
  caption: string;
  rows: AnalyticsKeyCount[];
  /** Column heading for the count — "Views" for pages, "Times" for events. */
  countLabel: string;
  /** Pages have a dwell time; interactions do not. */
  showTime?: boolean;
  emptyMessage: string;
}

/** Human-readable seconds. 95 becomes "1m 35s". */
function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}

/** `donate_amount_selected` reads better as "Donate amount selected". */
function humanise(key: string): string {
  const words = key.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * A ranked list with a bar behind each row.
 *
 * The bar is a magnitude encoding sharing one scale (the top row is full
 * width), so the shape of the drop-off is readable at a glance while the exact
 * figures stay in the table. A real table rather than a chart of bars: these
 * rows are read as much as compared, and page paths are text.
 */
export function RankedTable({
  title,
  caption,
  rows,
  countLabel,
  showTime = false,
  emptyMessage,
}: RankedTableProps) {
  const peak = Math.max(...rows.map((row) => row.events), 1);

  return (
    <section className="rounded-card bg-paper p-4 ring-1 ring-edge">
      <h3 className="font-bold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{caption}</p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">{emptyMessage}</p>
      ) : (
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="text-ink-soft">
              <th scope="col" className="pb-2 font-bold">
                {title.includes("page") ? "Page" : "Interaction"}
              </th>
              <th scope="col" className="pb-2 text-right font-bold">
                {countLabel}
              </th>
              <th scope="col" className="pb-2 text-right font-bold">
                Visits
              </th>
              {showTime && (
                <th scope="col" className="pb-2 text-right font-bold">
                  Avg. time
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-edge">
                <th scope="row" className="relative py-2 pr-3 font-normal text-ink">
                  {/* Behind the label rather than beside it, so the column
                      keeps its full width for long paths. Painted first and
                      overlapped by the `relative` span below — no z-index, which
                      would need a stacking context the table row does not have. */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-1 left-0 rounded-sm bg-signal-soft"
                    style={{ width: `${(row.events / peak) * 100}%` }}
                  />
                  <span className="relative">
                    {showTime ? row.key : humanise(row.key)}
                  </span>
                </th>
                <td className="py-2 text-right font-bold text-ink">{row.events}</td>
                <td className="py-2 text-right text-ink-soft">{row.visits}</td>
                {showTime && (
                  <td className="py-2 text-right text-ink-soft">
                    {row.avg_seconds === null ? "—" : formatSeconds(row.avg_seconds)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
