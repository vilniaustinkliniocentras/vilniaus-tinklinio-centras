-- PROPOSAL — do not apply until reviewed. Do not run from the app.
-- Phase 4: atomic coach historical roster + attendance save.
-- Run manually in the Supabase SQL Editor only after approval.
-- Requires 009_coaches_groups_attendance.sql (already applied).
-- Does not depend on 010. Does not change 009/010, tables, or RLS.
--
-- Idempotent: CREATE OR REPLACE + REVOKE/GRANT. No table changes, no data
-- rewrites. Safe to paste once after 009; safe to paste again if interrupted.
--
-- WHY THIS FILE EXISTS
-- 1) Coach RLS (coach_can_select_athlete) is Vilnius-today based. A coach
--    cannot SELECT historical members who already left a group unless they
--    already have attendance. Session-date roster must be a DEFINER RPC
--    that re-checks assignment internally.
-- 2) Saving attendance is session find/create + N attendance upserts.
--    PostgREST cannot wrap that in one transaction. This save function does.
--
-- Execute is granted only to authenticated (coach JWT). PUBLIC/anon cannot
-- call them. service_role is not required and is not granted. Table RLS is
-- unchanged. Functions are SECURITY DEFINER so they MUST enforce auth.uid(),
-- active coach, and current group assignment before reading/writing.
--
-- Date policy (v1):
--   today = (timezone('Europe/Vilnius', now()))::date
--   future dates rejected; today and any past date allowed; no edit window.
--
-- Historical roster (same predicate in both functions):
--   membership.training_group_id = requested group
--   AND starts_on <= session_date
--   AND (ends_on IS NULL OR ends_on >= session_date)
--   Do not filter by athletes.active.
--
-- App layer (after this is applied): call via createCoachServerClient()
-- after requireActiveCoach(). Do not use the service role.

create or replace function public.coach_group_roster_for_date(
  p_training_group_id uuid,
  p_session_date date
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_today date := (timezone('Europe/Vilnius', now()))::date;
  v_coach_id uuid;
  v_session_id uuid;
  v_athletes jsonb;
begin
  if p_training_group_id is null or p_session_date is null then
    raise exception 'Trūksta grupės arba datos.' using errcode = '22023';
  end if;

  if (select auth.uid()) is null then
    raise exception 'Prisijunkite.' using errcode = '42501';
  end if;

  v_coach_id := public.current_active_coach_id();
  if v_coach_id is null then
    raise exception 'Neturite trenerio prieigos.' using errcode = '42501';
  end if;

  if public.coach_has_training_group(p_training_group_id) is not true then
    raise exception 'Ši grupė jums nepriskirta.' using errcode = '42501';
  end if;

  if p_session_date > v_today then
    raise exception 'Negalima žymėti būsimos datos.' using errcode = 'P0003';
  end if;

  select s.id
    into v_session_id
  from public.training_sessions as s
  where s.training_group_id = p_training_group_id
    and s.session_date = p_session_date;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'athlete_id', q.athlete_id,
        'child_name', q.child_name,
        'child_birth_date', q.child_birth_date,
        'status', q.status
      )
      order by q.child_name, q.child_birth_date, q.athlete_id
    ),
    '[]'::jsonb
  )
    into v_athletes
  from (
    select
      a.id as athlete_id,
      a.child_name,
      a.child_birth_date,
      att.status
    from public.athlete_group_memberships as m
    inner join public.athletes as a
      on a.id = m.athlete_id
    left join public.attendance as att
      on att.athlete_id = a.id
     and v_session_id is not null
     and att.training_session_id = v_session_id
    where m.training_group_id = p_training_group_id
      and m.starts_on <= p_session_date
      and (m.ends_on is null or m.ends_on >= p_session_date)
  ) as q;

  return jsonb_build_object(
    'session_id', v_session_id,
    'session_date', p_session_date,
    'training_group_id', p_training_group_id,
    'athletes', v_athletes
  );
end;
$$;

comment on function public.coach_group_roster_for_date(uuid, date) is
  'Authenticated active coach assigned to the group only. Historical membership roster for a Vilnius calendar date (no athletes.active filter), plus existing attendance status. No registration/parent/contract/payment data.';

revoke all on function public.coach_group_roster_for_date(uuid, date) from public, anon;
grant execute on function public.coach_group_roster_for_date(uuid, date) to authenticated;

create or replace function public.coach_save_attendance(
  p_training_group_id uuid,
  p_session_date date,
  p_marks jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_today date := (timezone('Europe/Vilnius', now()))::date;
  v_coach_id uuid;
  v_elem jsonb;
  v_athlete_id uuid;
  v_status text;
  v_submitted_ids uuid[] := '{}'::uuid[];
  v_expected_ids uuid[] := '{}'::uuid[];
  v_marks jsonb := '[]'::jsonb;
  v_expected_sorted uuid[];
  v_submitted_sorted uuid[];
  v_session_id uuid;
  v_saved_count integer;
begin
  if p_training_group_id is null or p_session_date is null or p_marks is null then
    raise exception 'Trūksta grupės, datos arba lankomumo sąrašo.' using errcode = '22023';
  end if;

  if (select auth.uid()) is null then
    raise exception 'Prisijunkite.' using errcode = '42501';
  end if;

  v_coach_id := public.current_active_coach_id();
  if v_coach_id is null then
    raise exception 'Neturite trenerio prieigos.' using errcode = '42501';
  end if;

  if public.coach_has_training_group(p_training_group_id) is not true then
    raise exception 'Ši grupė jums nepriskirta.' using errcode = '42501';
  end if;

  if p_session_date > v_today then
    raise exception 'Negalima žymėti būsimos datos.' using errcode = 'P0003';
  end if;

  if jsonb_typeof(p_marks) is distinct from 'array' then
    raise exception 'Neteisingas lankomumo sąrašas.' using errcode = '22023';
  end if;

  for v_elem in
    select value from jsonb_array_elements(p_marks)
  loop
    if jsonb_typeof(v_elem) is distinct from 'object' then
      raise exception 'Neteisingas lankomumo sąrašas.' using errcode = '22023';
    end if;

    if jsonb_typeof(v_elem->'athlete_id') is distinct from 'string' then
      raise exception 'Neteisingas sportininko identifikatorius.' using errcode = '22023';
    end if;

    begin
      v_athlete_id := (v_elem->>'athlete_id')::uuid;
    exception
      when invalid_text_representation then
        raise exception 'Neteisingas sportininko identifikatorius.' using errcode = '22023';
    end;

    if v_athlete_id = any (v_submitted_ids) then
      raise exception 'Pasikartojantis sportininkas lankomumo sąraše.' using errcode = 'P0004';
    end if;

    if jsonb_typeof(v_elem->'status') is distinct from 'string' then
      raise exception 'Neteisingas lankomumo statusas.' using errcode = '22023';
    end if;

    v_status := v_elem->>'status';
    if v_status not in ('present', 'absent', 'excused') then
      raise exception 'Neteisingas lankomumo statusas.' using errcode = '22023';
    end if;

    v_submitted_ids := array_append(v_submitted_ids, v_athlete_id);
    v_marks := v_marks || jsonb_build_array(
      jsonb_build_object(
        'athlete_id', v_athlete_id,
        'status', v_status
      )
    );
  end loop;

  -- Serialize two coaches / double-click on the same group+date. Taken only
  -- after assignment is proven so unassigned callers cannot lock a group.
  perform pg_advisory_xact_lock(
    392842,
    hashtext(p_training_group_id::text || chr(31) || p_session_date::text)
  );

  perform 1
  from public.athlete_group_memberships as m
  where m.training_group_id = p_training_group_id
    and m.starts_on <= p_session_date
    and (m.ends_on is null or m.ends_on >= p_session_date)
  order by m.id
  for update;

  select coalesce(array_agg(a.id order by a.id), '{}'::uuid[])
    into v_expected_ids
  from public.athlete_group_memberships as m
  inner join public.athletes as a
    on a.id = m.athlete_id
  where m.training_group_id = p_training_group_id
    and m.starts_on <= p_session_date
    and (m.ends_on is null or m.ends_on >= p_session_date);

  if coalesce(array_length(v_expected_ids, 1), 0) = 0 then
    raise exception 'Šią dieną grupėje nėra sportininkų.' using errcode = 'P0004';
  end if;

  select coalesce(array_agg(x order by x), '{}'::uuid[])
    into v_expected_sorted
  from unnest(v_expected_ids) as x;

  select coalesce(array_agg(x order by x), '{}'::uuid[])
    into v_submitted_sorted
  from unnest(v_submitted_ids) as x;

  if v_submitted_sorted is distinct from v_expected_sorted then
    raise exception 'Lankomumo sąrašas nesutampa su tos dienos grupe.' using errcode = 'P0004';
  end if;

  insert into public.training_sessions (
    training_group_id,
    session_date,
    created_by_coach_id
  )
  values (
    p_training_group_id,
    p_session_date,
    v_coach_id
  )
  on conflict (training_group_id, session_date) do nothing
  returning id into v_session_id;

  if v_session_id is null then
    select s.id
      into v_session_id
    from public.training_sessions as s
    where s.training_group_id = p_training_group_id
      and s.session_date = p_session_date
    for update;
  else
    perform 1
    from public.training_sessions as s
    where s.id = v_session_id
    for update;
  end if;

  if v_session_id is null then
    raise exception 'Nepavyko išsaugoti treniruotės.' using errcode = 'P0002';
  end if;

  insert into public.attendance (
    training_session_id,
    athlete_id,
    status,
    marked_at
  )
  select
    v_session_id,
    m.athlete_id,
    m.status,
    now()
  from jsonb_to_recordset(v_marks) as m(athlete_id uuid, status text)
  on conflict (training_session_id, athlete_id) do update
    set status = excluded.status,
        marked_at = now();

  v_saved_count := coalesce(array_length(v_submitted_ids, 1), 0);

  return jsonb_build_object(
    'session_id', v_session_id,
    'session_date', p_session_date,
    'training_group_id', p_training_group_id,
    'saved_count', v_saved_count,
    'marks', v_marks
  );
end;
$$;

comment on function public.coach_save_attendance(uuid, date, jsonb) is
  'Authenticated active coach assigned to the group only. Atomically find/create the unique session and upsert attendance for the exact historical roster. Future dates rejected. Does not delete attendance or rewrite session identity.';

revoke all on function public.coach_save_attendance(uuid, date, jsonb) from public, anon;
grant execute on function public.coach_save_attendance(uuid, date, jsonb) to authenticated;
