# The Grand Escape — web

Hub + event landing pages for **The Grand Escape**. Built with Astro (static), deployed on Cloudflare Pages. Form handled by a Cloudflare Pages Function that proxies to Brevo.

## Stack

- **Astro 6** (static SSG, zero JS by default, zero build adapter)
- **MDX** for per-event copy
- **Cloudflare Pages** + **Pages Functions** (form proxy in `/functions/api/subscribe.ts`)
- **Brevo** (email / newsletter)
- **Pages CMS** (https://pagescms.org) — hosted admin UI, git-backed, config in `.pages.yml`

## Local development

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # production build in dist/
npm run preview   # preview production build
```

## Structure

```
src/
├── content/
│   ├── hub.yaml               # Hub copy (manifesto, values, stats, signup, trust)
│   └── events/
│       ├── slovenia.mdx       # Per-event frontmatter + body
│       ├── germany.mdx
│       └── tuscany.mdx
├── content.config.ts          # Zod schemas for content collections
├── components/                # Riusabili hub + sub-LP
├── layouts/BaseLayout.astro
├── pages/
│   ├── index.astro            # Hub
│   ├── germany.astro          # Sub-LP pilota
│   ├── slovenia.astro         # Placeholder — waitlist
│   └── tuscany.astro          # Placeholder — waitlist
└── styles/tokens.css          # Design tokens

public/
├── brand/                     # Logo TGE + BAS + sponsor assets
├── video/                     # hero-loop.webm, hero-poster.jpg (DA CARICARE)
└── og/                        # social share images (TODO)

functions/
└── api/subscribe.ts           # Cloudflare Pages Function — proxy Brevo
```

## Content editing

### Senza CMS (codice)

- **Hub**: edita `src/content/hub.yaml`
- **Eventi**: edita `src/content/events/{slug}.mdx`
- Commit → Cloudflare Pages re-build automatico

### Con Pages CMS (admin hostato)

1. Push il repo su GitHub (se non già fatto)
2. Vai su [app.pagescms.org](https://app.pagescms.org), accedi con GitHub
3. Seleziona il repo `thegrandescape-web`
4. L'admin si genera automaticamente da `.pages.yml` (schema tipizzato con tab per ogni sezione, array riordinabili per testimonials/values/partners, editor rich-text per event body)
5. Ogni salvataggio = commit su `main` → Cloudflare Pages rebuilda automaticamente

**Perché Pages CMS** (e non Keystatic): Keystatic richiede Astro adapter + React + incompatibilità con Cloudflare Workers runtime. Pages CMS è esterno, zero dipendenze npm, zero build change, zero conflitti di versione Astro.

## Deploy (Cloudflare Pages)

1. Push il repo su GitHub
2. Cloudflare Dashboard → Pages → Create project → Connect GitHub
3. **Build settings**
   - Framework preset: `Astro`
   - Build command: `npm run build`
   - Build output directory: `dist`
4. **Environment variables**:
   - `BREVO_API_KEY` (server-side only)
   - `BREVO_LIST_ID` (main newsletter)
   - `BREVO_GERMANY_LIST`, `BREVO_SLOVENIA_LIST`, `BREVO_TUSCANY_LIST` (opzionali)
5. Deploy → verifica su `staging.thegrandescape.cc`
6. DNS swap → `thegrandescape.cc`

## Brevo — custom attributes richiesti

| Name | Type | Values |
|---|---|---|
| `EVENT_INTEREST` | Text | `slovenia,germany,tuscany` comma-sep |
| `SIGNUP_SOURCE` | Text | pathname della pagina di signup |
| `SIGNUP_VARIANT` | Text | `hub` o `event` |

## Asset da caricare

- `public/video/hero-loop.webm` — WebM VP9, 6–10s, < 1.5MB, muted+loop
- `public/video/hero-poster.jpg` — poster 1920x1080, < 200KB
- `public/og/hub.jpg` — Open Graph 1200x630
- Foto reali per i 4 ValueBlock (sostituire i gradient placeholder)

## TODO

- [ ] Connect repo to Pages CMS on https://app.pagescms.org (dopo push su GitHub)
- [ ] Upload hero video + poster
- [ ] Replace ValueBlock gradient placeholders with real photos
- [ ] OG image
- [ ] Slovenia/Tuscany sub-LP content
- [ ] Analytics setup

## License

Private — © 2026 Bike Adventure Series
