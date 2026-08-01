import { DONATION_STEPS } from "../data";
import type { DonationStep } from "../types";

interface DonationProgressProps {
  currentStep: DonationStep;
}

export function DonationProgress({ currentStep }: DonationProgressProps) {
  const currentIndex = DONATION_STEPS.findIndex((step) => step.value === currentStep);

  return (
    <nav aria-label="Donation progress" className="rounded-2xl border border-orange-100 bg-white/90 p-3 shadow-sm">
      <ol className="grid gap-2 text-sm sm:grid-cols-3">
        {DONATION_STEPS.map((step, index) => {
          const isCurrent = step.value === currentStep;
          const isComplete = index < currentIndex;

          return (
            <li
              key={step.value}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                isCurrent
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : isComplete
                    ? "border-teal-200 bg-teal-50 text-zinc-950"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  isCurrent
                    ? "bg-white text-zinc-950"
                    : isComplete
                      ? "bg-teal-700 text-white"
                      : "bg-white text-zinc-600 ring-1 ring-zinc-200"
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
