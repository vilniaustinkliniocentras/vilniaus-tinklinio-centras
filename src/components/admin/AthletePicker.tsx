"use client";

import type { BillingAthleteOption } from "@/lib/admin/billing-types";
import { billingSelectClass } from "@/components/admin/billing-styles";

export function athleteOptionLabel(athlete: BillingAthleteOption): string {
  const group = athlete.groupName ? ` · ${athlete.groupName}` : "";
  const parent = athlete.parentName ? ` (${athlete.parentName})` : "";
  return `${athlete.childName}${parent}${group}`;
}

export function AthletePicker({
  id,
  label,
  value,
  athletes,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  athletes: BillingAthleteOption[];
  onChange: (athleteId: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={billingSelectClass}
      >
        <option value="">Pasirinkite sportininką</option>
        {athletes.map((athlete) => (
          <option key={athlete.id} value={athlete.id}>
            {athleteOptionLabel(athlete)}
          </option>
        ))}
      </select>
    </div>
  );
}
