# SpaceX HQ Home (No Default) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When no published site is marked default, `/` shows a SpaceX HQ branded landing page; when a published default exists, `/` keeps the current iframe viewer; admins can clear default; `/view/:slug` stays unchanged.

**Architecture:** Extract a pure `getPublishedDefaultSite` helper. Branch `PublicSite` on `/` (no slug): Viewer if default exists, else `SpaceXHqHome`. Admin gains Clear default, stops auto-promoting on delete, and shows helper copy. Landing is a dedicated component + CSS with dark aerospace branding and reduced-motion support.

**Tech Stack:** React 19, Wouter, existing `Site` type / Neon sites API, Vite CSS (`src/styles/`), Lucide optional for CTAs only if needed.

## Global Constraints

- Option B only: published default → iframe on `/`; no published default → SpaceX HQ landing on `/`.
- `/view/:slug` behavior must not change.
- At most one `isDefault: true`; zero defaults allowed.
- Deleting the default must **not** auto-promote another site to default.
- Branding: dark aerospace look; **SPACEX HQ** as hero brand; first viewport = brand + one line + optional CTAs; no dashboard chrome; respect `prefers-reduced-motion`.
- Do not commit `.env.local` or secrets.
- Prefer focused files; follow existing admin/viewer CSS patterns.

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/site.ts` | Add `getPublishedDefaultSite(sites: Site[]): Site \| undefined` |
| `src/components/spacex-hq-home.tsx` | Branding landing for `/` when no default |
| `src/styles/spacex-hq.css` | Landing tokens, layout, motion |
| `src/index.css` | Import `spacex-hq.css` |
| `src/App.tsx` | Wire `/` branch; Clear default; remove delete auto-promote; helper copy |
| `scripts/assert-published-default.mjs` | Tiny Node assert for helper logic (no new test runner) |

---

### Task 1: Published-default helper

**Files:**
- Modify: `src/lib/site.ts`
- Create: `scripts/assert-published-default.mjs`
- Modify: `src/App.tsx` (replace local `getDefaultSite` usages for home resolution later in Task 3; in this task only add helper + keep `getDefaultSite` until Task 3, or replace immediately if safer)

**Interfaces:**
- Produces: `getPublishedDefaultSite(sites: Site[]): Site | undefined` — returns the first site with `published === true` and `isDefault === true`, else `undefined`. Does **not** fall back to “any published” or `sites[0]`.

- [ ] **Step 1: Add helper to `src/lib/site.ts`**

```ts
export type Site = {
  slug: string;
  name: string;
  url: string;
  description: string;
  published: boolean;
  isDefault?: boolean;
  embeddable?: boolean;
  embedCheckedAt?: string;
  embedReason?: string;
};

/** Strict home default: published + isDefault only. No fallback. */
export function getPublishedDefaultSite(sites: Site[]): Site | undefined {
  return sites.find((site) => site.published && site.isDefault);
}
```

- [ ] **Step 2: Write assert script `scripts/assert-published-default.mjs`**

```js
function getPublishedDefaultSite(sites) {
  return sites.find((site) => site.published && site.isDefault);
}

const samples = [
  {
    name: 'none',
    sites: [
      { slug: 'a', published: true, isDefault: false },
      { slug: 'b', published: true, isDefault: false },
    ],
    expect: undefined,
  },
  {
    name: 'unpublished-default-ignored',
    sites: [{ slug: 'a', published: false, isDefault: true }],
    expect: undefined,
  },
  {
    name: 'published-default',
    sites: [
      { slug: 'a', published: true, isDefault: false },
      { slug: 'b', published: true, isDefault: true },
    ],
    expect: 'b',
  },
];

for (const sample of samples) {
  const got = getPublishedDefaultSite(sample.sites);
  const slug = got?.slug;
  if (slug !== sample.expect) {
    console.error(`FAIL ${sample.name}: got ${slug}, expect ${sample.expect}`);
    process.exit(1);
  }
}
console.log('assert-published-default: ok');
```

- [ ] **Step 3: Run assert**

Run: `node scripts/assert-published-default.mjs`  
Expected: `assert-published-default: ok`

- [ ] **Step 4: Commit**

```bash
git add src/lib/site.ts scripts/assert-published-default.mjs
git commit -m "Add strict published-default site helper for home routing."
```

---

### Task 2: SpaceX HQ landing page UI

**Files:**
- Create: `src/components/spacex-hq-home.tsx`
- Create: `src/styles/spacex-hq.css`
- Modify: `src/index.css` (add `@import "./styles/spacex-hq.css";`)

**Interfaces:**
- Consumes: `Site` from `@/lib/site`
- Produces: `export function SpaceXHqHome({ sites }: { sites: Site[] })` — renders full-viewport branding; links only `sites.filter(s => s.published)` to `/view/${slug}`.

- [ ] **Step 1: Add CSS `src/styles/spacex-hq.css`**

Use CSS variables (not purple/cream AI defaults). Example tokens:

```css
@layer components {
  .sxhq {
    --sxhq-bg: #050505;
    --sxhq-fg: #f5f5f5;
    --sxhq-muted: #9a9a9a;
    --sxhq-accent: #ba0c2f;
    --sxhq-display: "Orbitron", "Eurostile", "Arial Narrow", sans-serif;
    --sxhq-body: "IBM Plex Sans", "Helvetica Neue", sans-serif;
    min-height: 100svh;
    margin: 0;
    background:
      radial-gradient(ellipse 80% 50% at 50% -10%, #1a1a1a 0%, transparent 55%),
      radial-gradient(ellipse 60% 40% at 80% 100%, #1a0508 0%, transparent 50%),
      var(--sxhq-bg);
    color: var(--sxhq-fg);
    font-family: var(--sxhq-body);
    display: grid;
    place-items: center;
    padding: 2rem 1.25rem;
    overflow: hidden;
    position: relative;
  }

  .sxhq__atmosphere {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.35), transparent),
      radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,0.25), transparent),
      radial-gradient(1px 1px at 40% 80%, rgba(255,255,255,0.2), transparent);
    opacity: 0.45;
    animation: sxhq-drift 28s linear infinite;
  }

  .sxhq__inner {
    position: relative;
    z-index: 1;
    text-align: center;
    max-width: 40rem;
  }

  .sxhq__brand {
    font-family: var(--sxhq-display);
    font-weight: 700;
    letter-spacing: 0.28em;
    font-size: clamp(2.5rem, 10vw, 5rem);
    line-height: 1;
    margin: 0;
    animation: sxhq-rise 0.9s ease-out both;
  }

  .sxhq__brand-hq {
    display: block;
    margin-top: 0.35em;
    letter-spacing: 0.5em;
    font-size: 0.35em;
    color: var(--sxhq-accent);
  }

  .sxhq__tag {
    margin: 1.5rem 0 0;
    color: var(--sxhq-muted);
    font-size: 0.95rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    animation: sxhq-rise 0.9s ease-out 0.15s both;
  }

  .sxhq__ctas {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 2rem;
    animation: sxhq-rise 0.9s ease-out 0.3s both;
  }

  .sxhq__cta {
    appearance: none;
    border: 1px solid rgba(245, 245, 245, 0.35);
    background: transparent;
    color: var(--sxhq-fg);
    text-decoration: none;
    padding: 0.65rem 1.1rem;
    font-size: 0.8rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    transition: border-color 0.2s, background 0.2s, transform 0.2s;
  }

  .sxhq__cta:hover {
    border-color: var(--sxhq-accent);
    background: rgba(186, 12, 47, 0.12);
    transform: translateY(-1px);
  }

  .sxhq__cta:focus-visible {
    outline: 2px solid var(--sxhq-accent);
    outline-offset: 3px;
  }

  @keyframes sxhq-rise {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes sxhq-drift {
    from { transform: translateY(0); }
    to { transform: translateY(-24px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .sxhq__atmosphere,
    .sxhq__brand,
    .sxhq__tag,
    .sxhq__ctas {
      animation: none;
    }
    .sxhq__cta:hover {
      transform: none;
    }
  }
}
```

Load Orbitron + IBM Plex Sans via `@import` at top of this file from fonts.googleapis.com **or** self-host if the project prefers offline; Google Fonts import is acceptable for this landing-only CSS.

- [ ] **Step 2: Create `src/components/spacex-hq-home.tsx`**

```tsx
import type { Site } from '@/lib/site';

export function SpaceXHqHome({ sites }: { sites: Site[] }) {
  const published = sites.filter((site) => site.published);

  return (
    <main className="sxhq" data-testid="spacex-hq-home">
      <div className="sxhq__atmosphere" aria-hidden="true" />
      <div className="sxhq__inner">
        <h1 className="sxhq__brand">
          SPACEX
          <span className="sxhq__brand-hq">HQ</span>
        </h1>
        <p className="sxhq__tag">Operations hub · Starstruck</p>
        {published.length > 0 ? (
          <nav className="sxhq__ctas" aria-label="Published pages">
            {published.map((site) => (
              <a key={site.slug} className="sxhq__cta" href={`/view/${site.slug}`}>
                {site.name}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Import CSS in `src/index.css`**

Add after other style imports:

```css
@import "./styles/spacex-hq.css";
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`  
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
git add src/components/spacex-hq-home.tsx src/styles/spacex-hq.css src/index.css
git commit -m "Add SpaceX HQ branded home page for visitors."
```

---

### Task 3: Branch `/` in `PublicSite`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `getPublishedDefaultSite` from `@/lib/site`, `SpaceXHqHome` from `@/components/spacex-hq-home`
- Behavior: For `PublicSite` **without** `slug`: if ready and `getPublishedDefaultSite(sites)` → `<Viewer site={...} />`; else if ready → `<SpaceXHqHome sites={sites} />`. With `slug`: keep finding published by slug and `<Viewer site={...} />` (including fallback when missing).

- [ ] **Step 1: Update imports and remove fallback `getDefaultSite` for home**

In `src/App.tsx`:

1. Import `getPublishedDefaultSite` and `type Site` already from `@/lib/site` (Site already imported).
2. Import `SpaceXHqHome`.
3. Delete local function `getDefaultSite` (lines ~53–58) so home never falls back to “any published”.

- [ ] **Step 2: Rewrite `PublicSite` site selection + render**

```tsx
function PublicSite({ slug }: { slug?: string }) {
  const [sites, setSites] = useState<Site[]>([]);
  const [ready, setReady] = useState(false);

  const site = useMemo(() => {
    if (!ready) {
      return undefined;
    }
    if (slug) {
      return sites.find(
        (candidate) => candidate.slug === slug && candidate.published,
      );
    }
    return getPublishedDefaultSite(sites);
  }, [sites, slug, ready]);

  // ... existing fetchPublishedSites effect unchanged ...

  if (!ready) {
    return (
      <main className="viewer-root" aria-busy="true">
        <div className="viewer__veil" role="status" aria-label="Loading">
          <span className="viewer__pulse" aria-hidden="true" />
        </div>
      </main>
    );
  }

  if (!slug && !site) {
    return <SpaceXHqHome sites={sites} />;
  }

  return <Viewer site={site} />;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`  
Expected: exit 0

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "Show SpaceX HQ home on / when no published default."
```

---

### Task 4: Admin Clear default + no auto-promote + helper copy

**Files:**
- Modify: `src/App.tsx` (`setDefault`, `removeSite`, pages list UI)

**Interfaces:**
- `setDefault(site)` when `site.isDefault` → clear all defaults (`isDefault: false` for every site), notice: `"Default cleared. / now shows SpaceX HQ home."`
- `setDefault(site)` when not default → existing make-default behavior
- `removeSite`: remove site; **do not** set `remaining[0].isDefault = true`
- Button label: `site.isDefault ? 'Clear default' : 'Make default'`
- Helper paragraph in Pages card content (above list): `If no page is default, visitors see the SpaceX HQ home page at /.`

- [ ] **Step 1: Update `setDefault`**

```tsx
async function setDefault(site: Site) {
  if (site.isDefault) {
    const nextSites = sites.map((candidate) => ({
      ...candidate,
      isDefault: false,
    }));
    await updateSites(
      nextSites,
      'Default cleared. / now shows SpaceX HQ home.',
    );
    return;
  }

  const nextSites = sites.map((candidate) => ({
    ...candidate,
    isDefault: candidate.slug === site.slug,
  }));
  await updateSites(nextSites, `${site.name} is now the default page.`);
}
```

- [ ] **Step 2: Update `removeSite` — no auto-promote**

```tsx
async function removeSite(site: Site) {
  if (!window.confirm(`Remove ${site.name} from the page list?`)) {
    return;
  }

  const remaining = sites.filter((candidate) => candidate.slug !== site.slug);
  const saved = await updateSites(remaining, `${site.name} was removed.`);
  if (saved && editingSlug === site.slug) {
    resetForm();
  }
}
```

- [ ] **Step 3: Update button label + helper copy**

Button:

```tsx
<Button variant="ghost" size="sm" type="button" onClick={() => setDefault(site)}>
  {site.isDefault ? 'Clear default' : 'Make default'}
</Button>
```

In Pages `CardContent`, before the list:

```tsx
<p className="admin-muted">
  If no page is default, visitors see the SpaceX HQ home page at{' '}
  <span className="admin-code">/</span>.
</p>
```

Keep **Default** badge only when `site.isDefault` (add next to Live badge if not already present):

```tsx
{site.isDefault ? <Badge variant="secondary">Default</Badge> : null}
```

- [ ] **Step 4: Typecheck + build**

Run: `npm run build`  
Expected: success (chunk size warning OK)

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "Allow clearing site default without auto-promoting another."
```

---

### Task 5: Manual smoke acceptance

**Files:** none (verification only)

- [ ] **Step 1: Dev server**

Run: `npm run dev`  
Open `http://127.0.0.1:5173/admin`, unlock.

- [ ] **Step 2: Clear default**

On a default page, click **Clear default**. Open `/` → expect SpaceX HQ landing (`data-testid="spacex-hq-home"`), not iframe.

- [ ] **Step 3: Make default**

Click **Make default** on a published page. Open `/` → expect iframe viewer for that page.

- [ ] **Step 4: View route**

Open `/view/<slug>` for a published non-default page → expect iframe still works.

- [ ] **Step 5: Commit nothing unless fixes needed; if fixes, commit with message describing the fix**

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Clear default / Make default | Task 4 |
| Default badge | Task 4 |
| Helper copy | Task 4 |
| No auto-promote on delete | Task 4 |
| `/` iframe when published default | Task 1 + 3 |
| `/` HQ landing when no default | Task 2 + 3 |
| `/view/:slug` unchanged | Task 3 (slug branch untouched) |
| Branding content/visual/motion/a11y | Task 2 |
| Acceptance checks | Task 5 |

Placeholder scan: none.  
Type names: `getPublishedDefaultSite`, `SpaceXHqHome`, `Site` consistent across tasks.
