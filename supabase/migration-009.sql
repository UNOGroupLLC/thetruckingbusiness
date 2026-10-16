-- Migration 009: one kickoff-call booking per (date, time) slot, enforced
-- in the database itself. The booking route checks the slot before
-- inserting and replaces the order's own previous booking, but two
-- requests racing for the same slot could both pass that check. This
-- unique index is the backstop: the second insert fails, and the route
-- reports the slot as taken (409) instead of double-booking the hour.
create unique index if not exists call_bookings_slot_unique
  on public.call_bookings (date, time);
