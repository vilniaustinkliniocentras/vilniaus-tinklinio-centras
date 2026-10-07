"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  assignBankTransaction,
  unassignBankTransaction,
} from "@/lib/actions/admin-payments";
import { suggestRegistrationsForTransaction } from "@/lib/admin/payment-suggestions";
import { formatTrainingGroupDisplay } from "@/lib/constants/training-groups";
import type { BankTransaction, Registration } from "@/types/database";
import type { BankTransactionStatus } from "@/lib/constants/bank-transactions";

function childLabel(registration: {
  child_name: string;
  parent_name: string;
  training_group?: string | null;
}): string {
  const group = registration.training_group
    ? ` · ${formatTrainingGroupDisplay(registration.training_group)}`
    : "";
  return `${registration.child_name} (${registration.parent_name}${group})`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatAmount(amountCents: number, currency: string): string {
  return (amountCents / 100).toLocaleString("lt-LT", {
    style: "currency",
    currency: currency || "EUR",
  });
}

export function BankTransactionMatch({
  transaction,
  registrations,
  onUpdated,
}: {
  transaction: BankTransaction;
  registrations: Registration[];
  onUpdated: (next: {
    registrationId: string | null;
    status: BankTransactionStatus;
    registration: BankTransaction["registration"];
  }) => void;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(!transaction.registration_id);

  useEffect(() => {
    setIsChanging(!transaction.registration_id);
    setPendingId("");
    setError(null);
  }, [transaction.registration_id]);

  const suggestions = suggestRegistrationsForTransaction(transaction, registrations);
  const pendingRegistration = registrations.find((row) => row.id === pendingId) ?? null;

  async function handleUnassign() {
    if (isUpdating) {
      return;
    }
    setIsUpdating(true);
    setError(null);
    try {
      const result = await unassignBankTransaction(transaction.id);
      if (result.success) {
        onUpdated({
          registrationId: null,
          status: result.status ?? "unassigned",
          registration: null,
        });
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Nepavyko pašalinti priskyrimo.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleAssign() {
    if (!pendingRegistration || isUpdating) {
      return;
    }
    setIsUpdating(true);
    setError(null);
    try {
      const result = await assignBankTransaction(transaction.id, pendingRegistration.id);
      if (result.success) {
        onUpdated({
          registrationId: pendingRegistration.id,
          status: result.status ?? "assigned",
          registration: {
            id: pendingRegistration.id,
            child_name: pendingRegistration.child_name,
            parent_name: pendingRegistration.parent_name,
            training_group: pendingRegistration.training_group,
          },
        });
        setPendingId("");
        setIsChanging(false);
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Nepavyko priskirti vaikui.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="space-y-2">
      {transaction.registration ? (
        <p className="text-sm text-gray-800">
          {childLabel(transaction.registration)}
        </p>
      ) : (
        <p className="text-sm text-gray-500">Nepriskirta</p>
      )}

      {suggestions.length > 0 && isChanging ? (
        <div className="rounded-lg bg-vtc-gray-50 px-3 py-2 text-xs text-gray-700">
          <p className="font-medium text-gray-900">Galimas vaikas</p>
          <ul className="mt-1 space-y-1">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => setPendingId(suggestion.id)}
                  className="text-left font-semibold text-vtc-navy hover:underline disabled:opacity-60"
                >
                  {childLabel(suggestion)}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-gray-500">Tik pasiūlymas – priskyrimas neįvyksta automatiškai.</p>
        </div>
      ) : null}

      {transaction.registration && !isChanging ? (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => setIsChanging(true)}
            className="text-left text-xs font-semibold text-vtc-navy hover:underline disabled:opacity-60"
          >
            Pakeisti priskyrimą
          </button>
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => void handleUnassign()}
            className="text-left text-xs font-semibold text-gray-600 hover:underline disabled:opacity-60"
          >
            Pašalinti priskyrimą
          </button>
        </div>
      ) : (
        <>
          <select
            value={pendingId}
            disabled={isUpdating}
            onChange={(event) => setPendingId(event.target.value)}
            aria-label="Pasirinkti vaiką"
            className="w-full min-w-[190px] rounded-lg border border-vtc-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-vtc-navy focus:ring-2 focus:ring-vtc-navy/10 disabled:opacity-60"
          >
            <option value="">Pasirinkite vaiką</option>
            {registrations.map((registration) => (
              <option key={registration.id} value={registration.id}>
                {childLabel(registration)}
              </option>
            ))}
          </select>

          {pendingRegistration ? (
            <div className="rounded-lg border border-vtc-gray-200 bg-vtc-gray-50 p-3 text-xs text-gray-700">
              <p className="font-medium text-gray-900">Patvirtinkite priskyrimą</p>
              <dl className="mt-2 space-y-1">
                <div>
                  <dt className="text-gray-500">Mokėtojas</dt>
                  <dd>{transaction.payer_name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">IBAN</dt>
                  <dd className="break-all">{transaction.payer_account ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Suma</dt>
                  <dd>{formatAmount(transaction.amount_cents, transaction.currency)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Mokėjimo paskirtis</dt>
                  <dd>{transaction.description ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Data</dt>
                  <dd>{formatDate(transaction.transaction_date)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Vaikas</dt>
                  <dd>{childLabel(pendingRegistration)}</dd>
                </div>
              </dl>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => void handleAssign()}
                className="mt-3 text-xs font-semibold text-vtc-navy hover:underline disabled:opacity-60"
              >
                {isUpdating ? "Saugoma..." : "Priskirti vaikui"}
              </button>
            </div>
          ) : null}

          {transaction.registration ? (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => {
                setIsChanging(false);
                setPendingId("");
              }}
              className="text-left text-xs font-semibold text-gray-600 hover:underline disabled:opacity-60"
            >
              Atšaukti
            </button>
          ) : null}
        </>
      )}

      {error ? (
        <span className="block text-xs text-red-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
