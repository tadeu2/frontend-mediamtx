# Architecture: mediamtx-admin-ui

## System context

```
┌─────────────────────────────────────────────────┐
│                    LXC Host                      │
│                                                   │
│  ┌──────────────────┐   ┌─────────────────────┐  │
│  │  MediaMTX         │   │  mediamtx-admin-ui  │  │
│  │  (mediamtx.service)│   │  (mediamtx-admin-ui │  │
│  │                   │   │   .service)         │  │
│  │  API :9997        │◄──│  Backend :9088      │  │
│  │  Metrics :9998    │◄──│  (read-only proxy)  │  │
│  │  Pprof :9999      │   │                     │  │
│  │  RTSP :8554       │   │  Frontend :5173 dev │  │
│  │  WebRTC UDP range │   │  (Vite dev server)  │  │
│  └──────────────────┘   └─────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Backend architecture

```
backend/
├── src/
│   ├── server.ts          # Fastify app composition + entrypoint
│   ├── config.ts          # Env-based configuration loader
│   ├── plugins/
│   │   ├── auth.ts        # Bearer token auth (onRequest hook + decorator)
│   │   ├── cors.ts        # CORS plugin
│   │   └── error-handler.ts  # Normalized error response format
│   ├── routes/
│   │   └── admin.ts       # All read-only API routes
│   └── services/
│       ├── command.ts     # Safe execFile runner (bounded, no shell)
│       ├── journal.ts     # Bounded journalctl wrapper
│       ├── systemd.ts     # Bounded systemctl status wrapper
│       └── config-redact.ts  # YAML secret redaction
├── test/
│   ├── _helpers.ts
│   ├── health.test.ts
│   ├── api.test.ts
│   └── error-handler.test.ts
├── package.json
└── tsconfig.json
```

## Frontend architecture

```
frontend/
├── src/
│   ├── main.tsx           # React entrypoint
│   ├── app/
│   │   └── App.tsx        # Root component (providers + layout)
│   ├── api/
│   │   ├── client.ts      # Typed fetch-based API client
│   │   └── ApiContext.tsx  # React context + useApi/usePermissions hooks
│   ├── config/
│   │   └── permissions.ts # AllowedActions type + MVP_PERMISSIONS constant
│   ├── layout/
│   │   └── SidebarLayout.tsx  # Nav shell + hash-based router
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Streams.tsx
│   │   ├── Logs.tsx
│   │   ├── Metrics.tsx
│   │   ├── Config.tsx
│   │   └── Diagnostics.tsx
│   └── styles.css         # Dark theme CSS
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Shared contracts

```
shared/
└── admin-api.ts           # TypeScript DTOs for all API responses
```

Both backend and frontend tsconfig include `../shared/**/*.ts`.

## Data flow

```
Browser ──HTTP──→ Backend ──fetch──→ MediaMTX API (:9997)
                         ──fetch──→ MediaMTX Metrics (:9998)
                         ──execFile──→ journalctl -u mediamtx
                         ──execFile──→ systemctl status mediamtx
                         ──readFile──→ /etc/mediamtx/mediamtx.yml
```

All backend operations are read-only. No restart/reload/edit in MVP.

## Deployment topology

MVP: **Same LXC + systemd** (ADR-0001). No Docker.

- Backend listens `127.0.0.1:9088` by default
- Frontend served by Vite dev server or built as static files served by the backend
- Systemd service user: dedicated `mediamtx-ui` user; polkit handles systemctl access, systemd-journal group handles journalctl access
- Reverse proxy optional (only if already present, requires new ADR)

## Security model

| Layer | Mechanism |
|-------|-----------|
| Transport | Localhost only by default; `Bearer` token if exposed |
| Auth | Optional `ADMIN_AUTH_TOKEN` env var; `/healthz` exempt |
| Commands | `execFile` with explicit args, no shell, bounded timeout |
| Logs | Lined-bounded (max 1000), timeout-protected |
| Config | Secrets redacted before rendering (YAML keys: `password`, `token`, `key`, `secret`) |
| Frontend | Permission gate disables all admin actions in MVP |
| Commands | No arbitrary command execution; allowlist only |

## Fastify v5 scope encapsulation

**Known issue (discovered during testing):** `app.register()` creates sibling encapsulated scopes. Auth `onRequest` hooks and custom error handlers registered in one plugin scope do **not** apply to routes registered in a sibling scope.

**Current workaround:** Tests bypass this by calling plugin functions as plain functions on the root scope. Production routes currently rely on the register order — **this must be fixed before deployment** by either:
- Using `register()` with `{ encapsulate: false }`, or
- Calling plugin functions as plain decorator/hook registrations on the root `app` instance.
