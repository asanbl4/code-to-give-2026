import { cn } from "@/lib/cn";

export type ProgressTone = "signal" | "positive" | "highlight";

const TONES: Record<ProgressTone, string> = {
  signal: "bg-signal",
  positive: "bg-positive",
  highlight: "bg-highlight",
};

interface ProgressBarProps {
  value: number;
  max?: number;
  /**
   * What the bar measures. Rendered for sighted users unless `labelledBy` is
   * given, and always reaches assistive tech one way or the other — a bare
   * `role="progressbar"` with no accessible name announces as nothing useful.
   */
  label: string;
  /** Point at an existing element instead of rendering the label here. */
  labelledBy?: string;
  /** Right-hand caption, e.g. "15 of 20 sessions". */
  hint?: string;
  tone?: ProgressTone;
  className?: string;
}

/**
 * One progress bar. It was previously rebuilt four times — in the goal widget,
 * the donation impact chart, the volunteer summary and the landing page — and
 * only one of those four set `role="progressbar"`.
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  labelledBy,
  hint,
  tone = "signal",
  className,
}: ProgressBarProps) {
  // Guard the ratio: `max` of 0 (or an empty dataset upstream) would otherwise
  // produce NaN and a bar with no width and no aria value.
  const percent = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;

  return (
    <div className={className}>
      {(!labelledBy || hint) && (
        <div className="flex items-baseline justify-between gap-3 text-sm">
          {!labelledBy && <span className="font-bold text-ink">{label}</span>}
          {hint && <span className="text-ink-soft">{hint}</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-2 h-3 overflow-hidden rounded-full bg-surface-deep"
      >
        <div
          className={cn("h-full rounded-full transition-[width]", TONES[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
