import { useId } from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}

/** A checkbox with room to explain itself. Used by the staff consent controls. */
export function Toggle({ checked, onChange, label, hint, disabled }: ToggleProps) {
  const id = useId();

  return (
    <div className="flex gap-3 rounded-card bg-paper p-3 ring-1 ring-edge">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-signal"
      />
      <label htmlFor={id}>
        <span className="font-bold text-ink">{label}</span>
        {hint && <span className="block text-sm text-ink-soft">{hint}</span>}
      </label>
    </div>
  );
}
