"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { fetchRegistrationById } from "@/lib/admin/registrations";
import {
  adminFetchBankImports,
  adminFetchBankTransactions,
  adminImportSebStatement,
  adminUpdateBankTransactionNotes,
  adminUpdateBankTransactionRegistration,
  adminUpdateBankTransactionStatus,
} from "@/lib/admin/bank-imports";
import type { BankImport, BankTransaction, SebImportSummary } from "@/types/database";
import {
  decodeSebStatementBuffer,
  hashSebStatementBytes,
  parseSebStatement,
  SEB_CSV_MAX_BYTES,
} from "@/lib/admin/seb-csv";
import {
  isBankTransactionStatus,
  type BankTransactionStatus,
} from "@/lib/constants/bank-transactions";

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

function sanitizeUploadFilename(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "seb-israsas.csv";
  const cleaned = base.replace(/[^\w.\- ()ąčęėįšųūžĄČĘĖĮŠŲŪŽ]+/g, "_").trim();
  const withExtension = cleaned.toLowerCase().endsWith(".csv")
    ? cleaned
    : `${cleaned || "seb-israsas"}.csv`;
  return withExtension.slice(0, 180);
}

export async function importSebStatementAction(
  formData: FormData
): Promise<
  | { success: true; summary: SebImportSummary }
  | { success: false; message: string }
> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  const uploaded = formData.get("statement");
  if (
    !uploaded ||
    typeof uploaded === "string" ||
    typeof (uploaded as Blob).arrayBuffer !== "function"
  ) {
    return { success: false, message: "Pasirinkite SEB CSV failą." };
  }
  const file = uploaded as File;

  const filename = sanitizeUploadFilename(file.name);
  if (!filename.toLowerCase().endsWith(".csv")) {
    return { success: false, message: "Galima importuoti tik .csv failą." };
  }

  if (file.size <= 0) {
    return { success: false, message: "Failas tuščias." };
  }

  if (file.size > SEB_CSV_MAX_BYTES) {
    return { success: false, message: "Failas per didelis. Didžiausias dydis – 2 MB." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const text = decodeSebStatementBuffer(bytes);
  if (!text) {
    return { success: false, message: "Nepavyko perskaityti CSV failo." };
  }

  const parsed = parseSebStatement(text);
  if (!parsed.ok) {
    return { success: false, message: parsed.message };
  }

  const result = await adminImportSebStatement({
    filename,
    fileHash: hashSebStatementBytes(bytes),
    credits: parsed.credits.map((row) => ({
      transactionDate: row.transactionDate,
      amountCents: row.amountCents,
      currency: row.currency,
      payerName: row.payerName,
      payerAccount: row.payerAccount,
      description: row.description,
      bankReference: row.bankReference,
      transactionHash: row.transactionHash,
      rawFields: row.rawFields,
    })),
    skippedDebits: parsed.skippedDebits,
    rowErrorCount: parsed.rowErrors.length,
    dataRowCount: parsed.dataRowCount,
  });

  if (!result.success) {
    return result;
  }

  revalidatePayments();
  return result;
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
    message: "Mokėjimas priskirtas vaikui.",
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
    message: "Mokėjimo priskyrimas pašalintas.",
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
