"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { FormEvent, RefObject } from "react";
import { Button, Card, IconBadge, RadioCard, TextField } from "@/components/ui";
import { formatHkd } from "@/lib/format";
import {
  DONATION_FREQUENCIES,
  INITIAL_DONATION_SELECTION,
  INTEREST_AREAS,
  PRESET_AMOUNTS,
  VERIFIED_IMPACT_BY_AMOUNT,
} from "../data";
import type {
  DonationFrequency,
  DonationInterest,
  DonationSelection,
  DonationStep,
  DonationSummaryDetails,
  PresetAmount,
} from "../types";
import { DonationProgress } from "./DonationProgress";
import { DonationReview } from "./DonationReview";
import { DonationSummary } from "./DonationSummary";
import { DonationThankYou } from "./DonationThankYou";

const WHOLE_DOLLARS = /^[1-9]\d*$/;

function parseCustomAmount(value: string): number | null {
  const trimmed = value.trim();
  return WHOLE_DOLLARS.test(trimmed) ? Number(trimmed) : null;
}

function getCustomAmountError(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "Enter a whole-number HKD amount.";
  if (!WHOLE_DOLLARS.test(trimmed)) {
    return "Enter a positive whole-number HKD amount without decimals or symbols.";
  }
  return null;
}

function getInitialSelection(): DonationSelection {
  return { ...INITIAL_DONATION_SELECTION };
}

/** Move focus to the new step's heading, so a screen reader lands in the right place. */
function focusHeading<T extends HTMLElement>(ref: RefObject<T | null>) {
  window.requestAnimationFrame(() => ref.current?.focus());
}

function getSummaryDetails(selection: DonationSelection): DonationSummaryDetails {
  const frequency = DONATION_FREQUENCIES.find((item) => item.value === selection.frequency);
  const interest = INTEREST_AREAS.find((item) => item.value === selection.interest);
  const amount =
    selection.amountMode === "custom"
      ? parseCustomAmount(selection.customAmount)
      : selection.presetAmount;
  const amountLabel = amount ? formatHkd(amount) : "Custom amount not set";
  const isMonthly = selection.frequency === "monthly";

  return {
    frequencyLabel: frequency?.label ?? selection.frequency,
    amountLabel: isMonthly ? `${amountLabel} monthly` : amountLabel,
    monthlyTotalLabel: isMonthly && amount ? `${formatHkd(amount * 12)} over 12 months` : null,
    interestLabel: interest?.label ?? selection.interest,
    impactStatement:
      selection.amountMode === "preset" ? VERIFIED_IMPACT_BY_AMOUNT[selection.presetAmount] : null,
  };
}

export function DonationExperience() {
  const id = useId();
  const [step, setStep] = useState<DonationStep>("selection");
  const [selection, setSelection] = useState<DonationSelection>(getInitialSelection);
  const [customAmountTouched, setCustomAmountTouched] = useState(false);
  const selectionHeadingRef = useRef<HTMLHeadingElement>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const thankYouHeadingRef = useRef<HTMLHeadingElement>(null);
  const customAmountRef = useRef<HTMLInputElement>(null);

  const customAmountError =
    selection.amountMode === "custom" ? getCustomAmountError(selection.customAmount) : null;
  // Do not shout at someone who has not finished typing yet.
  const shownCustomAmountError = customAmountTouched ? customAmountError : null;
  const summaryDetails = useMemo(() => getSummaryDetails(selection), [selection]);

  function updateFrequency(frequency: DonationFrequency) {
    setSelection((current) => ({ ...current, frequency }));
  }

  function updatePresetAmount(presetAmount: PresetAmount) {
    setSelection((current) => ({ ...current, amountMode: "preset", presetAmount }));
  }

  function updateInterest(interest: DonationInterest) {
    setSelection((current) => ({ ...current, interest }));
  }

  function chooseCustomAmount() {
    setSelection((current) => ({ ...current, amountMode: "custom" }));
  }

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (customAmountError) {
      setCustomAmountTouched(true);
      window.requestAnimationFrame(() => customAmountRef.current?.focus());
      return;
    }
    setStep("review");
    focusHeading(reviewHeadingRef);
  }

  function handleBackToEdit() {
    setStep("selection");
    focusHeading(selectionHeadingRef);
  }

  function handleStartAgain() {
    setSelection(getInitialSelection());
    setCustomAmountTouched(false);
    setStep("selection");
    focusHeading(selectionHeadingRef);
  }

  if (step === "review") {
    return (
      <div className="space-y-6">
        <DonationProgress currentStep={step} />
        <DonationReview
          details={summaryDetails}
          headingRef={reviewHeadingRef}
          onBack={handleBackToEdit}
          onComplete={() => {
            setStep("thank-you");
            focusHeading(thankYouHeadingRef);
          }}
        />
      </div>
    );
  }

  if (step === "thank-you") {
    return (
      <div className="space-y-6">
        <DonationProgress currentStep={step} />
        <DonationThankYou
          details={summaryDetails}
          headingRef={thankYouHeadingRef}
          onStartAgain={handleStartAgain}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DonationProgress currentStep={step} />
      <section
        aria-labelledby="donation-selection-heading"
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]"
      >
        <Card as="form" panel padding="lg" onSubmit={handleReview}>
          <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-signal-deep">
            Donation selection
          </p>
          <h2
            ref={selectionHeadingRef}
            id="donation-selection-heading"
            tabIndex={-1}
            className="mt-2 font-display text-2xl font-bold text-ink outline-none sm:text-3xl"
          >
            Choose your gift
          </h2>
          <p className="mt-3 text-ink-soft">
            Select a frequency, amount, and support interest before reviewing your selection.
          </p>

          <fieldset className="mt-8">
            <legend className="font-bold text-ink">Donation frequency</legend>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {DONATION_FREQUENCIES.map((frequency) => (
                <RadioCard
                  key={frequency.value}
                  id={`${id}-frequency-${frequency.value}`}
                  name={`${id}-frequency`}
                  value={frequency.value}
                  label={frequency.label}
                  description={frequency.description}
                  checked={selection.frequency === frequency.value}
                  onChange={() => updateFrequency(frequency.value)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-8">
            <legend className="font-bold text-ink">Donation amount</legend>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {PRESET_AMOUNTS.map((amount) => (
                <RadioCard
                  key={amount.value}
                  id={`${id}-amount-${amount.value}`}
                  name={`${id}-amount`}
                  value={String(amount.value)}
                  label={<span className="font-display text-2xl">{amount.label}</span>}
                  checked={
                    selection.amountMode === "preset" && selection.presetAmount === amount.value
                  }
                  onChange={() => updatePresetAmount(amount.value)}
                  icon={<IconBadge name="heart" className="bg-paper" />}
                >
                  <span className="mt-2 block text-sm leading-6 text-ink-soft">
                    {amount.impactStatement}
                  </span>
                </RadioCard>
              ))}
              <RadioCard
                id={`${id}-amount-custom`}
                name={`${id}-amount`}
                value="custom"
                label="Custom amount"
                description="Enter a positive whole-number HKD amount."
                checked={selection.amountMode === "custom"}
                onChange={chooseCustomAmount}
              />
            </div>

            {selection.amountMode === "custom" && (
              <TextField
                ref={customAmountRef}
                id={`${id}-custom-amount`}
                label="Custom amount in HKD"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={selection.customAmount}
                fieldClassName="mt-4 max-w-sm"
                help="Use whole Hong Kong dollars only. Custom amounts do not show a custom impact description."
                error={shownCustomAmountError}
                onFocus={chooseCustomAmount}
                onChange={(event) =>
                  setSelection((current) => ({
                    ...current,
                    amountMode: "custom",
                    customAmount: event.target.value,
                  }))
                }
                onBlur={() => setCustomAmountTouched(true)}
              />
            )}
          </fieldset>

          <fieldset className="mt-8">
            <legend className="font-bold text-ink">What would you like to support?</legend>
            <p className="mt-2 text-ink-soft">
              This selection expresses your supporter interest and does not necessarily create a
              restricted fund allocation.
            </p>
            <div className="mt-4 grid gap-3">
              {INTEREST_AREAS.map((interest) => (
                <RadioCard
                  key={interest.value}
                  id={`${id}-interest-${interest.value}`}
                  name={`${id}-interest`}
                  value={interest.value}
                  label={interest.label}
                  description={interest.description}
                  checked={selection.interest === interest.value}
                  onChange={() => updateInterest(interest.value)}
                  icon={<IconBadge name={interest.icon} className="bg-paper" />}
                />
              ))}
            </div>
          </fieldset>

          <div className="mt-8 flex flex-col gap-3 border-t border-edge pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-ink-soft">Next, review your selection before confirmation.</p>
            <Button type="submit" variant="donate" size="lg">
              Review donation
            </Button>
          </div>
        </Card>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <DonationSummary
            details={summaryDetails}
            hasAmountError={Boolean(shownCustomAmountError)}
          />
        </div>
      </section>
    </div>
  );
}
