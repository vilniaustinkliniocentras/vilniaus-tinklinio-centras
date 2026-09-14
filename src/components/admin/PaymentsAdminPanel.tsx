"use client";

import { BankTransactionsTable } from "@/components/admin/BankTransactionsTable";
import type { BankImport, BankTransaction, Registration } from "@/types/database";

interface PaymentsAdminPanelProps {
  transactions: BankTransaction[];
  imports: BankImport[];
  registrations: Registration[];
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PaymentsAdminPanel({
  transactions,
  imports,
  registrations,
}: PaymentsAdminPanelProps) {
  return (
    <div className="space-y-6">
      <section
        className="rounded-xl border border-vtc-gray-200 bg-white p-4 shadow-sm sm:p-5"
        aria-labelledby="seb-import-heading"
      >
        <h2 id="seb-import-heading" className="text-base font-semibold text-gray-900">
          SEB išrašo importas
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Importas bus aktyvuotas gavus realų SEB CSV išrašo pavyzdį.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-vtc-gray-100 px-4 py-2 text-sm font-semibold text-gray-400"
        >
          Įkelti CSV
        </button>
      </section>

      {imports.length > 0 ? (
        <section
          className="rounded-xl border border-vtc-gray-200 bg-white p-4 shadow-sm sm:p-5"
          aria-labelledby="bank-import-history-heading"
        >
          <h2
            id="bank-import-history-heading"
            className="text-base font-semibold text-gray-900"
          >
            Importuoti išrašai
          </h2>
          <ul className="mt-4 divide-y divide-vtc-gray-100">
            {imports.map((item) => (
              <li key={item.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{item.filename}</p>
                  <p className="text-gray-500">{formatDateTime(item.imported_at)}</p>
                </div>
                <p className="text-gray-600">
                  Įkelta {item.rows_imported} iš {item.rows_total}
                  {item.rows_skipped > 0 ? `, praleista ${item.rows_skipped}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {transactions.length === 0 ? (
        <p className="rounded-xl border border-vtc-gray-200 bg-white p-8 text-center text-gray-500">
          Banko mokėjimų dar nėra. Jie atsiras importavus SEB išrašą.
        </p>
      ) : (
        <BankTransactionsTable
          transactions={transactions}
          registrations={registrations}
        />
      )}
    </div>
  );
}
