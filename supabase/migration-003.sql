-- migration-003.sql — Blog / articles
-- Run in Supabase SQL editor. Creates the blog_posts table, a public
-- image bucket, RLS policies, and one published seed article.

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null default '',
  content_md text not null default '',
  cover_image_url text,
  category text not null default 'Guides',
  tags text[] not null default '{}',
  seo_title text,
  seo_description text,
  has_affiliate_links boolean not null default false,
  faqs jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'published')),
  author text not null default 'The Trucking Business',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_slug_idx on blog_posts (slug);
create index if not exists blog_posts_status_pub_idx on blog_posts (status, published_at desc);

alter table blog_posts enable row level security;

drop policy if exists "public read published posts" on blog_posts;
create policy "public read published posts"
  on blog_posts for select
  using (status = 'published');
-- Writes go through the service_role key (bypasses RLS) via /api/blog.

-- Public bucket for blog cover / in-article images.
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

drop policy if exists "public read blog images" on storage.objects;
create policy "public read blog images"
  on storage.objects for select
  using (bucket_id = 'blog-images');

-- ---------------------------------------------------------------- seed post
insert into blog_posts (
  slug, title, excerpt, content_md, category, tags,
  seo_title, seo_description, has_affiliate_links, faqs, status, published_at
) values (
  'how-to-start-a-trucking-company',
  'How to Start a Trucking Company: The Complete Step-by-Step Guide',
  'From business entity to your first load — every step to legally start a trucking company in the U.S., explained in plain English.',
  $MD$Starting a trucking company is one of the most realistic paths to owning a business in America — but the paperwork surprises most first-timers. Between the FMCSA, your state, and your insurance company, there are about a dozen filings that have to happen in the right order.

This guide walks through every step in plain English. It is educational — not legal advice — and you should always verify current requirements with FMCSA and your state agencies before filing.

## Step 1: Choose your business structure

Most new carriers form an **LLC** or operate as a **sole proprietor**. An LLC separates your personal assets from the business, which matters in an industry built around liability. Talk to a CPA or attorney before you decide — this choice affects your taxes for years.

## Step 2: Get your EIN from the IRS

Your **Employer Identification Number** is free from IRS.gov and takes minutes. You'll need it for your USDOT application, bank account, and tax filings. Even owner-operators with no employees should get one.

## Step 3: Get your USDOT number

Your **USDOT number** is your company's federal ID for safety tracking. You apply through FMCSA's registration system (now called **MOTUS**). It's free, and you'll need it before almost everything else on this list.

## Step 4: Get your MC operating authority (if needed)

If you'll haul freight **for hire across state lines**, you need **MC (Motor Carrier) operating authority** — filed on FMCSA Form OP-1. Private carriers hauling their own goods generally don't. After you file, there's a mandatory protest period, so authority typically takes a few weeks to become active. Don't book interstate loads until your authority shows **Active**.

## Step 5: File your BOC-3

The **BOC-3** designates a **process agent** in every state where you operate — someone authorized to receive legal documents on your behalf. You can't get active authority without one on file. Most carriers use a blanket process agent service rather than filing 50 separate designations.

## Step 6: Get trucking insurance

Insurance is usually the **biggest startup cost** and the longest lead-time item. FMCSA sets minimum liability levels by operation type (for most interstate for-hire carriers, the well-known minimum is $750,000 in primary liability), and you'll also want **cargo insurance** because shippers and brokers will demand it. Start shopping early — underwriting a new authority takes time, and your authority can't go active without insurance on file.

## Step 7: Register for UCR

The **Unified Carrier Registration (UCR)** is an annual federal registration for interstate carriers, brokers, and freight forwarders. Fees are tiered by fleet size. It's a quick online filing, but operating without it can get you fined at roadside.

## Step 8: IRP plates and IFTA license

Running interstate? You need **apportioned plates** through the **International Registration Plan (IRP)** from your base state, and an **IFTA license** for fuel tax reporting across states. IFTA requires **quarterly fuel tax returns** — even quarters where a truck didn't run.

## Step 9: Set up your drug & alcohol program

FMCSA requires every CDL driver — including **owner-operators** — to be in a compliant **drug and alcohol testing program** with pre-employment, random, post-accident, and reasonable-suspicion testing. Solo owner-operators join a **consortium** (a group random-testing pool) because you can't administer your own random tests. You must also register in the **FMCSA Drug & Alcohol Clearinghouse** and run the required queries on every driver.

## Step 10: Get an ELD

If you run interstate and your truck's engine is model year **2000 or newer**, you need a registered **Electronic Logging Device** to track hours of service. Shop around: devices range from plug-and-play units to full fleet platforms, and pricing varies widely. Pick one that's on FMCSA's registered list.

## Step 11: Build your driver qualification files

Before a driver — including you — gets behind the wheel, you need a **Driver Qualification (DQ) file**: application, motor vehicle record, medical card, road test or equivalent, and more. Keep these organized from day one. This is exactly what auditors ask for first.

## How long does it all take?

Realistically, plan on **4–8 weeks** from starting paperwork to being ready for your first load, with insurance shopping and the authority protest period driving most of the timeline. Rushing it is how filings get rejected.

## Want it done for you?

This is literally what we do every day. Our [startup packages](/pricing) handle the entity-to-authority sequence — USDOT, MC authority, BOC-3, UCR, Clearinghouse, consortium enrollment, and your compliance files — so you can focus on finding freight instead of fighting forms.

---

*The Trucking Business is an independent private company, not affiliated with FMCSA or USDOT. Requirements change — verify current rules with FMCSA, the eCFR, IRS, and your state agencies before filing.*
$MD$,
  'Startup Guides',
  array['start a trucking company','new authority','USDOT','MC number','owner operator'],
  'How to Start a Trucking Company (Step-by-Step Guide) | The Trucking Business',
  'How to start a trucking company in the U.S.: USDOT, MC authority, BOC-3, insurance, UCR, IRP/IFTA, Clearinghouse and ELD — explained step by step.',
  false,
  '[
    {"q": "How much does it cost to start a trucking company?", "a": "It varies widely — the truck itself (bought or leased) and insurance are the two biggest costs, followed by authority filings, plates, permits, and an operating reserve. Use our free startup cost calculator to total your own numbers."},
    {"q": "Do I need a CDL to own a trucking company?", "a": "No — you can own the company and hire drivers. But you do need qualified CDL drivers with complete driver qualification files before any truck moves."},
    {"q": "How long until I can haul my first load?", "a": "Realistically 4–8 weeks from starting paperwork, with insurance shopping and the MC authority protest period driving most of the timeline."}
  ]'::jsonb,
  'published',
  now()
)
on conflict (slug) do nothing;
