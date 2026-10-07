"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  correctAthleteFeeRateAction,
  overrideMonthlyChargeAction,
  setAthleteFeeRateAction,
  unwaiveMonthlyChargeAction,
  waiveMonthlyChargeAction,
} from "@/lib/actions/admin-billing";
import type { BillingAthleteOption, BillingMonthRow } from "@/lib/admin/billing-types";
import {
  formatBillingMonthLt,
  formatRatePeriodLt,
  isoMonthFromDate,
} from "@/lib/admin/billing-month";
import { centsToEuroInput, formatEurFromCents } from "@/lib/admin/money";
import {
  ALTERNATE_FEE_EUR,
  SUGGESTED_FEE_EUR,
  paymentMonthStatusBadgeClasses,
  paymentMonthStatusLabels,
  type PaymentMonthStatus,
} from "@/lib/constants/billing";
import { PaymentAllocationEditor } from "@/components/admin/PaymentAllocationEditor";
import {
  billingInputClass,
  billingLinkButtonClass,
} from "@/components/admin/billing-styles";

function StatusBadge({ status }: { status: PaymentMonthStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${paymentMonthStatusBadgeClasses[status]}`}
    >
      {paymentMonthStatusLabels[status]}
    </span>
  );
}

function expectedDisplay(row: BillingMonthRow): string {
  if (row.chargesNotGenerated) {
    return "Nesugeneruota";
  }
  if (row.expectedCents === null) {
    return "—";
  }
  return formatEurFromCents(row.expectedCents);
}

function remainingDisplay(row: BillingMonthRow): string {
  if (row.chargesNotGenerated) {
    return "—";
  }
  if (!row.hasCharge) {
    return row.paidCents > 0 ? `Permoka ${formatEurFromCents(row.paidCents)}` : "—";
  }
  const remaining = row.remainingCents ?? 0;
  if (remaining > 0) {
    return `Liko ${formatEurFromCents(remaining)}`;
  }
  if (remaining < 0) {
    return `Permoka ${formatEurFromCents(-remaining)}`;
  }
  return formatEurFromCents(0);
}

function FeeRateForm({ row, month }: { row: BillingMonthRow; month: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState(
    row.rateCoveringMonth
      ? centsToEuroInput(row.rateCoveringMonth.amountCents)
      : String(SUGGESTED_FEE_EUR)
  );
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const openRate = row.openRate;
  const canCorrect = Boolean(openRate);
  const canSet =
    !openRate || isoMonthFromDate(openRate.validFrom) < month;

  async function run(
    action: "set" | "correct"
  ) {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result =
        action === "set"
          ? await setAthleteFeeRateAction({
              athleteId: row.athleteId,
              amountEuros: amount,
              month,
              note,
            })
          : await correctAthleteFeeRateAction({
              athleteId: row.athleteId,
              amountEuros: amount,
              note,
            });
      if (result.success) {
        setMessage(result.message);
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Nepavyko išsaugoti tarifo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600">
        {row.rateCoveringMonth ? (
          <>
            Šio mėnesio tarifas:{" "}
            <span className="font-medium text-gray-900">
              {formatEurFromCents(row.rateCoveringMonth.amountCents)}
            </span>
            . {formatRatePeriodLt(row.rateCoveringMonth.validFrom, row.rateCoveringMonth.validTo)}.
          </>
        ) : (
          "Šiam mėnesiui tarifo nėra."
        )}
        {openRate &&
        (!row.rateCoveringMonth || openRate.id !== row.rateCoveringMonth.id) ? (
          <>
            {" "}
            Dabartinis atviras tarifas: {formatEurFromCents(openRate.amountCents)},{" "}
            {formatRatePeriodLt(openRate.validFrom, openRate.validTo)}.
          </>
        ) : null}
      </p>
      {row.hasCharge ? (
        <p className="text-xs text-gray-500">
          Keičiant tarifą jau sugeneruotas šio mėnesio mokestis neperrašomas.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <input
          value={amount}
          inputMode="decimal"
          placeholder={String(SUGGESTED_FEE_EUR)}
          disabled={isSaving}
          onChange={(event) => setAmount(event.target.value)}
          aria-label="Tarifas eurais"
          className={`${billingInputClass} max-w-28`}
        />
        <button
          type="button"
          className={billingLinkButtonClass}
          disabled={isSaving}
          onClick={() => setAmount(String(SUGGESTED_FEE_EUR))}
        >
          {SUGGESTED_FEE_EUR} EUR
        </button>
        <button
          type="button"
          className={billingLinkButtonClass}
          disabled={isSaving}
          onClick={() => setAmount(String(ALTERNATE_FEE_EUR))}
        >
          {ALTERNATE_FEE_EUR} EUR
        </button>
      </div>
      <input
        value={note}
        disabled={isSaving}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Pastaba (nebūtina)"
        className={billingInputClass}
      />
      <div className="flex flex-wrap gap-3">
        {canSet ? (
          <button
            type="button"
            className={billingLinkButtonClass}
            disabled={isSaving}
            onClick={() => void run("set")}
          >
            Nustatyti nuo {formatBillingMonthLt(month)}
          </button>
        ) : null}
        {canCorrect ? (
          <button
            type="button"
            className={billingLinkButtonClass}
            disabled={isSaving}
            onClick={() => void run("correct")}
          >
            Pataisyti dabartinį tarifą
          </button>
        ) : null}
      </div>
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

function WaiverForm({ row, month }: { row: BillingMonthRow; month: string }) {
  const router = useRouter();
  const [note, setNote] = useState(row.waivedNote ?? "");
  const [expected, setExpected] = useState(
    row.expectedCents
      ? centsToEuroInput(row.expectedCents)
      : row.rateCoveringMonth
        ? centsToEuroInput(row.rateCoveringMonth.amountCents)
        : String(SUGGESTED_FEE_EUR)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleWaive() {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const result = await waiveMonthlyChargeAction({
        athleteId: row.athleteId,
        month,
        note,
        expectedAmountEuros: row.hasCharge ? undefined : expected,
      });
      if (result.success) {
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Nepavyko atleisti nuo mokesčio.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUnwaive() {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const result = await unwaiveMonthlyChargeAction({
        athleteId: row.athleteId,
        month,
      });
      if (result.success) {
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Nepavyko atšaukti atleidimo.");
    } finally {
      setIsSaving(false);
    }
  }

  if (row.waived) {
    return (
      <div className="space-y-2 text-xs text-gray-700">
        <p>
          Originalus mokestis {row.expectedCents !== null ? formatEurFromCents(row.expectedCents) : "—"}.
          Taikytina suma {formatEurFromCents(0)}.
        </p>
        {row.waivedNote ? <p>Priežastis: {row.waivedNote}</p> : null}
        <button
          type="button"
          className={billingLinkButtonClass}
          disabled={isSaving}
          onClick={() => void handleUnwaive()}
        >
          Atšaukti atleidimą
        </button>
        {error ? (
          <p className="text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        Atleidimas neištrina mokesčio. Originali suma išlieka, taikytina tampa 0 EUR.
      </p>
      {!row.hasCharge ? (
        <input
          value={expected}
          inputMode="decimal"
          disabled={isSaving}
          onChange={(event) => setExpected(event.target.value)}
          aria-label="Originali mokesčio suma"
          placeholder="Originali suma, EUR"
          className={billingInputClass}
        />
      ) : null}
      <textarea
        value={note}
        disabled={isSaving}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        required
        placeholder="Atleidimo priežastis"
        className={billingInputClass}
      />
      <button
        type="button"
        className={billingLinkButtonClass}
        disabled={isSaving}
        onClick={() => void handleWaive()}
      >
        Atleisti šį mėnesį
      </button>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function OverrideForm({ row, month }: { row: BillingMonthRow; month: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState(
    row.expectedCents ? centsToEuroInput(row.expectedCents) : ""
  );
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const result = await overrideMonthlyChargeAction({
        athleteId: row.athleteId,
        month,
        amountEuros: amount,
        note,
      });
      if (result.success) {
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Nepavyko pataisyti mokesčio.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        Pataiso tik šio mėnesio mokestį. Nulinę sumą žymėkite kaip atleistą.
      </p>
      <input
        value={amount}
        inputMode="decimal"
        disabled={isSaving}
        onChange={(event) => setAmount(event.target.value)}
        placeholder="Suma, EUR"
        className={billingInputClass}
      />
      <input
        value={note}
        disabled={isSaving}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Pastaba"
        className={billingInputClass}
      />
      <button
        type="button"
        className={billingLinkButtonClass}
        disabled={isSaving}
        onClick={() => void handleSave()}
      >
        Pataisyti šio mėnesio mokestį
      </button>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RowDetails({
  row,
  month,
  athletes,
}: {
  row: BillingMonthRow;
  month: string;
  athletes: BillingAthleteOption[];
}) {
  return (
    <div className="grid gap-4 border-t border-vtc-gray-100 bg-vtc-gray-50 px-4 py-4 lg:grid-cols-2">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Skaičiavimas
        </h4>
        <dl className="mt-2 space-y-1 text-sm text-gray-700">
          <div className="flex justify-between gap-4">
            <dt>Tikėtina suma</dt>
            <dd className="font-medium">{expectedDisplay(row)}</dd>
          </div>
          {row.waived ? (
            <div className="flex justify-between gap-4">
              <dt>Taikytina suma</dt>
              <dd className="font-medium">{formatEurFromCents(0)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt>Sumokėta</dt>
            <dd className="font-medium">{formatEurFromCents(row.paidCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Likutis / permoka</dt>
            <dd className="font-medium">{remainingDisplay(row)}</dd>
          </div>
        </dl>
        {row.chargesNotGenerated ? (
          <p className="mt-2 text-xs text-amber-800">
            Yra narystė, bet mėnesio mokestis dar nesugeneruotas. Nesumokėta suma nėra 0 EUR.
          </p>
        ) : null}
        {row.missingRate ? (
          <p className="mt-2 text-xs text-amber-800">Šiam mėnesiui nėra tarifo.</p>
        ) : null}
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tarifas</h4>
        <div className="mt-2">
          <FeeRateForm row={row} month={month} />
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Atleidimas</h4>
        <div className="mt-2">
          <WaiverForm row={row} month={month} />
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Šio mėnesio mokestis
        </h4>
        <div className="mt-2">
          <OverrideForm row={row} month={month} />
        </div>
      </div>
      <div className="lg:col-span-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Priskyrimai
        </h4>
        <div className="mt-2 space-y-2">
          {row.allocations.length === 0 ? (
            <p className="text-xs text-gray-500">Šiam mėnesiui priskyrimų nėra.</p>
          ) : (
            row.allocations.map((allocation) => (
              <PaymentAllocationEditor
                key={allocation.id}
                allocation={allocation}
                athletes={athletes}
                defaultMonth={month}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_FILTERS: Array<PaymentMonthStatus | "all"> = [
  "all",
  "unpaid",
  "partial",
  "paid",
  "overpaid",
  "waived",
  "not_applicable",
];

export function BillingMonthTable({
  month,
  rows,
  athletes,
  statusCounts,
}: {
  month: string;
  rows: BillingMonthRow[];
  athletes: BillingAthleteOption[];
  statusCounts: Record<PaymentMonthStatus, number>;
}) {
  const [filter, setFilter] = useState<PaymentMonthStatus | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const visibleRows = useMemo(
    () => (filter === "all" ? rows : rows.filter((row) => row.status === filter)),
    [filter, rows]
  );

  return (
    <section className="rounded-xl border border-vtc-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-vtc-gray-100 p-3">
        {STATUS_FILTERS.map((value) => {
          const label =
            value === "all" ? `Visos (${rows.length})` : `${paymentMonthStatusLabels[value]} (${statusCounts[value]})`;
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                active
                  ? "bg-vtc-navy text-white ring-vtc-navy"
                  : "bg-white text-gray-700 ring-vtc-gray-200 hover:text-vtc-navy"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {visibleRows.length === 0 ? (
        <p className="p-6 text-center text-sm text-gray-500">
          Šį mėnesį nėra sportininkų su naryste, mokesčiu ar priskyrimu.
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-vtc-gray-200 bg-vtc-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">Sportininkas</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Grupė</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Būsena</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Tikėtina</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Sumokėta</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Likutis</th>
                  <th className="px-4 py-3 font-semibold text-gray-700" />
                </tr>
              </thead>
              <tbody className="divide-y divide-vtc-gray-100">
                {visibleRows.map((row) => (
                  <Fragment key={row.athleteId}>
                    <tr className="hover:bg-vtc-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{row.childName}</p>
                        {row.parentName ? (
                          <p className="text-xs text-gray-500">{row.parentName}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.groupName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                        {row.chargesNotGenerated ? (
                          <p className="mt-1 text-xs text-amber-800">Mokestis nesugeneruotas</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        {expectedDisplay(row)}
                        {row.waived && row.expectedCents !== null ? (
                          <p className="text-xs text-gray-500">
                            Taikytina {formatEurFromCents(0)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatEurFromCents(row.paidCents)}
                      </td>
                      <td className="px-4 py-3 text-gray-800">{remainingDisplay(row)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className={billingLinkButtonClass}
                          onClick={() =>
                            setOpenId(openId === row.athleteId ? null : row.athleteId)
                          }
                        >
                          {openId === row.athleteId ? "Uždaryti" : "Tvarkyti"}
                        </button>
                      </td>
                    </tr>
                    {openId === row.athleteId ? (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <RowDetails row={row} month={month} athletes={athletes} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-3 lg:hidden">
            {visibleRows.map((row) => (
              <article key={row.athleteId} className="rounded-lg border border-vtc-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{row.childName}</h3>
                    <p className="text-xs text-gray-500">{row.groupName ?? "Be grupės"}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-gray-500">Tikėtina</dt>
                    <dd className="font-medium text-gray-900">{expectedDisplay(row)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Sumokėta</dt>
                    <dd className="font-medium text-gray-900">
                      {formatEurFromCents(row.paidCents)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Likutis</dt>
                    <dd className="font-medium text-gray-900">{remainingDisplay(row)}</dd>
                  </div>
                </dl>
                {row.chargesNotGenerated ? (
                  <p className="mt-2 text-xs text-amber-800">Mokestis nesugeneruotas</p>
                ) : null}
                <button
                  type="button"
                  className={`${billingLinkButtonClass} mt-3`}
                  onClick={() => setOpenId(openId === row.athleteId ? null : row.athleteId)}
                >
                  {openId === row.athleteId ? "Uždaryti" : "Tvarkyti"}
                </button>
                {openId === row.athleteId ? (
                  <div className="-mx-4 mt-3">
                    <RowDetails row={row} month={month} athletes={athletes} />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
