# changelog

## 1.0.0 — 2026-06-28

First public release.

### added

- Zoneless Angular 19 scaffold (`provideExperimentalZonelessChangeDetection`) with standalone components throughout — no `NgModule`s.
- Tailwind v4 with `@theme`-based design tokens (OKLCH palette, dark-first), matching the portfolio.
- TanStack Query for Angular (`injectQuery`, `injectMutation`) wired to a typed `ApiClient` with Zod-validated responses.
- **Dashboard** — totals + success rate + hourly throughput SVG bars + per-source rollup, with `injectQuery` polling every 30s.
- **Events list** — signal-based filters (search, status, source), virtual-scroll-friendly table, multi-select with bulk replay + tombstone actions.
- **Event detail** — full event metadata, request headers + body excerpt, per-delivery rows with status, attempt count, last status code, response excerpt, and a manual replay button.
- **Deliveries list** — filter by status + target, per-row retry action.
- **Sources** — list + reactive form with Zod-validated `SourceCreate` body, plugin selector, signature tolerance, target multi-select, enabled/test-mode toggles, delete.
- **Targets** — list + reactive form with URL validation, custom backoff schedule (comma-separated seconds), max attempts, timeout, enabled toggle, delete.
- **Settings** — runtime configurable API base URL + bearer token, persisted to `localStorage`, surfaced in sidebar status pill.
- Shell with responsive sidebar + topbar status, dark theme by default, accent-tinted active route.
- Functional router with `withComponentInputBinding()` — params flow into components via `input.required<string>()`.
- Dev proxy (`proxy.conf.json`) pointing `/api` at the local backend on port 3000.
