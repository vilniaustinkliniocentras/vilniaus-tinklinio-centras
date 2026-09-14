"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { fetchRegistrationById } from "@/lib/admin/registrations";
import {
  adminFetchBankImports,
  adminFetchBankTransactions,
  adminUpdateBankTransactionNotes,
  adminUpdateBankTransactionRegistration,
  adminUpdateBankTransactionStatus,
} from "@/lib/admin/bank-imports";
import {
  isBankTransactionStatus,
  type BankTransactionStatus,
} from "@/lib/constants/bank-transactions";
import type { BankImport, BankTransaction } from "@/types/database";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function revalidatePayments(): void {
  revalidatePath("/admin/mokejimai");
}

export async function getBankTransactions(): Promise<{
  data: BankTransaction[] | null;
  error: string | null;
}> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { data: null, error: "Neturite prieigos." };
  }

  const result = await adminFetchBankTransactions();
  if (!result.success) {
    return { data: null, error: result.message };
  }

  return { data: result.data, error: null };
}

export async function getBankImports(): Promise<{
  data: BankImport[] | null;
  error: string | null;
}> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { data: null, error: "Neturite prieigos." };
  }

  const result = await adminFetchBankImports();
  if (!result.success) {
    return { data: null, error: result.message };
  }

  return { data: result.data, error: null };
}

export async function assignBankTransaction(
  transactionId: string,
  registrationId: string
): Promise<{ success: boolean; message: string; status?: BankTransactionStatus }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  if (!UUID_REGEX.test(transactionId)) {
    return { success: false, message: "Neteisingas mokėjimo identifikatorius." };
  }

  if (!UUID_REGEX.test(registrationId)) {
    return { success: false, message: "Neteisingas registracijos identifikatorius." };
  }

  const registration = await fetchRegistrationById(registrationId);
  if (!registration) {
    return { success: false, message: "Registracija nerasta." };
  }

  const result = await adminUpdateBankTransactionRegistration(
    transactionId,
    registrationId
  );

  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidatePayments();
  return {
    success: true,
    message: "Mokėjimas priskirtas registracijai.",
    status: result.status,
  };
}

export async function unassignBankTransaction(
  transactionId: string
): Promise<{ success: boolean; message: string; status?: BankTransactionStatus }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  if (!UUID_REGEX.test(transactionId)) {
    return { success: false, message: "Neteisingas mokėjimo identifikatorius." };
  }

  const result = await adminUpdateBankTransactionRegistration(transactionId, null);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidatePayments();
  return {
    success: true,
    message: "Mokėjimo priskyrimas nuimtas.",
    status: result.status,
  };
}

export async function updateBankTransactionNotes(
  transactionId: string,
  notes: string
): Promise<{ success: boolean; message: string; notes?: string | null }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  if (!UUID_REGEX.test(transactionId)) {
    return { success: false, message: "Neteisingas mokėjimo identifikatorius." };
  }

  const normalizedNotes = notes.trim() || null;
  const result = await adminUpdateBankTransactionNotes(transactionId, normalizedNotes);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidatePayments();
  return {
    success: true,
    message: "Pastaba išsaugota.",
    notes: result.notes,
  };
}

export async function setBankTransactionStatus(
  transactionId: string,
  status: BankTransactionStatus
): Promise<{ success: boolean; message: string; status?: BankTransactionStatus }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  if (!UUID_REGEX.test(transactionId)) {
    return { success: false, message: "Neteisingas mokėjimo identifikatorius." };
  }

  if (!isBankTransactionStatus(status)) {
    return { success: false, message: "Neteisinga mokėjimo būsena." };
  }

  const result = await adminUpdateBankTransactionStatus(transactionId, status);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidatePayments();
  return {
    success: true,
    message: "Būsena atnaujinta.",
    status: result.status,
  };
}
