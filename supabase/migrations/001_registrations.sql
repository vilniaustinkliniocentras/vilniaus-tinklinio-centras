-- Vilniaus tinklinio centras: registrations table
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  parent_name text not null,
  parent_email text not null,
  parent_phone text not null,
  child_name text not null,
  child_birth_date date not null,
  volleyball_experience text not null,
  preferred_training_times text not null,
  additional_comments text,
  privacy_consent boolean not null default false,
  status text not null default 'new',
  created_at timestamptz not null default now(),

  constraint registrations_privacy_consent_check check (privacy_consent = true),
  constraint registrations_status_check check (status in ('new', 'contacted', 'accepted', 'rejected'))
);

create index if not exists registrations_created_at_idx
  on public.registrations (created_at desc);

create index if not exists registrations_status_idx
  on public.registrations (status);

alter table public.registrations enable row level security;

-- Public (anon) users may INSERT only; cannot read, update, or delete
create policy "registrations_public_insert"
  on public.registrations
  for insert
  to anon, authenticated
  with check (privacy_consent = true);

-- Explicitly deny SELECT for anon/authenticated via RLS default (no select policy = denied)
-- Admin reads use the service role key on the server only (bypasses RLS)

comment on table public.registrations is 'VTC child training registration submissions from the public website';
