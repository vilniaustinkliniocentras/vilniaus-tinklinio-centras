import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BankImport,
  BankTransaction,
  BankTransactionRegistration,
  BankTransactionStatus,
  SebImportSummary,
} from "@/types/database";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BANK_TRANSACTION_LIST_SELECT =
  "id, bank_import_id, transaction_date, amount_cents, currency, payer_name, payer_account, description, bank_reference, transaction_hash, registration_id, status, notes, created_at, updated_at, registrations(id, child_name, parent_name, training_group)";

type BankTransactionRow = Omit<BankTransaction, "registration"> & {
  registrations?: BankTransactionRegistration | BankTransactionRegistration[] | null;
};

function isMissingRelationError(message: string): boolean {
  return /could not find the table|relation .+ does not exist|schema cache/i.test(
    message
  );
}

function missingTablesMessage(): string {
  return "Mokėjimų lentelės dar nesukurtos. Paleiskite migraciją 008_bank_imports.sql.";
}

function normalizeRegistration(
  value: BankTransactionRow["registrations"]
): BankTransactionRegistration | null {
  if (!value) {
    return null;
  }

  const registration = Array.isArray(value) ? value[0] : value;
  if (!registration?.id) {
    return null;
  }

  return {
    id: registration.id,
    child_name: registration.child_name,
    parent_name: registration.parent_name,
    training_group: registration.training_group ?? null,
  };
}

function normalizeTransaction(row: BankTransactionRow): BankTransaction {
  return {
    id: row.id,
    bank_import_id: row.bank_import_id,
    transaction_date: row.transaction_date,
    amount_cents: row.amount_cents,
    currency: row.currency,
    payer_name: row.payer_name ?? null,
    payer_account: row.payer_account ?? null,
    description: row.description ?? null,
    bank_reference: row.bank_reference ?? null,
    transaction_hash: row.transaction_hash,
    registration_id: row.registration_id ?? null,
    status: row.status,
    notes: row.notes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    registration: normalizeRegistration(row.registrations),
  };
}

export async function adminFetchBankImports(): Promise<
  { success: true; data: BankImport[] } | { success: false; message: string }
> {
  const supabase = createAdminClient();
  if (!supabase) {
    return {
      success: false,
      message: "Supabase administracijos konfigūracija nebaigta.",
    };
  }

  const { data, error } = await supabase
    .from("bank_imports")
    .select(
      "id, filename, file_hash, rows_total, rows_imported, rows_skipped, imported_at"
    )
    .order("imported_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch bank imports:", error.message);
    return {
      success: false,
      message: isMissingRelationError(error.message)
        ? missingTablesMessage()
        : "Nepavyko gauti banko išrašų.",
    };
  }

  if (!Array.isArray(data)) {
    return { success: false, message: "Nepavyko gauti banko išrašų." };
  }

  return { success: true, data: data as BankImport[] };
}

export async function adminFetchBankTransactions(): Promise<
  { success: true; data: BankTransaction[] } | { success: false; message: string }
> {
  const supabase = createAdminClient();
  if (!supabase) {
    return {
      success: false,
      message: "Supabase administracijos konfigūracija nebaigta.",
    };
  }

  const { data, error } = await supabase
    .from("bank_transactions")
    .select(BANK_TRANSACTION_LIST_SELECT)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch bank transactions:", error.message);
    return {
      success: false,
      message: isMissingRelationError(error.message)
        ? missingTablesMessage()
        : "Nepavyko gauti mokėjimų.",
    };
  }

  if (!Array.isArray(data)) {
    return { success: false, message: "Nepavyko gauti mokėjimų." };
  }

  return {
    success: true,
    data: (data as BankTransactionRow[]).map(normalizeTransaction),
  };
}

export async function adminUpdateBankTransactionRegistration(
  transactionId: string,
  registrationId: string | null
): Promise<
  | { success: true; registrationId: string | null; status: BankTransactionStatus }
  | { success: false; message: string }
> {
  if (!UUID_REGEX.test(transactionId)) {
    return { success: false, message: "Neteisingas mokėjimo identifikatorius." };
  }

  if (registrationId && !UUID_REGEX.test(registrationId)) {
    return { success: false, message: "Neteisingas registracijos identifikatorius." };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return {
      success: false,
      message: "Supabase administracijos konfigūracija nebaigta.",
    };
  }

  const { data: current, error: currentError } = await supabase
    .from("bank_transactions")
    .select("id, status")
    .eq("id", transactionId)
    .maybeSingle();

  if (currentError) {
    console.error("Failed to load bank transaction:", currentError.message);
    return { success: false, message: "Nepavyko atnaujinti mokėjimo." };
  }

  if (!current) {
    return { success: false, message: "Mokėjimas nerastas." };
  }

  const nextStatus: BankTransactionStatus = registrationId
    ? current.status === "confirmed"
      ? "confirmed"
      : "assigned"
    : "unassigned";

  const { data, error } = await supabase
    .from("bank_transactions")
    .update({
      registration_id: registrationId,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transactionId)
    .select("id, registration_id, status")
    .maybeSingle();

  if (error || !data) {
    console.error(
      "Failed to update bank transaction registration:",
      error?.message ?? "No rows updated"
    );
    return { success: false, message: "Nepavyko priskirti registracijos." };
  }

  return {
    success: true,
    registrationId: data.registration_id,
    status: data.status as BankTransactionStatus,
  };
}

export async function adminUpdateBankTransactionStatus(
  transactionId: string,
  status: BankTransactionStatus
): Promise<
  { success: true; status: BankTransactionStatus } | { success: false; message: string }
> {
  if (!UUID_REGEX.test(transactionId)) {
    return { success: false, message: "Neteisingas mokėjimo identifikatorius." };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return {
      success: false,
      message: "Supabase administracijos konfigūracija nebaigta.",
    };
  }

  const { data: current, error: currentError } = await supabase
    .from("bank_transactions")
    .select("id, registration_id, status")
    .eq("id", transactionId)
    .maybeSingle();

  if (currentError) {
    console.error("Failed to load bank transaction:", currentError.message);
    return { success: false, message: "Nepavyko atnaujinti būsenos." };
  }

  if (!current) {
    return { success: false, message: "Mokėjimas nerastas." };
  }

  if (
    (status === "assigned" || status === "confirmed") &&
    !current.registration_id
  ) {
    return {
      success: false,
      message: "Pirmiausia priskirkite mokėjimą registracijai.",
    };
  }

  const { data, error } = await supabase
    .from("bank_transactions")
    .update({
      status,
      registration_id: status === "unassigned" ? null : current.registration_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transactionId)
    .select("id, status")
    .maybeSingle();

  if (error || !data) {
    console.error(
      "Failed to update bank transaction status:",
      error?.message ?? "No rows updated"
    );
    return { success: false, message: "Nepavyko atnaujinti būsenos." };
  }

  return { success: true, status: data.status as BankTransactionStatus };
}

export async function adminUpdateBankTransactionNotes(
  transactionId: string,
  notes: string | null
): Promise<{ success: true; notes: string | null } | { success: false; message: string }> {
  if (!UUID_REGEX.test(transactionId)) {
    return { success: false, message: "Neteisingas mokėjimo identifikatorius." };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return {
      success: false,
      message: "Supabase administracijos konfigūracija nebaigta.",
    };
  }

  const { data, error } = await supabase
    .from("bank_transactions")
    .update({
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transactionId)
    .select("id, notes")
    .maybeSingle();

  if (error || !data) {
    console.error(
      "Failed to update bank transaction notes:",
      error?.message ?? "No rows updated"
    );
    return { success: false, message: "Nepavyko išsaugoti pastabos." };
  }

  return { success: true, notes: data.notes ?? null };
}

function isUniqueViolation(message: string | undefined): boolean {
  if (!message) {
    return false;
  }

  return /duplicate key|unique constraint|23505/i.test(message);
}

export async function adminImportSebStatement(input: {
  filename: string;
  fileHash: string;
  credits: {
    transactionDate: string;
    amountCents: number;
    currency: string;
    payerName: string | null;
    payerAccount: string | null;
    description: string | null;
    bankReference: string;
    transactionHash: string;
    rawFields: Record<string, string>;
  }[];
  skippedDebits: number;
  rowErrorCount: number;
  dataRowCount: number;
}): Promise<
  { success: true; summary: SebImportSummary } | { success: false; message: string }
> {
  const supabase = createAdminClient();
  if (!supabase) {
    return {
      success: false,
      message: "Supabase administracijos konfigūracija nebaigta.",
    };
  }

  const { data: existingImport, error: existingError } = await supabase
    .from("bank_imports")
    .select("id, rows_imported, rows_skipped, rows_total")
    .eq("file_hash", input.fileHash)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to check bank import hash:", existingError.message);
    return { success: false, message: "Nepavyko patikrinti, ar išrašas jau importuotas." };
  }

  if (existingImport) {
    return {
      success: true,
      summary: {
        imported: 0,
        alreadyImported: input.credits.length,
        skipped: input.skippedDebits,
        errors: input.rowErrorCount,
        filename: input.filename,
        alreadyImportedFile: true,
      },
    };
  }

  const { data: insertedImport, error: insertImportError } = await supabase
    .from("bank_imports")
    .insert({
      filename: input.filename,
      file_hash: input.fileHash,
      rows_total: input.dataRowCount,
      rows_imported: 0,
      rows_skipped: 0,
    })
    .select("id")
    .maybeSingle();

  if (insertImportError || !insertedImport?.id) {
    if (isUniqueViolation(insertImportError?.message)) {
      return {
        success: true,
        summary: {
          imported: 0,
          alreadyImported: input.credits.length,
          skipped: input.skippedDebits,
          errors: input.rowErrorCount,
          filename: input.filename,
          alreadyImportedFile: true,
        },
      };
    }

    console.error("Failed to insert bank import:", insertImportError?.message);
    return { success: false, message: "Nepavyko išsaugoti importo įrašo." };
  }

  let imported = 0;
  let alreadyImported = 0;

  for (const credit of input.credits) {
    const { error } = await supabase.from("bank_transactions").insert({
      bank_import_id: insertedImport.id,
      transaction_date: credit.transactionDate,
      amount_cents: credit.amountCents,
      currency: credit.currency,
      payer_name: credit.payerName,
      payer_account: credit.payerAccount,
      description: credit.description,
      bank_reference: credit.bankReference,
      transaction_hash: credit.transactionHash,
      status: "unassigned",
      raw_fields: credit.rawFields,
    });

    if (!error) {
      imported += 1;
      continue;
    }

    if (isUniqueViolation(error.message)) {
      alreadyImported += 1;
      continue;
    }

    console.error("Failed to insert bank transaction:", error.message);
    return { success: false, message: "Nepavyko išsaugoti banko operacijos." };
  }

  const skipped = input.skippedDebits + alreadyImported + input.rowErrorCount;

  const { error: updateError } = await supabase
    .from("bank_imports")
    .update({
      rows_imported: imported,
      rows_skipped: skipped,
      rows_total: input.dataRowCount,
    })
    .eq("id", insertedImport.id);

  if (updateError) {
    console.error("Failed to update bank import counts:", updateError.message);
  }

  return {
    success: true,
    summary: {
      imported,
      alreadyImported,
      skipped: input.skippedDebits,
      errors: input.rowErrorCount,
      filename: input.filename,
      alreadyImportedFile: false,
    },
  };
}
