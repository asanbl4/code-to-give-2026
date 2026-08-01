import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface RadioCardProps {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: ReactNode;
  description?: ReactNode;
  /** Shown between the radio and the text — an Icon, usually. */
  icon?: ReactNode;
  /** Extra content under the description, e.g. an impact statement. */
  children?: ReactNode;
  className?: string;
}

/**
 * A radio button wearing a card.
 *
 * `DonationExperience` defined one of these and then re-implemented the same
 * markup inline for the interest options anyway, so the two drifted. One
 * component now, used by frequency, amount and interest alike.
 *
 * The selected state carries a "Selected" word as well as the colour change:
 * colour alone is not a state indicator for anyone who cannot distinguish it.
 */
export function RadioCard({
  id,
  name,
  value,
  checked,
  onChange,
  label,
  description,
  icon,
  children,
  className,
}: RadioCardProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer gap-3 rounded-card border-2 p-4 transition-colors",
        checked
          ? "border-signal bg-signal-soft text-ink"
          : "border-edge bg-paper text-ink hover:border-signal hover:bg-surface",
        className,
      )}
    >
      <input
        id={id}
        name={name}
        type="radio"
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1 h-5 w-5 shrink-0 accent-signal"
      />
      {icon}
      <span className="min-w-0">
        <span className="block font-bold">{label}</span>
        {description && <span className="mt-1 block text-sm text-ink-soft">{description}</span>}
        {children}
        {checked && (
          <span className="mt-2 block text-sm font-bold text-signal-deep">Selected</span>
        )}
      </span>
    </label>
  );
}
