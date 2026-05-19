# Tasks: mediamtx-admin-ui

**Status**: 10 / 12 complete
**Delivery**: feature-branch-chain (3 PRs)

---

## PR 1 — Foundation / Contracts ✅

| # | Task | Status |
|---|------|--------|
| 1.1 | ADR: same-LXC + systemd deployment | ✅ |
| 1.2 | Deployment doc (ports, service boundaries) | ✅ |
| 1.3 | Shared DTOs in `shared/admin-api.ts` | ✅ |

## PR 2 — Backend ✅

| # | Task | Status |
|---|------|--------|
| 2.1 | Scaffold Fastify backend (package, server, config, plugins) | ✅ |
| 2.2 | Read-only routes for status, streams, logs, metrics, config, diagnostics | ✅ |
| 2.3 | Allowlisted systemd/journal wrappers | ✅ |

## PR 3 — Frontend + Verification

| # | Task | Status |
|---|------|--------|
| 3.1 | Scaffold React + Vite (package, main, App, API client) | ✅ |
| 3.2 | Read-only views: dashboard, streams, logs, metrics, config, diagnostics | ✅ |
| 3.3 | Permission gate + route guards (all admin actions disabled) | ✅ |
| 4.1 | Backend tests (29 tests, auth + bounds + degradation) | ✅ |
| 4.2 | Frontend tests + e2e | ⬜ |
| 4.3 | README + docs/runbook | ✅ |

---

## Legend

- ✅ Complete
- ⬜ Pending

## Next

4.2 — Frontend component tests + e2e smoke test.
