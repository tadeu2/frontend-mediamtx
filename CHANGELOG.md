# Changelog

All notable changes to `mediamtx-admin-ui` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/) and this project uses [Semantic Versioning](VERSIONING.md).

## 1.0.0 (2026-10-02)


### Features

* add deployment script and env example ([319c164](https://github.com/tadeu2/frontend-mediamtx/commit/319c164cdc3f17d5266f47636858975b01a4f826))
* centralize shared admin api contract ([da54f11](https://github.com/tadeu2/frontend-mediamtx/commit/da54f11241920555c2b1d4b0ad699c084d4e0201))
* dynamic MediaMTX settings configurable from frontend ([8995352](https://github.com/tadeu2/frontend-mediamtx/commit/899535232696053ebbaf6951c1938efe47d2ed5f))
* initial MVP scaffold for mediamtx-admin-ui ([39e1fda](https://github.com/tadeu2/frontend-mediamtx/commit/39e1fda0a32170fdd5cef17f2c85f73faae87027))
* integrate MediaMTX API for streams/status/config/diagnostics ([13c6791](https://github.com/tadeu2/frontend-mediamtx/commit/13c67915388e7c83df8f545ec2859072cf8ef914))
* login/token auth flow + read-only settings panel ([03512aa](https://github.com/tadeu2/frontend-mediamtx/commit/03512aa77a2be4340407c11e00cf5053263d1024))
* structured Prometheus metrics parser (F-1) ([3d160f5](https://github.com/tadeu2/frontend-mediamtx/commit/3d160f59959c53aab1bf69d3f0689f93cbd74926))
* support Basic Auth for MediaMTX API via env vars ([f175722](https://github.com/tadeu2/frontend-mediamtx/commit/f175722b4b7e24aca5d9f9f98a4357f876908e64))
* update frontend to shared admin api contract ([f28f819](https://github.com/tadeu2/frontend-mediamtx/commit/f28f819df1ca703f0082a759cebb74622632b3d7))


### Bug Fixes

* add Basic Auth to metrics fetch and reachability check ([48d9ef2](https://github.com/tadeu2/frontend-mediamtx/commit/48d9ef2fb8571948ea6aec6d25eb1e968b733a80))
* allow .env to override LAN bind settings ([1aa209f](https://github.com/tadeu2/frontend-mediamtx/commit/1aa209f677d4ac39f058f846b5c651bbf8c78bae))
* allow AF_NETLINK for Fastify address logging under systemd ([024bacd](https://github.com/tadeu2/frontend-mediamtx/commit/024bacd94872ffade71b6fb2cdc03d660252230b))
* apply auth/error hooks to root Fastify scope + add systemd service file ([80bd8fd](https://github.com/tadeu2/frontend-mediamtx/commit/80bd8fd50ab5d25dcb29b5780d14d965675a6f23))
* credential redaction and .env hardening ([86e5819](https://github.com/tadeu2/frontend-mediamtx/commit/86e58197a7452b8d1595f098377c99cb62cc363a))
* Fastify v5 encapsulation — nest auth+route plugins under register() ([8707088](https://github.com/tadeu2/frontend-mediamtx/commit/8707088d2ca881200c4bf1c5eb49ad90fd38a35d))
* frontend Bearer token flow for all API calls ([5b9e185](https://github.com/tadeu2/frontend-mediamtx/commit/5b9e185025319bd07ec36b03c2859807b1ed715b))
* log stderr when systemctl command fails ([598cba8](https://github.com/tadeu2/frontend-mediamtx/commit/598cba82e52cfe914d1818ccc9f724fff01e7cfd))
* make production deploy build and serve frontend ([6baeb6c](https://github.com/tadeu2/frontend-mediamtx/commit/6baeb6cd41e4461c436bb36bdb4386ea43082e53))
* replace sudo with direct systemctl + polkit ([542a7df](https://github.com/tadeu2/frontend-mediamtx/commit/542a7dfd14bc3dd6323e6d9c6194eebb8f113fb6))
* type mockApi return as Mocked&lt;ApiClient&gt; to expose mockResolvedValue/mockRejectedValue ([311b8dc](https://github.com/tadeu2/frontend-mediamtx/commit/311b8dc201652c853499909404de3edfc5a7faae))
* use full /usr/bin/sudo path, add user to systemd-journal group ([7f5a0a4](https://github.com/tadeu2/frontend-mediamtx/commit/7f5a0a46d217ee21abe01e6135ec49febe1a63f5))


### Miscellaneous

* add release-please automation ([e6859f5](https://github.com/tadeu2/frontend-mediamtx/commit/e6859f5d0a5d664537543254fe84adfac1272677))
* add release-please automation ([8992bfc](https://github.com/tadeu2/frontend-mediamtx/commit/8992bfccbb0ef6ac3d3c4b6c2b7ab7bf0b3699fc))
* add release-please automation ([18a2c7e](https://github.com/tadeu2/frontend-mediamtx/commit/18a2c7efabcc7fd00b6c655d419e4720cc4ddca0))
* archive shared admin api contract ([1c80956](https://github.com/tadeu2/frontend-mediamtx/commit/1c80956f7cc2d556f31c8cc55868680e1907b851))
* fix release-type generic-&gt;simple ([7681cd6](https://github.com/tadeu2/frontend-mediamtx/commit/7681cd64af09dec0e25f7ae8d0ba74c8ce90f4a0))
* switch gga provider to opencode ([9b09373](https://github.com/tadeu2/frontend-mediamtx/commit/9b09373cd26934ff172994853238b815f0d285cd))


### Documentation

* add versioning commitment to AGENTS.md ([939acc6](https://github.com/tadeu2/frontend-mediamtx/commit/939acc6242df78021702e5b084b62b80ed3f9c5b))
* update CHANGELOG with all MVP changes since initial commit ([baf012e](https://github.com/tadeu2/frontend-mediamtx/commit/baf012e37e1cf23d4c8cc668abe76d9faffe957d))


### Tests

* frontend component tests (32) + e2e smoke tests ([5eb509c](https://github.com/tadeu2/frontend-mediamtx/commit/5eb509c8ebfee6f47fe3937281ee3b2f45dcad33))

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

### Changed

- F-3: Restructured `backend/src/server.ts` to use Fastify's native `register()` encapsulation — authPlugin + route scopes are now children of an `authScope` wrapper, eliminating the plain-function workaround for scope propagation
- Initialized OpenSpec bootstrap (`openspec/config.yaml`, tracked skeleton directories) and refreshed `.atl/skill-registry.md`
- Centralized `/api/status` + `/api/settings` DTO contracts in `shared/admin-api.ts`; backend/frontend now consume shared response types and API-facing docs were aligned (`README.md`, `architecture.md`, `design.md`, `docs/runbook.md`)

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
