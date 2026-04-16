# The Grand Escape — Web

Marketing site for **The Grand Escape** (TGE), a no-race road-bikepacking
event series. Hub at `/` + three sub-LPs (`/slovenia`, `/germany`, `/tuscany`)
with a shared layout. Hosted on Cloudflare Workers via the `@astrojs/cloudflare`
SSR adapter. Editable via Pages CMS (app.pagescms.org).

---

## Stack

- **Astro 6** with `output: 'server'` + `@astrojs/cloudflare` adapter (SSR on Workers)
- **Content collections** (MDX for events, YAML for hub) with Zod schemas
- **Pages CMS** (hosted external) reads `.pages.yml` → provides a form-based admin
  that commits to `main` → Cloudflare auto-builds
- **Brevo** for waitlist (server-side via `/api/subscribe`)
- **Meta Pixel + CAPI** for attribution (same endpoint, consent-gated)

---

## Folder map

```
src/
├── content.config.ts          # Zod schemas for hub + events collections
├── content/
│   ├── hub/main/index.yaml    # homepage copy (editable from CMS)
│   └── events/
│       ├── slovenia/index.mdx # frontmatter + body per event
│       ├── germany/index.mdx
│       └── tuscany/index.mdx
├── layouts/
│   ├── BaseLayout.astro       # <head> + Nav + MetaPixel + CookieBanner + WhatsAppBadge
│   └── EventLayout.astro      # shared sub-LP structure (hero → facts → … → FAQ)
├── components/                # see "Component patterns" below
├── pages/
│   ├── index.astro            # hub
│   ├── slovenia.astro         # thin wrapper → EventLayout
│   ├── germany.astro
│   ├── tuscany.astro
│   └── api/subscribe.ts       # Astro endpoint (Brevo + Meta CAPI)
├── lib/event-defaults.ts      # shared credoPillars + signupBenefits
└── styles/tokens.css          # design tokens (colors, fonts, fluid type)

public/brand/                  # logos, mascots (goat.png, pretzel.svg)
.pages.yml                     # Pages CMS schema
astro.config.mjs               # output:'server', adapter: cloudflare()
```

**No `functions/` folder.** Cloudflare Pages Functions are ignored when the
Astro Cloudflare adapter is active. All server routes live under
`src/pages/api/` as Astro endpoints.

---

## Content collections

### `hub` (file, YAML)
Single entry at `src/content/hub/main/index.yaml`. Sections:
`manifesto`, `signup` (top form), `documentary`, `whatIs`, `threeEscapes`,
`documentarySecondary`, `testimonials`, `values[]`, `origin`,
`registrationOpens`, `signupBottom`, `trust.partners[]`.

### `events` (collection, MDX)
One folder per event. Frontmatter includes route metadata + `places[]`,
`included[]`, `testimonials[]`, `faq[]`, plus `photoSplits.{day,quiet}`,
`photoBreaks.{included,testimonials,faq}`, and an optional
`registrationOpens` countdown. MDX body is the one hero paragraph under
the philosophy section.

All image fields are **optional strings** (paths under `/public/…`).
Components fall back to gradient placeholders when absent.

---

## Component patterns

**Shared EventLayout**: takes `event` (from collection) + `trust`, forwards
to all section components. Two slots: `mascot` (forwarded to Hero) and
`mdx-copy` (for rendered MDX body). Applies a per-event display font class
(`font-event-germania | questrial | tuscany`) that cascades to every H2 in
the page.

**Image prop convention**: every visual component (`Hero`, `PhotoSplit`,
`PhotoBreak`, `PlacesBento`, `ValueBlock`, `OriginStory`, `PhilosophyQuote`)
accepts an optional `image` prop (URL string). When present it wins over
`imageBg` (gradient string). Fallback gradient in each component.

**Per-event accent color**: flows from `event.subBrandColor` as a CSS
variable `--accent`. Germany `#FABF80` (caramel), Slovenia `#617D42` (fern),
Tuscany `#A32C29` (wine). `FactsBar` auto-picks cream vs espresso text via
YIQ luminance when the accent is dark.

**Nav**: full-screen mobile overlay (JS-free via `<details>`-alternative
using a hidden checkbox + label siblings of the drawer to avoid Safari's
`backdrop-filter` containing-block bug).

**`MetaPixel` + `CookieBanner`**: pixel script is inert until
`localStorage.tge_consent.marketing === true`. Consent change fires a
`tge:consent-change` CustomEvent. `window.tgeTrack(name, params, opts)`
helper for downstream events; fires `Lead` on form success, `Contact` on
WhatsApp click.

---

## Env vars

| Name | Where | Notes |
|---|---|---|
| `PUBLIC_META_PIXEL_ID` | Build variables | Astro bakes into client JS |
| `META_PIXEL_ID` | Runtime | same value, used server-side for CAPI |
| `META_CAPI_TOKEN` | Runtime (Secret) | Meta Events Manager access token |
| `META_TEST_EVENT_CODE` | Runtime | set only during test mode, remove to go live |
| `BREVO_API_KEY` | Runtime (Secret) | xkeysib-… |
| `BREVO_LIST_ID` | Runtime | master list id (currently `17` = TGE Lead) |
| `BREVO_ATTR_NAME` | Runtime | default `EVENT_INTEREST` |

`.env.example` documents the full set. `.env` is gitignored for local dev.

### Brevo contact attributes (must exist in dashboard before first submit)
`EVENT_INTEREST`, `SIGNUP_SOURCE`, `SIGNUP_VARIANT` — all `normal` / `text`.

---

## Deploy flow

Cloudflare Pages has auto-migrated this project to **Workers Builds**, which
changes the workflow:

1. Push to `main` → CF Builds runs `npm run build`
2. Build runs `wrangler versions upload` (NOT deploy)
3. The version is uploaded but **not** promoted to Production
4. **Manual step**: dashboard → Deployments → click "Deploy" / "Promote to Production"

To automate: change the deploy command from `wrangler versions upload` to
`wrangler deploy` in Settings → Build → Deploy command. Not done yet —
ask the user before switching.

---

## Known gotchas

### Astro 6 env import
`locals.runtime.env` was removed. Import from the virtual module:
```ts
// @ts-expect-error virtual module provided by @astrojs/cloudflare
import { env } from 'cloudflare:workers';
```
Used in `src/pages/api/subscribe.ts`.

### CMS YAML reformatting
Pages CMS reformats the hub YAML (unquotes strings, sorts keys alphabetically).
Local commits and CMS commits both touch the same file → pull before push to
avoid conflicts. Recent conflict resolved by `git reset --soft origin/main`
+ re-applying local changes.

### Cloudflare Pages Functions ignored
`functions/api/*.ts` is silently ignored because the Astro Cloudflare adapter
owns `/api/*` routing. Always add server endpoints to `src/pages/api/`.

### Empty-body 500
If the Worker throws before my handler returns JSON, the platform returns a
generic 500 with empty body. `src/pages/api/subscribe.ts` wraps the handler
in try/catch that returns `{error, message, stack}` — keep that pattern for
any new endpoints during debugging.

### Env split (Build vs Runtime)
PUBLIC_* vars are baked into the client bundle at build time → they only
need to be in the **Build variables** section. Server-side vars must be in
**Variables and Secrets** (runtime). Setting only one side is a common
source of silent 500s.

---

## Brand voice (copy constraints)

- **Forbidden words**: `unforgettable`, `stunning`, `epic`, `once in a lifetime`,
  `fairytale` / `fairy-tale`, `magical`, `world-renowned`, `most beautiful`,
  `unreal`, `pure magic`, `crystal` (for landscapes), `cracked the code`,
  `perfectly designed`.
- **No fixed durations** (no "4 days of riding", "take a week"). Flexibility
  is the selling point.
- **No race language**: no watts, KOMs, difficulty ratings, cutoffs.
- **Tone**: rider-to-rider, concrete before poetic, second-person singular.
- **Direct quotes**: attributed testimonials are left verbatim even when they
  violate the rules (editorial integrity).

---

## Local dev

```bash
npm install
npm run dev         # dev server on :4321 (falls back to :4322 if busy)
npm run build       # production build to ./dist
```

The dev server has Astro HMR. After frontmatter or content config changes a
restart may be needed. Vite cache lives in `node_modules/.vite` +
`node_modules/.astro` — delete both and restart if you see stale CSS.

---

## When in doubt

- Check `.env.example` for env var contract
- Check `src/content.config.ts` for field names and types
- Check `src/lib/event-defaults.ts` for shared copy
- Brevo contact edits go through `/api/subscribe` → one list + merged `EVENT_INTEREST` attribute
