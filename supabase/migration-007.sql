-- Migration 007: admin workflow + portal connection.
-- Adds: order priority/assignee/payment lifecycle for the tabbed admin,
-- an order_events table (the activity trail and work log spine), and a
-- contact_messages table so website inquiries land in the admin Inquiries
-- section instead of only in the owner inbox.
--
-- As with migration-006, new tables need explicit GRANTs to service_role:
-- the role bypasses RLS but holds no table privileges by default.
--
-- Run in the Supabase SQL editor BEFORE uploading the app package that
-- carries the new admin (the new code reads these columns/tables; every
-- use degrades gracefully if they are missing, but the new sections stay
-- empty until this has run).

-- 1) Orders: workflow + payment lifecycle columns (all additive).
alter table public.orders
  add column if not exists priority boolean not null default false;
alter table public.orders
  add column if not exists assignee text;
alter table public.orders
  add column if not exists pay_status text not null default 'paid';
alter table public.orders
  add column if not exists refunded_cents integer;

-- 2) Order events: one row per thing that happened on an order.
--    Written by the webhook (payment_received), the filing action
--    (filing_started), admin edits (assigned, priority_on/off,
--    intake_edited, note), document uploads (document_uploaded), and
--    Stripe lifecycle events (refunded, subscription_cancelled).
create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  actor text not null,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);
alter table public.order_events enable row level security;
create index if not exists order_events_order_idx on public.order_events (order_id, created_at desc);
create index if not exists order_events_created_idx on public.order_events (created_at desc);

-- 3) Contact messages (admin Inquiries inbox).
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  topic text not null,
  message text not null,
  status text not null default 'new',
  assigned_to text,
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);

-- 4) Grants for the new tables (service_role only; all access goes
--    through Next.js API routes).
grant select, insert, update, delete on public.order_events to service_role;
grant select, insert, update, delete on public.contact_messages to service_role;
