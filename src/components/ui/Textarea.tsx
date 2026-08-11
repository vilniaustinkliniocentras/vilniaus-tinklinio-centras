import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  id: string;
}

export function Textarea({
  label,
  error,
  id,
  className = "",
  ...props
}: TextareaProps) {
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
      <textarea
        id={id}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`min-h-[120px] w-full min-w-0 max-w-full resize-y rounded-lg border px-4 py-3.5 text-base text-gray-900 transition-colors placeholder:text-gray-400 focus:border-vtc-blue-600 focus:ring-2 focus:ring-vtc-blue-100 ${
          error ? "border-red-500" : "border-gray-300"
        } ${className}`}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
