-- PROPOSAL — do not apply until reviewed. Do not run from the app.
-- Phase A: athlete monthly fees, waived-month audit, cash receipts, and
-- payment allocations. Run manually in the Supabase SQL Editor only after
-- approval. Do NOT apply from Vercel / the Next.js app.
--
-- Requires:
--   008_bank_imports.sql (already applied in production)
--   009_coaches_groups_attendance.sql (athletes, memberships, btree_gist)
--
-- This file does NOT:
--   - edit 008_bank_imports.sql
--   - UPDATE or DELETE existing bank_imports / bank_transactions rows
--   - backfill payment_allocations from registration_id / status
--   - change /admin/mokejimai application code
--
-- Applying 012 changes schema + privileges + future delete behavior
-- (bank_imports → bank_transactions ON DELETE RESTRICT instead of CASCADE).
-- Existing credit rows remain as they are, including registration_id and
-- status (legacy hints until a later UI phase).
--
-- WHY THIS FILE EXISTS
-- Club fees are per-athlete and change over time. One SEB credit (or one
-- cash receipt) may cover several children and/or months. EXPECTED (monthly
-- charge) and PAID (allocations) are different facts. Cash must not be stored
-- as a fake SEB row. Waived months must remain auditable (not deleted).
--
-- Identity: allocations and charges reference public.athletes.id only.
-- Earliest billing month: 2026-09-01.
-- Rate used for generation: the rate covering the 1st of the billing month.
-- Membership: any overlapping day in the month => full month (no prorating).
-- Generation is admin-triggered, idempotent, and never overwrites a charge.
-- An athlete with no applicable fee rate is skipped (no hidden 69 EUR default
-- in the database; the admin UI may later offer 69 EUR as a form default).
--
-- Advisory lock namespaces (distinct from 010's 392841):
--   512047 bank allocation source
--   512048 cash allocation source
--   512049 athlete fee rates
--   512050 monthly charges (generate / override / waive)
--
-- Execute on RPCs is granted only to service_role. Coaches/anon/authenticated
-- cannot read or write these tables. Admin cookie auth is unchanged.

create extension if not exists btree_gist with schema extensions;

set search_path = public, extensions, pg_catalog;

-- ---------------------------------------------------------------------------
-- 008 follow-up: imported credits must not vanish if an import batch is deleted
-- Schema-only. Does not rewrite bank_transactions rows.
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint as c
    join pg_class as t on t.oid = c.conrelid
    join pg_namespace as n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'bank_transactions'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike '%bank_import_id%'
  loop
    execute format(
      'alter table public.bank_transactions drop constraint %I',
      r.conname
    );
  end loop;
end
$$;

alter table public.bank_transactions
  add constraint bank_transactions_bank_import_id_fkey
  foreign key (bank_import_id)
  references public.bank_imports(id)
  on delete restrict;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.athlete_fee_rates (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  amount_cents integer not null,
  valid_from date not null,
  valid_to date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint athlete_fee_rates_amount_cents_check
    check (amount_cents > 0),
  constraint athlete_fee_rates_dates_check
    check (valid_to is null or valid_to > valid_from),
  constraint athlete_fee_rates_no_overlap
    exclude using gist (
      athlete_id with =,
      daterange(valid_from, valid_to, '[)') with &&
    )
);

comment on table public.athlete_fee_rates is
  'Per-athlete monthly tariff history. Admin-only. No club-wide default amount. Never expose via the public anon client. Do not UPDATE amount_cents to rewrite billed history — monthly charges snapshot expected_amount_cents.';

comment on column public.athlete_fee_rates.amount_cents is
  'Monthly tariff in cents while this period applies. There is no database default of 69 EUR.';

comment on column public.athlete_fee_rates.valid_from is
  'Inclusive start. Generation uses the rate covering the 1st of the billing month; a mid-month valid_from applies from the next month.';

comment on column public.athlete_fee_rates.valid_to is
  'Exclusive end. NULL = current open period.';

create unique index if not exists athlete_fee_rates_one_current_idx
  on public.athlete_fee_rates (athlete_id)
  where valid_to is null;

create index if not exists athlete_fee_rates_athlete_valid_from_idx
  on public.athlete_fee_rates (athlete_id, valid_from);

create table if not exists public.athlete_monthly_charges (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  billing_month date not null,
  expected_amount_cents integer not null,
  source text not null,
  waived boolean not null default false,
  waived_at timestamptz,
  waived_note text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  effective_expected_cents integer generated always as (
    case when waived then 0 else expected_amount_cents end
  ) stored,

  constraint athlete_monthly_charges_billing_month_first_check
    check (billing_month = date_trunc('month', billing_month)::date),
  constraint athlete_monthly_charges_earliest_month_check
    check (billing_month >= date '2026-09-01'),
  constraint athlete_monthly_charges_expected_amount_cents_check
    check (expected_amount_cents > 0),
  constraint athlete_monthly_charges_source_check
    check (source in ('generated', 'manual')),
  constraint athlete_monthly_charges_waived_state_check
    check (
      (not waived and waived_at is null and waived_note is null)
      or
      (waived and waived_at is not null)
    ),
  constraint athlete_monthly_charges_unique_month
    unique (athlete_id, billing_month)
);

comment on table public.athlete_monthly_charges is
  'EXPECTED monthly fee snapshot per athlete. Admin-only. Absence of a row = Netaikoma (not billed). waived = Atleista: historical row kept, debt uses effective_expected_cents = 0, original expected_amount_cents preserved. Never expose via the public anon client.';

comment on column public.athlete_monthly_charges.expected_amount_cents is
  'Original/normal expected amount in cents at charge time (or last admin override). Never cleared to 0 for a waiver.';

comment on column public.athlete_monthly_charges.effective_expected_cents is
  'Amount used for debt/status: 0 when waived, otherwise expected_amount_cents.';

comment on column public.athlete_monthly_charges.waived is
  'True = Atleista nuo mokesčio. Do not delete the row to waive a month.';

comment on column public.athlete_monthly_charges.billing_month is
  'First day of the billed month. Earliest allowed: 2026-09-01.';

create index if not exists athlete_monthly_charges_billing_month_idx
  on public.athlete_monthly_charges (billing_month);

create table if not exists public.cash_payments (
  id uuid primary key default gen_random_uuid(),
  paid_on date not null,
  amount_cents integer not null,
  currency text not null default 'EUR',
  note text,
  created_at timestamptz not null default now(),

  constraint cash_payments_amount_cents_check
    check (amount_cents > 0),
  constraint cash_payments_currency_check
    check (char_length(currency) = 3)
);

comment on table public.cash_payments is
  'Admin-recorded cash receipts. Not a bank_transactions row. Allocations consume this envelope. Never expose via the public anon client.';

comment on column public.cash_payments.amount_cents is
  'Cash received in cents. Unallocated remainder = amount_cents - sum(payment_allocations).';

create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  billing_month date not null,
  amount_cents integer not null,
  bank_transaction_id uuid references public.bank_transactions(id) on delete restrict,
  cash_payment_id uuid references public.cash_payments(id) on delete restrict,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payment_allocations_billing_month_first_check
    check (billing_month = date_trunc('month', billing_month)::date),
  constraint payment_allocations_earliest_month_check
    check (billing_month >= date '2026-09-01'),
  constraint payment_allocations_amount_cents_check
    check (amount_cents > 0),
  constraint payment_allocations_source_xor_check
    check (
      (bank_transaction_id is not null and cash_payment_id is null)
      or
      (bank_transaction_id is null and cash_payment_id is not null)
    )
);

comment on table public.payment_allocations is
  'PAID lines toward an athlete/month. Source is exactly one of bank_transaction_id (Bankas) or cash_payment_id (Grynieji). Monthly paid totals MUST sum this table only. Admin-only. Never expose via the public anon client.';

comment on column public.payment_allocations.athlete_id is
  'Durable billed child. Do not allocate to registrations that have no athlete.';

comment on column public.payment_allocations.bank_transaction_id is
  'SEB credit being split. Deleting an allocation does not delete this row.';

comment on column public.payment_allocations.cash_payment_id is
  'Cash receipt being split. Deleting an allocation does not delete this row.';

create unique index if not exists payment_allocations_bank_line_idx
  on public.payment_allocations (bank_transaction_id, athlete_id, billing_month)
  where bank_transaction_id is not null;

create unique index if not exists payment_allocations_cash_line_idx
  on public.payment_allocations (cash_payment_id, athlete_id, billing_month)
  where cash_payment_id is not null;

create index if not exists payment_allocations_athlete_month_idx
  on public.payment_allocations (athlete_id, billing_month);

create index if not exists payment_allocations_bank_transaction_id_idx
  on public.payment_allocations (bank_transaction_id)
  where bank_transaction_id is not null;

create index if not exists payment_allocations_cash_payment_id_idx
  on public.payment_allocations (cash_payment_id)
  where cash_payment_id is not null;

create index if not exists payment_allocations_billing_month_idx
  on public.payment_allocations (billing_month);

-- ---------------------------------------------------------------------------
-- Views (derived balances; not a second source of truth)
-- ---------------------------------------------------------------------------

create or replace view public.bank_transaction_balances
with (security_invoker = true) as
select
  bt.id as bank_transaction_id,
  bt.amount_cents,
  coalesce(sum(pa.amount_cents), 0)::integer as allocated_cents,
  (bt.amount_cents - coalesce(sum(pa.amount_cents), 0))::integer as unallocated_cents
from public.bank_transactions as bt
left join public.payment_allocations as pa
  on pa.bank_transaction_id = bt.id
group by bt.id, bt.amount_cents;

comment on view public.bank_transaction_balances is
  'Allocated vs remaining cents per imported SEB credit. Unallocated money stays here; it is not deleted.';

create or replace view public.cash_payment_balances
with (security_invoker = true) as
select
  cp.id as cash_payment_id,
  cp.amount_cents,
  coalesce(sum(pa.amount_cents), 0)::integer as allocated_cents,
  (cp.amount_cents - coalesce(sum(pa.amount_cents), 0))::integer as unallocated_cents
from public.cash_payments as cp
left join public.payment_allocations as pa
  on pa.cash_payment_id = cp.id
group by cp.id, cp.amount_cents;

comment on view public.cash_payment_balances is
  'Allocated vs remaining cents per cash receipt.';

create or replace view public.athlete_month_payment_totals
with (security_invoker = true) as
select
  coalesce(c.athlete_id, a.athlete_id) as athlete_id,
  coalesce(c.billing_month, a.billing_month) as billing_month,
  c.expected_amount_cents,
  c.effective_expected_cents,
  c.waived,
  c.source as charge_source,
  coalesce(a.paid_cents, 0) as paid_cents
from public.athlete_monthly_charges as c
full outer join (
  select
    pa.athlete_id,
    pa.billing_month,
    sum(pa.amount_cents)::integer as paid_cents
  from public.payment_allocations as pa
  group by pa.athlete_id, pa.billing_month
) as a
  on a.athlete_id = c.athlete_id
 and a.billing_month = c.billing_month;

comment on view public.athlete_month_payment_totals is
  'EXPECTED snapshot (if any) vs PAID allocations per athlete/month. Includes prepaid months that have allocations but no charge row yet.';

-- ---------------------------------------------------------------------------
-- Trigger functions
-- ---------------------------------------------------------------------------

create or replace function public.bank_transactions_protect_imported_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.bank_import_id is distinct from old.bank_import_id
       or new.transaction_date is distinct from old.transaction_date
       or new.amount_cents is distinct from old.amount_cents
       or new.currency is distinct from old.currency
       or new.payer_name is distinct from old.payer_name
       or new.payer_account is distinct from old.payer_account
       or new.description is distinct from old.description
       or new.bank_reference is distinct from old.bank_reference
       or new.transaction_hash is distinct from old.transaction_hash
       or new.raw_fields is distinct from old.raw_fields
       or new.created_at is distinct from old.created_at then
      raise exception
        'Imported bank transaction fields cannot be changed.'
        using errcode = 'P0001';
    end if;

    if new.status = 'ignored'
       and old.status is distinct from 'ignored'
       and exists (
         select 1
         from public.payment_allocations as pa
         where pa.bank_transaction_id = new.id
       ) then
      raise exception
        'Negalima ignoruoti banko operacijos, kol yra priskyrimų. Pirmiausia pašalinkite priskyrimus.'
        using errcode = 'P0006';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.bank_transactions_protect_imported_fields() is
  'BEFORE UPDATE: freeze imported SEB facts. Allow notes, updated_at, registration_id, status. Block ignored while allocations exist.';

create or replace function public.payment_allocations_before_write()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status text;
begin
  if tg_op = 'UPDATE' then
    if new.bank_transaction_id is distinct from old.bank_transaction_id
       or new.cash_payment_id is distinct from old.cash_payment_id then
      raise exception
        'Negalima pakeisti priskyrimo šaltinio.'
        using errcode = 'P0001';
    end if;
    new.updated_at := now();
  end if;

  if new.bank_transaction_id is not null then
    select bt.status
      into v_status
    from public.bank_transactions as bt
    where bt.id = new.bank_transaction_id
    for update;

    if not found then
      raise exception 'Banko operacija nerasta.' using errcode = 'P0002';
    end if;

    if v_status = 'ignored' then
      raise exception
        'Negalima priskirti ignoruojamos banko operacijos.'
        using errcode = 'P0006';
    end if;
  elsif new.cash_payment_id is not null then
    perform 1
    from public.cash_payments as cp
    where cp.id = new.cash_payment_id
    for update;

    if not found then
      raise exception 'Grynųjų mokėjimas nerastas.' using errcode = 'P0002';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.payment_allocations_before_write() is
  'BEFORE INSERT/UPDATE: freeze allocation source FKs; lock parent; refuse ignored bank credits.';

create or replace function public.payment_allocations_enforce_source_cap()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_bank uuid;
  v_cash uuid;
  v_cap integer;
  v_sum integer;
begin
  v_bank := coalesce(new.bank_transaction_id, old.bank_transaction_id);
  v_cash := coalesce(new.cash_payment_id, old.cash_payment_id);

  if v_bank is not null then
    select bt.amount_cents
      into v_cap
    from public.bank_transactions as bt
    where bt.id = v_bank
    for update;

    if not found then
      raise exception 'Banko operacija nerasta.' using errcode = 'P0002';
    end if;

    select coalesce(sum(pa.amount_cents), 0)::integer
      into v_sum
    from public.payment_allocations as pa
    where pa.bank_transaction_id = v_bank;

    if v_sum > v_cap then
      raise exception
        'Negalima priskirti daugiau nei banko operacijos suma.'
        using errcode = 'P0005';
    end if;
  end if;

  if v_cash is not null then
    select cp.amount_cents
      into v_cap
    from public.cash_payments as cp
    where cp.id = v_cash
    for update;

    if not found then
      raise exception 'Grynųjų mokėjimas nerastas.' using errcode = 'P0002';
    end if;

    select coalesce(sum(pa.amount_cents), 0)::integer
      into v_sum
    from public.payment_allocations as pa
    where pa.cash_payment_id = v_cash;

    if v_sum > v_cap then
      raise exception
        'Negalima priskirti daugiau nei grynųjų mokėjimo suma.'
        using errcode = 'P0005';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

comment on function public.payment_allocations_enforce_source_cap() is
  'CONSTRAINT AFTER ROW: sum(allocations) for a bank or cash source cannot exceed the original amount. FOR UPDATE serializes concurrent allocators.';

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists bank_transactions_protect_imported_fields
  on public.bank_transactions;
create trigger bank_transactions_protect_imported_fields
  before update on public.bank_transactions
  for each row
  execute function public.bank_transactions_protect_imported_fields();

drop trigger if exists payment_allocations_before_write
  on public.payment_allocations;
create trigger payment_allocations_before_write
  before insert or update on public.payment_allocations
  for each row
  execute function public.payment_allocations_before_write();

drop trigger if exists payment_allocations_enforce_source_cap
  on public.payment_allocations;
create constraint trigger payment_allocations_enforce_source_cap
  after insert or update or delete on public.payment_allocations
  deferrable initially immediate
  for each row
  execute function public.payment_allocations_enforce_source_cap();

drop trigger if exists athlete_fee_rates_set_updated_at on public.athlete_fee_rates;
create trigger athlete_fee_rates_set_updated_at
  before update on public.athlete_fee_rates
  for each row
  execute function public.set_updated_at();

drop trigger if exists athlete_monthly_charges_set_updated_at
  on public.athlete_monthly_charges;
create trigger athlete_monthly_charges_set_updated_at
  before update on public.athlete_monthly_charges
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Admin RPCs (service_role only)
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_athlete_fee_rate(
  p_athlete_id uuid,
  p_amount_cents integer,
  p_valid_from date,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_exists boolean;
  v_current public.athlete_fee_rates%rowtype;
  v_id uuid;
begin
  if p_athlete_id is null or p_valid_from is null then
    raise exception 'Trūksta sportininko arba datos.' using errcode = '22023';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Tarifas turi būti teigiamas.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(512049, hashtext(p_athlete_id::text));

  select exists(select 1 from public.athletes as a where a.id = p_athlete_id)
    into v_exists;

  if not v_exists then
    raise exception 'Sportininkas nerastas.' using errcode = 'P0002';
  end if;

  perform 1
  from public.athlete_fee_rates as r
  where r.athlete_id = p_athlete_id
  for update;

  select *
    into v_current
  from public.athlete_fee_rates as r
  where r.athlete_id = p_athlete_id
    and r.valid_to is null;

  if v_current.id is not null then
    if p_valid_from < v_current.valid_from then
      raise exception
        'Naujas tarifas negali prasidėti anksčiau nei dabartinis.'
        using errcode = 'P0003';
    end if;

    if p_valid_from = v_current.valid_from then
      raise exception
        'Šiai datai tarifas jau yra. Pataisykite dabartinį tarifą.'
        using errcode = 'P0003';
    end if;

    update public.athlete_fee_rates
       set valid_to = p_valid_from
     where id = v_current.id;
  end if;

  insert into public.athlete_fee_rates (
    athlete_id,
    amount_cents,
    valid_from,
    note
  )
  values (
    p_athlete_id,
    p_amount_cents,
    p_valid_from,
    nullif(btrim(p_note), '')
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'athlete_id', p_athlete_id,
    'amount_cents', p_amount_cents,
    'valid_from', p_valid_from,
    'closed_rate_id', v_current.id
  );
exception
  when exclusion_violation or unique_violation then
    raise exception 'Tarifo laikotarpiai negali persidengti.' using errcode = 'P0004';
end;
$$;

comment on function public.admin_set_athlete_fee_rate(uuid, integer, date, text) is
  'Admin/service-role only. Close the current open rate at p_valid_from and insert a new open rate. Does not rewrite existing monthly charges. No database default of 69 EUR.';

create or replace function public.admin_correct_current_athlete_fee_rate(
  p_athlete_id uuid,
  p_amount_cents integer,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_current public.athlete_fee_rates%rowtype;
begin
  if p_athlete_id is null then
    raise exception 'Trūksta sportininko.' using errcode = '22023';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Tarifas turi būti teigiamas.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(512049, hashtext(p_athlete_id::text));

  select *
    into v_current
  from public.athlete_fee_rates as r
  where r.athlete_id = p_athlete_id
    and r.valid_to is null
  for update;

  if v_current.id is null then
    raise exception 'Dabartinis tarifas nerastas.' using errcode = 'P0002';
  end if;

  update public.athlete_fee_rates
     set amount_cents = p_amount_cents,
         note = coalesce(nullif(btrim(p_note), ''), note)
   where id = v_current.id;

  return jsonb_build_object(
    'id', v_current.id,
    'athlete_id', p_athlete_id,
    'amount_cents', p_amount_cents,
    'valid_from', v_current.valid_from,
    'existing_charges_unchanged', true
  );
end;
$$;

comment on function public.admin_correct_current_athlete_fee_rate(uuid, integer, text) is
  'Admin/service-role only. Correct the open tariff amount. Existing athlete_monthly_charges rows stay frozen.';

create or replace function public.admin_generate_monthly_charges(
  p_billing_month date
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_month date;
  v_month_end date;
  v_eligible integer := 0;
  v_with_rate integer := 0;
  v_generated integer := 0;
begin
  if p_billing_month is null then
    raise exception 'Trūksta mėnesio.' using errcode = '22023';
  end if;

  v_month := date_trunc('month', p_billing_month)::date;

  if v_month < date '2026-09-01' then
    raise exception
      'Mokesčių mėnuo negali būti ankstesnis nei 2026-09.'
      using errcode = 'P0003';
  end if;

  v_month_end := (v_month + interval '1 month' - interval '1 day')::date;

  perform pg_advisory_xact_lock(512050, hashtext(v_month::text));

  select count(*)::integer
    into v_eligible
  from (
    select distinct m.athlete_id
    from public.athlete_group_memberships as m
    where m.starts_on <= v_month_end
      and (m.ends_on is null or m.ends_on >= v_month)
  ) as e;

  select count(*)::integer
    into v_with_rate
  from (
    select distinct m.athlete_id
    from public.athlete_group_memberships as m
    join public.athlete_fee_rates as r
      on r.athlete_id = m.athlete_id
     and r.valid_from <= v_month
     and (r.valid_to is null or r.valid_to > v_month)
    where m.starts_on <= v_month_end
      and (m.ends_on is null or m.ends_on >= v_month)
  ) as w;

  insert into public.athlete_monthly_charges (
    athlete_id,
    billing_month,
    expected_amount_cents,
    source
  )
  select distinct on (m.athlete_id)
    m.athlete_id,
    v_month,
    r.amount_cents,
    'generated'
  from public.athlete_group_memberships as m
  join public.athlete_fee_rates as r
    on r.athlete_id = m.athlete_id
   and r.valid_from <= v_month
   and (r.valid_to is null or r.valid_to > v_month)
  where m.starts_on <= v_month_end
    and (m.ends_on is null or m.ends_on >= v_month)
  order by m.athlete_id
  on conflict (athlete_id, billing_month) do nothing;

  get diagnostics v_generated = row_count;

  return jsonb_build_object(
    'billing_month', v_month,
    'generated', v_generated,
    'skipped_existing', v_with_rate - v_generated,
    'skipped_no_rate', v_eligible - v_with_rate,
    'eligible_athletes', v_eligible
  );
end;
$$;

comment on function public.admin_generate_monthly_charges(date) is
  'Admin/service-role only. Insert missing monthly charges for athletes with membership overlap and a rate covering the 1st. Idempotent. Never overwrites. Refuses months before 2026-09-01. Skips athletes with no rate.';

create or replace function public.admin_override_monthly_charge_expected(
  p_athlete_id uuid,
  p_billing_month date,
  p_expected_amount_cents integer,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_month date;
  v_exists boolean;
  v_row public.athlete_monthly_charges%rowtype;
begin
  if p_athlete_id is null or p_billing_month is null then
    raise exception 'Trūksta sportininko arba mėnesio.' using errcode = '22023';
  end if;

  if p_expected_amount_cents is null or p_expected_amount_cents <= 0 then
    raise exception
      'Mėnesio mokestis turi būti teigiamas. Nulinį mokestį žymėkite kaip atleistą.'
      using errcode = '22023';
  end if;

  v_month := date_trunc('month', p_billing_month)::date;

  if v_month < date '2026-09-01' then
    raise exception
      'Mokesčių mėnuo negali būti ankstesnis nei 2026-09.'
      using errcode = 'P0003';
  end if;

  perform pg_advisory_xact_lock(512050, hashtext(p_athlete_id::text || v_month::text));

  select exists(select 1 from public.athletes as a where a.id = p_athlete_id)
    into v_exists;

  if not v_exists then
    raise exception 'Sportininkas nerastas.' using errcode = 'P0002';
  end if;

  insert into public.athlete_monthly_charges (
    athlete_id,
    billing_month,
    expected_amount_cents,
    source,
    note
  )
  values (
    p_athlete_id,
    v_month,
    p_expected_amount_cents,
    'manual',
    nullif(btrim(p_note), '')
  )
  on conflict (athlete_id, billing_month) do update
    set expected_amount_cents = excluded.expected_amount_cents,
        source = 'manual',
        note = coalesce(excluded.note, public.athlete_monthly_charges.note)
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'athlete_id', v_row.athlete_id,
    'billing_month', v_row.billing_month,
    'expected_amount_cents', v_row.expected_amount_cents,
    'effective_expected_cents', v_row.effective_expected_cents,
    'waived', v_row.waived,
    'source', v_row.source
  );
end;
$$;

comment on function public.admin_override_monthly_charge_expected(uuid, date, integer, text) is
  'Admin/service-role only. Create or correct a month''s original expected amount (source=manual). Does not change waived flags. Does not use 0 — waive instead.';

create or replace function public.admin_waive_monthly_charge(
  p_athlete_id uuid,
  p_billing_month date,
  p_note text default null,
  p_expected_amount_cents integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_month date;
  v_exists boolean;
  v_expected integer;
  v_row public.athlete_monthly_charges%rowtype;
begin
  if p_athlete_id is null or p_billing_month is null then
    raise exception 'Trūksta sportininko arba mėnesio.' using errcode = '22023';
  end if;

  v_month := date_trunc('month', p_billing_month)::date;

  if v_month < date '2026-09-01' then
    raise exception
      'Mokesčių mėnuo negali būti ankstesnis nei 2026-09.'
      using errcode = 'P0003';
  end if;

  perform pg_advisory_xact_lock(512050, hashtext(p_athlete_id::text || v_month::text));

  select exists(select 1 from public.athletes as a where a.id = p_athlete_id)
    into v_exists;

  if not v_exists then
    raise exception 'Sportininkas nerastas.' using errcode = 'P0002';
  end if;

  select *
    into v_row
  from public.athlete_monthly_charges as c
  where c.athlete_id = p_athlete_id
    and c.billing_month = v_month
  for update;

  if v_row.id is not null then
    update public.athlete_monthly_charges
       set waived = true,
           waived_at = coalesce(v_row.waived_at, now()),
           waived_note = coalesce(nullif(btrim(p_note), ''), v_row.waived_note)
     where id = v_row.id
    returning * into v_row;
  else
    v_expected := p_expected_amount_cents;

    if v_expected is null then
      select r.amount_cents
        into v_expected
      from public.athlete_fee_rates as r
      where r.athlete_id = p_athlete_id
        and r.valid_from <= v_month
        and (r.valid_to is null or r.valid_to > v_month)
      limit 1;
    end if;

    if v_expected is null or v_expected <= 0 then
      raise exception
        'Nėra mėnesio mokesčio ir tarifo. Nurodykite atleidžiamos sumos originalą.'
        using errcode = 'P0003';
    end if;

    insert into public.athlete_monthly_charges (
      athlete_id,
      billing_month,
      expected_amount_cents,
      source,
      waived,
      waived_at,
      waived_note
    )
    values (
      p_athlete_id,
      v_month,
      v_expected,
      'manual',
      true,
      now(),
      nullif(btrim(p_note), '')
    )
    returning * into v_row;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'athlete_id', v_row.athlete_id,
    'billing_month', v_row.billing_month,
    'expected_amount_cents', v_row.expected_amount_cents,
    'effective_expected_cents', v_row.effective_expected_cents,
    'waived', v_row.waived,
    'waived_at', v_row.waived_at,
    'waived_note', v_row.waived_note
  );
end;
$$;

comment on function public.admin_waive_monthly_charge(uuid, date, text, integer) is
  'Admin/service-role only. Mark a month Atleista. Keeps expected_amount_cents. effective_expected_cents becomes 0. Does not delete the charge.';

create or replace function public.admin_unwaive_monthly_charge(
  p_athlete_id uuid,
  p_billing_month date
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_month date;
  v_row public.athlete_monthly_charges%rowtype;
begin
  if p_athlete_id is null or p_billing_month is null then
    raise exception 'Trūksta sportininko arba mėnesio.' using errcode = '22023';
  end if;

  v_month := date_trunc('month', p_billing_month)::date;

  perform pg_advisory_xact_lock(512050, hashtext(p_athlete_id::text || v_month::text));

  select *
    into v_row
  from public.athlete_monthly_charges as c
  where c.athlete_id = p_athlete_id
    and c.billing_month = v_month
  for update;

  if v_row.id is null then
    raise exception 'Mėnesio mokestis nerastas.' using errcode = 'P0002';
  end if;

  update public.athlete_monthly_charges
     set waived = false,
         waived_at = null,
         waived_note = null
   where id = v_row.id
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'athlete_id', v_row.athlete_id,
    'billing_month', v_row.billing_month,
    'expected_amount_cents', v_row.expected_amount_cents,
    'effective_expected_cents', v_row.effective_expected_cents,
    'waived', v_row.waived
  );
end;
$$;

comment on function public.admin_unwaive_monthly_charge(uuid, date) is
  'Admin/service-role only. Reverse a waiver. Debt again uses expected_amount_cents.';

create or replace function public.admin_allocate_bank_payment(
  p_bank_transaction_id uuid,
  p_athlete_id uuid,
  p_billing_month date,
  p_amount_cents integer,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_month date;
  v_status text;
  v_cap integer;
  v_id uuid;
begin
  if p_bank_transaction_id is null or p_athlete_id is null or p_billing_month is null then
    raise exception 'Trūksta banko operacijos, sportininko arba mėnesio.' using errcode = '22023';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Priskiriama suma turi būti teigiama.' using errcode = '22023';
  end if;

  v_month := date_trunc('month', p_billing_month)::date;

  if v_month < date '2026-09-01' then
    raise exception
      'Mokesčių mėnuo negali būti ankstesnis nei 2026-09.'
      using errcode = 'P0003';
  end if;

  if not exists (select 1 from public.athletes as a where a.id = p_athlete_id) then
    raise exception 'Sportininkas nerastas.' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(512047, hashtext(p_bank_transaction_id::text));

  select bt.status, bt.amount_cents
    into v_status, v_cap
  from public.bank_transactions as bt
  where bt.id = p_bank_transaction_id
  for update;

  if not found then
    raise exception 'Banko operacija nerasta.' using errcode = 'P0002';
  end if;

  if v_status = 'ignored' then
    raise exception
      'Negalima priskirti ignoruojamos banko operacijos.'
      using errcode = 'P0006';
  end if;

  insert into public.payment_allocations (
    athlete_id,
    billing_month,
    amount_cents,
    bank_transaction_id,
    note
  )
  values (
    p_athlete_id,
    v_month,
    p_amount_cents,
    p_bank_transaction_id,
    nullif(btrim(p_note), '')
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'athlete_id', p_athlete_id,
    'billing_month', v_month,
    'amount_cents', p_amount_cents,
    'bank_transaction_id', p_bank_transaction_id,
    'source', 'bank'
  );
exception
  when unique_violation then
    raise exception
      'Ši banko operacija šiam vaikui ir mėnesiui jau priskirta. Pataisykite sumą.'
      using errcode = 'P0004';
end;
$$;

comment on function public.admin_allocate_bank_payment(uuid, uuid, date, integer, text) is
  'Admin/service-role only. Allocate part of an imported SEB credit to one athlete/month. Locks the bank row. Cap enforced by constraint trigger. Does not create a charge row.';

create or replace function public.admin_allocate_cash_payment(
  p_cash_payment_id uuid,
  p_athlete_id uuid,
  p_billing_month date,
  p_amount_cents integer,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_month date;
  v_id uuid;
begin
  if p_cash_payment_id is null or p_athlete_id is null or p_billing_month is null then
    raise exception 'Trūksta grynųjų mokėjimo, sportininko arba mėnesio.' using errcode = '22023';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Priskiriama suma turi būti teigiama.' using errcode = '22023';
  end if;

  v_month := date_trunc('month', p_billing_month)::date;

  if v_month < date '2026-09-01' then
    raise exception
      'Mokesčių mėnuo negali būti ankstesnis nei 2026-09.'
      using errcode = 'P0003';
  end if;

  if not exists (select 1 from public.athletes as a where a.id = p_athlete_id) then
    raise exception 'Sportininkas nerastas.' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(512048, hashtext(p_cash_payment_id::text));

  perform 1
  from public.cash_payments as cp
  where cp.id = p_cash_payment_id
  for update;

  if not found then
    raise exception 'Grynųjų mokėjimas nerastas.' using errcode = 'P0002';
  end if;

  insert into public.payment_allocations (
    athlete_id,
    billing_month,
    amount_cents,
    cash_payment_id,
    note
  )
  values (
    p_athlete_id,
    v_month,
    p_amount_cents,
    p_cash_payment_id,
    nullif(btrim(p_note), '')
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'athlete_id', p_athlete_id,
    'billing_month', v_month,
    'amount_cents', p_amount_cents,
    'cash_payment_id', p_cash_payment_id,
    'source', 'cash'
  );
exception
  when unique_violation then
    raise exception
      'Šis grynųjų mokėjimas šiam vaikui ir mėnesiui jau priskirtas. Pataisykite sumą.'
      using errcode = 'P0004';
end;
$$;

comment on function public.admin_allocate_cash_payment(uuid, uuid, date, integer, text) is
  'Admin/service-role only. Allocate remaining cash to another athlete/month. Locks the cash row. Cap enforced by constraint trigger.';

create or replace function public.admin_record_cash_payment(
  p_athlete_id uuid,
  p_amount_cents integer,
  p_paid_on date,
  p_billing_month date,
  p_note text default null,
  p_allocate_amount_cents integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_month date;
  v_allocate integer;
  v_cash_id uuid;
  v_allocation_id uuid;
begin
  if p_athlete_id is null or p_paid_on is null or p_billing_month is null then
    raise exception 'Trūksta sportininko, datos arba mėnesio.' using errcode = '22023';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Grynųjų suma turi būti teigiama.' using errcode = '22023';
  end if;

  v_allocate := coalesce(p_allocate_amount_cents, p_amount_cents);

  if v_allocate <= 0 then
    raise exception 'Priskiriama suma turi būti teigiama.' using errcode = '22023';
  end if;

  if v_allocate > p_amount_cents then
    raise exception
      'Negalima priskirti daugiau nei grynųjų mokėjimo suma.'
      using errcode = 'P0005';
  end if;

  v_month := date_trunc('month', p_billing_month)::date;

  if v_month < date '2026-09-01' then
    raise exception
      'Mokesčių mėnuo negali būti ankstesnis nei 2026-09.'
      using errcode = 'P0003';
  end if;

  if not exists (select 1 from public.athletes as a where a.id = p_athlete_id) then
    raise exception 'Sportininkas nerastas.' using errcode = 'P0002';
  end if;

  insert into public.cash_payments (
    paid_on,
    amount_cents,
    note
  )
  values (
    p_paid_on,
    p_amount_cents,
    nullif(btrim(p_note), '')
  )
  returning id into v_cash_id;

  perform pg_advisory_xact_lock(512048, hashtext(v_cash_id::text));

  insert into public.payment_allocations (
    athlete_id,
    billing_month,
    amount_cents,
    cash_payment_id,
    note
  )
  values (
    p_athlete_id,
    v_month,
    v_allocate,
    v_cash_id,
    nullif(btrim(p_note), '')
  )
  returning id into v_allocation_id;

  return jsonb_build_object(
    'cash_payment_id', v_cash_id,
    'allocation_id', v_allocation_id,
    'athlete_id', p_athlete_id,
    'billing_month', v_month,
    'amount_cents', p_amount_cents,
    'allocated_cents', v_allocate,
    'source', 'cash'
  );
end;
$$;

comment on function public.admin_record_cash_payment(uuid, integer, date, date, text, integer) is
  'Admin/service-role only. Insert a cash receipt and its first allocation in one transaction. Optional p_allocate_amount_cents < amount leaves remainder for a later split. Not a bank_transactions row.';

create or replace function public.admin_update_payment_allocation(
  p_allocation_id uuid,
  p_amount_cents integer default null,
  p_athlete_id uuid default null,
  p_billing_month date default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row public.payment_allocations%rowtype;
  v_month date;
  v_amount integer;
  v_athlete uuid;
begin
  if p_allocation_id is null then
    raise exception 'Trūksta priskyrimo.' using errcode = '22023';
  end if;

  -- Lock the payment source first (same order as allocate) to avoid deadlocks,
  -- then lock the allocation row.
  select *
    into v_row
  from public.payment_allocations as pa
  where pa.id = p_allocation_id;

  if v_row.id is null then
    raise exception 'Priskyrimas nerastas.' using errcode = 'P0002';
  end if;

  if v_row.bank_transaction_id is not null then
    perform pg_advisory_xact_lock(512047, hashtext(v_row.bank_transaction_id::text));
    perform 1
    from public.bank_transactions as bt
    where bt.id = v_row.bank_transaction_id
    for update;
  else
    perform pg_advisory_xact_lock(512048, hashtext(v_row.cash_payment_id::text));
    perform 1
    from public.cash_payments as cp
    where cp.id = v_row.cash_payment_id
    for update;
  end if;

  select *
    into v_row
  from public.payment_allocations as pa
  where pa.id = p_allocation_id
  for update;

  if v_row.id is null then
    raise exception 'Priskyrimas nerastas.' using errcode = 'P0002';
  end if;

  v_amount := coalesce(p_amount_cents, v_row.amount_cents);
  v_athlete := coalesce(p_athlete_id, v_row.athlete_id);
  v_month := date_trunc('month', coalesce(p_billing_month, v_row.billing_month))::date;

  if v_amount <= 0 then
    raise exception 'Priskiriama suma turi būti teigiama.' using errcode = '22023';
  end if;

  if v_month < date '2026-09-01' then
    raise exception
      'Mokesčių mėnuo negali būti ankstesnis nei 2026-09.'
      using errcode = 'P0003';
  end if;

  if not exists (select 1 from public.athletes as a where a.id = v_athlete) then
    raise exception 'Sportininkas nerastas.' using errcode = 'P0002';
  end if;

  update public.payment_allocations
     set amount_cents = v_amount,
         athlete_id = v_athlete,
         billing_month = v_month,
         note = case
           when p_note is null then note
           else nullif(btrim(p_note), '')
         end
   where id = p_allocation_id
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'athlete_id', v_row.athlete_id,
    'billing_month', v_row.billing_month,
    'amount_cents', v_row.amount_cents,
    'bank_transaction_id', v_row.bank_transaction_id,
    'cash_payment_id', v_row.cash_payment_id
  );
exception
  when unique_violation then
    raise exception
      'Toks priskyrimas šiam šaltiniui, vaikui ir mėnesiui jau yra.'
      using errcode = 'P0004';
end;
$$;

comment on function public.admin_update_payment_allocation(uuid, integer, uuid, date, text) is
  'Admin/service-role only. Change allocation amount/athlete/month/note. Cannot change bank vs cash source. Locks the parent row before updating.';

create or replace function public.admin_delete_payment_allocation(
  p_allocation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row public.payment_allocations%rowtype;
begin
  if p_allocation_id is null then
    raise exception 'Trūksta priskyrimo.' using errcode = '22023';
  end if;

  select *
    into v_row
  from public.payment_allocations as pa
  where pa.id = p_allocation_id;

  if v_row.id is null then
    raise exception 'Priskyrimas nerastas.' using errcode = 'P0002';
  end if;

  if v_row.bank_transaction_id is not null then
    perform pg_advisory_xact_lock(512047, hashtext(v_row.bank_transaction_id::text));
    perform 1
    from public.bank_transactions as bt
    where bt.id = v_row.bank_transaction_id
    for update;
  else
    perform pg_advisory_xact_lock(512048, hashtext(v_row.cash_payment_id::text));
    perform 1
    from public.cash_payments as cp
    where cp.id = v_row.cash_payment_id
    for update;
  end if;

  select *
    into v_row
  from public.payment_allocations as pa
  where pa.id = p_allocation_id
  for update;

  if v_row.id is null then
    raise exception 'Priskyrimas nerastas.' using errcode = 'P0002';
  end if;

  delete from public.payment_allocations
  where id = p_allocation_id;

  return jsonb_build_object(
    'id', v_row.id,
    'deleted', true,
    'bank_transaction_id', v_row.bank_transaction_id,
    'cash_payment_id', v_row.cash_payment_id
  );
end;
$$;

comment on function public.admin_delete_payment_allocation(uuid) is
  'Admin/service-role only. Remove an allocation. Does not delete the original bank transaction or cash receipt. Remainder becomes unallocated on the source.';

-- ---------------------------------------------------------------------------
-- Privileges: no anon / authenticated access. service_role only.
-- ---------------------------------------------------------------------------

revoke all on table public.athlete_fee_rates from public, anon, authenticated;
revoke all on table public.athlete_monthly_charges from public, anon, authenticated;
revoke all on table public.cash_payments from public, anon, authenticated;
revoke all on table public.payment_allocations from public, anon, authenticated;
revoke all on table public.bank_transaction_balances from public, anon, authenticated;
revoke all on table public.cash_payment_balances from public, anon, authenticated;
revoke all on table public.athlete_month_payment_totals from public, anon, authenticated;

revoke all on table public.bank_imports from public, anon, authenticated;
revoke all on table public.bank_transactions from public, anon, authenticated;

grant all on table public.athlete_fee_rates to service_role;
grant all on table public.athlete_monthly_charges to service_role;
grant all on table public.cash_payments to service_role;
grant all on table public.payment_allocations to service_role;
grant select on table public.bank_transaction_balances to service_role;
grant select on table public.cash_payment_balances to service_role;
grant select on table public.athlete_month_payment_totals to service_role;
grant all on table public.bank_imports to service_role;
grant all on table public.bank_transactions to service_role;

alter table public.athlete_fee_rates enable row level security;
alter table public.athlete_monthly_charges enable row level security;
alter table public.cash_payments enable row level security;
alter table public.payment_allocations enable row level security;

revoke all on function public.bank_transactions_protect_imported_fields() from public, anon, authenticated;
revoke all on function public.payment_allocations_before_write() from public, anon, authenticated;
revoke all on function public.payment_allocations_enforce_source_cap() from public, anon, authenticated;
revoke all on function public.admin_set_athlete_fee_rate(uuid, integer, date, text) from public, anon, authenticated;
revoke all on function public.admin_correct_current_athlete_fee_rate(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.admin_generate_monthly_charges(date) from public, anon, authenticated;
revoke all on function public.admin_override_monthly_charge_expected(uuid, date, integer, text) from public, anon, authenticated;
revoke all on function public.admin_waive_monthly_charge(uuid, date, text, integer) from public, anon, authenticated;
revoke all on function public.admin_unwaive_monthly_charge(uuid, date) from public, anon, authenticated;
revoke all on function public.admin_allocate_bank_payment(uuid, uuid, date, integer, text) from public, anon, authenticated;
revoke all on function public.admin_allocate_cash_payment(uuid, uuid, date, integer, text) from public, anon, authenticated;
revoke all on function public.admin_record_cash_payment(uuid, integer, date, date, text, integer) from public, anon, authenticated;
revoke all on function public.admin_update_payment_allocation(uuid, integer, uuid, date, text) from public, anon, authenticated;
revoke all on function public.admin_delete_payment_allocation(uuid) from public, anon, authenticated;

grant execute on function public.bank_transactions_protect_imported_fields() to service_role;
grant execute on function public.payment_allocations_before_write() to service_role;
grant execute on function public.payment_allocations_enforce_source_cap() to service_role;
grant execute on function public.admin_set_athlete_fee_rate(uuid, integer, date, text) to service_role;
grant execute on function public.admin_correct_current_athlete_fee_rate(uuid, integer, text) to service_role;
grant execute on function public.admin_generate_monthly_charges(date) to service_role;
grant execute on function public.admin_override_monthly_charge_expected(uuid, date, integer, text) to service_role;
grant execute on function public.admin_waive_monthly_charge(uuid, date, text, integer) to service_role;
grant execute on function public.admin_unwaive_monthly_charge(uuid, date) to service_role;
grant execute on function public.admin_allocate_bank_payment(uuid, uuid, date, integer, text) to service_role;
grant execute on function public.admin_allocate_cash_payment(uuid, uuid, date, integer, text) to service_role;
grant execute on function public.admin_record_cash_payment(uuid, integer, date, date, text, integer) to service_role;
grant execute on function public.admin_update_payment_allocation(uuid, integer, uuid, date, text) to service_role;
grant execute on function public.admin_delete_payment_allocation(uuid) to service_role;
