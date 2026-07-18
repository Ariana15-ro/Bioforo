import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * Labeled text input with inline error messaging and basic a11y
 * (associates label/htmlFor, exposes aria-invalid).
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, name, className, ...props }, ref) => {
    const inputId = id ?? name;
    return (
      <label className="block text-sm text-slate-200" htmlFor={inputId}>
        <span className="mb-1 block font-medium">{label}</span>
        <input
          id={inputId}
          name={name}
          ref={ref}
          aria-invalid={Boolean(error)}
          className={cn(
            "w-full rounded-xl border bg-forest-950/60 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500",
            error
              ? "border-red-400 focus:border-red-400"
              : "border-white/15 focus:border-bio-500",
            className,
          )}
          {...props}
        />
        {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
      </label>
    );
  },
);

TextField.displayName = "TextField";
