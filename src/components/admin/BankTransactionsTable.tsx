"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  assignBankTransaction,
  setBankTransactionStatus,
  unassignBankTransaction,
  updateBankTransactionNotes,
} from "@/lib/actions/admin-payments";
import {
  BANK_TRANSACTION_STATUSES,
  bankTransactionStatusBadgeClasses,
  bankTransactionStatusLabels,
  type BankTransactionStatus,
} from "@/lib/constants/bank-transactions";
import { formatTrainingGroupDisplay } from "@/lib/constants/training-groups";
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

function registrationLabel(registration: {
  child_name: string;
  parent_name: string;
  training_group?: string | null;
}): string {
  const group = registration.training_group
    ? ` · ${formatTrainingGroupDisplay(registration.training_group)}`
    : "";
  return `${registration.child_name} (${registration.parent_name}${group})`;
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

function RegistrationSelect({
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
  const [value, setValue] = useState(transaction.registration_id ?? "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(transaction.registration_id ?? "");
  }, [transaction.registration_id]);

  async function handleChange(registrationId: string) {
    if (isUpdating) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      if (!registrationId) {
        const result = await unassignBankTransaction(transaction.id);
        if (result.success) {
          setValue("");
          onUpdated({
            registrationId: null,
            status: result.status ?? "unassigned",
            registration: null,
          });
          router.refresh();
        } else {
          setError(result.message);
        }
        return;
      }

      const result = await assignBankTransaction(transaction.id, registrationId);
      if (result.success) {
        const selected = registrations.find((row) => row.id === registrationId);
        setValue(registrationId);
        onUpdated({
          registrationId,
          status: result.status ?? "assigned",
          registration: selected
            ? {
                id: selected.id,
                child_name: selected.child_name,
                parent_name: selected.parent_name,
                training_group: selected.training_group,
              }
            : transaction.registration,
        });
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Nepavyko priskirti registracijos.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="space-y-1">
      <select
        value={value}
        disabled={isUpdating}
        onChange={(event) => handleChange(event.target.value)}
        aria-label="Priskirti registraciją"
        className="w-full min-w-[190px] rounded-lg border border-vtc-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-vtc-navy focus:ring-2 focus:ring-vtc-navy/10 disabled:opacity-60"
      >
        <option value="">Nepriskirtas</option>
        {registrations.map((registration) => (
          <option key={registration.id} value={registration.id}>
            {registrationLabel(registration)}
          </option>
        ))}
      </select>
      {isUpdating ? <span className="text-xs text-gray-400">Saugoma...</span> : null}
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
              <th className="px-4 py-3 font-semibold text-gray-700">Mokėtojas</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Paskirtis</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Suma</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Vaikas / registracija</th>
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
                <td className="px-4 py-3 text-gray-700">{row.payer_name ?? "—"}</td>
                <td className="max-w-[220px] px-4 py-3 text-gray-700">
                  {row.description ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                  {formatAmount(row.amount_cents, row.currency)}
                </td>
                <td className="px-4 py-3">
                  <RegistrationSelect
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
                <h3 className="font-semibold text-gray-900">
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
              <div>
                <dt className="text-gray-400">Paskirtis</dt>
                <dd className="text-gray-700">{row.description ?? "—"}</dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-vtc-gray-100 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Vaikas / registracija
              </p>
              <RegistrationSelect
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
