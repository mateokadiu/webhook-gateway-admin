# webhook-gateway-admin

> Modern Angular 19 admin UI for [webhook-gateway](https://github.com/mateokadiu/webhook-gateway).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Angular](https://img.shields.io/badge/Angular-19-DD0031.svg)](https://angular.dev)
[![Tailwind v4](https://img.shields.io/badge/Tailwind-v4-38BDF8.svg)](https://tailwindcss.com)
[![Status](https://img.shields.io/badge/status-v1.0-brightgreen)](./CHANGELOG.md)

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (Angular 19)                                            │
│                                                                  │
│  ┌──────────────────────┐    HTTP/JSON    ┌──────────────────┐  │
│  │  Zoneless shell      │ ──────────────▶ │  /api/events     │  │
│  │  Signal-driven CD    │                 │  /api/deliveries │  │
│  │                      │                 │  /api/sources    │  │
│  │  TanStack Query for  │ ◀────────────── │  /api/targets    │  │
│  │  Angular (injectQuery│  Zod-validated  │  /api/stats      │  │
│  │  / injectMutation)   │  response       └──────────────────┘  │
│  └──────────────────────┘                                        │
│                                                                  │
│  Tailwind v4 @theme tokens · standalone components · @if/@for    │
└──────────────────────────────────────────────────────────────────┘
                            ▼
                   webhook-gateway (NestJS)
```

Built to exercise Angular 19's signal-first architecture against a real backend. **Same backend, second admin UI** — the canonical admin in [`webhook-gateway`](https://github.com/mateokadiu/webhook-gateway) is Next.js + React 19; this repo is the Angular twin so I can speak to both frameworks against the same domain model.

## Features

- **Dashboard** — totals (received/delivered/failed/dead), success rate, hourly throughput SVG bars, per-source rollup. Polls every 30s.
- **Events** — signal-based filters (full-text search, status, source); multi-select rows; bulk replay + bulk tombstone; deep-link per-event detail with full metadata, request headers, body excerpt, and per-delivery rows.
- **Deliveries** — filter by status + target; manual per-row retry for failed/retrying/dead deliveries.
- **Sources** — list + reactive form (`Zod`-validated `SourceCreate` body, plugin selector, signature tolerance, target multi-select, enabled/test-mode toggles, delete).
- **Targets** — list + reactive form (URL validation, custom backoff schedule as comma-separated seconds, max attempts, timeout, enabled toggle, delete).
- **Settings** — runtime-configurable API base URL + bearer token, persisted to `localStorage`, surfaced in the sidebar status pill.

## What this exercises (Angular 19 cheat sheet)

| Feature | Where |
|---|---|
| `provideExperimentalZonelessChangeDetection()` | [`app.config.ts`](./src/app/app.config.ts) — no Zone.js, signals are the dirty marker |
| Standalone components | every `@Component`; no `NgModule` anywhere |
| Template control flow (`@if`/`@for`/`@switch`) | every feature template |
| `input.required<T>()` + `withComponentInputBinding()` | [`event-detail.component.ts`](./src/app/features/events/event-detail.component.ts), [`source-form.component.ts`](./src/app/features/sources/source-form.component.ts), [`target-form.component.ts`](./src/app/features/targets/target-form.component.ts) |
| `signal()` + `computed()` for local state | filter state in [`events-list.component.ts`](./src/app/features/events/events-list.component.ts), [`deliveries-list.component.ts`](./src/app/features/deliveries/deliveries-list.component.ts) |
| TanStack Query for Angular (`injectQuery` / `injectMutation`) | [`core/api/`](./src/app/core/api/) + every feature |
| Zod validation at the I/O boundary | [`core/models/schemas.ts`](./src/app/core/models/schemas.ts) — schemas mirror backend's |
| Reactive forms (typed, signal-aware) | source + target forms |
| Functional router + lazy `loadComponent` | [`app.routes.ts`](./src/app/app.routes.ts) |
| Tailwind v4 `@theme` tokens | [`src/styles.css`](./src/styles.css) — single source of truth for the OKLCH palette |

## Quick start

```bash
# 1. boot the backend (in another terminal)
cd ../webhook-gateway
pnpm install
docker compose -f docker-compose.yml up -d        # postgres + redis
pnpm --filter @webhook-gateway/api dev            # port 3000

# 2. run this admin
pnpm install
pnpm dev                                           # port 5100, proxies /api → :3000
```

Open <http://localhost:5100>. The sidebar shows whether you're authenticated; the **Settings** page configures the API base URL + bearer token.

## Project layout

```
src/app/
├── core/
│   ├── api/                # typed clients per controller (events, deliveries, sources, targets, stats)
│   ├── models/             # Zod schemas mirroring backend (single source of truth for types)
│   └── ui/                 # status-badge, relative-time pipe, skeleton, empty-state
├── shell/                  # sidebar + top status pill
└── features/
    ├── dashboard/          # stats overview
    ├── events/             # list + detail
    ├── deliveries/         # list + retry
    ├── sources/            # list + form
    ├── targets/            # list + form
    └── settings/           # base URL + bearer token
```

## Deploy

The admin is a static SPA — any CDN works. Recommended targets:

### Cloudflare Pages (free, edge, recommended)

1. Push this repo to GitHub (already done).
2. In Cloudflare Pages → **Create application** → connect `mateokadiu/webhook-gateway-admin`.
3. Build settings:
   - **Framework preset:** Angular
   - **Build command:** `pnpm install --frozen-lockfile && pnpm build`
   - **Build output directory:** `dist/webhook-gateway-admin/browser`
   - **Environment variables:** none (the API base is configurable at runtime via the Settings page)
4. Deploy. The admin lands at `<project>.pages.dev`.

### Anywhere else

The static build (`pnpm build`) emits `dist/webhook-gateway-admin/browser/` which contains plain HTML/CSS/JS. Serve it from S3 + CloudFront, Netlify, Vercel static, GitHub Pages, or a plain Nginx — pick whichever.

Configure the API base URL via the **Settings** page once deployed; the value is stored in `localStorage` so each visitor can point at their own backend.

## Decisions log

| # | Decision | Why |
|---|---|---|
| 1 | Zoneless | Zone.js patches every async API; with signals + OnPush + signal-driven CD, you don't need it. Faster startup, smaller bundle, simpler mental model. |
| 2 | TanStack Query for Angular over a hand-rolled service + `BehaviorSubject` | Dedup, caching, mutation invalidation, polling, stale-while-revalidate — all built in. Standard pattern across React + Angular keeps cross-framework code readable. |
| 3 | Zod at the I/O boundary | The backend already ships Zod schemas in `@webhook-gateway/shared`. Mirroring them in the client gives compile-time *and* runtime type safety end-to-end. |
| 4 | Standalone everywhere | No `NgModule`s. Standalone is the modern default; modules are deprecated for app code in Angular 19+. |
| 5 | Functional router + `withComponentInputBinding()` | Params flow into components as inputs (`input.required<string>()`) — no `ActivatedRoute.snapshot.paramMap.get(...)` boilerplate, no observable juggling. |
| 6 | Reactive forms with `Zod.safeParse` on submit | Form gives you control state + change tracking; Zod gives you the source-of-truth schema. Best of both. |
| 7 | Tailwind v4 with `@theme` block | Single design-token source in CSS. No `tailwind.config.js`. Lightning CSS handles compilation. |
| 8 | Dev proxy (`/api → localhost:3000`) | Same-origin in dev so the API client doesn't need CORS exemptions and `fetch` cookies work. |

## License

MIT · [@mateokadiu](https://github.com/mateokadiu)
