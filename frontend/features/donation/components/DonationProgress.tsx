import { cn } from "@/lib/cn";
import { DONATION_STEPS } from "../data";
import type { DonationStep } from "../types";

export function DonationProgress({ currentStep }: { currentStep: DonationStep }) {
  const currentIndex = DONATION_STEPS.findIndex((step) => step.value === currentStep);

  return (
    <nav
      aria-label="Donation progress"
      className="rounded-card bg-paper p-3 shadow-card ring-1 ring-edge"
    >
      <ol className="grid gap-2 sm:grid-cols-3">
        {DONATION_STEPS.map((step, index) => {
          const isCurrent = step.value === currentStep;
          const isComplete = index < currentIndex;

          return (
            <li
              key={step.value}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-card border-2 px-3 py-2.5",
                isCurrent && "border-signal bg-signal-soft text-ink",
                isComplete && "border-positive bg-positive-soft text-ink",
                !isCurrent && !isComplete && "border-edge bg-surface text-ink-soft",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold",
                  isCurrent && "bg-signal text-white",
                  isComplete && "bg-positive text-white",
                  !isCurrent && !isComplete && "bg-paper text-ink-soft ring-1 ring-edge",
                )}
              >
                {index + 1}
              </span>
              <span>
                <span className="block font-bold">{step.label}</span>
                {/* State in words as well as colour. */}
                {isCurrent && <span className="block text-sm">Current step</span>}
                {isComplete && <span className="block text-sm">Completed</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
