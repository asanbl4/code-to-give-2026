"use client";

import { useId } from "react";

interface InlineTextProps {
  label: string;
  value: string | null;
  onSave: (value: string) => void;
  disabled?: boolean;
}

/**
 * A text field that saves on blur.
 *
 * Uncontrolled and keyed on the saved value: typing stays local, and when the
 * server value changes the input remounts with it. That avoids mirroring a prop
 * into state, which is where this kind of field usually goes wrong.
 */
export function InlineText({ label, value, onSave, disabled }: InlineTextProps) {
  // The id used to be derived from the label text, which put spaces in it and
  // collided whenever two fields shared a label.
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold text-ink">
        {label}
      </label>
      <input
        id={id}
        key={value ?? ""}
        defaultValue={value ?? ""}
        disabled={disabled}
        onBlur={(event) => {
          if (event.target.value !== (value ?? "")) onSave(event.target.value);
        }}
        className="mt-1 w-full rounded-card border-2 border-edge bg-paper px-3 py-2 disabled:bg-surface"
      />
    </div>
  );
}
