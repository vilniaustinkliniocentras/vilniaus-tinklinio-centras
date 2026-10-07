"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  setBankTransactionStatus,
  updateBankTransactionNotes,
} from "@/lib/actions/admin-payments";
import type { BankBillingRow, BillingAthleteOption } from "@/lib/admin/billing-types";
import { formatEurFromCents } from "@/lib/admin/money";
import { suggestAthletesForTransaction } from "@/lib/admin/payment-suggestions";
import { NewAllocationForm } from "@/components/admin/NewAllocationForm";
import { PaymentAllocationEditor } from "@/components/admin/PaymentAllocationEditor";
import { billingInputClass, billingLinkButtonClass } from "@/components/admin/billing-styles";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function NotesEditor({
  transactionId,
  currentNotes,
}: {
  transactionId: string;
  currentNotes: string | null;
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
        className={billingInputClass}
      />
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={isSaving}
        className={billingLinkButtonClass}
      >
        {isSaving ? "Saugoma..." : "Išsaugoti pastabą"}
      </button>
      {error ? (
        <span className="block text-xs text-red-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function IgnoreControls({ row }: { row: BankBillingRow }) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAllocations = row.allocations.length > 0;

  async function handleStatus(status: "ignored" | "unassigned") {
    if (isUpdating) {
      return;
    }
    if (status === "ignored" && hasAllocations) {
      setError("Negalima ignoruoti, kol yra priskyrimų. Pirmiausia juos pašalinkite.");
      return;
    }
    setIsUpdating(true);
    setError(null);
    try {
      const result = await setBankTransactionStatus(row.id, status);
      if (result.success) {
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
      {row.status === "ignored" ? (
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => void handleStatus("unassigned")}
          className={billingLinkButtonClass}
        >
          Grąžinti iš ignoruojamų
        </button>
      ) : (
        <button
          type="button"
          disabled={isUpdating || hasAllocations}
          onClick={() => void handleStatus("ignored")}
          className="text-left text-xs font-semibold text-gray-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Ignoruoti
        </button>
      )}
      {isUpdating ? <span className="text-xs text-gray-400">Atnaujinama...</span> : null}
      {error ? (
        <span className="block text-xs text-red-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function TransactionAllocations({
  row,
  athletes,
  month,
}: {
  row: BankBillingRow;
  athletes: BillingAthleteOption[];
  month: string;
}) {
  const ignored = row.status === "ignored";
  const suggestions = ignored
    ? []
    : suggestAthletesForTransaction(
        { description: row.description, payerName: row.payerName },
        athletes
      );

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600">
        Originali {formatEurFromCents(row.amountCents)} · priskirta{" "}
        {formatEurFromCents(row.allocatedCents)} · nepriskirta{" "}
        {formatEurFromCents(row.unallocatedCents)}
      </p>
      {row.allocations.map((allocation) => (
        <PaymentAllocationEditor
          key={allocation.id}
          allocation={allocation}
          athletes={athletes}
          defaultMonth={month}
        />
      ))}
      <NewAllocationForm
        source="bank"
        sourceId={row.id}
        athletes={athletes}
        defaultMonth={month}
        defaultAmountCents={row.unallocatedCents}
        suggestions={suggestions}
        disabled={ignored || row.unallocatedCents <= 0}
        disabledReason={
          ignored
            ? "Ignoruojamos operacijos priskirti negalima."
            : "Visa suma jau priskirta."
        }
      />
    </div>
  );
}

export function BankTransactionsTable({
  transactions,
  athletes,
  month,
}: {
  transactions: BankBillingRow[];
  athletes: BillingAthleteOption[];
  month: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (transactions.length === 0) {
    return (
      <p className="rounded-xl border border-vtc-gray-200 bg-white p-8 text-center text-gray-500">
        Banko mokėjimų dar nėra. Jie atsiras importavus SEB išrašą.
      </p>
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
              <th className="px-4 py-3 font-semibold text-gray-700">Suma</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Paskirtis</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Priskyrimai</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Pastabos</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Veiksmai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vtc-gray-100">
            {transactions.map((row) => (
              <tr key={row.id} className="align-top hover:bg-vtc-gray-50/50">
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                  {formatDate(row.transactionDate)}
                  {row.status === "ignored" ? (
                    <p className="mt-1 text-xs font-medium text-gray-500">Ignoruota</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  <p>{row.payerName ?? "—"}</p>
                  {row.payerAccount ? (
                    <p className="mt-0.5 break-all text-xs text-gray-500">{row.payerAccount}</p>
                  ) : null}
                  {row.legacyRegistrationHint ? (
                    <p className="mt-1 text-xs text-gray-400">
                      Senas hintas: {row.legacyRegistrationHint}
                    </p>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-800">
                  <p className="font-medium text-green-800">
                    {formatEurFromCents(row.amountCents)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Priskirta {formatEurFromCents(row.allocatedCents)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Liko {formatEurFromCents(row.unallocatedCents)}
                  </p>
                </td>
                <td className="max-w-[220px] px-4 py-3 text-gray-700">
                  {row.description ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <TransactionAllocations row={row} athletes={athletes} month={month} />
                </td>
                <td className="px-4 py-3">
                  <NotesEditor transactionId={row.id} currentNotes={row.notes} />
                </td>
                <td className="px-4 py-3">
                  <IgnoreControls row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 lg:hidden">
        {transactions.map((row) => (
          <article
            key={row.id}
            className="rounded-xl border border-vtc-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-green-800">
                  {formatEurFromCents(row.amountCents)}
                </h3>
                <p className="text-sm text-gray-500">{formatDate(row.transactionDate)}</p>
              </div>
              {row.status === "ignored" ? (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20">
                  Ignoruota
                </span>
              ) : null}
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-gray-400">Mokėtojas</dt>
                <dd className="text-gray-700">{row.payerName ?? "—"}</dd>
              </div>
              {row.payerAccount ? (
                <div>
                  <dt className="text-gray-400">IBAN</dt>
                  <dd className="break-all text-gray-700">{row.payerAccount}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-gray-400">Paskirtis</dt>
                <dd className="text-gray-700">{row.description ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Priskirta / liko</dt>
                <dd className="text-gray-700">
                  {formatEurFromCents(row.allocatedCents)} / {formatEurFromCents(row.unallocatedCents)}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              className={`${billingLinkButtonClass} mt-3`}
              onClick={() => setOpenId(openId === row.id ? null : row.id)}
            >
              {openId === row.id ? "Uždaryti priskyrimus" : "Priskyrimai"}
            </button>
            {openId === row.id ? (
              <div className="mt-3 space-y-4">
                <TransactionAllocations row={row} athletes={athletes} month={month} />
                <NotesEditor transactionId={row.id} currentNotes={row.notes} />
                <IgnoreControls row={row} />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </>
  );
}
