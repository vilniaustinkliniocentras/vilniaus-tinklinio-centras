-- Signed contract upload storage (private bucket + registration metadata).
-- Run manually in Supabase SQL Editor when deploying signed contract upload stage 1.

alter table public.registrations
  add column if not exists signed_contract_path text,
  add column if not exists signed_contract_uploaded_at timestamptz;

comment on column public.registrations.signed_contract_path is
  'Private storage path of the uploaded signed contract PDF in the signed-contracts bucket';

comment on column public.registrations.signed_contract_uploaded_at is
  'Timestamp when the signed contract PDF was uploaded';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'signed-contracts',
  'signed-contracts',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Private bucket: no storage policies for anon/authenticated.
-- Server-side uploads use the service role key, which bypasses storage RLS.
