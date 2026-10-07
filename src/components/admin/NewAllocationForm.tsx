"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  allocateBankPaymentAction,
  allocateCashPaymentAction,
} from "@/lib/actions/admin-billing";
import type { BillingAthleteOption } from "@/lib/admin/billing-types";
import { EARLIEST_BILLING_MONTH } from "@/lib/admin/billing-month";
import { centsToEuroInput } from "@/lib/admin/money";
import { AthletePicker, athleteOptionLabel } from "@/components/admin/AthletePicker";
import { billingInputClass, billingLinkButtonClass } from "@/components/admin/billing-styles";

export function NewAllocationForm({
  source,
  sourceId,
  athletes,
  defaultMonth,
  defaultAmountCents,
  suggestions = [],
  disabled,
  disabledReason,
}: {
  source: "bank" | "cash";
  sourceId: string;
  athletes: BillingAthleteOption[];
  defaultMonth: string;
  defaultAmountCents: number;
  suggestions?: BillingAthleteOption[];
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [athleteId, setAthleteId] = useState("");
  const [month, setMonth] = useState(defaultMonth);
  const [amount, setAmount] = useState(
    defaultAmountCents > 0 ? centsToEuroInput(defaultAmountCents) : ""
  );
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (disabled || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result =
        source === "bank"
          ? await allocateBankPaymentAction({
              bankTransactionId: sourceId,
              athleteId,
              month,
              amountEuros: amount,
              note,
            })
          : await allocateCashPaymentAction({
              cashPaymentId: sourceId,
              athleteId,
              month,
              amountEuros: amount,
              note,
            });

      if (result.success) {
        setMessage(result.message);
        setAthleteId("");
        setNote("");
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Nepavyko išsaugoti priskyrimo.");
    } finally {
      setIsSaving(false);
    }
  }

  if (disabled) {
    return (
      <p className="text-xs text-gray-500">
        {disabledReason ?? "Priskyrimas negalimas."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {suggestions.length > 0 ? (
        <div className="rounded-lg bg-vtc-gray-50 px-3 py-2 text-xs text-gray-700">
          <p className="font-medium text-gray-900">Galimas sportininkas</p>
          <ul className="mt-1 space-y-1">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setAthleteId(suggestion.id)}
                  className={billingLinkButtonClass}
                >
                  {athleteOptionLabel(suggestion)}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-gray-500">
            Tik pasiūlymas – priskyrimas neįvyksta automatiškai.
          </p>
        </div>
      ) : null}

      <AthletePicker
        id={`${source}-athlete-${sourceId}`}
        label="Sportininkas"
        value={athleteId}
        athletes={athletes}
        onChange={setAthleteId}
        disabled={isSaving}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${source}-month-${sourceId}`}
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Mokesčių mėnuo
          </label>
          <input
            id={`${source}-month-${sourceId}`}
            type="month"
            min={EARLIEST_BILLING_MONTH}
            value={month}
            disabled={isSaving}
            onChange={(event) => setMonth(event.target.value)}
            className={billingInputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${source}-amount-${sourceId}`}
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Priskirti, EUR
          </label>
          <input
            id={`${source}-amount-${sourceId}`}
            value={amount}
            inputMode="decimal"
            disabled={isSaving}
            onChange={(event) => setAmount(event.target.value)}
            className={billingInputClass}
          />
        </div>
      </div>
      <div>
        <label
          htmlFor={`${source}-note-${sourceId}`}
          className="mb-1 block text-xs font-medium text-gray-600"
        >
          Pastaba
        </label>
        <input
          id={`${source}-note-${sourceId}`}
          value={note}
          disabled={isSaving}
          onChange={(event) => setNote(event.target.value)}
          className={billingInputClass}
        />
      </div>
      <button
        type="button"
        className={billingLinkButtonClass}
        disabled={isSaving}
        onClick={() => void handleSubmit()}
      >
        {isSaving ? "Saugoma..." : "Priskirti sportininkui / mėnesiui"}
      </button>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-xs text-green-800" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
