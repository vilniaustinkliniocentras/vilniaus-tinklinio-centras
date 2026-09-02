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
}
