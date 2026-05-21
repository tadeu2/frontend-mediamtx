# Changelog

All notable changes to `mediamtx-admin-ui` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/) and this project uses [Semantic Versioning](VERSIONING.md).

## [Unreleased]

### Security

- Hardened systemd unit: `NoNewPrivileges=true`, removed sudo dependency
- Added credential redaction in journalctl log responses (Authorization Basic/Bearer, password, token, apiKey, secret, MEDIAMTX_API_PASSWORD)
- Removed sudoers configuration from deploy script; systemctl access now uses polkit, journalctl uses systemd-journal group
- Added polkit rule for read-only systemctl commands
- Restored `NoNewPrivileges=true` after sudo removal
- Added Bearer token login UI with sessionStorage
- Settings panel hardened: read-only status, no secrets exposed, PATCH endpoint removed
- All API calls use `Authorization: Bearer <token>` when configured
- 401 responses trigger automatic logout and redirect to login

### Added

- F-1: Structured Prometheus metrics parser — line-by-line exposition-format parser with per-protocol connection/bandwidth breakdown (RTSP+RTSPS, RTMP+RTMPS merged)
- Initial MVP implementation
- ADR-0001: same-LXC + systemd deployment decision (no Docker by default)
- `docs/deployment/mediamtx-admin-ui.md` — deployment boundary, ports, safety rules
- `shared/admin-api.ts` — cross-package TypeScript DTOs for health, status, streams, logs, metrics, config, diagnostics
- Dynamic settings via `SettingsManager` (persisted to `settings.json`)
- MediaMTX API integration (`GET /v3/paths/list` for streams, `GET /v3/config/global/get` for feature flags)
- Basic Auth support for MediaMTX API (`MEDIAMTX_API_USERNAME` / `MEDIAMTX_API_PASSWORD`)
- `VERSIONING.md` — SemVer versioning policy
- `CHANGELOG.md` — changelog conventions
- `architecture.md`, `design.md`, `tasks.md` — SDD file-based artifacts
- Login page for ADMIN_AUTH_TOKEN entry
- AuthContext with sessionStorage Bearer token management
- Logout button in sidebar

### Backend

- Fastify + TypeScript scaffold with auth, CORS, and error handler plugins
- Read-only API routes: `/api/health`, `/api/status`, `/api/streams`, `/api/logs`, `/api/metrics`, `/api/config`, `/api/diagnostics/safe-check`
- Allowlisted journalctl wrapper for bounded, read-only logs
- Allowlisted systemctl wrapper for bounded, read-only service status
- Safe command runner using `child_process.execFile` with explicit args, timeouts, no shell
- YAML secret redaction for config views
- MediaMTX API client with Basic Auth support
- SettingsManager with read-only status endpoint and reachability checks
- Config file reading with feature flag detection via MediaMTX API
- 51 passing tests (auth, route bounds, graceful degradation, error shapes, settings, credential redaction)

### Frontend

- React + TypeScript + Vite scaffold with dark theme
- API client with Bearer token and `credentials: 'include'` support
- Sidebar layout with hash-based routing (no react-router dependency)
- 6 read-only views: Dashboard, Streams, Logs, Metrics, Config, Diagnostics
- All views handle loading, error, and empty/unavailable states
- Permission gate (`frontend/src/config/permissions.ts`) with all admin actions disabled by default
- Dev server proxy: `/api` → `http://127.0.0.1:9088`
- Login page for ADMIN_AUTH_TOKEN entry
- AuthContext with sessionStorage and 401 auto-redirect
- Read-only Settings status panel (no secrets, no forms)
- 57 passing tests (auth context, login, settings, all page components)

### Docs

- `README.md` — project overview, architecture, setup, env vars
- `docs/runbook.md` — service management, health checks, rollback, troubleshooting
- `AGENTS.md` — repository-specific OpenCode agent instructions
- `architecture.md` — system context, data flow, security model
- `design.md` — technical decisions, API contract, permission model
- `tasks.md` — full task tracking
