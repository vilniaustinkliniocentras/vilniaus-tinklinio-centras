"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordCashPaymentAction } from "@/lib/actions/admin-billing";
import type { BillingAthleteOption, CashBillingRow } from "@/lib/admin/billing-types";
import { EARLIEST_BILLING_MONTH } from "@/lib/admin/billing-month";
import { formatEurFromCents } from "@/lib/admin/money";
import { vilniusTodayIsoDate } from "@/lib/coach/dates";
import { AthletePicker } from "@/components/admin/AthletePicker";
import { NewAllocationForm } from "@/components/admin/NewAllocationForm";
import { PaymentAllocationEditor } from "@/components/admin/PaymentAllocationEditor";
import { billingInputClass, billingLinkButtonClass } from "@/components/admin/billing-styles";
import { Button } from "@/components/ui/Button";

function RecordCashForm({
  athletes,
  month,
}: {
  athletes: BillingAthleteOption[];
  month: string;
}) {
  const router = useRouter();
  const [athleteId, setAthleteId] = useState("");
  const [paidOn, setPaidOn] = useState(vilniusTodayIsoDate());
  const [received, setReceived] = useState("");
  const [allocated, setAllocated] = useState("");
  const [billingMonth, setBillingMonth] = useState(month);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await recordCashPaymentAction({
        athleteId,
        receivedEuros: received,
        allocatedEuros: allocated,
        paidOn,
        month: billingMonth,
        note,
      });
      if (result.success) {
        setMessage(result.message);
        setAthleteId("");
        setReceived("");
        setAllocated("");
        setNote("");
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Nepavyko įrašyti grynųjų.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <AthletePicker
        id="cash-new-athlete"
        label="Sportininkas"
        value={athleteId}
        athletes={athletes}
        onChange={setAthleteId}
        disabled={isSaving}
      />
      <div>
        <label htmlFor="cash-paid-on" className="mb-1 block text-xs font-medium text-gray-600">
          Gavimo data
        </label>
        <input
          id="cash-paid-on"
          type="date"
          value={paidOn}
          disabled={isSaving}
          onChange={(event) => setPaidOn(event.target.value)}
          className={billingInputClass}
        />
      </div>
      <div>
        <label htmlFor="cash-month" className="mb-1 block text-xs font-medium text-gray-600">
          Pirmas priskyrimas, mėnuo
        </label>
        <input
          id="cash-month"
          type="month"
          min={EARLIEST_BILLING_MONTH}
          value={billingMonth}
          disabled={isSaving}
          onChange={(event) => setBillingMonth(event.target.value)}
          className={billingInputClass}
        />
      </div>
      <div>
        <label htmlFor="cash-received" className="mb-1 block text-xs font-medium text-gray-600">
          Gauta, EUR
        </label>
        <input
          id="cash-received"
          value={received}
          inputMode="decimal"
          disabled={isSaving}
          onChange={(event) => setReceived(event.target.value)}
          className={billingInputClass}
        />
      </div>
      <div>
        <label htmlFor="cash-allocated" className="mb-1 block text-xs font-medium text-gray-600">
          Priskirti dabar, EUR
        </label>
        <input
          id="cash-allocated"
          value={allocated}
          inputMode="decimal"
          placeholder="Jei tuščia – visa gauta suma"
          disabled={isSaving}
          onChange={(event) => setAllocated(event.target.value)}
          className={billingInputClass}
        />
      </div>
      <div>
        <label htmlFor="cash-note" className="mb-1 block text-xs font-medium text-gray-600">
          Pastaba
        </label>
        <input
          id="cash-note"
          value={note}
          disabled={isSaving}
          onChange={(event) => setNote(event.target.value)}
          className={billingInputClass}
        />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="button" size="sm" disabled={isSaving} onClick={() => void handleSubmit()}>
          {isSaving ? "Saugoma..." : "Įrašyti grynuosius"}
        </Button>
        {error ? (
          <p className="mt-2 text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-2 text-xs text-green-800" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function CashPaymentsPanel({
  rows,
  athletes,
  month,
}: {
  rows: CashBillingRow[];
  athletes: BillingAthleteOption[];
  month: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-vtc-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-semibold text-gray-900">Grynieji</h2>
      <p className="mt-1 text-sm text-gray-600">
        Gauta suma ir priskirta suma yra skirtingi dalykai. Likutį galima priskirti vėliau
        kitiems sportininkams ar mėnesiams.
      </p>
      <div className="mt-4">
        <RecordCashForm athletes={athletes} month={month} />
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">Grynųjų įrašų dar nėra.</p>
      ) : (
        <ul className="mt-4 divide-y divide-vtc-gray-100">
          {rows.map((row) => {
            const open = openId === row.id;
            return (
              <li key={row.id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      Gauta {formatEurFromCents(row.amountCents)} · {row.paidOn}
                    </p>
                    <p className="text-gray-600">
                      Priskirta {formatEurFromCents(row.allocatedCents)} · nepriskirta{" "}
                      {formatEurFromCents(row.unallocatedCents)}
                    </p>
                    {row.note ? <p className="text-xs text-gray-500">{row.note}</p> : null}
                  </div>
                  <button
                    type="button"
                    className={billingLinkButtonClass}
                    onClick={() => setOpenId(open ? null : row.id)}
                  >
                    {open ? "Uždaryti" : "Priskyrimai"}
                  </button>
                </div>
                {open ? (
                  <div className="mt-3 space-y-2">
                    {row.allocations.map((allocation) => (
                      <PaymentAllocationEditor
                        key={allocation.id}
                        allocation={allocation}
                        athletes={athletes}
                        defaultMonth={month}
                      />
                    ))}
                    <NewAllocationForm
                      source="cash"
                      sourceId={row.id}
                      athletes={athletes}
                      defaultMonth={month}
                      defaultAmountCents={row.unallocatedCents}
                      disabled={row.unallocatedCents <= 0}
                      disabledReason="Visa gauta suma jau priskirta."
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
