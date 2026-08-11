import type { SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  id: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  id,
  options,
  placeholder = "Pasirinkite...",
  className = "",
  ...props
}: SelectProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
        {props.required && (
          <span className="ml-0.5 text-vtc-blue-700" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <select
        id={id}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full min-w-0 max-w-full rounded-lg border bg-white px-4 py-3.5 text-base text-gray-900 transition-colors focus:border-vtc-blue-600 focus:ring-2 focus:ring-vtc-blue-100 ${
          error ? "border-red-500" : "border-gray-300"
        } ${className}`}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
