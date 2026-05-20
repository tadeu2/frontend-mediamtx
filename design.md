# Design: mediamtx-admin-ui

## Technical approach

Self-hosted read-only admin UI for MediaMTX, deployed as a separate systemd service in the same LXC. Backend acts as a BFF (Backend For Frontend) that proxies MediaMTX API/metrics, reads bounded journald logs, and exposes safe diagnostics — all read-only, no mutation in MVP.

## Architecture decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Backend framework | Fastify | Express | Built-in schema validation, typed contracts, faster, cleaner API boundaries |
| Frontend stack | React + Vite | Next.js, SPA | Simple static serving; no SSR needed for admin UI |
| Deployment | Same LXC + systemd | Docker, separate LXC | Lowest ops cost, direct journald access, fastest MVP path |
| CSS | Plain CSS (dark theme) | Tailwind, shadcn | Keep deps minimal; dark theme is simple enough |
| Routing | Hash-based (`#dashboard`) | react-router | Zero additional deps, works without backend serving index.html fallback |
| Auth | Bearer token (optional) | Session, OAuth | Simple, env-var driven, works for local/internal use |
| Auth scope | Plugin-based `onRequest` hook | Middleware, route decorator | Fastify-native pattern, easy to test |
| Log source | `journalctl` via `execFile` | File read, syslog | Bounded, structured, no sudo needed; user must be in systemd-journal group |
| Metrics source | MediaMTX `/metrics` endpoint | Prometheus scrape | Direct fetch, no external dependency |

## API contract

All responses use shapes from `shared/admin-api.ts`. Error format:

```typescript
{ code: string; message: string; details?: Record<string, unknown> }
```

| Endpoint | Method | Auth | Parameters | Response type |
|----------|--------|------|------------|---------------|
| `/api/health` | GET | No | — | `HealthResponse` |
| `/api/status` | GET | Yes | — | `ServiceStatusResponse` |
| `/api/streams` | GET | Yes | — | `StreamsResponse` |
| `/api/logs` | GET | Yes | `lines`, `level`, `query` | `LogsResponse` |
| `/api/metrics` | GET | Yes | — | `MetricsSummary` |
| `/api/config` | GET | Yes | — | `ConfigView` |
| `/api/diagnostics/safe-check` | GET | Yes | — | `SafeDiagnosticsResponse` |

## Permission model

Frontend defines an `AllowedActions` type in `frontend/src/config/permissions.ts`:

```typescript
interface AllowedActions {
  canRestart: boolean;
  canReload: boolean;
  canEditConfig: boolean;
}
```

MVP sets all to `false`. The sidebar hides the "Admin" section entirely when all flags are `false`. The `hashchange` router redirects unauthorized admin URLs to `#dashboard`.

## Data sources and fallbacks

| Data | Primary source | When unavailable |
|------|---------------|------------------|
| Service status | `systemctl show mediamtx` | Shows `active: false, state: 'unknown'` |
| Streams | MediaMTX API `:9997` | Returns `source: 'unavailable'` with warning |
| Metrics | MediaMTX metrics `:9998/metrics` | Returns `available: false` with warning |
| Logs | `journalctl -u mediamtx` | Returns `source: 'unavailable'` with empty items |
| Config | `readFile(mediamtx.yml)` | Returns `available: false` with warning |
| Diagnostics | Aggregated from all sources | Lists each source status with individual results |

## Testing strategy

| Layer | Tool | Coverage |
|-------|------|----------|
| Backend unit | Node `node:test` + `node:assert` | Auth, route bounds, graceful degradation, error shapes |
| Frontend unit | (pending 4.2) | Component rendering, state transitions |
| E2E | (pending 4.2) | Dashboard loading, filter interactions, empty states |

## Known issues

- **Fastify v5 scope encapsulation** — auth and error handler hooks do not propagate to sibling scopes via `register()`. Fix required before deployment.
- **`normalizeLines(0)`** — passing `lines=0` returns the default (100) instead of clamping to 1, because `!0` is `true` in JavaScript.
