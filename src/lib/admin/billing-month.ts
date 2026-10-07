import { isIsoMonthString, vilniusCurrentMonth } from "@/lib/coach/dates";

export const EARLIEST_BILLING_MONTH = "2026-09";

export function billingMonthStart(month: string): string {
  return `${month}-01`;
}

export function isAllowedBillingMonth(value: string): boolean {
  return isIsoMonthString(value) && value >= EARLIEST_BILLING_MONTH;
}

export function defaultBillingMonth(
  currentMonth = vilniusCurrentMonth()
): string {
  return currentMonth >= EARLIEST_BILLING_MONTH
    ? currentMonth
    : EARLIEST_BILLING_MONTH;
}

export function shiftIsoMonth(month: string, delta: number): string | null {
  if (!isIsoMonthString(month)) {
    return null;
  }

  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1 + delta;
  const shifted = new Date(Date.UTC(year, monthIndex, 1));
  const next = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
  return isAllowedBillingMonth(next) ? next : null;
}

export function formatBillingMonthLt(month: string): string {
  if (!isIsoMonthString(month)) {
    return month;
  }

  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const label = new Intl.DateTimeFormat("lt-LT", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthIndex, 1)));

  return `${year} m. ${label}`;
}

export function paymentsMonthUrl(month: string): string {
  return `/admin/mokejimai?menuo=${encodeURIComponent(month)}`;
}

export function isoMonthFromDate(value: string): string {
  return value.slice(0, 7);
}

export function addIsoMonth(month: string, delta: number): string | null {
  if (!isIsoMonthString(month)) {
    return null;
  }

  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1 + delta;
  const shifted = new Date(Date.UTC(year, monthIndex, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatRatePeriodLt(validFrom: string, validTo: string | null): string {
  const fromMonth = isoMonthFromDate(validFrom);
  const fromLabel = formatBillingMonthLt(fromMonth);
  if (!validTo) {
    return `Nuo ${fromLabel}`;
  }

  const lastMonth = addIsoMonth(isoMonthFromDate(validTo), -1);
  if (!lastMonth || lastMonth === fromMonth) {
    return fromLabel;
  }

  return `${fromLabel} – ${formatBillingMonthLt(lastMonth)}`;
}
