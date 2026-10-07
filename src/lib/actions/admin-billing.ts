"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { isUuid } from "@/lib/admin/coaches-groups";
import { isIsoDateString } from "@/lib/coach/dates";
import {
  billingMonthStart,
  isAllowedBillingMonth,
} from "@/lib/admin/billing-month";
import { parseEurosToCents } from "@/lib/admin/money";
import {
  adminAllocateBankPayment,
  adminAllocateCashPayment,
  adminCorrectCurrentAthleteFeeRate,
  adminDeletePaymentAllocation,
  adminGenerateMonthlyCharges,
  adminOverrideMonthlyChargeExpected,
  adminRecordCashPayment,
  adminSetAthleteFeeRate,
  adminUnwaiveMonthlyCharge,
  adminUpdatePaymentAllocation,
  adminWaiveMonthlyCharge,
} from "@/lib/admin/billing";
import type { GenerateChargesResult } from "@/lib/admin/billing-types";

function revalidatePayments(): void {
  revalidatePath("/admin/mokejimai");
}

function unauthorized(): { success: false; message: string } {
  return { success: false, message: "Neturite prieigos." };
}

function parseMonthStart(month: string): string | null {
  if (!isAllowedBillingMonth(month)) {
    return null;
  }
  return billingMonthStart(month);
}

function parsePositiveCents(value: string, label: string): number | { error: string } {
  const cents = parseEurosToCents(value);
  if (cents === null) {
    return { error: `Neteisinga ${label}. Įveskite teigiamą sumą eurais, pvz. 40 arba 69.` };
  }
  return cents;
}

export async function generateMonthlyChargesAction(
  month: string
): Promise<
  | { success: true; message: string; result: GenerateChargesResult }
  | { success: false; message: string }
> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return unauthorized();
  }

  const monthStart = parseMonthStart(month);
  if (!monthStart) {
    return { success: false, message: "Neteisingas mokesčių mėnuo." };
  }

  const result = await adminGenerateMonthlyCharges(monthStart);
  if (!result.success) {
    return result;
  }

  revalidatePayments();
  return {
    success: true,
    message: "Mokesčių generavimas baigtas.",
    result: result.data,
  };
}

export async function setAthleteFeeRateAction(input: {
  athleteId: string;
  amountEuros: string;
  month: string;
  note?: string;
}): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return unauthorized();
  }

  if (!isUuid(input.athleteId)) {
    return { success: false, message: "Neteisingas sportininko identifikatorius." };
  }

  const monthStart = parseMonthStart(input.month);
  if (!monthStart) {
    return { success: false, message: "Neteisingas mokesčių mėnuo." };
  }

  const amount = parsePositiveCents(input.amountEuros, "tarifo suma");
  if (typeof amount === "object") {
    return { success: false, message: amount.error };
  }

  const result = await adminSetAthleteFeeRate({
    athleteId: input.athleteId,
    amountCents: amount,
    validFrom: monthStart,
    note: input.note?.trim() || null,
  });

  if (!result.success) {
    return result;
  }

  revalidatePayments();
  return { success: true, message: "Tarifas nustatytas nuo pasirinkto mėnesio." };
}

export async function correctAthleteFeeRateAction(input: {
  athleteId: string;
  amountEuros: string;
  note?: string;
}): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return unauthorized();
  }

  if (!isUuid(input.athleteId)) {
    return { success: false, message: "Neteisingas sportininko identifikatorius." };
  }

  const amount = parsePositiveCents(input.amountEuros, "tarifo suma");
  if (typeof amount === "object") {
    return { success: false, message: amount.error };
  }

  const result = await adminCorrectCurrentAthleteFeeRate({
    athleteId: input.athleteId,
    amountCents: amount,
    note: input.note?.trim() || null,
  });

  if (!result.success) {
    return result;
  }

  revalidatePayments();
  return {
    success: true,
    message: "Dabartinis tarifas pataisytas. Jau sugeneruoti mokesčiai nekeičiami.",
  };
}

export async function overrideMonthlyChargeAction(input: {
  athleteId: string;
  month: string;
  amountEuros: string;
  note?: string;
}): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return unauthorized();
  }

  if (!isUuid(input.athleteId)) {
    return { success: false, message: "Neteisingas sportininko identifikatorius." };
  }

  const monthStart = parseMonthStart(input.month);
  if (!monthStart) {
    return { success: false, message: "Neteisingas mokesčių mėnuo." };
  }

  const amount = parsePositiveCents(input.amountEuros, "mėnesio mokesčio suma");
  if (typeof amount === "object") {
    return { success: false, message: amount.error };
  }

  const result = await adminOverrideMonthlyChargeExpected({
    athleteId: input.athleteId,
    billingMonth: monthStart,
    expectedAmountCents: amount,
    note: input.note?.trim() || null,
  });

  if (!result.success) {
    return result;
  }

  revalidatePayments();
  return { success: true, message: "Šio mėnesio mokestis pataisytas." };
}

export async function waiveMonthlyChargeAction(input: {
  athleteId: string;
  month: string;
  note: string;
  expectedAmountEuros?: string;
}): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return unauthorized();
  }

  if (!isUuid(input.athleteId)) {
    return { success: false, message: "Neteisingas sportininko identifikatorius." };
  }

  const monthStart = parseMonthStart(input.month);
  if (!monthStart) {
    return { success: false, message: "Neteisingas mokesčių mėnuo." };
  }

  const note = input.note.trim();
  if (note.length < 3) {
    return { success: false, message: "Nurodykite atleidimo priežastį." };
  }

  let expectedAmountCents: number | null = null;
  if (input.expectedAmountEuros && input.expectedAmountEuros.trim()) {
    const amount = parsePositiveCents(input.expectedAmountEuros, "originali mokesčio suma");
    if (typeof amount === "object") {
      return { success: false, message: amount.error };
    }
    expectedAmountCents = amount;
  }

  const result = await adminWaiveMonthlyCharge({
    athleteId: input.athleteId,
    billingMonth: monthStart,
    note,
    expectedAmountCents,
  });

  if (!result.success) {
    return result;
  }

  revalidatePayments();
  return { success: true, message: "Mėnuo pažymėtas kaip atleistas. Mokestis neištrintas." };
}

export async function unwaiveMonthlyChargeAction(input: {
  athleteId: string;
  month: string;
}): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return unauthorized();
  }

  if (!isUuid(input.athleteId)) {
    return { success: false, message: "Neteisingas sportininko identifikatorius." };
  }

  const monthStart = parseMonthStart(input.month);
  if (!monthStart) {
    return { success: false, message: "Neteisingas mokesčių mėnuo." };
  }

  const result = await adminUnwaiveMonthlyCharge({
    athleteId: input.athleteId,
    billingMonth: monthStart,
  });

  if (!result.success) {
    return result;
  }

  revalidatePayments();
  return { success: true, message: "Atleidimas atšauktas." };
}

export async function allocateBankPaymentAction(input: {
  bankTransactionId: string;
  athleteId: string;
  month: string;
  amountEuros: string;
  note?: string;
}): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return unauthorized();
  }

  if (!isUuid(input.bankTransactionId) || !isUuid(input.athleteId)) {
    return { success: false, message: "Neteisingas identifikatorius." };
  }

  const monthStart = parseMonthStart(input.month);
  if (!monthStart) {
    return { success: false, message: "Neteisingas mokesčių mėnuo." };
  }

  const amount = parsePositiveCents(input.amountEuros, "priskiriama suma");
  if (typeof amount === "object") {
    return { success: false, message: amount.error };
  }

  const result = await adminAllocateBankPayment({
    bankTransactionId: input.bankTransactionId,
    athleteId: input.athleteId,
    billingMonth: monthStart,
    amountCents: amount,
    note: input.note?.trim() || null,
  });

  if (!result.success) {
    return result;
  }

  revalidatePayments();
  return { success: true, message: "Banko operacija priskirta." };
}

export async function allocateCashPaymentAction(input: {
  cashPaymentId: string;
  athleteId: string;
  month: string;
  amountEuros: string;
  note?: string;
}): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return unauthorized();
  }

  if (!isUuid(input.cashPaymentId) || !isUuid(input.athleteId)) {
    return { success: false, message: "Neteisingas identifikatorius." };
  }

  const monthStart = parseMonthStart(input.month);
  if (!monthStart) {
    return { success: false, message: "Neteisingas mokesčių mėnuo." };
  }

  const amount = parsePositiveCents(input.amountEuros, "priskiriama suma");
  if (typeof amount === "object") {
    return { success: false, message: amount.error };
  }

  const result = await adminAllocateCashPayment({
    cashPaymentId: input.cashPaymentId,
    athleteId: input.athleteId,
    billingMonth: monthStart,
    amountCents: amount,
    note: input.note?.trim() || null,
  });

  if (!result.success) {
    return result;
  }

  revalidatePayments();
  return { success: true, message: "Grynieji priskirti." };
}

export async function recordCashPaymentAction(input: {
  athleteId: string;
  receivedEuros: string;
  allocatedEuros?: string;
  paidOn: string;
  month: string;
  note?: string;
}): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return unauthorized();
  }

  if (!isUuid(input.athleteId)) {
    return { success: false, message: "Neteisingas sportininko identifikatorius." };
  }

  if (!isIsoDateString(input.paidOn)) {
    return { success: false, message: "Neteisinga gavimo data." };
  }

  const monthStart = parseMonthStart(input.month);
  if (!monthStart) {
    return { success: false, message: "Neteisingas mokesčių mėnuo." };
  }

  const received = parsePositiveCents(input.receivedEuros, "gauta suma");
  if (typeof received === "object") {
    return { success: false, message: received.error };
  }

  let allocateAmountCents: number | null = null;
  if (input.allocatedEuros && input.allocatedEuros.trim()) {
    const allocated = parsePositiveCents(input.allocatedEuros, "priskiriama suma");
    if (typeof allocated === "object") {
      return { success: false, message: allocated.error };
    }
    if (allocated > received) {
      return {
        success: false,
        message: "Priskiriama suma negali būti didesnė už gautą sumą.",
      };
    }
    allocateAmountCents = allocated;
  }

  const result = await adminRecordCashPayment({
    athleteId: input.athleteId,
    amountCents: received,
    paidOn: input.paidOn,
    billingMonth: monthStart,
    note: input.note?.trim() || null,
    allocateAmountCents,
  });

  if (!result.success) {
    return result;
  }

  revalidatePayments();
  return { success: true, message: "Grynųjų mokėjimas įrašytas." };
}

export async function updatePaymentAllocationAction(input: {
  allocationId: string;
  athleteId: string;
  month: string;
  amountEuros: string;
  note?: string;
}): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return unauthorized();
  }

  if (!isUuid(input.allocationId) || !isUuid(input.athleteId)) {
    return { success: false, message: "Neteisingas identifikatorius." };
  }

  const monthStart = parseMonthStart(input.month);
  if (!monthStart) {
    return { success: false, message: "Neteisingas mokesčių mėnuo." };
  }

  const amount = parsePositiveCents(input.amountEuros, "priskiriama suma");
  if (typeof amount === "object") {
    return { success: false, message: amount.error };
  }

  const result = await adminUpdatePaymentAllocation({
    allocationId: input.allocationId,
    amountCents: amount,
    athleteId: input.athleteId,
    billingMonth: monthStart,
    note: input.note ?? "",
  });

  if (!result.success) {
    return result;
  }

  revalidatePayments();
  return { success: true, message: "Priskyrimas pataisytas." };
}

export async function deletePaymentAllocationAction(
  allocationId: string
): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return unauthorized();
  }

  if (!isUuid(allocationId)) {
    return { success: false, message: "Neteisingas priskyrimo identifikatorius." };
  }

  const result = await adminDeletePaymentAllocation(allocationId);
  if (!result.success) {
    return result;
  }

  revalidatePayments();
  return { success: true, message: "Priskyrimas ištrintas." };
}
