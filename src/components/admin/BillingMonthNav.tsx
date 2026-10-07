"use client";

import { useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  EARLIEST_BILLING_MONTH,
  formatBillingMonthLt,
  paymentsMonthUrl,
  shiftIsoMonth,
} from "@/lib/admin/billing-month";
import { isIsoMonthString } from "@/lib/coach/dates";

export function BillingMonthNav({ month }: { month: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const previous = shiftIsoMonth(month, -1);
  const next = shiftIsoMonth(month, 1);

  function go(nextMonth: string) {
    startTransition(() => {
      router.push(paymentsMonthUrl(nextMonth));
    });
  }

  function handleMonthChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    if (!nextValue || !isIsoMonthString(nextValue)) {
      event.target.value = month;
      return;
    }

    if (nextValue < EARLIEST_BILLING_MONTH) {
      event.target.value = month;
      return;
    }

    if (nextValue === month) {
      return;
    }

    go(nextValue);
  }

  return (
    <div className={`flex flex-wrap items-end gap-3 ${isPending ? "opacity-70" : ""}`}>
      <div className="min-w-0">
        <label htmlFor="payments-month" className="mb-1 block text-xs font-medium text-gray-600">
          Mėnuo
        </label>
        <input
          id="payments-month"
          type="month"
          min={EARLIEST_BILLING_MONTH}
          value={month}
          onChange={handleMonthChange}
          disabled={isPending}
          className="rounded-lg border border-vtc-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-vtc-navy focus:ring-2 focus:ring-vtc-navy/10 disabled:opacity-60"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!previous || isPending}
          onClick={() => previous && go(previous)}
          className="rounded-lg border border-vtc-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-vtc-gray-50 disabled:opacity-50"
        >
          Ankstesnis
        </button>
        <button
          type="button"
          disabled={!next || isPending}
          onClick={() => next && go(next)}
          className="rounded-lg border border-vtc-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-vtc-gray-50 disabled:opacity-50"
        >
          Kitas
        </button>
      </div>
      <p className="text-sm text-gray-500">{formatBillingMonthLt(month)}</p>
    </div>
  );
}
