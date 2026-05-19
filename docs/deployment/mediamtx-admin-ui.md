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

## Configuration

Recommended environment variables:

- `MEDIAMTX_ADMIN_UI_BIND`
- `MEDIAMTX_ADMIN_UI_PORT`
- `MEDIAMTX_API_URL`
- `MEDIAMTX_METRICS_URL`
- `MEDIAMTX_CONFIG_PATH`
- `MEDIAMTX_LOG_LIMIT`

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
