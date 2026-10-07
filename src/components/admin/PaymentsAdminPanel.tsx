"use client";

import { BankTransactionsTable } from "@/components/admin/BankTransactionsTable";
import { BillingMonthNav } from "@/components/admin/BillingMonthNav";
import { BillingMonthTable } from "@/components/admin/BillingMonthTable";
import { CashPaymentsPanel } from "@/components/admin/CashPaymentsPanel";
import { GenerateChargesPanel } from "@/components/admin/GenerateChargesPanel";
import { SebStatementImport } from "@/components/admin/SebStatementImport";
import type { PaymentsBillingPageData } from "@/lib/admin/billing-types";
import { formatEurFromCents } from "@/lib/admin/money";

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PaymentsAdminPanel({ data }: { data: PaymentsBillingPageData }) {
  const unallocatedBankCents = data.bankRows.reduce(
    (sum, row) => sum + Math.max(row.unallocatedCents, 0),
    0
  );

  return (
    <div className="space-y-6">
      <BillingMonthNav month={data.month} />

      <GenerateChargesPanel
        month={data.month}
        membershipWithoutChargeCount={data.membershipWithoutChargeCount}
        membershipWithoutRateCount={data.membershipWithoutRateCount}
      />

      <BillingMonthTable
        month={data.month}
        rows={data.monthRows}
        athletes={data.athletes}
        statusCounts={data.statusCounts}
      />

      <CashPaymentsPanel rows={data.cashRows} athletes={data.athletes} month={data.month} />

      <SebStatementImport />

      {data.imports.length > 0 ? (
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
            {data.imports.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
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

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Banko operacijos</h2>
          <p className="mt-1 text-sm text-gray-600">
            Importuoti SEB faktai nekeičiami. Nepriskirta suma:{" "}
            <span className="font-semibold text-vtc-navy">
              {formatEurFromCents(unallocatedBankCents)}
            </span>
            . Senos būsenos „priskirtas / patvirtintas“ nereiškia apmokėjimo.
          </p>
        </div>
        <BankTransactionsTable
          transactions={data.bankRows}
          athletes={data.athletes}
          month={data.month}
        />
      </section>
    </div>
  );
}
