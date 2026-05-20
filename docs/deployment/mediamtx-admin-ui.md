# mediamtx-admin-ui deployment

## Purpose

This document defines the MVP deployment boundary for `mediamtx-admin-ui`.
It is a read-only operator UI that runs **beside** MediaMTX in the same LXC.

## Topology

| Service | Role | Notes |
|---|---|---|
| `mediamtx.service` | Existing MediaMTX runtime | Unchanged by the UI MVP |
| `mediamtx-admin-ui.service` | New admin UI/BFF service | Node.js backend + compiled frontend |
| Optional reverse proxy | TLS/routing only | Use only if already present or approved later |

## Runtime boundaries

- UI listens on `127.0.0.1` by default, or a private internal address if explicitly configured.
- MediaMTX API/metrics are consumed locally when available.
- Journald access is read-only and bounded.
- `restart`/`reload` of MediaMTX are **out of scope for MVP**.

## Suggested ports and endpoints

| Endpoint | Source | Use |
|---|---|---|
| `127.0.0.1:<ui-port>` | `mediamtx-admin-ui` | Web UI and backend API |
| `127.0.0.1:9997` | MediaMTX API | Read-only status/config/path queries |
| `127.0.0.1:9998` | MediaMTX metrics | Prometheus scrape / summary |
| `journalctl -u mediamtx` | systemd journal | Bounded logs only |

> Exact bind port and config file paths must be verified on the target host before rollout.

## Safety rules

1. No arbitrary shell execution from the UI.
2. No write access to `mediamtx.yml` in MVP.
3. No MediaMTX restart/reload actions in MVP.
4. Redact secrets, tokens, and credentials before rendering config or logs.
5. Keep all diagnostics bounded by line count and timeout.
6. The `backend/.env` file contains secrets. Restrict permissions outside the repo:
   ```bash
   chmod 600 /opt/mediamtx-admin-ui/backend/.env
   chown mediamtx-ui:mediamtx-ui /opt/mediamtx-admin-ui/backend/.env
   ```
   See `.env.example` for the full warning about `EnvironmentFile` override behavior.

## Configuration

The backend reads environment variables (see `backend/.env.example` for all options):

| Variable | Purpose | Default |
|---|---|---|
| `BIND_ADDRESS` | IP the backend listens on. Use `127.0.0.1` for local-only. | `127.0.0.1` |
| `PORT` | TCP port | `9088` |
| `MEDIAMTX_API_URL` | MediaMTX API base URL | `http://127.0.0.1:9997` |
| `MEDIAMTX_METRICS_URL` | MediaMTX metrics endpoint | `http://127.0.0.1:9998/metrics` |
| `MEDIAMTX_CONFIG_PATH` | Path to `mediamtx.yml` | `/etc/mediamtx/mediamtx.yml` |
| `ADMIN_AUTH_TOKEN` | Bearer token for API auth — generate with `openssl rand -hex 32` | *(none — auth disabled)* |
| `CORS_ORIGIN` | Allowed CORS origin | `*` |
| `MEDIAMTX_API_USERNAME` | HTTP Basic username for MediaMTX API (if auth enabled) | *(none)* |
| `MEDIAMTX_API_PASSWORD` | HTTP Basic password for MediaMTX API (if auth enabled) | *(none)* |

## Disable and rollback

```text
systemctl stop mediamtx-admin-ui
systemctl disable mediamtx-admin-ui
```

Rollback removes only the admin UI package/service and leaves `mediamtx.service` untouched.

## Validation

- `systemctl status mediamtx-admin-ui --no-pager`
- `curl http://127.0.0.1:<ui-port>/api/health`
- `curl http://127.0.0.1:<ui-port>/api/logs?lines=20`
