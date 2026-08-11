-- Add referral_source column for "Kaip apie mus sužinojote?" field
-- Run in Supabase SQL Editor after 002_add_training_group.sql

alter table public.registrations
  add column if not exists referral_source text;
