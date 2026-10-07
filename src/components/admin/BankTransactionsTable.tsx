"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  setBankTransactionStatus,
  updateBankTransactionNotes,
} from "@/lib/actions/admin-payments";
import { BankTransactionMatch } from "@/components/admin/BankTransactionMatch";
import {
  BANK_TRANSACTION_STATUSES,
  bankTransactionStatusBadgeClasses,
  bankTransactionStatusLabels,
  type BankTransactionStatus,
} from "@/lib/constants/bank-transactions";
import type { BankTransaction, Registration } from "@/types/database";

interface BankTransactionsTableProps {
  transactions: BankTransaction[];
  registrations: Registration[];
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

function TransactionStatusSelect({
  transactionId,
  currentStatus,
  hasRegistration,
  onUpdated,
}: {
  transactionId: string;
  currentStatus: string;
  hasRegistration: boolean;
  onUpdated: (status: BankTransactionStatus) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  async function handleChange(newStatus: string) {
    if (newStatus === status || isUpdating) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const result = await setBankTransactionStatus(
        transactionId,
        newStatus as BankTransactionStatus
      );

      if (result.success && result.status) {
        setStatus(result.status);
        onUpdated(result.status);
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Nepavyko atnaujinti būsenos.");
    } finally {
      setIsUpdating(false);
    }
  }

  const badgeStatus =
    (status as BankTransactionStatus) in bankTransactionStatusBadgeClasses
      ? (status as BankTransactionStatus)
      : "unassigned";

  return (
    <div className="space-y-1">
      <select
        value={status}
        disabled={isUpdating}
        onChange={(event) => handleChange(event.target.value)}
        aria-label="Keisti mokėjimo būseną"
        className={`w-full min-w-[140px] rounded-lg border-0 py-1.5 pl-2.5 pr-8 text-xs font-medium ring-1 ring-inset focus:ring-2 focus:ring-vtc-navy disabled:opacity-60 ${bankTransactionStatusBadgeClasses[badgeStatus]}`}
      >
        {BANK_TRANSACTION_STATUSES.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={
              (option.value === "assigned" || option.value === "confirmed") &&
              !hasRegistration
            }
          >
            {option.label}
          </option>
        ))}
      </select>
      {isUpdating ? <span className="text-xs text-gray-400">Atnaujinama...</span> : null}
      {error ? (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function NotesEditor({
  transactionId,
  currentNotes,
  onUpdated,
}: {
  transactionId: string;
  currentNotes: string | null;
  onUpdated: (notes: string | null) => void;
}) {
  const router = useRouter();
  const isSavingRef = useRef(false);
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNotes(currentNotes ?? "");
  }, [currentNotes]);

  async function handleSave() {
    if (isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setError(null);

    try {
      const result = await updateBankTransactionNotes(transactionId, notes);
      if (result.success) {
        onUpdated(result.notes ?? null);
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Nepavyko išsaugoti pastabos.");
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-1">
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={2}
        aria-label="Mokėjimo pastaba"
        className="w-full min-w-[160px] rounded-lg border border-vtc-gray-200 px-2.5 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-vtc-navy focus:ring-2 focus:ring-vtc-navy/10"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="text-xs font-semibold text-vtc-navy hover:underline disabled:opacity-60"
      >
        {isSaving ? "Saugoma..." : "Išsaugoti"}
      </button>
      {error ? (
        <span className="block text-xs text-red-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function TransactionActions({
  transaction,
  onStatusUpdated,
}: {
  transaction: BankTransaction;
  onStatusUpdated: (status: BankTransactionStatus) => void;
}) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStatus(status: BankTransactionStatus) {
    if (isUpdating) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const result = await setBankTransactionStatus(transaction.id, status);
      if (result.success && result.status) {
        onStatusUpdated(result.status);
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Nepavyko atnaujinti būsenos.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-col gap-1">
        {transaction.status !== "confirmed" ? (
          <button
            type="button"
            disabled={isUpdating || !transaction.registration_id}
            onClick={() => handleStatus("confirmed")}
            className="text-left text-xs font-semibold text-green-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Patvirtinti
          </button>
        ) : null}
        {transaction.status !== "ignored" ? (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => handleStatus("ignored")}
            className="text-left text-xs font-semibold text-gray-600 hover:underline disabled:opacity-60"
          >
            Ignoruoti
          </button>
        ) : (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => handleStatus("unassigned")}
            className="text-left text-xs font-semibold text-vtc-navy hover:underline disabled:opacity-60"
          >
            Grąžinti
          </button>
        )}
      </div>
      {isUpdating ? <span className="text-xs text-gray-400">Atnaujinama...</span> : null}
      {error ? (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function BankTransactionsTable({
  transactions,
  registrations,
}: BankTransactionsTableProps) {
  const [rows, setRows] = useState(transactions);

  useEffect(() => {
    setRows(transactions);
  }, [transactions]);

  function patchRow(id: string, patch: Partial<BankTransaction>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-vtc-gray-200 bg-white lg:block">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-vtc-gray-200 bg-vtc-gray-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700">Data</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Mokėtojas / gavėjas</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Suma</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Paskirtis</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Tipas</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Susiejimas</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Būsena</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Pastabos</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Veiksmai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vtc-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-vtc-gray-50/50">
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                  {formatDate(row.transaction_date)}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  <p>{row.payer_name ?? "—"}</p>
                  {row.payer_account ? (
                    <p className="mt-0.5 break-all text-xs text-gray-500">{row.payer_account}</p>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-green-800">
                  {formatAmount(row.amount_cents, row.currency)}
                </td>
                <td className="max-w-[220px] px-4 py-3 text-gray-700">
                  {row.description ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-800 ring-1 ring-inset ring-green-600/20">
                    Įplauka
                  </span>
                </td>
                <td className="px-4 py-3">
                  <BankTransactionMatch
                    transaction={row}
                    registrations={registrations}
                    onUpdated={({ registrationId, status, registration }) =>
                      patchRow(row.id, {
                        registration_id: registrationId,
                        status,
                        registration,
                      })
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <TransactionStatusSelect
                    transactionId={row.id}
                    currentStatus={row.status}
                    hasRegistration={Boolean(row.registration_id)}
                    onUpdated={(status) =>
                      patchRow(row.id, {
                        status,
                        ...(status === "unassigned"
                          ? { registration_id: null, registration: null }
                          : {}),
                      })
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <NotesEditor
                    transactionId={row.id}
                    currentNotes={row.notes}
                    onUpdated={(notes) => patchRow(row.id, { notes })}
                  />
                </td>
                <td className="px-4 py-3">
                  <TransactionActions
                    transaction={row}
                    onStatusUpdated={(status) =>
                      patchRow(row.id, {
                        status,
                        ...(status === "unassigned"
                          ? { registration_id: null, registration: null }
                          : {}),
                      })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 lg:hidden">
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-xl border border-vtc-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-green-800">
                  {formatAmount(row.amount_cents, row.currency)}
                </h3>
                <p className="text-sm text-gray-500">{formatDate(row.transaction_date)}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                  bankTransactionStatusBadgeClasses[row.status] ??
                  bankTransactionStatusBadgeClasses.unassigned
                }`}
              >
                {bankTransactionStatusLabels[row.status] ?? row.status}
              </span>
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-gray-400">Mokėtojas</dt>
                <dd className="text-gray-700">{row.payer_name ?? "—"}</dd>
              </div>
              {row.payer_account ? (
                <div>
                  <dt className="text-gray-400">IBAN</dt>
                  <dd className="break-all text-gray-700">{row.payer_account}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-gray-400">Mokėjimo paskirtis</dt>
                <dd className="text-gray-700">{row.description ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Tipas</dt>
                <dd>
                  <span className="inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-800 ring-1 ring-inset ring-green-600/20">
                    Įplauka
                  </span>
                </dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-vtc-gray-100 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Susiejimas
              </p>
              <BankTransactionMatch
                transaction={row}
                registrations={registrations}
                onUpdated={({ registrationId, status, registration }) =>
                  patchRow(row.id, {
                    registration_id: registrationId,
                    status,
                    registration,
                  })
                }
              />
            </div>

            <div className="mt-4 border-t border-vtc-gray-100 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Būsena
              </p>
              <TransactionStatusSelect
                transactionId={row.id}
                currentStatus={row.status}
                hasRegistration={Boolean(row.registration_id)}
                onUpdated={(status) =>
                  patchRow(row.id, {
                    status,
                    ...(status === "unassigned"
                      ? { registration_id: null, registration: null }
                      : {}),
                  })
                }
              />
            </div>

            <div className="mt-4 border-t border-vtc-gray-100 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Pastabos
              </p>
              <NotesEditor
                transactionId={row.id}
                currentNotes={row.notes}
                onUpdated={(notes) => patchRow(row.id, { notes })}
              />
            </div>

            <div className="mt-4 border-t border-vtc-gray-100 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Veiksmai
              </p>
              <TransactionActions
                transaction={row}
                onStatusUpdated={(status) =>
                  patchRow(row.id, {
                    status,
                    ...(status === "unassigned"
                      ? { registration_id: null, registration: null }
                      : {}),
                  })
                }
              />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
