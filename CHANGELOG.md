# Changelog

All notable changes to `mediamtx-admin-ui` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/) and this project uses [Semantic Versioning](VERSIONING.md).

## [Unreleased]

### Added

- Initial MVP implementation
- ADR-0001: same-LXC + systemd deployment decision (no Docker by default)
- `docs/deployment/mediamtx-admin-ui.md` — deployment boundary, ports, safety rules
- `shared/admin-api.ts` — cross-package TypeScript DTOs for health, status, streams, logs, metrics, config, diagnostics

### Backend

- Fastify + TypeScript scaffold with auth, CORS, and error handler plugins
- Read-only API routes: `/api/health`, `/api/status`, `/api/streams`, `/api/logs`, `/api/metrics`, `/api/config`, `/api/diagnostics/safe-check`
- Allowlisted journalctl wrapper for bounded, read-only logs
- Allowlisted systemctl wrapper for bounded, read-only service status
- Safe command runner using `child_process.execFile` with explicit args, timeouts, no shell
- YAML secret redaction for config views
- 29 passing tests (auth, route bounds, graceful degradation, error shapes)

### Frontend

- React + TypeScript + Vite scaffold with dark theme
- API client with Bearer token and `credentials: 'include'` support
- Sidebar layout with hash-based routing (no react-router dependency)
- 6 read-only views: Dashboard, Streams, Logs, Metrics, Config, Diagnostics
- All views handle loading, error, and empty/unavailable states
- Permission gate (`frontend/src/config/permissions.ts`) with all admin actions disabled by default
- Dev server proxy: `/api` → `http://127.0.0.1:9088`

### Docs

- `README.md` — project overview, architecture, setup, env vars
- `docs/runbook.md` — service management, health checks, rollback, troubleshooting
- `AGENTS.md` — repository-specific OpenCode agent instructions
