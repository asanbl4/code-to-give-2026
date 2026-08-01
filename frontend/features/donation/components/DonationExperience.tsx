"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { FormEvent, RefObject } from "react";
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
  PresetDonationAmountOption,
  PresetAmount,
} from "../types";
import { DonationProgress } from "./DonationProgress";
import { DonationReview } from "./DonationReview";
import { DonationSummary } from "./DonationSummary";
import { DonationThankYou } from "./DonationThankYou";

function formatHkd(amount: number): string {
  return `HK$${amount.toLocaleString("en-HK")}`;
}

function parseCustomAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return null;
  }
  return Number(trimmed);
}

function getCustomAmountError(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "Enter a whole-number HKD amount.";
  }
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return "Enter a positive whole-number HKD amount without decimals or symbols.";
  }
  return null;
}

function getInitialSelection(): DonationSelection {
  return { ...INITIAL_DONATION_SELECTION };
}

function focusHeading<T extends HTMLElement>(ref: RefObject<T | null>) {
  window.requestAnimationFrame(() => {
    ref.current?.focus();
  });
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
      selection.amountMode === "preset"
        ? VERIFIED_IMPACT_BY_AMOUNT[selection.presetAmount]
        : null,
  };
}

interface RadioCardProps {
  checked: boolean;
  description?: string;
  id: string;
  label: string;
  name: string;
  onChange: () => void;
  value: string;
}

function RadioCard({
  checked,
  description,
  id,
  label,
  name,
  onChange,
  value,
}: RadioCardProps) {
  return (
    <label
      htmlFor={id}
      className={`group flex cursor-pointer gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-orange-600 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
        checked
          ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
          : "border-zinc-200 bg-white text-zinc-950 hover:border-orange-300 hover:bg-orange-50/40"
      }`}
    >
      <input
        id={id}
        name={name}
        type="radio"
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-orange-600"
      />
      <span>
        <span className="block font-semibold">{label}</span>
        {description && (
          <span className={`mt-1 block text-sm ${checked ? "text-zinc-200" : "text-zinc-500"}`}>
            {description}
          </span>
        )}
        {checked && <span className="mt-2 block text-xs font-semibold">Selected</span>}
      </span>
    </label>
  );
}

function InterestIcon({ value }: { value: DonationInterest }) {
  const baseClass = "h-5 w-5";

  return (
    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-orange-700 ring-1 ring-orange-100">
      <svg aria-hidden="true" viewBox="0 0 24 24" className={baseClass}>
        {value === "where-needed-most" && (
          <path fill="currentColor" d="M12 3 4 7v5c0 4.1 3.4 7.8 8 9 4.6-1.2 8-4.9 8-9V7l-8-4Zm0 5a3 3 0 0 1 3 3c0 2.2-3 5-3 5s-3-2.8-3-5a3 3 0 0 1 3-3Z" />
        )}
        {value === "sports" && (
          <path fill="currentColor" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm4.6 5.2a7 7 0 0 1 1.3 3.1 12 12 0 0 0-4.2-.4 12.5 12.5 0 0 0-.8-2.1 8.5 8.5 0 0 0 3.7-.6ZM12 5a7 7 0 0 1 2.7.5 6.5 6.5 0 0 1-2.9 1.4 13.5 13.5 0 0 0-1.6-1.7A7.5 7.5 0 0 1 12 5ZM7.9 6.3c.6.5 1.2 1.1 1.7 1.8A10.4 10.4 0 0 1 5.4 10a7 7 0 0 1 2.5-3.7Zm-2.7 6.1a12.7 12.7 0 0 0 5.4-2.3c.3.6.5 1.2.7 1.9a10.7 10.7 0 0 0-4.2 4 7 7 0 0 1-1.9-3.6Zm3.5 4.9a8.8 8.8 0 0 1 3-3.1 15.4 15.4 0 0 1 .1 4.8 7 7 0 0 1-3.1-1.7Zm5.2 1.4a16 16 0 0 0-.1-5.3 9.2 9.2 0 0 1 4.1.3 7 7 0 0 1-4 5Z" />
        )}
        {value === "nutrition" && (
          <path fill="currentColor" d="M7 3c4.4 0 8 3.6 8 8v1h-1c-4.4 0-8-3.6-8-8V3h1Zm10 1h2v5a5 5 0 0 1-5 5h-1v-1a5 5 0 0 1 4-4.9V4ZM5 14h14v2a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5v-2Z" />
        )}
        {value === "family-support" && (
          <path fill="currentColor" d="M8 11a4 4 0 1 1 8 0v1h1a3 3 0 0 1 3 3v5h-2v-5a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v5H4v-5a3 3 0 0 1 3-3h1v-1Zm4-2a2 2 0 0 0-2 2v1h4v-1a2 2 0 0 0-2-2ZM5.5 4a2.5 2.5 0 0 1 2.2 3.7A4.9 4.9 0 0 0 6.2 10H4a3 3 0 0 0-3 3v2h2v-2a1 1 0 0 1 1-1h1.1a6.5 6.5 0 0 1 .8-3.4A2.5 2.5 0 0 1 5.5 4Zm13 0a2.5 2.5 0 0 0-.4 4.6 6.5 6.5 0 0 1 .8 3.4H20a1 1 0 0 1 1 1v2h2v-2a3 3 0 0 0-3-3h-2.2a4.9 4.9 0 0 0-1.5-2.3A2.5 2.5 0 0 1 18.5 4Z" />
        )}
        {value === "employment-and-life-skills" && (
          <path fill="currentColor" d="M9 4h6l1 2h4v14H4V6h4l1-2Zm1.2 2-.5 1h4.6l-.5-1h-3.6ZM6 9v3h12V9H6Zm0 5v4h12v-4h-5v2h-2v-2H6Z" />
        )}
      </svg>
    </span>
  );
}

interface AmountCardProps {
  amount: PresetDonationAmountOption;
  checked: boolean;
  id: string;
  name: string;
  onChange: () => void;
}

function AmountCard({ amount, checked, id, name, onChange }: AmountCardProps) {
  return (
    <label
      htmlFor={id}
      className={`group relative flex cursor-pointer gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-orange-600 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
        checked
          ? "border-zinc-950 bg-zinc-950 text-white shadow-md"
          : "border-zinc-200 bg-white text-zinc-950 hover:border-orange-300 hover:bg-orange-50/40"
      }`}
    >
      {checked && (
        <span className="absolute right-3 top-3 rounded-full bg-white px-2 py-1 text-xs font-semibold text-zinc-950">
          ✓ Selected
        </span>
      )}
      <input
        id={id}
        name={name}
        type="radio"
        value={amount.value}
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-orange-600"
      />
      <span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-700">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
            <path fill="currentColor" d="M12 21s-7-4.4-9.2-8.6C.9 8.8 3.3 5 7.2 5c2 0 3.6 1 4.8 2.5C13.2 6 14.8 5 16.8 5c3.9 0 6.3 3.8 4.4 7.4C19 16.6 12 21 12 21Z" />
          </svg>
        </span>
        <span className="mt-3 block text-2xl font-semibold">{amount.label}</span>
        <span className={`mt-2 block text-sm leading-6 ${checked ? "text-zinc-200" : "text-zinc-600"}`}>
          {amount.impactStatement}
        </span>
      </span>
    </label>
  );
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
  const shouldShowCustomAmountError = Boolean(customAmountError && customAmountTouched);
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
      window.requestAnimationFrame(() => {
        customAmountRef.current?.focus();
      });
      return;
    }
    setStep("review");
    focusHeading(reviewHeadingRef);
  }

  function handleBackToEdit() {
    setStep("selection");
    focusHeading(selectionHeadingRef);
  }

  function handleComplete() {
    setStep("thank-you");
    focusHeading(thankYouHeadingRef);
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
          onComplete={handleComplete}
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
        <form
          onSubmit={handleReview}
          className="rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-8"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
            Donation selection
          </p>
          <h2
            ref={selectionHeadingRef}
            id="donation-selection-heading"
            tabIndex={-1}
            className="mt-3 text-2xl font-semibold text-zinc-950 outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
          >
            Choose your gift
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Select a frequency, amount, and support interest before reviewing your
            selection.
          </p>

          <fieldset className="mt-8">
            <legend className="text-base font-semibold text-zinc-950">Donation frequency</legend>
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
            <legend className="text-base font-semibold text-zinc-950">Donation amount</legend>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {PRESET_AMOUNTS.map((amount) => (
                <AmountCard
                  key={amount.value}
                  id={`${id}-amount-${amount.value}`}
                  name={`${id}-amount`}
                  amount={amount}
                  checked={
                    selection.amountMode === "preset" && selection.presetAmount === amount.value
                  }
                  onChange={() => updatePresetAmount(amount.value)}
                />
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
              <div className="mt-4 max-w-sm">
                <label
                  htmlFor={`${id}-custom-amount`}
                  className="block text-sm font-medium text-zinc-800"
                >
                  Custom amount in HKD
                </label>
                <div className="mt-2 flex rounded-2xl border border-zinc-300 bg-white focus-within:border-amber-600 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-amber-600">
                  <span className="flex items-center border-r border-zinc-200 px-4 text-sm font-semibold text-zinc-600">
                    HK$
                  </span>
                  <input
                    ref={customAmountRef}
                    id={`${id}-custom-amount`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={selection.customAmount}
                    onFocus={chooseCustomAmount}
                    onChange={(event) => {
                      setSelection((current) => ({
                        ...current,
                        amountMode: "custom",
                        customAmount: event.target.value,
                      }));
                    }}
                    onBlur={() => setCustomAmountTouched(true)}
                    aria-invalid={shouldShowCustomAmountError}
                    aria-describedby={`${id}-custom-amount-help ${
                      shouldShowCustomAmountError ? `${id}-custom-amount-error` : ""
                    }`}
                    className="min-w-0 flex-1 rounded-r-2xl px-4 py-3 text-base text-zinc-950 outline-none"
                  />
                </div>
                <p id={`${id}-custom-amount-help`} className="mt-2 text-sm text-zinc-500">
                  Use whole Hong Kong dollars only. Custom amounts do not show a custom
                  impact description.
                </p>
                {shouldShowCustomAmountError && (
                  <p
                    id={`${id}-custom-amount-error`}
                    role="alert"
                    className="mt-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
                  >
                    {customAmountError}
                  </p>
                )}
              </div>
            )}
          </fieldset>

          <fieldset className="mt-8">
            <legend className="text-base font-semibold text-zinc-950">
              What would you like to support?
            </legend>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              This selection expresses your supporter interest and does not necessarily
              create a restricted fund allocation.
            </p>
            <div className="mt-4 grid gap-3">
              {INTEREST_AREAS.map((interest) => (
                <label
                  key={interest.value}
                  htmlFor={`${id}-interest-${interest.value}`}
                  className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-orange-600 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
                    selection.interest === interest.value
                      ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                      : "border-zinc-200 bg-white text-zinc-950 hover:border-orange-300 hover:bg-orange-50/40"
                  }`}
                >
                  <input
                    id={`${id}-interest-${interest.value}`}
                    name={`${id}-interest`}
                    type="radio"
                    value={interest.value}
                    checked={selection.interest === interest.value}
                    onChange={() => updateInterest(interest.value)}
                    className="mt-1 h-4 w-4 accent-orange-600"
                  />
                  <InterestIcon value={interest.value} />
                  <span>
                    <span className="block font-semibold">{interest.label}</span>
                    <span
                      className={`mt-1 block text-sm ${
                        selection.interest === interest.value ? "text-zinc-200" : "text-zinc-500"
                      }`}
                    >
                      {interest.description}
                    </span>
                    {selection.interest === interest.value && (
                      <span className="mt-2 block text-xs font-semibold">Selected</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-8 flex flex-col gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-zinc-600">
              Next, review your selection before confirmation.
            </p>
            <button
              type="submit"
              className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              Review donation
            </button>
          </div>
        </form>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <DonationSummary
            details={summaryDetails}
            customAmountError={shouldShowCustomAmountError ? customAmountError ?? undefined : undefined}
          />
        </div>
      </section>
    </div>
  );
}
