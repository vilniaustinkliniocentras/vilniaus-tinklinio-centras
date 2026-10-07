const EURO_INPUT = /^\d+(?:[.,]\d{1,2})?$/;

export function formatEurFromCents(cents: number): string {
  return (cents / 100).toLocaleString("lt-LT", {
    style: "currency",
    currency: "EUR",
  });
}

export function parseEurosToCents(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, "");
  if (!trimmed || !EURO_INPUT.test(trimmed)) {
    return null;
  }

  const normalized = trimmed.replace(",", ".");
  const [whole, frac = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    return null;
  }

  return cents;
}

export function centsToEuroInput(cents: number): string {
  if (cents % 100 === 0) {
    return String(cents / 100);
  }

  return (cents / 100).toFixed(2).replace(".", ",");
}
