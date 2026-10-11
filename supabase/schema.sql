-- TheTruckingBusiness.com — Phase 2 database schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor after creating the project.
-- Demo note: the app works without a database (localStorage fallback) until
-- SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Vercel.

create table if not exists orders (
  id text primary key,                       -- e.g. TTB-482913
  package_slug text not null,
  package_name text not null,
  amount_cents integer not null,              -- price in cents
  buyer_name text not null,
  buyer_email text not null,
  intake_service text not null check (intake_service in ('authority','compliance')),
  created_at timestamptz not null default now()
);

create table if not exists intake_submissions (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references orders(id) on delete cascade,
  data jsonb not null,                        -- all intake answers, incl. POA + consortium consent
  created_at timestamptz not null default now(),
  unique(order_id)                            -- one intake per order
);

create table if not exists call_bookings (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references orders(id) on delete cascade,
  date date not null,                         -- YYYY-MM-DD
  time text not null,                         -- e.g. "11:00 AM" (Eastern)
  created_at timestamptz not null default now(),
  unique(order_id)                            -- one booking per order (1 client/hour enforced in app + here by slot check)
);

-- Read access for the service role only (API routes use the service key).
-- No public anon access: all reads/writes go through Next.js API routes.
alter table orders enable row level security;
alter table intake_submissions enable row level security;
alter table call_bookings enable row level security;

-- Helpful index for the admin inbox (newest first).
create index if not exists orders_created_at_idx on orders (created_at desc);
