import type { PaymentMonthStatus } from "@/lib/constants/billing";
import type { BankImport, BankTransactionStatus } from "@/types/database";

export type BillingAthleteOption = {
  id: string;
  childName: string;
  parentName: string | null;
  groupName: string | null;
  active: boolean;
};

export type BillingFeeRate = {
  id: string;
  athleteId: string;
  amountCents: number;
  validFrom: string;
  validTo: string | null;
  note: string | null;
};

export type PaymentAllocationView = {
  id: string;
  athleteId: string;
  athleteName: string;
  billingMonth: string;
  amountCents: number;
  bankTransactionId: string | null;
  cashPaymentId: string | null;
  source: "bank" | "cash";
  note: string | null;
  createdAt: string;
};

export type BillingMonthRow = {
  athleteId: string;
  childName: string;
  parentName: string | null;
  groupName: string | null;
  hasMembership: boolean;
  hasCharge: boolean;
  chargesNotGenerated: boolean;
  missingRate: boolean;
  waived: boolean;
  waivedAt: string | null;
  waivedNote: string | null;
  chargeSource: "generated" | "manual" | null;
  expectedCents: number | null;
  effectiveExpectedCents: number;
  paidCents: number;
  remainingCents: number | null;
  status: PaymentMonthStatus;
  rateCoveringMonth: BillingFeeRate | null;
  openRate: BillingFeeRate | null;
  allocations: PaymentAllocationView[];
};

export type BankBillingRow = {
  id: string;
  transactionDate: string;
  amountCents: number;
  allocatedCents: number;
  unallocatedCents: number;
  currency: string;
  payerName: string | null;
  payerAccount: string | null;
  description: string | null;
  bankReference: string | null;
  status: BankTransactionStatus;
  notes: string | null;
  legacyRegistrationHint: string | null;
  allocations: PaymentAllocationView[];
};

export type CashBillingRow = {
  id: string;
  paidOn: string;
  amountCents: number;
  allocatedCents: number;
  unallocatedCents: number;
  note: string | null;
  createdAt: string;
  allocations: PaymentAllocationView[];
};

export type GenerateChargesResult = {
  billingMonth: string;
  generated: number;
  skippedExisting: number;
  skippedNoRate: number;
  eligibleAthletes: number;
};

export type PaymentsBillingPageData = {
  month: string;
  monthStart: string;
  monthRows: BillingMonthRow[];
  statusCounts: Record<PaymentMonthStatus, number>;
  membershipWithoutChargeCount: number;
  membershipWithoutRateCount: number;
  athletes: BillingAthleteOption[];
  bankRows: BankBillingRow[];
  cashRows: CashBillingRow[];
  imports: BankImport[];
};
