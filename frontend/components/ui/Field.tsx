import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

/**
 * One control style, one label style, one error style.
 *
 * `event-signup-form.tsx` used to repeat this exact 140-character class string
 * four times; the admin tool and the donation form each had their own third and
 * fourth variant. No focus ring here — `globals.css` owns focus.
 */
const CONTROL =
  "mt-2 w-full rounded-card border-2 border-edge bg-paper px-4 py-3 text-ink " +
  "transition-colors placeholder:text-ink-soft/70 " +
  "disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-70";

const CONTROL_INVALID = "border-danger";

interface ShellProps {
  id: string;
  label: string;
  help?: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
}

function FieldShell({ id, label, help, error, className, children }: ShellProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-bold text-ink">
        {label}
      </label>
      {children}
      {help && (
        <p id={`${id}-help`} className="mt-2 text-sm text-ink-soft">
          {help}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 rounded-card bg-danger-soft px-3 py-2 text-sm font-bold text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/** `aria-describedby` has to name every hint that exists, and nothing that doesn't. */
function describedBy(id: string, help?: string, error?: string | null): string | undefined {
  const ids = [help && `${id}-help`, error && `${id}-error`].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

interface Common {
  id: string;
  label: string;
  help?: string;
  error?: string | null;
  /** Classes for the wrapper, not the control — use it for grid spans. */
  fieldClassName?: string;
}

type TextFieldProps = Common &
  Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & { ref?: Ref<HTMLInputElement> };

export function TextField({
  id,
  label,
  help,
  error,
  fieldClassName,
  className,
  ...rest
}: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} help={help} error={error} className={fieldClassName}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error)}
        className={cn(CONTROL, error && CONTROL_INVALID, className)}
        {...rest}
      />
    </FieldShell>
  );
}

type TextareaFieldProps = Common & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">;

export function TextareaField({
  id,
  label,
  help,
  error,
  fieldClassName,
  className,
  rows = 4,
  ...rest
}: TextareaFieldProps) {
  return (
    <FieldShell id={id} label={label} help={help} error={error} className={fieldClassName}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error)}
        className={cn(CONTROL, error && CONTROL_INVALID, className)}
        {...rest}
      />
    </FieldShell>
  );
}

type SelectFieldProps = Common & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id">;

export function SelectField({
  id,
  label,
  help,
  error,
  fieldClassName,
  className,
  children,
  ...rest
}: SelectFieldProps) {
  return (
    <FieldShell id={id} label={label} help={help} error={error} className={fieldClassName}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error)}
        className={cn(CONTROL, error && CONTROL_INVALID, className)}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}
