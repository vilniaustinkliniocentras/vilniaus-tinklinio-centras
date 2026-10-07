export const SUGGESTED_FEE_EUR = 69;
export const ALTERNATE_FEE_EUR = 40;
export const SUGGESTED_FEE_CENTS = SUGGESTED_FEE_EUR * 100;
export const ALTERNATE_FEE_CENTS = ALTERNATE_FEE_EUR * 100;

export type PaymentMonthStatus =
  | "unpaid"
  | "partial"
  | "paid"
  | "overpaid"
  | "waived"
  | "not_applicable";

export const paymentMonthStatusLabels: Record<PaymentMonthStatus, string> = {
  unpaid: "Nesumokėta",
  partial: "Dalinai sumokėta",
  paid: "Sumokėta",
  overpaid: "Permoka",
  waived: "Atleista",
  not_applicable: "Netaikoma",
};

export const paymentMonthStatusBadgeClasses: Record<PaymentMonthStatus, string> = {
  unpaid: "bg-red-50 text-red-800 ring-red-600/20",
  partial: "bg-amber-50 text-amber-800 ring-amber-600/20",
  paid: "bg-green-50 text-green-800 ring-green-600/20",
  overpaid: "bg-violet-50 text-violet-800 ring-violet-600/20",
  waived: "bg-slate-100 text-slate-700 ring-slate-500/20",
  not_applicable: "bg-gray-100 text-gray-600 ring-gray-500/20",
};

export function derivePaymentMonthStatus(input: {
  waived: boolean;
  hasCharge: boolean;
  effectiveExpectedCents: number;
  paidCents: number;
}): PaymentMonthStatus {
  if (input.waived) {
    return "waived";
  }

  if (!input.hasCharge) {
    return input.paidCents > 0 ? "overpaid" : "not_applicable";
  }

  if (input.paidCents <= 0) {
    return "unpaid";
  }

  if (input.paidCents < input.effectiveExpectedCents) {
    return "partial";
  }

  if (input.paidCents > input.effectiveExpectedCents) {
    return "overpaid";
  }

  return "paid";
}
