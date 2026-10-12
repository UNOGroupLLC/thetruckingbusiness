-- TheTruckingBusiness.com — migration 005: pin flag for the blog index.
-- Run in the Supabase SQL editor. Pinned posts sort above everything else on
-- /resources/blog, permanently, regardless of publish date.

alter table blog_posts
  add column if not exists pinned boolean not null default false;

-- The flagship guide stays at the top of the blog index.
update blog_posts
  set pinned = true
  where slug = 'how-to-start-a-trucking-company';
