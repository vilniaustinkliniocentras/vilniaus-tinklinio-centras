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

export interface Athlete {
  id: string;
  registration_id: string;
  child_name: string;
  child_birth_date: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Coach {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** Operational training group row (public.training_groups). Not the public website registration dropdown. */
export interface DbTrainingGroup {
  id: string;
  name: string;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoachGroupAssignment {
  id: string;
  coach_id: string;
  /** FK to public.training_groups (DbTrainingGroup), not the website dropdown. */
  training_group_id: string;
  created_at: string;
}

export interface AthleteGroupMembership {
  id: string;
  athlete_id: string;
  /** FK to public.training_groups (DbTrainingGroup), not the website dropdown. */
  training_group_id: string;
  starts_on: string;
  ends_on: string | null;
  created_at: string;
}

/** Admin-only view of whether a registration is currently attending. */
export interface RegistrationAthleteStatus {
  registrationId: string;
  athleteId: string | null;
  isCurrentlyAttending: boolean;
  currentGroupId: string | null;
  currentGroupName: string | null;
  membershipStartsOn: string | null;
}

export interface AdminGroupOption {
  id: string;
  name: string;
}

/** Current operational roster row for /admin/grupes. */
export interface AdminRosterAthlete {
  athleteId: string;
  childName: string;
  childBirthDate: string;
  groupId: string;
  groupName: string;
  groupActive: boolean;
  membershipId: string;
  membershipStartsOn: string;
}

export interface TrainingSession {
  id: string;
  /** FK to public.training_groups (DbTrainingGroup), not the website dropdown. */
  training_group_id: string;
  session_date: string;
  starts_at: string | null;
  ends_at: string | null;
  created_by_coach_id: string | null;
  created_at: string;
}

export type AttendanceStatus = "present" | "absent" | "excused";

export interface Attendance {
  id: string;
  training_session_id: string;
  athlete_id: string;
  status: AttendanceStatus;
  marked_by_coach_id: string | null;
  marked_at: string;
  notes: string | null;
}
