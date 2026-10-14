-- Migration 006: grant table privileges on the order tables.
-- Same root cause as migration-004 (blog_posts): in Postgres the
-- service_role role BYPASSES RLS but still needs an explicit GRANT on
-- each table. Without these, the Stripe webhook's order insert fails
-- with 403 "permission denied for table orders" and the order row is
-- never created (the webhook does not check the write result, so this
-- fails silently — no order, no emails, nothing visibly broken).
-- The GRANT is on the Postgres role, so it applies to both the new
-- sb_secret_* keys and any legacy keys.
--
-- Run order: (1) diagnostic SELECT to see what service_role already
-- holds on each table, (2) the DO block to apply missing grants,
-- (3) re-run the diagnostic to confirm.

-- 1) DIAGNOSTIC: privileges service_role holds on each order table.
select
  t.table_name,
  coalesce(
    string_agg(g.privilege_type, ', ' order by g.privilege_type),
    '(none)'
  ) as service_role_privileges
from information_schema.tables t
left join information_schema.role_table_grants g
  on g.table_schema = t.table_schema
 and g.table_name = t.table_name
 and g.grantee = 'service_role'
where t.table_schema = 'public'
  and t.table_name in ('orders', 'intake_submissions', 'order_documents', 'call_bookings')
group by t.table_name
order by t.table_name;

-- 2) FIX: grant everything the app's server routes use on these tables.
--    orders: upsert + select            (Stripe webhook, /api/orders, admin)
--    intake_submissions: upsert + select (customer intake submit, admin)
--    order_documents: insert + select    (admin document upload, portal)
--    call_bookings: insert + select      (kickoff call scheduling)
--    DELETE is included for future admin use; the block is idempotent.
do $$
declare
  t text;
begin
  foreach t in array array['orders', 'intake_submissions', 'order_documents', 'call_bookings']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('grant select, insert, update, delete on public.%I to service_role', t);
      raise notice 'grants applied on public.%', t;
    else
      raise notice 'table public.% does not exist — skipped', t;
    end if;
  end loop;
end $$;

-- 3) Re-run the diagnostic SELECT above. Each table should now show
--    DELETE, INSERT, SELECT, UPDATE for service_role.
