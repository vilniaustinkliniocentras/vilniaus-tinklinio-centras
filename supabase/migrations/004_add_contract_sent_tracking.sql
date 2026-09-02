-- Track when a training contract PDF was emailed to the parent.
-- Run manually in Supabase SQL Editor when deploying stage 2.

alter table public.registrations
  add column if not exists contract_sent_at timestamptz,
  add column if not exists contract_sent_to text;

comment on column public.registrations.contract_sent_at is
  'Timestamp when the training contract PDF was last emailed to the parent';

comment on column public.registrations.contract_sent_to is
  'Email address used for the last contract send';
