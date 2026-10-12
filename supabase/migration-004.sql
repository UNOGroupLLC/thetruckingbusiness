-- Migration 004: grant table privileges on blog_posts.
-- RLS policies alone are not enough — Postgres also requires a GRANT
-- for the role, otherwise every read fails with "permission denied
-- for table blog_posts" even when a policy would allow it.
grant select on public.blog_posts to anon, authenticated;
