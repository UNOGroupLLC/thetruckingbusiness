-- Migration 008: client document uploads in the portal.
-- order_documents gains a direction so one table holds both halves of the
-- document flow: filing documents the office sends the customer
-- (direction 'to_client', the original behavior and the default) and
-- documents a client uploads TO the office from their portal
-- (direction 'from_client'). Client uploads carry a team review state:
-- status 'in_review' on arrival, then 'accepted' or 'needs_new_copy';
-- staff_note holds the message shown to the client when a clearer copy
-- is requested.
--
-- Run in the Supabase SQL editor BEFORE uploading the app package that
-- carries the portal upload feature. The new code degrades gracefully
-- if these columns are missing: reads fall back to the old column list,
-- and client uploads report an error until this has run.

-- 1) Direction + review state (all additive; existing rows default to
--    'to_client' with no review state, exactly as they behave today).
alter table public.order_documents
  add column if not exists direction text not null default 'to_client';
alter table public.order_documents
  add column if not exists status text;
alter table public.order_documents
  add column if not exists staff_note text;

-- 2) Grants for order_documents are already in place (migration-006
--    granted select/insert/update/delete to service_role). Repeated
--    here so this file is self-contained; safe to re-run.
grant select, insert, update, delete on public.order_documents to service_role;
