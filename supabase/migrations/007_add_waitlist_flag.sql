-- Waitlist flag for full training groups (e.g. 17:00–18:00 slot).
-- Existing registrations default to false.

alter table public.registrations
  add column if not exists is_waitlist boolean not null default false;

create index if not exists registrations_is_waitlist_idx
  on public.registrations (is_waitlist)
  where is_waitlist = true;

comment on column public.registrations.is_waitlist is
  'True when the registration is for a full group waitlist, not an active training spot.';
