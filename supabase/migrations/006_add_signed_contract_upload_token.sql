-- Upload token hash for parent signed contract upload links.
-- Run manually in Supabase SQL Editor when deploying signed contract upload stage 2.
-- Only the SHA-256 hash is stored; the raw token is never persisted.

alter table public.registrations
  add column if not exists signed_contract_upload_token_hash text,
  add column if not exists signed_contract_upload_token_created_at timestamptz;

comment on column public.registrations.signed_contract_upload_token_hash is
  'SHA-256 hash of the parent signed contract upload token';

comment on column public.registrations.signed_contract_upload_token_created_at is
  'Timestamp when the signed contract upload token was generated';

create unique index if not exists registrations_signed_contract_upload_token_hash_uidx
  on public.registrations (signed_contract_upload_token_hash)
  where signed_contract_upload_token_hash is not null;
