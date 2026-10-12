# Blog API — for the owner, VA, and AI agents

The blog lives in Supabase (`blog_posts` table, created by
`supabase/migration-003.sql`). No code changes are ever needed to publish.

## Option 1 — Admin UI (no code, for the owner or VA)

1. Go to `https://www.thetruckingbusiness.com/admin/blog`
2. Paste the `BLOG_API_KEY` once (kept in that browser tab only)
3. Click **+ New article**, write in Markdown, **Preview**, then **Publish**

Markdown cheatsheet: `## Heading`, `**bold**`, `*italic*`,
`[link text](https://…)`, `![alt text](image-url)`, `- bullet list`.

**Embeds** (shortcode on its own line in the markdown):
- `[calculator:startup-cost]` / `[calculator:cost-per-mile]` — live calculators inside the article
- `[visual:sleeper-berth]` / `[visual:hos-clocks]` / `[visual:authority-timeline]` — interactive visuals

## Option 2 — API (for AI agents / automation)

Base: `https://www.thetruckingbusiness.com`

All write endpoints require the header:

```
Authorization: Bearer <BLOG_API_KEY>
```

### Create a post (draft — recommended for agents)

```http
POST /api/blog
Content-Type: application/json
Authorization: Bearer <BLOG_API_KEY>

{
  "title": "Do You Need an ELD? Hours-of-Service Rules Explained",
  "excerpt": "Which trucks need an ELD, the exemptions, and what roadside expects.",
  "content_md": "## Who needs an ELD?\n\n...",
  "category": "Compliance",
  "tags": ["eld", "hours of service"],
  "cover_image_url": "https://… (optional)",
  "seo_title": "Do You Need an ELD? (60 chars max)",
  "seo_description": "155-char summary for Google",
  "has_affiliate_links": true,
  "status": "draft",
  "author": "The Trucking Business"
}
```

- `title` and `content_md` are required. `slug` is auto-generated from the title.
- **Agents should always create `draft` posts** — the owner reviews and publishes.
- `has_affiliate_links: true` shows the FTC affiliate disclosure box. Set it
  whenever a post contains any affiliate/referral link.
- `faqs`: array of `{"q": "…", "a": "…"}` — 3 to 5 per post. These render as
  an FAQ section AND as FAQPage schema, which is what wins Google's
  "People Also Ask" boxes. Always include them.
- `status: "published"` publishes immediately (owner only).

### Update / delete

```http
PUT /api/blog/<slug>        # same body fields, all optional
DELETE /api/blog/<slug>
```

### Read

```http
GET /api/blog               # published posts (public)
GET /api/blog?category=Compliance
GET /api/blog/<slug>        # one published post (public)
```

## Content rules (non-negotiable)

1. **Never invent FMCSA requirements, fees, deadlines, citations, or exemptions.**
   If a number can't be verified, write around it ("fees are tiered by fleet size").
2. Every post ends with the site's standard disclaimer (added automatically).
3. Never present the business as FMCSA/USDOT or a government agency.
4. No fabricated testimonials, statistics, or "we've helped X drivers" claims.
5. Affiliate links: only real programs the owner joined; always set
   `has_affiliate_links: true`.
6. Internal links: link naturally to `/pricing` where a service fits.

## Suggested twice-daily workflow for an agent

- Morning + evening: `POST /api/blog` with `status: "draft"`.
- Topics rotate: startup steps, compliance explainers, cost breakdowns,
  ELD/tech reviews, audit readiness, state-specific guides.
- The owner opens `/admin/blog`, reviews, and hits **Publish**.
