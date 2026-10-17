-- Migration 011 (Oct 17, 2026, F9): cap the order-documents Storage
-- bucket at 50 MB per file, matching the app's upload limit.
-- Optional hardening: the app already enforces 50 MB at sign and
-- register time, and Supabase's free plan caps every file at 50 MB
-- globally. Run this once so the bucket itself also refuses anything
-- larger on any plan.
update storage.buckets
set file_size_limit = 52428800
where id = 'order-documents';
