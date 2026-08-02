"use client";

import { useId, useState } from "react";
import type { AnalyticsDayPoint } from "@/lib/admin";

interface TrafficChartProps {
  title: string;
  points: AnalyticsDayPoint[];
  /** Which measure to draw. One series per chart — see the note below. */
  measure: "visits" | "page_views";
}

/**
 * One measure, one chart.
 *
 * Deliberately not both series together, for two reasons. Page views are always
 * at least visits, and often several times them, so a shared axis flattens the
 * visits line into the baseline. And the two series would need two hues: this
 * palette's only candidates are `signal` and `positive`, whose separation under
 * deuteranopia measures ΔE 5.4 — below the safe floor, which is the red/green
 * problem in its textbook form. Small multiples avoid both, and each chart
 * keeps an honest axis of its own.
 *
 * No legend, because a single series is named by the title above it.
 *
 * Drawn as inline SVG rather than with a charting library: the site's rule is
 * that colour comes from `globals.css` and nowhere else, and every chart
 * library arrives with a palette of its own.
 */

const VIEWBOX_WIDTH = 720;
const VIEWBOX_HEIGHT = 200;
const PADDING = { top: 16, right: 12, bottom: 26, left: 40 };

const PLOT_WIDTH = VIEWBOX_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = VIEWBOX_HEIGHT - PADDING.top - PADDING.bottom;

/** A round-ish number at or above the peak, so the axis reads sensibly. */
function niceCeiling(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function shortDate(day: string): string {
  // Parsed as UTC and formatted as UTC: `new Date("2026-08-02")` is midnight
  // UTC, and formatting that in a timezone behind it prints the 1st.
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function TrafficChart({ title, points, measure }: TrafficChartProps) {
  const headingId = useId();
  const [hovered, setHovered] = useState<number | null>(null);

  const values = points.map((point) => point[measure]);
  const peak = niceCeiling(Math.max(...values, 0));

  const x = (index: number) =>
    PADDING.left +
    (points.length === 1 ? PLOT_WIDTH / 2 : (index / (points.length - 1)) * PLOT_WIDTH);
  const y = (value: number) => PADDING.top + PLOT_HEIGHT - (value / peak) * PLOT_HEIGHT;

  const line = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const area = `${PADDING.left},${PADDING.top + PLOT_HEIGHT} ${line} ${
    PADDING.left + PLOT_WIDTH
  },${PADDING.top + PLOT_HEIGHT}`;

  // Four gridlines including the baseline. More would compete with the data.
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(peak * fraction));

  const active = hovered !== null ? points[hovered] : null;

  return (
    <figure className="rounded-card bg-paper p-4 ring-1 ring-edge">
      <figcaption id={headingId} className="font-bold text-ink">
        {title}
      </figcaption>

      <div className="relative mt-3">
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className="w-full"
          role="img"
          aria-labelledby={headingId}
          onMouseLeave={() => setHovered(null)}
          onMouseMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            // Client pixels back into viewBox units, then to the nearest day.
            const withinPlot =
              ((event.clientX - box.left) / box.width) * VIEWBOX_WIDTH - PADDING.left;
            const fraction = withinPlot / PLOT_WIDTH;
            const index = Math.round(fraction * (points.length - 1));
            setHovered(Math.min(Math.max(index, 0), points.length - 1));
          }}
        >
          {gridValues.map((value) => (
            <g key={value}>
              <line
                x1={PADDING.left}
                x2={PADDING.left + PLOT_WIDTH}
                y1={y(value)}
                y2={y(value)}
                stroke="var(--color-edge)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={PADDING.left - 8}
                y={y(value) + 4}
                textAnchor="end"
                className="fill-[var(--color-ink-soft)] text-[11px]"
              >
                {value}
              </text>
            </g>
          ))}

          <polygon points={area} fill="var(--color-signal-soft)" />
          <polyline
            points={line}
            fill="none"
            stroke="var(--color-signal)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* First and last day only. A label per point is unreadable at 90. */}
          {[0, points.length - 1].map((index) =>
            points[index] ? (
              <text
                key={index}
                x={x(index)}
                y={VIEWBOX_HEIGHT - 6}
                textAnchor={index === 0 ? "start" : "end"}
                className="fill-[var(--color-ink-soft)] text-[11px]"
              >
                {shortDate(points[index].day)}
              </text>
            ) : null,
          )}

          {hovered !== null && active && (
            <g>
              <line
                x1={x(hovered)}
                x2={x(hovered)}
                y1={PADDING.top}
                y2={PADDING.top + PLOT_HEIGHT}
                stroke="var(--color-ink-soft)"
                strokeWidth="1"
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
              {/* A ring in the surface colour separates the marker from the
                  line it sits on. */}
              <circle
                cx={x(hovered)}
                cy={y(active[measure])}
                r="5"
                fill="var(--color-signal)"
                stroke="var(--color-paper)"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {hovered !== null && active && (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-xs font-bold text-paper"
            style={{ left: `${(x(hovered) / VIEWBOX_WIDTH) * 100}%` }}
          >
            {shortDate(active.day)}: {active[measure]}
          </div>
        )}
      </div>

      {/* The same numbers, reachable without a pointer. The chart above is
          decorative for anyone who cannot hover it. */}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-bold text-ink-soft">
          View as table
        </summary>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="text-ink-soft">
              <th scope="col" className="py-1 font-bold">
                Day
              </th>
              <th scope="col" className="py-1 text-right font-bold">
                {title}
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.day} className="border-t border-edge">
                <td className="py-1 text-ink">{shortDate(point.day)}</td>
                <td className="py-1 text-right text-ink">{point[measure]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
