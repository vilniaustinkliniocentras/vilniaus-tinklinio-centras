-- Coaches / Groups / Attendance — schema and security foundation.
-- Run manually in the Supabase SQL Editor after 008_bank_imports.sql.
-- Do NOT apply this file from the app. Admin continues to use the service role
-- after isAdminAuthenticated(); this migration does not change ADMIN_PASSWORD auth.
--
-- Required extension: btree_gist (for the membership date-range exclusion).
-- Hosted Supabase already has schema extensions; IF NOT EXISTS is safe if the
-- extension was enabled earlier.

-- ---------------------------------------------------------------------------
-- Domain notes
-- ---------------------------------------------------------------------------
-- public.registrations = applications from the public website (parent contacts,
--   status, waitlist, contract and payment links). It is NOT a roster.
-- public.athletes = actual attending children. Snapshot of child_name and
--   child_birth_date only. Do not copy parent contacts, registration status,
--   waitlist, contract or payment data here. Coaches must never SELECT
--   registrations, contracts, signed contracts, or bank tables.
-- public.athlete_group_memberships preserves group history via starts_on/ends_on.
--   ends_on IS NULL means the membership is current. An athlete belongs to at
--   most one group on any calendar date (inclusive ranges; open-ended current
--   memberships included). Valid transfer: close old membership, start the new
--   one on a later date.
-- Coach access is intentionally narrow: these tables contain minors' data.

create extension if not exists btree_gist with schema extensions;

-- gist operator classes for uuid live with btree_gist (schema extensions on
-- hosted Supabase). Keep them visible for the membership exclusion constraint.
set search_path = public, extensions, pg_catalog;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.athletes (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations(id) on delete restrict,
  child_name text not null,
  child_birth_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.athletes is
  'Actual attending children. Distinct from public.registrations (applications + parent contacts). Snapshot child_name/child_birth_date only; coaches must never query registrations.';

comment on column public.athletes.registration_id is
  'Link back to the originating application. Admin/service-role only for joining; not for coach reads of parent data.';

comment on column public.athletes.child_name is
  'Snapshot of the child name at athlete creation. Not a live copy of registrations.child_name.';

comment on column public.athletes.child_birth_date is
  'Snapshot of the child birth date at athlete creation. Used for age grouping without exposing parent contacts.';

create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  full_name text not null,
  email text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.coaches is
  'Coach profiles linked to Supabase Auth users. Access is limited because athlete and attendance rows contain minors'' data. Inactive coaches have no RLS access.';

comment on column public.coaches.auth_user_id is
  'Supabase Auth user id. Coach RLS is always auth.uid() = auth_user_id AND coaches.active = true.';

create table if not exists public.training_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.training_groups is
  'Canonical operational training groups for roster and attendance. Do not auto-migrate registrations.training_group free-text strings into this table. Not the public website dropdown.';

create table if not exists public.coach_group_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  training_group_id uuid not null references public.training_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (coach_id, training_group_id)
);

comment on table public.coach_group_assignments is
  'Which groups a coach may see. Coaches cannot read other coaches'' assignments or unassigned groups.';

create table if not exists public.athlete_group_memberships (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  training_group_id uuid not null references public.training_groups(id) on delete restrict,
  starts_on date not null,
  ends_on date,
  created_at timestamptz not null default now(),
  constraint athlete_group_memberships_dates_check
    check (ends_on is null or ends_on >= starts_on),
  -- Inclusive ranges: [starts_on, ends_on]. NULL ends_on = [starts_on, infinity).
  -- Adjacent days do not overlap (end on D, start next on D+1). Same-day
  -- end+start is rejected so an athlete is in only one group per calendar date.
  constraint athlete_group_memberships_no_overlap
    exclude using gist (
      athlete_id with =,
      daterange(starts_on, ends_on, '[]') with &&
    )
);

comment on table public.athlete_group_memberships is
  'Group membership history. ends_on IS NULL = current membership. Exclusion constraint: one group per athlete per calendar date, including open-ended ranges. Transfer workflow: set ends_on, then insert a new membership starting after that date.';

comment on column public.athlete_group_memberships.ends_on is
  'NULL means the athlete is currently in this group. Closing a membership sets ends_on and preserves history.';

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  training_group_id uuid not null references public.training_groups(id) on delete restrict,
  session_date date not null,
  starts_at time,
  ends_at time,
  created_by_coach_id uuid references public.coaches(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (training_group_id, session_date)
);

comment on table public.training_sessions is
  'One training session per group per calendar date. Coaches may create/update sessions only for assigned groups. training_group_id and session_date become immutable once attendance exists.';

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  training_session_id uuid not null references public.training_sessions(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  status text not null,
  marked_by_coach_id uuid references public.coaches(id) on delete set null,
  marked_at timestamptz not null default now(),
  notes text,
  unique (training_session_id, athlete_id),
  constraint attendance_status_check
    check (status in ('present', 'absent', 'excused'))
);

comment on table public.attendance is
  'Per-session attendance for minors. Coaches may write rows only for assigned groups and only when the athlete is a member of that group on session_date. athlete_id and training_session_id are immutable.';

comment on column public.attendance.status is
  'present = Dalyvavo, absent = Nedalyvavo, excused = Pateisinta.';

-- Fast path for the common "one current membership" case. The gist exclusion
-- already prevents two overlapping open-ended ranges; this unique index keeps
-- that invariant cheap to enforce and simple to diagnose.
create unique index if not exists athlete_group_memberships_one_current_idx
  on public.athlete_group_memberships (athlete_id)
  where ends_on is null;

-- Unique constraints already index:
--   athletes.registration_id
--   coaches.auth_user_id
--   coach_group_assignments (coach_id, training_group_id)
--   training_sessions (training_group_id, session_date)
--   attendance (training_session_id, athlete_id)
create index if not exists coach_group_assignments_training_group_id_idx
  on public.coach_group_assignments (training_group_id);

create index if not exists athlete_group_memberships_group_dates_idx
  on public.athlete_group_memberships (training_group_id, starts_on, ends_on);

create index if not exists athlete_group_memberships_athlete_id_idx
  on public.athlete_group_memberships (athlete_id);

create index if not exists attendance_athlete_id_idx
  on public.attendance (athlete_id);

-- ---------------------------------------------------------------------------
-- Registrations INSERT: anon only
-- Public website visitors keep inserting applications. Authenticated coaches
-- must not inherit that insert policy. SELECT/UPDATE policies are unchanged
-- (still none for anon/authenticated; admin uses the service role).
-- ---------------------------------------------------------------------------

drop policy if exists "registrations_public_insert" on public.registrations;

create policy "registrations_public_insert"
  on public.registrations
  for insert
  to anon
  with check (privacy_consent = true);

comment on table public.registrations is
  'Public website applications (parent contacts, status, waitlist, contracts). Not the attending-child roster — that is public.athletes. Anon may INSERT only; coaches have no registrations access.';

-- ---------------------------------------------------------------------------
-- Helper functions
-- RLS helpers are SECURITY DEFINER to avoid policy recursion. They return only
-- uuid/boolean, never registration/parent/contract/payment rows. Trigger
-- helpers that must observe attendance regardless of RLS are also DEFINER.
-- ---------------------------------------------------------------------------

create or replace function public.current_active_coach_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select c.id
  from public.coaches as c
  where c.auth_user_id = (select auth.uid())
    and c.active = true
  limit 1
$$;

comment on function public.current_active_coach_id() is
  'Active coach id for auth.uid(), or null. RLS helper. Does not read registrations or parent data.';

create or replace function public.coach_has_training_group(p_training_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.coach_group_assignments as a
    join public.coaches as c on c.id = a.coach_id
    where a.training_group_id = p_training_group_id
      and c.auth_user_id = (select auth.uid())
      and c.active = true
  )
$$;

comment on function public.coach_has_training_group(uuid) is
  'True when the current Auth user is an active coach assigned to the given operational training group.';

create or replace function public.coach_can_access_session(p_training_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.training_sessions as s
    join public.coach_group_assignments as a on a.training_group_id = s.training_group_id
    join public.coaches as c on c.id = a.coach_id
    where s.id = p_training_session_id
      and c.auth_user_id = (select auth.uid())
      and c.active = true
  )
$$;

comment on function public.coach_can_access_session(uuid) is
  'True when the current active coach is assigned to the session''s training group.';

create or replace function public.athlete_belongs_to_session(
  p_athlete_id uuid,
  p_training_session_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.training_sessions as s
    join public.athlete_group_memberships as m
      on m.training_group_id = s.training_group_id
     and m.athlete_id = p_athlete_id
    where s.id = p_training_session_id
      and m.starts_on <= s.session_date
      and (m.ends_on is null or m.ends_on >= s.session_date)
  )
$$;

comment on function public.athlete_belongs_to_session(uuid, uuid) is
  'True when the athlete has a membership in the session''s group covering session_date.';

-- Current/future roster in assigned groups, or a name needed to render
-- attendance the coach already has in those groups. RLS cannot take a
-- session_date parameter, so "today" uses Europe/Vilnius. Safer/minimal vs
-- exposing every historical member of the group.
create or replace function public.coach_can_select_athlete(p_athlete_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    exists (
      select 1
      from public.athlete_group_memberships as m
      join public.coach_group_assignments as a
        on a.training_group_id = m.training_group_id
      join public.coaches as c on c.id = a.coach_id
      where m.athlete_id = p_athlete_id
        and c.auth_user_id = (select auth.uid())
        and c.active = true
        and (m.ends_on is null or m.ends_on >= (timezone('Europe/Vilnius', now()))::date)
    )
    or exists (
      select 1
      from public.attendance as att
      join public.training_sessions as s on s.id = att.training_session_id
      join public.coach_group_assignments as a
        on a.training_group_id = s.training_group_id
      join public.coaches as c on c.id = a.coach_id
      where att.athlete_id = p_athlete_id
        and c.auth_user_id = (select auth.uid())
        and c.active = true
    )
$$;

comment on function public.coach_can_select_athlete(uuid) is
  'True when the athlete is on the coach''s current/future assigned roster, or has attendance on a session in an assigned group. Boolean only; no parent/registration data.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'BEFORE UPDATE trigger: sets NEW.updated_at to now(). Used only on athletes, coaches, training_groups.';

create or replace function public.training_sessions_protect_identity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.training_group_id is not distinct from old.training_group_id
     and new.session_date is not distinct from old.session_date then
    return new;
  end if;

  if exists (
    select 1
    from public.attendance as a
    where a.training_session_id = old.id
  ) then
    raise exception
      'Cannot change training_group_id or session_date after attendance exists for this session'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

comment on function public.training_sessions_protect_identity() is
  'BEFORE UPDATE: lock training_group_id and session_date once attendance rows exist. starts_at/ends_at remain mutable. DEFINER so RLS cannot hide attendance and fail open.';

create or replace function public.attendance_before_write()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_coach_id uuid;
begin
  v_coach_id := public.current_active_coach_id();

  if tg_op = 'UPDATE'
     and (
       new.training_session_id is distinct from old.training_session_id
       or new.athlete_id is distinct from old.athlete_id
     ) then
    raise exception
      'Cannot change attendance.training_session_id or attendance.athlete_id'
      using errcode = 'P0001';
  end if;

  -- Coaches cannot persist another coach's id. Admin/service-role (no coach
  -- row for auth.uid()) may set marked_by_coach_id explicitly.
  if v_coach_id is not null then
    new.marked_by_coach_id := v_coach_id;
  end if;

  return new;
end;
$$;

comment on function public.attendance_before_write() is
  'BEFORE INSERT/UPDATE: freeze athlete_id and training_session_id on UPDATE; stamp marked_by_coach_id to the current active coach.';

revoke all on function public.current_active_coach_id() from public, anon;
revoke all on function public.coach_has_training_group(uuid) from public, anon;
revoke all on function public.coach_can_access_session(uuid) from public, anon;
revoke all on function public.athlete_belongs_to_session(uuid, uuid) from public, anon;
revoke all on function public.coach_can_select_athlete(uuid) from public, anon;
revoke all on function public.set_updated_at() from public, anon;
revoke all on function public.training_sessions_protect_identity() from public, anon;
revoke all on function public.attendance_before_write() from public, anon;

grant execute on function public.current_active_coach_id() to authenticated;
grant execute on function public.coach_has_training_group(uuid) to authenticated;
grant execute on function public.coach_can_access_session(uuid) to authenticated;
grant execute on function public.athlete_belongs_to_session(uuid, uuid) to authenticated;
grant execute on function public.coach_can_select_athlete(uuid) to authenticated;

-- Trigger functions must be executable by the role issuing INSERT/UPDATE.
grant execute on function public.set_updated_at() to authenticated, service_role;
grant execute on function public.training_sessions_protect_identity() to authenticated, service_role;
grant execute on function public.attendance_before_write() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Privileges: no anon access. Authenticated gets only what coach policies need.
-- service_role (admin after isAdminAuthenticated()) keeps full access and
-- bypasses RLS — no service-role policies are created for coaches.
-- ---------------------------------------------------------------------------

revoke all on table public.athletes from anon;
revoke all on table public.coaches from anon;
revoke all on table public.training_groups from anon;
revoke all on table public.coach_group_assignments from anon;
revoke all on table public.athlete_group_memberships from anon;
revoke all on table public.training_sessions from anon;
revoke all on table public.attendance from anon;

revoke insert, update, delete, truncate on table public.athletes from authenticated;
revoke insert, update, delete, truncate on table public.coaches from authenticated;
revoke insert, update, delete, truncate on table public.training_groups from authenticated;
revoke insert, update, delete, truncate on table public.coach_group_assignments from authenticated;
revoke insert, update, delete, truncate on table public.athlete_group_memberships from authenticated;
revoke delete, truncate on table public.training_sessions from authenticated;
revoke delete, truncate on table public.attendance from authenticated;

grant select on table public.athletes to authenticated;
grant select on table public.coaches to authenticated;
grant select on table public.training_groups to authenticated;
grant select on table public.coach_group_assignments to authenticated;
grant select on table public.athlete_group_memberships to authenticated;
grant select, insert, update on table public.training_sessions to authenticated;
grant select, insert, update on table public.attendance to authenticated;

-- ---------------------------------------------------------------------------
-- RLS — no broad authenticated policies, no anon policies
-- ---------------------------------------------------------------------------

alter table public.athletes enable row level security;
alter table public.coaches enable row level security;
alter table public.training_groups enable row level security;
alter table public.coach_group_assignments enable row level security;
alter table public.athlete_group_memberships enable row level security;
alter table public.training_sessions enable row level security;
alter table public.attendance enable row level security;

drop policy if exists coaches_select_own on public.coaches;
create policy coaches_select_own
  on public.coaches
  for select
  to authenticated
  using (
    auth.uid() = auth_user_id
    and active = true
  );

drop policy if exists coach_group_assignments_select_own on public.coach_group_assignments;
create policy coach_group_assignments_select_own
  on public.coach_group_assignments
  for select
  to authenticated
  using (coach_id = public.current_active_coach_id());

drop policy if exists training_groups_select_assigned on public.training_groups;
create policy training_groups_select_assigned
  on public.training_groups
  for select
  to authenticated
  using (public.coach_has_training_group(id));

drop policy if exists athlete_group_memberships_select_assigned on public.athlete_group_memberships;
create policy athlete_group_memberships_select_assigned
  on public.athlete_group_memberships
  for select
  to authenticated
  using (
    public.coach_has_training_group(training_group_id)
    and public.coach_can_select_athlete(athlete_id)
  );

drop policy if exists athletes_select_assigned_groups on public.athletes;
drop policy if exists athletes_select_roster_or_attendance on public.athletes;
create policy athletes_select_roster_or_attendance
  on public.athletes
  for select
  to authenticated
  using (public.coach_can_select_athlete(id));

drop policy if exists training_sessions_select_assigned on public.training_sessions;
create policy training_sessions_select_assigned
  on public.training_sessions
  for select
  to authenticated
  using (public.coach_has_training_group(training_group_id));

drop policy if exists training_sessions_insert_assigned on public.training_sessions;
create policy training_sessions_insert_assigned
  on public.training_sessions
  for insert
  to authenticated
  with check (
    public.coach_has_training_group(training_group_id)
    and (
      created_by_coach_id is null
      or created_by_coach_id = public.current_active_coach_id()
    )
  );

-- USING: existing row must already be in an assigned group.
-- WITH CHECK: new training_group_id must also be assigned (blocks moving a
-- session into an unauthorized group). Identity lock after attendance is a
-- trigger, not RLS — RLS cannot compare OLD vs NEW.
drop policy if exists training_sessions_update_assigned on public.training_sessions;
create policy training_sessions_update_assigned
  on public.training_sessions
  for update
  to authenticated
  using (public.coach_has_training_group(training_group_id))
  with check (public.coach_has_training_group(training_group_id));

drop policy if exists attendance_select_assigned on public.attendance;
create policy attendance_select_assigned
  on public.attendance
  for select
  to authenticated
  using (public.coach_can_access_session(training_session_id));

drop policy if exists attendance_insert_assigned on public.attendance;
create policy attendance_insert_assigned
  on public.attendance
  for insert
  to authenticated
  with check (
    public.coach_can_access_session(training_session_id)
    and public.athlete_belongs_to_session(athlete_id, training_session_id)
    and (
      marked_by_coach_id is null
      or marked_by_coach_id = public.current_active_coach_id()
    )
  );

-- USING: may only edit attendance on an assigned-group session.
-- WITH CHECK: new session must stay authorized, new athlete must belong on
-- that session_date, marked_by must be self (trigger also stamps it).
-- athlete_id / training_session_id changes are rejected by trigger.
drop policy if exists attendance_update_assigned on public.attendance;
create policy attendance_update_assigned
  on public.attendance
  for update
  to authenticated
  using (public.coach_can_access_session(training_session_id))
  with check (
    public.coach_can_access_session(training_session_id)
    and public.athlete_belongs_to_session(athlete_id, training_session_id)
    and (
      marked_by_coach_id is null
      or marked_by_coach_id = public.current_active_coach_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Triggers (after tables + functions)
-- ---------------------------------------------------------------------------

drop trigger if exists athletes_set_updated_at on public.athletes;
create trigger athletes_set_updated_at
  before update on public.athletes
  for each row
  execute function public.set_updated_at();

drop trigger if exists coaches_set_updated_at on public.coaches;
create trigger coaches_set_updated_at
  before update on public.coaches
  for each row
  execute function public.set_updated_at();

drop trigger if exists training_groups_set_updated_at on public.training_groups;
create trigger training_groups_set_updated_at
  before update on public.training_groups
  for each row
  execute function public.set_updated_at();

drop trigger if exists training_sessions_protect_identity on public.training_sessions;
create trigger training_sessions_protect_identity
  before update on public.training_sessions
  for each row
  execute function public.training_sessions_protect_identity();

drop trigger if exists attendance_before_write on public.attendance;
create trigger attendance_before_write
  before insert or update on public.attendance
  for each row
  execute function public.attendance_before_write();
