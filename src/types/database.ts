export interface Registration {
  id: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  child_name: string;
  child_birth_date: string;
  volleyball_experience: string;
  training_group: string | null;
  referral_source: string | null;
  preferred_training_times: string | null;
  additional_comments: string | null;
  privacy_consent: boolean;
  status: string;
  is_waitlist?: boolean;
  created_at: string;
  contract_sent_at: string | null;
  contract_sent_to: string | null;
  signed_contract_path: string | null;
  signed_contract_uploaded_at: string | null;
  signed_contract_upload_token_hash: string | null;
  signed_contract_upload_token_created_at: string | null;
}

export interface RegistrationInsert {
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  child_name: string;
  child_birth_date: string;
  volleyball_experience: string;
  training_group: string;
  preferred_training_times: string | null;
  referral_source: string;
  additional_comments: string | null;
  privacy_consent: boolean;
  is_waitlist?: boolean;
}

export interface BankImport {
  id: string;
  filename: string;
  file_hash: string;
  rows_total: number;
  rows_imported: number;
  rows_skipped: number;
  imported_at: string;
}

export type BankTransactionStatus =
  | "unassigned"
  | "assigned"
  | "confirmed"
  | "ignored";

export interface BankTransactionRegistration {
  id: string;
  child_name: string;
  parent_name: string;
  training_group: string | null;
}

export interface BankTransaction {
  id: string;
  bank_import_id: string;
  transaction_date: string;
  amount_cents: number;
  currency: string;
  payer_name: string | null;
  description: string | null;
  bank_reference: string | null;
  transaction_hash: string;
  registration_id: string | null;
  status: BankTransactionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  registration: BankTransactionRegistration | null;
}
