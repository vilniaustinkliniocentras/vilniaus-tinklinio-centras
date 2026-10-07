import type { BillingAthleteOption } from "@/lib/admin/billing-types";
import type { BankTransaction, Registration } from "@/types/database";

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("lt-LT").replace(/\s+/g, " ");
}

export function suggestAthletesForTransaction(
  transaction: {
    description: string | null;
    payerName?: string | null;
    payer_name?: string | null;
  },
  athletes: BillingAthleteOption[]
): BillingAthleteOption[] {
  const description = normalizeName(transaction.description ?? "");
  const payerName = normalizeName(transaction.payerName ?? transaction.payer_name ?? "");
  const haystack = `${description} ${payerName}`.trim();
  if (!haystack) {
    return [];
  }

  const matches: BillingAthleteOption[] = [];
  const seen = new Set<string>();

  for (const athlete of athletes) {
    const childName = normalizeName(athlete.childName);
    const parentName = normalizeName(athlete.parentName ?? "");
    const childHit = childName.length >= 4 && haystack.includes(childName);
    const parentHit = parentName.length >= 4 && haystack.includes(parentName);

    if ((childHit || parentHit) && !seen.has(athlete.id)) {
      seen.add(athlete.id);
      matches.push(athlete);
    }
  }

  return matches;
}

export function suggestRegistrationsForTransaction(
  transaction: BankTransaction,
  registrations: Registration[]
): Registration[] {
  const description = normalizeName(transaction.description ?? "");
  if (!description) {
    return [];
  }

  const matches: Registration[] = [];
  const seen = new Set<string>();

  for (const registration of registrations) {
    const childName = normalizeName(registration.child_name);
    const parentName = normalizeName(registration.parent_name);
    const childHit = childName.length >= 4 && description.includes(childName);
    const parentHit = parentName.length >= 4 && description.includes(parentName);

    if ((childHit || parentHit) && !seen.has(registration.id)) {
      seen.add(registration.id);
      matches.push(registration);
    }
  }

  return matches;
}
