import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { attendanceMonthBounds } from "@/lib/coach/dates";
import {
  billingMonthStart,
  isoMonthFromDate,
  isAllowedBillingMonth,
} from "@/lib/admin/billing-month";
import { derivePaymentMonthStatus } from "@/lib/constants/billing";
import type {
  BankBillingRow,
  BillingAthleteOption,
  BillingFeeRate,
  BillingMonthRow,
  CashBillingRow,
  GenerateChargesResult,
  PaymentAllocationView,
  PaymentsBillingPageData,
} from "@/lib/admin/billing-types";
import type { BankImport, BankTransactionStatus } from "@/types/database";

function missingClientMessage(): string {
  return "Supabase administracijos konfigūracija nebaigta.";
}

function missingBillingTablesMessage(): string {
  return "Mokesčių lentelės dar nesukurtos. Paleiskite migraciją 012_athlete_fees_and_payment_allocations.sql.";
}

function isMissingRelationError(message: string): boolean {
  return /could not find the table|relation .+ does not exist|schema cache/i.test(
    message
  );
}

export function billingRpcErrorMessage(
  error: { message?: string } | null,
  fallback: string
): string {
  const message = error?.message?.trim();
  if (!message) {
    return fallback;
  }

  if (
    /could not find the table|relation .+ does not exist|schema cache|permission denied|JWT/i.test(
      message
    )
  ) {
    return isMissingRelationError(message)
      ? missingBillingTablesMessage()
      : fallback;
  }

  return message.replace(/^[A-Z0-9]+:\s*/, "");
}

type RpcObject = Record<string, unknown>;

function asRpcObject(data: unknown): RpcObject | null {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as RpcObject;
  }

  if (typeof data === "string") {
    try {
      const parsed: unknown = JSON.parse(data);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as RpcObject;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return Number(value);
  }
  return null;
}

type AthleteRow = {
  id: string;
  registration_id: string;
  child_name: string;
  child_birth_date: string;
  active: boolean;
};

type RegistrationNameRow = {
  id: string;
  parent_name: string;
};

type MembershipRow = {
  id: string;
  athlete_id: string;
  training_group_id: string;
  starts_on: string;
  ends_on: string | null;
};

type GroupRow = {
  id: string;
  name: string;
  active: boolean;
};

type FeeRateRow = {
  id: string;
  athlete_id: string;
  amount_cents: number;
  valid_from: string;
  valid_to: string | null;
  note: string | null;
};

type ChargeRow = {
  id: string;
  athlete_id: string;
  billing_month: string;
  expected_amount_cents: number;
  effective_expected_cents: number;
  source: "generated" | "manual";
  waived: boolean;
  waived_at: string | null;
  waived_note: string | null;
  note: string | null;
};

type AllocationRow = {
  id: string;
  athlete_id: string;
  billing_month: string;
  amount_cents: number;
  bank_transaction_id: string | null;
  cash_payment_id: string | null;
  note: string | null;
  created_at: string;
};

type BankTxRow = {
  id: string;
  transaction_date: string;
  amount_cents: number;
  currency: string;
  payer_name: string | null;
  payer_account: string | null;
  description: string | null;
  bank_reference: string | null;
  status: BankTransactionStatus;
  notes: string | null;
  registration_id: string | null;
  registrations?:
    | { child_name: string; parent_name: string }
    | { child_name: string; parent_name: string }[]
    | null;
};

type BankBalanceRow = {
  bank_transaction_id: string;
  amount_cents: number;
  allocated_cents: number;
  unallocated_cents: number;
};

type CashRow = {
  id: string;
  paid_on: string;
  amount_cents: number;
  note: string | null;
  created_at: string;
};

type CashBalanceRow = {
  cash_payment_id: string;
  amount_cents: number;
  allocated_cents: number;
  unallocated_cents: number;
};

function mapFeeRate(row: FeeRateRow): BillingFeeRate {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    amountCents: row.amount_cents,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    note: row.note,
  };
}

function rateCoversMonthStart(rate: FeeRateRow, monthStart: string): boolean {
  return (
    rate.valid_from <= monthStart &&
    (rate.valid_to === null || rate.valid_to > monthStart)
  );
}

function membershipOverlapsMonth(
  row: MembershipRow,
  monthStart: string,
  monthEnd: string
): boolean {
  return (
    row.starts_on <= monthEnd &&
    (row.ends_on === null || row.ends_on >= monthStart)
  );
}

function membershipCoversFirst(row: MembershipRow, monthStart: string): boolean {
  return (
    row.starts_on <= monthStart &&
    (row.ends_on === null || row.ends_on >= monthStart)
  );
}

function emptyStatusCounts(): PaymentsBillingPageData["statusCounts"] {
  return {
    unpaid: 0,
    partial: 0,
    paid: 0,
    overpaid: 0,
    waived: 0,
    not_applicable: 0,
  };
}

function athleteLabel(
  athletesById: Map<string, AthleteRow>,
  athleteId: string
): string {
  return athletesById.get(athleteId)?.child_name ?? "Nežinomas sportininkas";
}

function mapAllocationView(
  row: AllocationRow,
  athletesById: Map<string, AthleteRow>
): PaymentAllocationView {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    athleteName: athleteLabel(athletesById, row.athlete_id),
    billingMonth: isoMonthFromDate(row.billing_month),
    amountCents: row.amount_cents,
    bankTransactionId: row.bank_transaction_id,
    cashPaymentId: row.cash_payment_id,
    source: row.bank_transaction_id ? "bank" : "cash",
    note: row.note,
    createdAt: row.created_at,
  };
}

function currentGroupName(
  memberships: MembershipRow[],
  groupsById: Map<string, GroupRow>
): string | null {
  const open = memberships.find((row) => row.ends_on === null);
  if (!open) {
    return null;
  }
  return groupsById.get(open.training_group_id)?.name ?? null;
}

export async function adminLoadPaymentsBilling(
  month: string
): Promise<
  { success: true; data: PaymentsBillingPageData } | { success: false; message: string }
> {
  if (!isAllowedBillingMonth(month)) {
    return { success: false, message: "Neteisingas mokesčių mėnuo." };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const bounds = attendanceMonthBounds(month);
  if (!bounds) {
    return { success: false, message: "Neteisingas mokesčių mėnuo." };
  }

  const monthStart = billingMonthStart(month);
  const monthEnd = bounds.end;

  const [
    athletesResult,
    registrationsResult,
    membershipsResult,
    groupsResult,
    ratesResult,
    chargesResult,
    allocationsResult,
    bankTxResult,
    bankBalancesResult,
    cashResult,
    cashBalancesResult,
    importsResult,
  ] = await Promise.all([
    supabase
      .from("athletes")
      .select("id, registration_id, child_name, child_birth_date, active"),
    supabase.from("registrations").select("id, parent_name"),
    supabase
      .from("athlete_group_memberships")
      .select("id, athlete_id, training_group_id, starts_on, ends_on")
      .lte("starts_on", monthEnd),
    supabase.from("training_groups").select("id, name, active"),
    supabase
      .from("athlete_fee_rates")
      .select("id, athlete_id, amount_cents, valid_from, valid_to, note")
      .order("valid_from", { ascending: true }),
    supabase
      .from("athlete_monthly_charges")
      .select(
        "id, athlete_id, billing_month, expected_amount_cents, effective_expected_cents, source, waived, waived_at, waived_note, note"
      )
      .eq("billing_month", monthStart),
    supabase
      .from("payment_allocations")
      .select(
        "id, athlete_id, billing_month, amount_cents, bank_transaction_id, cash_payment_id, note, created_at"
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("bank_transactions")
      .select(
        "id, transaction_date, amount_cents, currency, payer_name, payer_account, description, bank_reference, status, notes, registration_id, registrations(child_name, parent_name)"
      )
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("bank_transaction_balances")
      .select("bank_transaction_id, amount_cents, allocated_cents, unallocated_cents"),
    supabase
      .from("cash_payments")
      .select("id, paid_on, amount_cents, note, created_at")
      .order("paid_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("cash_payment_balances")
      .select("cash_payment_id, amount_cents, allocated_cents, unallocated_cents"),
    supabase
      .from("bank_imports")
      .select(
        "id, filename, file_hash, rows_total, rows_imported, rows_skipped, imported_at"
      )
      .order("imported_at", { ascending: false }),
  ]);

  const billingErrors = [
    ratesResult.error,
    chargesResult.error,
    allocationsResult.error,
    bankBalancesResult.error,
    cashResult.error,
    cashBalancesResult.error,
  ];
  for (const error of billingErrors) {
    if (error) {
      console.error("Failed to load billing data:", error.message);
      return {
        success: false,
        message: billingRpcErrorMessage(error, "Nepavyko gauti mokesčių duomenų."),
      };
    }
  }

  if (athletesResult.error) {
    console.error("Failed to fetch athletes:", athletesResult.error.message);
    return { success: false, message: "Nepavyko gauti sportininkų." };
  }
  if (registrationsResult.error) {
    console.error("Failed to fetch registrations:", registrationsResult.error.message);
    return { success: false, message: "Nepavyko gauti registracijų." };
  }
  if (membershipsResult.error) {
    console.error(
      "Failed to fetch memberships:",
      membershipsResult.error.message
    );
    return { success: false, message: "Nepavyko gauti narysčių." };
  }
  if (groupsResult.error) {
    console.error("Failed to fetch groups:", groupsResult.error.message);
    return { success: false, message: "Nepavyko gauti grupių." };
  }
  if (bankTxResult.error) {
    console.error("Failed to fetch bank transactions:", bankTxResult.error.message);
    return {
      success: false,
      message: billingRpcErrorMessage(bankTxResult.error, "Nepavyko gauti banko operacijų."),
    };
  }
  if (importsResult.error) {
    console.error("Failed to fetch bank imports:", importsResult.error.message);
    return { success: false, message: "Nepavyko gauti banko išrašų." };
  }

  const athletes = (athletesResult.data ?? []) as AthleteRow[];
  const athletesById = new Map(athletes.map((row) => [row.id, row]));
  const parentByRegistrationId = new Map(
    ((registrationsResult.data ?? []) as RegistrationNameRow[]).map((row) => [
      row.id,
      row.parent_name,
    ])
  );
  const groupsById = new Map(
    ((groupsResult.data ?? []) as GroupRow[]).map((row) => [row.id, row])
  );

  const overlappingMemberships = ((membershipsResult.data ?? []) as MembershipRow[]).filter(
    (row) => membershipOverlapsMonth(row, monthStart, monthEnd)
  );
  const membershipsByAthlete = new Map<string, MembershipRow[]>();
  for (const row of overlappingMemberships) {
    const list = membershipsByAthlete.get(row.athlete_id) ?? [];
    list.push(row);
    membershipsByAthlete.set(row.athlete_id, list);
  }

  const allMembershipsByAthlete = new Map<string, MembershipRow[]>();
  for (const row of (membershipsResult.data ?? []) as MembershipRow[]) {
    const list = allMembershipsByAthlete.get(row.athlete_id) ?? [];
    list.push(row);
    allMembershipsByAthlete.set(row.athlete_id, list);
  }

  const ratesByAthlete = new Map<string, FeeRateRow[]>();
  for (const row of (ratesResult.data ?? []) as FeeRateRow[]) {
    const list = ratesByAthlete.get(row.athlete_id) ?? [];
    list.push(row);
    ratesByAthlete.set(row.athlete_id, list);
  }

  const chargesByAthlete = new Map(
    ((chargesResult.data ?? []) as ChargeRow[]).map((row) => [row.athlete_id, row])
  );

  const allocations = (allocationsResult.data ?? []) as AllocationRow[];
  const monthAllocationsByAthlete = new Map<string, AllocationRow[]>();
  const allocationsByBank = new Map<string, AllocationRow[]>();
  const allocationsByCash = new Map<string, AllocationRow[]>();
  const paidByAthlete = new Map<string, number>();

  for (const row of allocations) {
    if (isoMonthFromDate(row.billing_month) === month) {
      const list = monthAllocationsByAthlete.get(row.athlete_id) ?? [];
      list.push(row);
      monthAllocationsByAthlete.set(row.athlete_id, list);
      paidByAthlete.set(
        row.athlete_id,
        (paidByAthlete.get(row.athlete_id) ?? 0) + row.amount_cents
      );
    }
    if (row.bank_transaction_id) {
      const list = allocationsByBank.get(row.bank_transaction_id) ?? [];
      list.push(row);
      allocationsByBank.set(row.bank_transaction_id, list);
    }
    if (row.cash_payment_id) {
      const list = allocationsByCash.get(row.cash_payment_id) ?? [];
      list.push(row);
      allocationsByCash.set(row.cash_payment_id, list);
    }
  }

  const athleteIds = new Set<string>();
  for (const athleteId of membershipsByAthlete.keys()) {
    athleteIds.add(athleteId);
  }
  for (const athleteId of chargesByAthlete.keys()) {
    athleteIds.add(athleteId);
  }
  for (const athleteId of monthAllocationsByAthlete.keys()) {
    athleteIds.add(athleteId);
  }

  const statusCounts = emptyStatusCounts();
  const monthRows: BillingMonthRow[] = [];
  let membershipWithoutChargeCount = 0;
  let membershipWithoutRateCount = 0;

  for (const athleteId of athleteIds) {
    const athlete = athletesById.get(athleteId);
    if (!athlete) {
      continue;
    }

    const memberships = membershipsByAthlete.get(athleteId) ?? [];
    const covering = memberships
      .filter((row) => membershipCoversFirst(row, monthStart))
      .sort((a, b) => b.starts_on.localeCompare(a.starts_on))[0];
    const later = memberships
      .filter((row) => !membershipCoversFirst(row, monthStart))
      .sort((a, b) => a.starts_on.localeCompare(b.starts_on))[0];
    const groupMembership = covering ?? later ?? null;
    const groupName = groupMembership
      ? (groupsById.get(groupMembership.training_group_id)?.name ?? null)
      : null;

    const rates = ratesByAthlete.get(athleteId) ?? [];
    const coveringRate = rates.find((rate) => rateCoversMonthStart(rate, monthStart)) ?? null;
    const openRate = rates.find((rate) => rate.valid_to === null) ?? null;
    const charge = chargesByAthlete.get(athleteId) ?? null;
    const paidCents = paidByAthlete.get(athleteId) ?? 0;
    const hasMembership = memberships.length > 0;
    const hasCharge = charge !== null;
    const missingRate = hasMembership && coveringRate === null;
    const chargesNotGenerated = hasMembership && !hasCharge;
    const waived = charge?.waived === true;
    const expectedCents = charge?.expected_amount_cents ?? null;
    const effectiveExpectedCents = charge?.effective_expected_cents ?? 0;
    const status = derivePaymentMonthStatus({
      waived,
      hasCharge,
      effectiveExpectedCents,
      paidCents,
    });
    const remainingCents = hasCharge ? effectiveExpectedCents - paidCents : null;

    if (chargesNotGenerated) {
      membershipWithoutChargeCount += 1;
    }
    if (missingRate) {
      membershipWithoutRateCount += 1;
    }
    statusCounts[status] += 1;

    monthRows.push({
      athleteId,
      childName: athlete.child_name,
      parentName: parentByRegistrationId.get(athlete.registration_id) ?? null,
      groupName,
      hasMembership,
      hasCharge,
      chargesNotGenerated,
      missingRate,
      waived,
      waivedAt: charge?.waived_at ?? null,
      waivedNote: charge?.waived_note ?? null,
      chargeSource: charge?.source ?? null,
      expectedCents,
      effectiveExpectedCents,
      paidCents,
      remainingCents,
      status,
      rateCoveringMonth: coveringRate ? mapFeeRate(coveringRate) : null,
      openRate: openRate ? mapFeeRate(openRate) : null,
      allocations: (monthAllocationsByAthlete.get(athleteId) ?? []).map((row) =>
        mapAllocationView(row, athletesById)
      ),
    });
  }

  monthRows.sort((a, b) => {
    const groupCompare = (a.groupName ?? "žžž").localeCompare(b.groupName ?? "žžž", "lt");
    if (groupCompare !== 0) {
      return groupCompare;
    }
    return a.childName.localeCompare(b.childName, "lt");
  });

  const athleteOptions: BillingAthleteOption[] = athletes
    .map((athlete) => ({
      id: athlete.id,
      childName: athlete.child_name,
      parentName: parentByRegistrationId.get(athlete.registration_id) ?? null,
      groupName: currentGroupName(
        allMembershipsByAthlete.get(athlete.id) ?? [],
        groupsById
      ),
      active: athlete.active,
    }))
    .sort((a, b) => a.childName.localeCompare(b.childName, "lt"));

  const bankBalances = new Map(
    ((bankBalancesResult.data ?? []) as BankBalanceRow[]).map((row) => [
      row.bank_transaction_id,
      row,
    ])
  );

  const bankRows: BankBillingRow[] = ((bankTxResult.data ?? []) as BankTxRow[]).map(
    (row) => {
      const balance = bankBalances.get(row.id);
      const registration = Array.isArray(row.registrations)
        ? row.registrations[0]
        : row.registrations;
      const hint = registration
        ? `${registration.child_name} (${registration.parent_name})`
        : null;

      return {
        id: row.id,
        transactionDate: row.transaction_date,
        amountCents: row.amount_cents,
        allocatedCents: balance?.allocated_cents ?? 0,
        unallocatedCents: balance?.unallocated_cents ?? row.amount_cents,
        currency: row.currency,
        payerName: row.payer_name,
        payerAccount: row.payer_account,
        description: row.description,
        bankReference: row.bank_reference,
        status: row.status,
        notes: row.notes,
        legacyRegistrationHint: hint,
        allocations: (allocationsByBank.get(row.id) ?? []).map((allocation) =>
          mapAllocationView(allocation, athletesById)
        ),
      };
    }
  );

  const cashBalances = new Map(
    ((cashBalancesResult.data ?? []) as CashBalanceRow[]).map((row) => [
      row.cash_payment_id,
      row,
    ])
  );

  const cashRows: CashBillingRow[] = ((cashResult.data ?? []) as CashRow[]).map((row) => {
    const balance = cashBalances.get(row.id);
    return {
      id: row.id,
      paidOn: row.paid_on,
      amountCents: row.amount_cents,
      allocatedCents: balance?.allocated_cents ?? 0,
      unallocatedCents: balance?.unallocated_cents ?? row.amount_cents,
      note: row.note,
      createdAt: row.created_at,
      allocations: (allocationsByCash.get(row.id) ?? []).map((allocation) =>
        mapAllocationView(allocation, athletesById)
      ),
    };
  });

  return {
    success: true,
    data: {
      month,
      monthStart,
      monthRows,
      statusCounts,
      membershipWithoutChargeCount,
      membershipWithoutRateCount,
      athletes: athleteOptions,
      bankRows,
      cashRows,
      imports: (importsResult.data ?? []) as BankImport[],
    },
  };
}

export async function adminSetAthleteFeeRate(input: {
  athleteId: string;
  amountCents: number;
  validFrom: string;
  note?: string | null;
}): Promise<{ success: true } | { success: false; message: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { error } = await supabase.rpc("admin_set_athlete_fee_rate", {
    p_athlete_id: input.athleteId,
    p_amount_cents: input.amountCents,
    p_valid_from: input.validFrom,
    p_note: input.note ?? null,
  });

  if (error) {
    console.error("admin_set_athlete_fee_rate failed:", error.message);
    return {
      success: false,
      message: billingRpcErrorMessage(error, "Nepavyko nustatyti tarifo."),
    };
  }

  return { success: true };
}

export async function adminCorrectCurrentAthleteFeeRate(input: {
  athleteId: string;
  amountCents: number;
  note?: string | null;
}): Promise<{ success: true } | { success: false; message: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { error } = await supabase.rpc("admin_correct_current_athlete_fee_rate", {
    p_athlete_id: input.athleteId,
    p_amount_cents: input.amountCents,
    p_note: input.note ?? null,
  });

  if (error) {
    console.error("admin_correct_current_athlete_fee_rate failed:", error.message);
    return {
      success: false,
      message: billingRpcErrorMessage(error, "Nepavyko pataisyti tarifo."),
    };
  }

  return { success: true };
}

export async function adminGenerateMonthlyCharges(
  billingMonthStartDate: string
): Promise<
  { success: true; data: GenerateChargesResult } | { success: false; message: string }
> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { data, error } = await supabase.rpc("admin_generate_monthly_charges", {
    p_billing_month: billingMonthStartDate,
  });

  if (error) {
    console.error("admin_generate_monthly_charges failed:", error.message);
    return {
      success: false,
      message: billingRpcErrorMessage(error, "Nepavyko sugeneruoti mokesčių."),
    };
  }

  const payload = asRpcObject(data);
  const generated = readInteger(payload?.generated);
  const skippedExisting = readInteger(payload?.skipped_existing);
  const skippedNoRate = readInteger(payload?.skipped_no_rate);
  const eligibleAthletes = readInteger(payload?.eligible_athletes);
  const billingMonth = readString(payload?.billing_month);

  if (
    generated === null ||
    skippedExisting === null ||
    skippedNoRate === null ||
    eligibleAthletes === null
  ) {
    return { success: false, message: "Nepavyko sugeneruoti mokesčių." };
  }

  return {
    success: true,
    data: {
      billingMonth: billingMonth ? isoMonthFromDate(billingMonth) : isoMonthFromDate(billingMonthStartDate),
      generated,
      skippedExisting,
      skippedNoRate,
      eligibleAthletes,
    },
  };
}

export async function adminOverrideMonthlyChargeExpected(input: {
  athleteId: string;
  billingMonth: string;
  expectedAmountCents: number;
  note?: string | null;
}): Promise<{ success: true } | { success: false; message: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { error } = await supabase.rpc("admin_override_monthly_charge_expected", {
    p_athlete_id: input.athleteId,
    p_billing_month: input.billingMonth,
    p_expected_amount_cents: input.expectedAmountCents,
    p_note: input.note ?? null,
  });

  if (error) {
    console.error("admin_override_monthly_charge_expected failed:", error.message);
    return {
      success: false,
      message: billingRpcErrorMessage(error, "Nepavyko pataisyti mėnesio mokesčio."),
    };
  }

  return { success: true };
}

export async function adminWaiveMonthlyCharge(input: {
  athleteId: string;
  billingMonth: string;
  note: string;
  expectedAmountCents?: number | null;
}): Promise<{ success: true } | { success: false; message: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { error } = await supabase.rpc("admin_waive_monthly_charge", {
    p_athlete_id: input.athleteId,
    p_billing_month: input.billingMonth,
    p_note: input.note,
    p_expected_amount_cents: input.expectedAmountCents ?? null,
  });

  if (error) {
    console.error("admin_waive_monthly_charge failed:", error.message);
    return {
      success: false,
      message: billingRpcErrorMessage(error, "Nepavyko atleisti nuo mokesčio."),
    };
  }

  return { success: true };
}

export async function adminUnwaiveMonthlyCharge(input: {
  athleteId: string;
  billingMonth: string;
}): Promise<{ success: true } | { success: false; message: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { error } = await supabase.rpc("admin_unwaive_monthly_charge", {
    p_athlete_id: input.athleteId,
    p_billing_month: input.billingMonth,
  });

  if (error) {
    console.error("admin_unwaive_monthly_charge failed:", error.message);
    return {
      success: false,
      message: billingRpcErrorMessage(error, "Nepavyko atšaukti atleidimo."),
    };
  }

  return { success: true };
}

export async function adminAllocateBankPayment(input: {
  bankTransactionId: string;
  athleteId: string;
  billingMonth: string;
  amountCents: number;
  note?: string | null;
}): Promise<{ success: true } | { success: false; message: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { error } = await supabase.rpc("admin_allocate_bank_payment", {
    p_bank_transaction_id: input.bankTransactionId,
    p_athlete_id: input.athleteId,
    p_billing_month: input.billingMonth,
    p_amount_cents: input.amountCents,
    p_note: input.note ?? null,
  });

  if (error) {
    console.error("admin_allocate_bank_payment failed:", error.message);
    return {
      success: false,
      message: billingRpcErrorMessage(error, "Nepavyko priskirti banko operacijos."),
    };
  }

  return { success: true };
}

export async function adminAllocateCashPayment(input: {
  cashPaymentId: string;
  athleteId: string;
  billingMonth: string;
  amountCents: number;
  note?: string | null;
}): Promise<{ success: true } | { success: false; message: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { error } = await supabase.rpc("admin_allocate_cash_payment", {
    p_cash_payment_id: input.cashPaymentId,
    p_athlete_id: input.athleteId,
    p_billing_month: input.billingMonth,
    p_amount_cents: input.amountCents,
    p_note: input.note ?? null,
  });

  if (error) {
    console.error("admin_allocate_cash_payment failed:", error.message);
    return {
      success: false,
      message: billingRpcErrorMessage(error, "Nepavyko priskirti grynųjų."),
    };
  }

  return { success: true };
}

export async function adminRecordCashPayment(input: {
  athleteId: string;
  amountCents: number;
  paidOn: string;
  billingMonth: string;
  note?: string | null;
  allocateAmountCents?: number | null;
}): Promise<{ success: true } | { success: false; message: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { error } = await supabase.rpc("admin_record_cash_payment", {
    p_athlete_id: input.athleteId,
    p_amount_cents: input.amountCents,
    p_paid_on: input.paidOn,
    p_billing_month: input.billingMonth,
    p_note: input.note ?? null,
    p_allocate_amount_cents: input.allocateAmountCents ?? null,
  });

  if (error) {
    console.error("admin_record_cash_payment failed:", error.message);
    return {
      success: false,
      message: billingRpcErrorMessage(error, "Nepavyko įrašyti grynųjų mokėjimo."),
    };
  }

  return { success: true };
}

export async function adminUpdatePaymentAllocation(input: {
  allocationId: string;
  amountCents?: number | null;
  athleteId?: string | null;
  billingMonth?: string | null;
  note?: string | null;
}): Promise<{ success: true } | { success: false; message: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { error } = await supabase.rpc("admin_update_payment_allocation", {
    p_allocation_id: input.allocationId,
    p_amount_cents: input.amountCents ?? null,
    p_athlete_id: input.athleteId ?? null,
    p_billing_month: input.billingMonth ?? null,
    p_note: input.note ?? null,
  });

  if (error) {
    console.error("admin_update_payment_allocation failed:", error.message);
    return {
      success: false,
      message: billingRpcErrorMessage(error, "Nepavyko pataisyti priskyrimo."),
    };
  }

  return { success: true };
}

export async function adminDeletePaymentAllocation(
  allocationId: string
): Promise<{ success: true } | { success: false; message: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { error } = await supabase.rpc("admin_delete_payment_allocation", {
    p_allocation_id: allocationId,
  });

  if (error) {
    console.error("admin_delete_payment_allocation failed:", error.message);
    return {
      success: false,
      message: billingRpcErrorMessage(error, "Nepavyko ištrinti priskyrimo."),
    };
  }

  return { success: true };
}
