-- Add training_group column for registration form group selection
-- Run in Supabase SQL Editor after 001_registrations.sql

alter table public.registrations
  add column if not exists training_group text;

alter table public.registrations
  alter column preferred_training_times drop not null;
