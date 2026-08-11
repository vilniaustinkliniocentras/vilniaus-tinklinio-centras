import type { InputHTMLAttributes, ReactNode } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  error?: string;
  id: string;
}

export function Checkbox({ label, error, id, className = "", ...props }: CheckboxProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id={id}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-vtc-blue-700 focus:ring-vtc-blue-600 ${className}`}
          {...props}
        />
        <label htmlFor={id} className="min-w-0 text-sm leading-relaxed text-gray-700">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
