import type { BankTransactionStatus } from "@/types/database";

export type { BankTransactionStatus };

export const BANK_TRANSACTION_STATUSES: {
  value: BankTransactionStatus;
  label: string;
}[] = [
  { value: "unassigned", label: "Nepriskirta" },
  { value: "assigned", label: "Priskirtas" },
  { value: "confirmed", label: "Patvirtintas" },
  { value: "ignored", label: "Ignoruotas" },
];

export const bankTransactionStatusLabels: Record<BankTransactionStatus, string> = {
  unassigned: "Nepriskirta",
  assigned: "Priskirtas",
  confirmed: "Patvirtintas",
  ignored: "Ignoruotas",
};

export function isBankTransactionStatus(
  value: string
): value is BankTransactionStatus {
  return BANK_TRANSACTION_STATUSES.some((status) => status.value === value);
}

export const bankTransactionStatusBadgeClasses: Record<BankTransactionStatus, string> = {
  unassigned: "bg-blue-50 text-blue-700 ring-blue-600/20",
  assigned: "bg-amber-50 text-amber-700 ring-amber-600/20",
  confirmed: "bg-green-50 text-green-700 ring-green-600/20",
  ignored: "bg-gray-100 text-gray-600 ring-gray-500/20",
};
