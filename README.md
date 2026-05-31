# mediamtx-admin-ui

Self-hosted read-only admin UI for [MediaMTX](https://github.com/bluenviron/mediamtx).

## Architecture

```
┌────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Frontend  │────→│  Backend (BFF)   │────→│  MediaMTX       │
│  Vite+React │     │  Fastify + TS    │     │  API :9997      │
│  :5173 dev  │     │  :9088           │     │  Metrics :9998  │
└────────────┘     └──────────────────┘     └─────────────────┘
                         │
                         ├── journalctl -u mediamtx
                         └── systemctl status mediamtx
```

- **Backend**: Node.js + TypeScript + Fastify, CommonJS.
- **Frontend**: React + TypeScript + Vite, ESM.
- **Shared contracts**: `shared/admin-api.ts`.
- **Deployment**: systemd service on the same LXC as MediaMTX. No Docker in MVP.
- **MVP scope**: read-only. No restart/reload/edit.

## Quick start

### Prerequisites
- Node.js 22+
- MediaMTX running on the same host (or accessible)

### Backend

```bash
cd backend
cp .env.example .env   # create and edit
npm install
npm run dev            # http://127.0.0.1:9088
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # http://127.0.0.1:5173
```

The frontend dev server proxies `/api` requests to the backend.

### Production build

```bash
cd backend && npm run build
cd frontend && npm run build
```

Serve the frontend `dist/` from the backend as static files, or via any web server.

## Environment variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `BIND_ADDRESS` | `127.0.0.1` | Listen address |
| `PORT` | `9088` | Listen port |
| `MEDIAMTX_API_URL` | `http://127.0.0.1:9997` | MediaMTX API base |
| `MEDIAMTX_METRICS_URL` | `http://127.0.0.1:9998/metrics` | MediaMTX metrics |
| `MEDIAMTX_CONFIG_PATH` | `/etc/mediamtx/mediamtx.yml` | Config file path |
| `ADMIN_AUTH_TOKEN` | (none) | Bearer token for API auth |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |

### Frontend (Vite dev)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE` | `http://127.0.0.1:9088` | Backend URL (prod only) |

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Service health |
| GET | `/api/status` | MediaMTX service status |
| GET | `/api/streams` | Active stream paths |
| GET | `/api/logs?lines=N&level=FILTER` | Recent journald logs |
| GET | `/api/metrics` | Parsed Prometheus metrics |
| GET | `/api/config` | Read-only config view |
| GET | `/api/settings` | Read-only backend/env status |
| GET | `/api/diagnostics/safe-check` | System diagnostics |

All endpoints are read-only. No mutation endpoints exist in MVP.
Response DTO contracts are centralized in `shared/admin-api.ts`.

## Security

- Default listen is `127.0.0.1` (localhost only).
- Set `ADMIN_AUTH_TOKEN` if exposing beyond localhost.
- Secrets are redacted from config/log views.
- No arbitrary shell execution.
- See `docs/deployment/mediamtx-admin-ui.md` and `docs/adr/0001-mediamtx-admin-ui-same-lxc-systemd.md`.

## Project layout

```
backend/           Fastify API (Node.js + TypeScript)
frontend/          React + Vite admin UI
shared/            Cross-package TypeScript contracts (admin-api.ts)
docs/
  adr/             Architecture Decision Records
  deployment/      Deployment and operations guide
```

## Systemd deployment

See `docs/deployment/mediamtx-admin-ui.md` for service unit and setup.

## License

MIT
