"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deletePaymentAllocationAction,
  updatePaymentAllocationAction,
} from "@/lib/actions/admin-billing";
import type { BillingAthleteOption, PaymentAllocationView } from "@/lib/admin/billing-types";
import { EARLIEST_BILLING_MONTH, formatBillingMonthLt } from "@/lib/admin/billing-month";
import { centsToEuroInput, formatEurFromCents } from "@/lib/admin/money";
import { AthletePicker } from "@/components/admin/AthletePicker";
import {
  billingDangerLinkClass,
  billingInputClass,
  billingLinkButtonClass,
} from "@/components/admin/billing-styles";

export function PaymentAllocationEditor({
  allocation,
  athletes,
  defaultMonth,
}: {
  allocation: PaymentAllocationView;
  athletes: BillingAthleteOption[];
  defaultMonth: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [athleteId, setAthleteId] = useState(allocation.athleteId);
  const [month, setMonth] = useState(allocation.billingMonth || defaultMonth);
  const [amount, setAmount] = useState(centsToEuroInput(allocation.amountCents));
  const [note, setNote] = useState(allocation.note ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceLabel = allocation.source === "bank" ? "Bankas" : "Grynieji";

  async function handleSave() {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const result = await updatePaymentAllocationAction({
        allocationId: allocation.id,
        athleteId,
        month,
        amountEuros: amount,
        note,
      });
      if (result.success) {
        setEditing(false);
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Nepavyko pataisyti priskyrimo.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const result = await deletePaymentAllocationAction(allocation.id);
      if (result.success) {
        setConfirmDelete(false);
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Nepavyko ištrinti priskyrimo.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="rounded-lg border border-vtc-gray-100 bg-vtc-gray-50 px-3 py-2 text-xs text-gray-700">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium text-gray-900">
              {allocation.athleteName} · {formatBillingMonthLt(allocation.billingMonth)}
            </p>
            <p>
              {formatEurFromCents(allocation.amountCents)} · {sourceLabel}
              {allocation.note ? ` · ${allocation.note}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              className={billingLinkButtonClass}
              disabled={isSaving}
              onClick={() => {
                setEditing(true);
                setConfirmDelete(false);
                setError(null);
              }}
            >
              Taisyti
            </button>
            {confirmDelete ? (
              <div className="flex flex-col items-end gap-1">
                <p className="text-red-800">Ištrinti priskyrimą? Originali įplauka liks.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={billingDangerLinkClass}
                    disabled={isSaving}
                    onClick={() => void handleDelete()}
                  >
                    {isSaving ? "Trinama..." : "Patvirtinti ištrynimą"}
                  </button>
                  <button
                    type="button"
                    className={billingLinkButtonClass}
                    disabled={isSaving}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Atšaukti
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={billingDangerLinkClass}
                disabled={isSaving}
                onClick={() => setConfirmDelete(true)}
              >
                Ištrinti
              </button>
            )}
          </div>
        </div>
        {error ? (
          <p className="mt-1 text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-vtc-gray-200 bg-white p-3">
      <AthletePicker
        id={`alloc-athlete-${allocation.id}`}
        label="Sportininkas"
        value={athleteId}
        athletes={athletes}
        onChange={setAthleteId}
        disabled={isSaving}
      />
      <div>
        <label
          htmlFor={`alloc-month-${allocation.id}`}
          className="mb-1 block text-xs font-medium text-gray-600"
        >
          Mokesčių mėnuo
        </label>
        <input
          id={`alloc-month-${allocation.id}`}
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
          htmlFor={`alloc-amount-${allocation.id}`}
          className="mb-1 block text-xs font-medium text-gray-600"
        >
          Suma, EUR
        </label>
        <input
          id={`alloc-amount-${allocation.id}`}
          value={amount}
          inputMode="decimal"
          disabled={isSaving}
          onChange={(event) => setAmount(event.target.value)}
          className={billingInputClass}
        />
      </div>
      <div>
        <label
          htmlFor={`alloc-note-${allocation.id}`}
          className="mb-1 block text-xs font-medium text-gray-600"
        >
          Pastaba
        </label>
        <input
          id={`alloc-note-${allocation.id}`}
          value={note}
          disabled={isSaving}
          onChange={(event) => setNote(event.target.value)}
          className={billingInputClass}
        />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          className={billingLinkButtonClass}
          disabled={isSaving}
          onClick={() => void handleSave()}
        >
          {isSaving ? "Saugoma..." : "Išsaugoti"}
        </button>
        <button
          type="button"
          className="text-xs font-semibold text-gray-600 hover:underline"
          disabled={isSaving}
          onClick={() => {
            setEditing(false);
            setAthleteId(allocation.athleteId);
            setMonth(allocation.billingMonth);
            setAmount(centsToEuroInput(allocation.amountCents));
            setNote(allocation.note ?? "");
            setError(null);
          }}
        >
          Atšaukti
        </button>
      </div>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
