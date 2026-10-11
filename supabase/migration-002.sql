-- TheTruckingBusiness.com — Phase 2 migration 002
-- Intake lifecycle (submitted -> corrected -> certified -> filing),
-- all intake services, and the private document bucket.
-- Run AFTER supabase/schema.sql in the Supabase SQL editor.

-- 1) Widen the intake_service check to every service with a dedicated form.
alter table orders drop constraint if exists orders_intake_service_check;
alter table orders add constraint orders_intake_service_check check (
  intake_service in (
    'authority', 'compliance', 'state-permit', 'motus',
    'clearinghouse-query', 'mcs150'
  )
);

-- 2) Versioned intake submissions: v1 submitted, v2 corrected+certified.
alter table intake_submissions add column if not exists version integer not null default 1;
alter table intake_submissions add column if not exists status text not null default 'submitted';
alter table intake_submissions add column if not exists certified jsonb;
-- Replace "one intake per order" with "one row per (order, version)".
alter table intake_submissions drop constraint if exists intake_submissions_order_id_key;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'intake_submissions_order_version_key'
  ) then
    alter table intake_submissions
      add constraint intake_submissions_order_version_key unique (order_id, version);
  end if;
end $$;

-- 3) Filing status on the order (set when the owner presses "Start filing").
alter table orders add column if not exists filing_status text not null default 'none';
alter table orders add column if not exists filing_started_at timestamptz;

-- 4) Filing documents (one row per uploaded file; bytes live in Storage).
create table if not exists order_documents (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references orders(id) on delete cascade,
  slot_key text not null,          -- e.g. 'boc3'
  slot_label text not null,        -- e.g. 'BOC-3 filing confirmation'
  file_name text not null,
  storage_path text not null,      -- path inside the bucket
  uploaded_at timestamptz not null default now()
);
alter table order_documents enable row level security;
create index if not exists order_documents_order_idx on order_documents (order_id);

-- 5) Private Storage bucket for customer documents.
-- Service-role key (used by the Next.js API routes) bypasses RLS, so no
-- storage policies are needed: every upload/download goes through the API.
insert into storage.buckets (id, name, public)
values ('order-documents', 'order-documents', false)
on conflict (id) do nothing;
