-- PROPOSAL — do not apply until reviewed. Do not run from the app.
-- Phase 3B: atomic admin athlete activation, group move, and stop.
-- Run manually in the Supabase SQL Editor only after approval.
-- Requires 009_coaches_groups_attendance.sql (already applied).
--
-- Idempotent: CREATE OR REPLACE + REVOKE/GRANT. No table changes, no data
-- rewrites of existing athletes/memberships/attendance. Safe to paste once
-- after 009; safe to paste again if the first attempt was interrupted after
-- a function body was created (permissions are re-applied).
--
-- WHY THIS FILE EXISTS
-- Activation, move, and stop each touch more than one row/table. Supabase JS
-- / PostgREST cannot wrap those writes in one Postgres transaction. These
-- SECURITY DEFINER functions run as one transaction. Phase 3B admin UI must
-- not ship until this is applied.
--
-- Execute is granted only to service_role. Coaches/anon/authenticated cannot
-- call them. Coach RLS is unchanged. Parent/registration data is read only
-- inside activate, to snapshot child_name and child_birth_date.
--
-- Vilnius calendar dates:
--   today = (timezone('Europe/Vilnius', now()))::date
-- Inclusive membership ranges cannot overlap. Same-day end+start is invalid
-- (Phase 1 exclusion: daterange(starts_on, ends_on, '[]')).
--
-- Activation:
--   starts_on = greatest(today, max(existing ends_on) + 1)
--   First-time activate: today.
--   Reactivate after stop: next day not covered by a closed membership
--   (same-day stop then re-add starts tomorrow).
--   Unique(registration_id) + row lock: no duplicate athlete.
--   Current membership already present: raise (double-click safe).
--
-- Move:
--   Same destination group: raise, no writes.
--   Established membership (starts_on < today):
--     close yesterday, new starts today. History preserved.
--   Same-day correction (starts_on = today, no attendance for this athlete
--     on a session in that group covering the membership):
--     DELETE the empty membership, INSERT the new group starting today.
--     Preferable to closing today: inclusive exclusion would otherwise force
--     tomorrow, and a [today, today] wrong-group row would be fake history.
--     Safe because attendance has no FK to memberships; we only delete when
--     no attendance exists for that membership period.
--   Pending future membership (starts_on > today) with no covering attendance:
--     DELETE the empty stub and open the new group on the next valid date
--     (today if free, otherwise max(remaining ends_on) + 1).
--   Meaningful history (attendance exists on a covered session in that group,
--     or the membership started before today):
--     never delete; close and start on the next valid date.
--
-- Stop:
--   Close current membership (do not delete, even same-day) and set
--   athletes.active = false. Repeated calls are idempotent.
--
-- App layer (after this is applied): call via createAdminClient() only after
-- isAdminAuthenticated(). These functions do not check the admin cookie.

create or replace function public.admin_activate_athlete(
  p_registration_id uuid,
  p_training_group_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_today date := (timezone('Europe/Vilnius', now()))::date;
  v_child_name text;
  v_birth date;
  v_group_active boolean;
  v_athlete public.athletes%rowtype;
  v_latest_end date;
  v_starts_on date;
  v_membership_id uuid;
begin
  if p_registration_id is null or p_training_group_id is null then
    raise exception 'Trūksta registracijos arba grupės.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(392841, hashtext(p_registration_id::text));

  select tg.active
    into v_group_active
  from public.training_groups as tg
  where tg.id = p_training_group_id
  for update;

  if not found then
    raise exception 'Treniruočių grupė nerasta.' using errcode = 'P0002';
  end if;

  if v_group_active is not true then
    raise exception 'Galima priskirti tik aktyvią treniruočių grupę.' using errcode = 'P0003';
  end if;

  select r.child_name, r.child_birth_date
    into v_child_name, v_birth
  from public.registrations as r
  where r.id = p_registration_id
  for share;

  if not found then
    raise exception 'Registracija nerasta.' using errcode = 'P0002';
  end if;

  -- Insert or lock the existing athlete row. Do not overwrite the original
  -- child snapshot. Unique(registration_id) serializes double-clicks.
  -- Dummy ON CONFLICT assignment does not copy a new name/date/active flag.
  insert into public.athletes (
    registration_id,
    child_name,
    child_birth_date,
    active
  )
  values (
    p_registration_id,
    v_child_name,
    v_birth,
    true
  )
  on conflict (registration_id) do update
    set child_name = public.athletes.child_name
  returning * into v_athlete;

  perform 1
  from public.athlete_group_memberships as m
  where m.athlete_id = v_athlete.id
  for update;

  if exists (
    select 1
    from public.athlete_group_memberships as m
    where m.athlete_id = v_athlete.id
      and m.ends_on is null
  ) then
    raise exception 'Šis vaikas jau yra lankančių sąraše.' using errcode = 'P0004';
  end if;

  select max(m.ends_on)
    into v_latest_end
  from public.athlete_group_memberships as m
  where m.athlete_id = v_athlete.id;

  if v_latest_end is null then
    v_starts_on := v_today;
  else
    v_starts_on := greatest(v_today, v_latest_end + 1);
  end if;

  update public.athletes
     set active = true
   where id = v_athlete.id
   returning * into v_athlete;

  insert into public.athlete_group_memberships (
    athlete_id,
    training_group_id,
    starts_on
  )
  values (
    v_athlete.id,
    p_training_group_id,
    v_starts_on
  )
  returning id into v_membership_id;

  return jsonb_build_object(
    'athlete_id', v_athlete.id,
    'registration_id', v_athlete.registration_id,
    'membership_id', v_membership_id,
    'training_group_id', p_training_group_id,
    'starts_on', v_starts_on,
    'effective_today', v_starts_on = v_today
  );
end;
$$;

comment on function public.admin_activate_athlete(uuid, uuid) is
  'Admin/service-role only. Atomically upsert athletes from a registration (child_name + child_birth_date only) and open a current membership on the next valid Vilnius date. Raises if a current membership already exists (double-click safe). Reuses the existing athlete row; never duplicates.';

revoke all on function public.admin_activate_athlete(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_activate_athlete(uuid, uuid) to service_role;

create or replace function public.admin_move_athlete(
  p_athlete_id uuid,
  p_new_training_group_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_today date := (timezone('Europe/Vilnius', now()))::date;
  v_group_active boolean;
  v_athlete_active boolean;
  v_old public.athlete_group_memberships%rowtype;
  v_has_attendance boolean;
  v_latest_end date;
  v_ends_on date;
  v_starts_on date;
  v_new_id uuid;
  v_action text;
  v_deleted boolean := false;
begin
  if p_athlete_id is null or p_new_training_group_id is null then
    raise exception 'Trūksta sportininko arba grupės.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(392841, hashtext(p_athlete_id::text));

  -- Lock order matches activate: destination group, then athlete, then
  -- memberships. Avoids a deadlock with concurrent activation into the
  -- same group.
  select tg.active
    into v_group_active
  from public.training_groups as tg
  where tg.id = p_new_training_group_id
  for update;

  if not found then
    raise exception 'Treniruočių grupė nerasta.' using errcode = 'P0002';
  end if;

  if v_group_active is not true then
    raise exception 'Galima perkelti tik į aktyvią treniruočių grupę.' using errcode = 'P0003';
  end if;

  select a.active
    into v_athlete_active
  from public.athletes as a
  where a.id = p_athlete_id
  for update;

  if not found then
    raise exception 'Sportininkas nerastas.' using errcode = 'P0002';
  end if;

  if v_athlete_active is not true then
    raise exception 'Aktyvus sportininkas nerastas.' using errcode = 'P0002';
  end if;

  perform 1
  from public.athlete_group_memberships as m
  where m.athlete_id = p_athlete_id
  for update;

  select *
    into v_old
  from public.athlete_group_memberships as m
  where m.athlete_id = p_athlete_id
    and m.ends_on is null;

  if v_old.id is null then
    raise exception 'Sportininkas neturi dabartinės narystės.' using errcode = 'P0002';
  end if;

  if v_old.training_group_id = p_new_training_group_id then
    raise exception 'Sportininkas jau priskirtas šiai grupei.' using errcode = 'P0004';
  end if;

  perform 1
  from public.attendance as att
  inner join public.training_sessions as s
    on s.id = att.training_session_id
  where att.athlete_id = p_athlete_id
    and s.training_group_id = v_old.training_group_id
    and s.session_date >= v_old.starts_on
    and (v_old.ends_on is null or s.session_date <= v_old.ends_on)
  for update;

  select exists (
    select 1
    from public.attendance as att
    inner join public.training_sessions as s
      on s.id = att.training_session_id
    where att.athlete_id = p_athlete_id
      and s.training_group_id = v_old.training_group_id
      and s.session_date >= v_old.starts_on
      and (v_old.ends_on is null or s.session_date <= v_old.ends_on)
  )
  into v_has_attendance;

  if v_old.starts_on >= v_today and v_has_attendance is not true then
    -- Empty current/pending membership: delete and occupy the next free date.
    -- For a membership that started today this makes the correction take
    -- effect today (today becomes free, then the new row uses it).
    delete from public.athlete_group_memberships
     where id = v_old.id;

    select max(m.ends_on)
      into v_latest_end
    from public.athlete_group_memberships as m
    where m.athlete_id = p_athlete_id;

    if v_latest_end is null then
      v_starts_on := v_today;
    else
      v_starts_on := greatest(v_today, v_latest_end + 1);
    end if;

    insert into public.athlete_group_memberships (
      athlete_id,
      training_group_id,
      starts_on
    )
    values (
      p_athlete_id,
      p_new_training_group_id,
      v_starts_on
    )
    returning id into v_new_id;

    v_action := 'corrected';
    v_deleted := true;
  elsif v_old.starts_on < v_today then
    v_ends_on := v_today - 1;
    v_starts_on := v_today;

    update public.athlete_group_memberships
       set ends_on = v_ends_on
     where id = v_old.id;

    insert into public.athlete_group_memberships (
      athlete_id,
      training_group_id,
      starts_on
    )
    values (
      p_athlete_id,
      p_new_training_group_id,
      v_starts_on
    )
    returning id into v_new_id;

    v_action := 'moved';
  else
    -- History must be kept (attendance on a covered session). Inclusive
    -- ranges cannot share a calendar day, so the new group starts the day
    -- after this membership's start.
    v_ends_on := v_old.starts_on;
    v_starts_on := v_old.starts_on + 1;

    update public.athlete_group_memberships
       set ends_on = v_ends_on
     where id = v_old.id;

    insert into public.athlete_group_memberships (
      athlete_id,
      training_group_id,
      starts_on
    )
    values (
      p_athlete_id,
      p_new_training_group_id,
      v_starts_on
    )
    returning id into v_new_id;

    v_action := 'moved';
  end if;

  return jsonb_build_object(
    'athlete_id', p_athlete_id,
    'action', v_action,
    'old_membership_id', case when v_deleted then null else v_old.id end,
    'old_membership_deleted', v_deleted,
    'old_training_group_id', v_old.training_group_id,
    'old_ends_on', v_ends_on,
    'new_membership_id', v_new_id,
    'new_training_group_id', p_new_training_group_id,
    'new_starts_on', v_starts_on,
    'effective_today', v_starts_on = v_today
  );
end;
$$;

comment on function public.admin_move_athlete(uuid, uuid) is
  'Admin/service-role only. Atomically move an athlete to another active group. Same-day empty memberships are deleted so the correction takes effect today; otherwise history is closed (not overwritten) and the new membership starts on the next valid date. Never creates overlapping ranges.';

revoke all on function public.admin_move_athlete(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_move_athlete(uuid, uuid) to service_role;

create or replace function public.admin_stop_athlete(
  p_athlete_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_today date := (timezone('Europe/Vilnius', now()))::date;
  v_was_active boolean;
  v_old public.athlete_group_memberships%rowtype;
  v_ends_on date;
begin
  if p_athlete_id is null then
    raise exception 'Trūksta sportininko.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(392841, hashtext(p_athlete_id::text));

  select a.active
    into v_was_active
  from public.athletes as a
  where a.id = p_athlete_id
  for update;

  if not found then
    raise exception 'Sportininkas nerastas.' using errcode = 'P0002';
  end if;

  perform 1
  from public.athlete_group_memberships as m
  where m.athlete_id = p_athlete_id
  for update;

  select *
    into v_old
  from public.athlete_group_memberships as m
  where m.athlete_id = p_athlete_id
    and m.ends_on is null;

  if v_old.id is not null then
    if v_old.starts_on <= v_today then
      v_ends_on := v_today;
    else
      v_ends_on := v_old.starts_on;
    end if;

    update public.athlete_group_memberships
       set ends_on = v_ends_on
     where id = v_old.id;
  end if;

  update public.athletes
     set active = false
   where id = p_athlete_id;

  return jsonb_build_object(
    'athlete_id', p_athlete_id,
    'closed_membership_id', v_old.id,
    'ends_on', v_ends_on,
    'active', false,
    'already_stopped', v_old.id is null and v_was_active is not true
  );
end;
$$;

comment on function public.admin_stop_athlete(uuid) is
  'Admin/service-role only. Atomically close the current membership (if any) and set athletes.active = false. Idempotent. Does not delete athletes, memberships, attendance, or registrations.';

revoke all on function public.admin_stop_athlete(uuid) from public, anon, authenticated;
grant execute on function public.admin_stop_athlete(uuid) to service_role;
