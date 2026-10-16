-- Migration 010: order completion.
-- Adds orders.completed_at, the stamp the admin sets with "Mark
-- complete". A completed order leaves the Orders queue and lives in the
-- Finished section as a sealed case file; clearing the stamp (Reopen)
-- moves it back. NULL means the order is still open.
--
-- Run in the Supabase SQL editor BEFORE uploading the app package that
-- carries the Finished section. The new code reads this column; reads
-- use select *, so a missing column simply leaves every order "open"
-- until this has run, and the Mark complete save would fail without it.

alter table public.orders
  add column if not exists completed_at timestamptz;

create index if not exists orders_completed_at_idx
  on public.orders (completed_at desc);
