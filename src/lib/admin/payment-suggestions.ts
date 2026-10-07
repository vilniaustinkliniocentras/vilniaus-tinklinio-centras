import type { BankTransaction, Registration } from "@/types/database";

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("lt-LT").replace(/\s+/g, " ");
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
