# SpaceX HQ home when no default site

**Date:** 2026-09-10  
**Status:** Approved  
**App:** Zam Viewer (`Frontend`)

## Goal

Let admins mark a page as default or **not** default. Visitor behavior on `/` depends on that:

- **A published site is marked default** → `/` keeps today’s iframe viewer (no change).
- **No site is marked default** → `/` shows a SpaceX HQ branded landing page (not the iframe).
- **`/view/:slug` is unchanged** in all cases.

## Background

Today:

- Each `Site` may have `isDefault?: boolean`.
- Admin already has **Make default** (sets one site default, clears others).
- `/` always resolves to a default/published site and embeds it in `Viewer`.
- There is no way to clear default so that **zero** sites are default; without that, the branding home cannot appear.

## Decision

Use **soft default (Approach 1)**:

- At most one site may have `isDefault: true`.
- Zero defaults is allowed.
- Home routing branches on whether a **published** default exists.

Rejected alternatives:

- Separate global “home mode” toggle (extra conflicting setting).
- Fake system “landing” row in the sites list (awkward data model).

## Behavior

### Admin (Pages tab)

1. Keep **Make default** when the site is not default.
2. When the site **is** default, the same control becomes **Clear default** and sets `isDefault: false` on that site (and leaves all others false).
3. Show a **Default** badge only on the current default site.
4. Show short helper copy near the pages list or under the control:  
   “If no page is default, visitors see the SpaceX HQ home page at `/`.”
5. Deleting the default site: if others remain, do **not** auto-promote another to default (so branding home can stay available). Optional: keep existing auto-promote only if product later requires it; for this spec, **prefer no auto-promote** so Clear default / delete default can land on branding home intentionally.

### Visitor `/`

1. Fetch published sites as today.
2. If `sites.find(s => s.published && s.isDefault)` exists → render current `Viewer` with that site.
3. Else → render new `SpaceXHqHome` (or equivalent) full-page branding experience.
4. Loading / empty states: while sites are loading, keep a minimal loading veil; if ready and no default, show branding (even if other published non-default pages exist).

### Visitor `/view/:slug`

Unchanged: published slug → viewer; missing/unpublished → existing fallback.

## SpaceX HQ landing page

### Job

One composition: brand-first home for `spacexhq` / root visits when no iframe default is set.

### Content (first viewport)

- Brand mark / wordmark: **SPACEX HQ** (or “SPACEX” + “HQ”) as the hero-level signal.
- One short supporting line (e.g. mission-style tagline for this hub — not a long marketing block).
- Optional CTA group: links to published pages via `/view/:slug` (if any), plus nothing that requires admin.
- No dashboard chrome, no stats, no cards-as-decoration.

### Visual direction

- Dark, high-contrast, aerospace / launch-aesthetic (black / near-black, white type, restrained metallic or red accent).
- Expressive typography (not Inter/Roboto/Arial/system default stack for display).
- Full-bleed atmosphere (gradient / subtle texture / deep space feel) — brand name must still read as the hero.
- At least 2–3 intentional motions (e.g. wordmark entrance, ambient drift, CTA hover) with `prefers-reduced-motion` respected.
- Mobile and desktop first viewport usable.

### Out of scope for branding

- Claiming official SpaceX affiliation beyond an internal/fan-style hub look for this product’s domain.
- Replacing admin UI chrome with SpaceX theme.

## Data model

No schema migration required beyond existing `isDefault` on `Site`:

```ts
isDefault?: boolean
```

Persistence remains Neon (and any JSON backup path) via existing sites update APIs.

## Routing summary

| Condition | `/` |
|-----------|-----|
| Published site with `isDefault: true` | Current iframe `Viewer` |
| No published default | SpaceX HQ landing |
| `/view/:slug` | Always current viewer behavior |

## Testing / acceptance

1. Mark a published page default → `/` shows iframe of that page.
2. Clear default → `/` shows SpaceX HQ landing.
3. Published non-default pages still open at `/view/:slug`.
4. Admin badge and Clear default / Make default labels are correct.
5. Landing is usable on narrow mobile width.
6. With reduced motion enabled, page remains usable without required animation.

## Non-goals

- Changing PostHog analytics tabs.
- Cloudflare / domain automation.
- Multi-default sites.
