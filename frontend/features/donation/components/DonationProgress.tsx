import { DONATION_STEPS } from "../data";
import type { DonationStep } from "../types";

interface DonationProgressProps {
  currentStep: DonationStep;
}

export function DonationProgress({ currentStep }: DonationProgressProps) {
  const currentIndex = DONATION_STEPS.findIndex((step) => step.value === currentStep);

  return (
    <nav aria-label="Donation progress" className="rounded-2xl border border-edge bg-white/90 p-3 shadow-sm">
      <ol className="grid gap-2 text-sm sm:grid-cols-3">
        {DONATION_STEPS.map((step, index) => {
          const isCurrent = step.value === currentStep;
          const isComplete = index < currentIndex;

          return (
            <li
              key={step.value}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                isCurrent
                  ? "border-signal bg-signal text-white"
                  : isComplete
                    ? "border-positive/40 bg-positive-soft text-ink"
                    : "border-edge bg-surface text-ink-soft"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  isCurrent
                    ? "bg-white text-ink"
                    : isComplete
                      ? "bg-positive text-white"
                      : "bg-white text-ink-soft ring-1 ring-edge"
                }`}
              >
                {index + 1}
              </span>
              <span>
                <span className="block font-semibold">{step.label}</span>
                {isCurrent && <span className="block text-xs">Current step</span>}
                {isComplete && <span className="block text-xs">Completed</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
