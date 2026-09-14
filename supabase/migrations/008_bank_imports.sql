-- Admin-only SEB bank statement import and payment review.
-- Run manually in Supabase SQL Editor after 007_add_waitlist_flag.sql.
-- Do not expose these tables through the anon/authenticated Supabase clients.

create table if not exists public.bank_imports (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  file_hash text not null unique,
  rows_total integer not null default 0,
  rows_imported integer not null default 0,
  rows_skipped integer not null default 0,
  imported_at timestamptz not null default now()
);

comment on table public.bank_imports is
  'Admin-only SEB bank statement import batches. Never expose via the public anon client.';

comment on column public.bank_imports.file_hash is
  'SHA-256 hash of the uploaded statement file; prevents importing the same file twice.';

comment on column public.bank_imports.rows_total is
  'Number of rows found in the statement file.';

comment on column public.bank_imports.rows_imported is
  'Number of incoming transactions inserted from this import.';

comment on column public.bank_imports.rows_skipped is
  'Number of rows skipped (outgoing, invalid, or duplicate transaction_hash).';

alter table public.bank_imports enable row level security;

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  bank_import_id uuid not null references public.bank_imports(id) on delete cascade,
  transaction_date date not null,
  amount_cents integer not null,
  currency text not null default 'EUR',
  payer_name text,
  payer_account text,
  description text,
  bank_reference text,
  transaction_hash text not null unique,
  registration_id uuid references public.registrations(id) on delete set null,
  status text not null default 'unassigned',
  notes text,
  raw_fields jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bank_transactions_amount_cents_check check (amount_cents > 0),
  constraint bank_transactions_status_check check (
    status in ('unassigned', 'assigned', 'confirmed', 'ignored')
  )
);

comment on table public.bank_transactions is
  'Admin-only incoming bank payments from imported SEB statements. Never expose via the public anon client.';

comment on column public.bank_transactions.amount_cents is
  'Incoming payment amount in cents. Outgoing/debit rows are not stored.';

comment on column public.bank_transactions.transaction_hash is
  'Canonical hash of the bank row; prevents duplicate transactions across overlapping statements.';

comment on column public.bank_transactions.registration_id is
  'Optional manual link to an existing registration. Does not change registration status, waitlist, or contracts.';

comment on column public.bank_transactions.raw_fields is
  'Parsed statement fields for later review. The original CSV file is not stored.';

comment on column public.bank_transactions.payer_account is
  'Payer IBAN or account number. Admin-only; do not log or expose on public routes.';

create index if not exists bank_transactions_status_idx
  on public.bank_transactions (status);

create index if not exists bank_transactions_transaction_date_idx
  on public.bank_transactions (transaction_date desc);

create index if not exists bank_transactions_bank_import_id_idx
  on public.bank_transactions (bank_import_id);

create index if not exists bank_transactions_registration_id_idx
  on public.bank_transactions (registration_id)
  where registration_id is not null;

alter table public.bank_transactions enable row level security;
