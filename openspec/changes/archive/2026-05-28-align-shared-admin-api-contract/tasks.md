# Tasks: Align Shared Admin API Contract

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~140-220 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Centralize DTOs and rewire consumers | PR 1 | Keep code, tests, and docs together; no dependency on another slice |

## Phase 1: Shared Contract Foundation

- [x] 1.1 Add canonical `/api/status` and `/api/settings` DTOs to `shared/admin-api.ts` with status-safe fields only.
- [x] 1.2 Update `backend/src/routes/admin.ts` to use the shared status DTO instead of the inline return type.
- [x] 1.3 Align `backend/src/routes/settings.ts` / `backend/src/services/settings.ts` types with the shared settings DTO contract.

## Phase 2: Frontend Consumer Wiring

- [x] 2.1 Remove local `ServiceStatusResponse` and `SettingsStatusResponse` interfaces from `frontend/src/api/client.ts`.
- [x] 2.2 Update `frontend/src/api/client.ts`, `frontend/src/pages/Dashboard.tsx`, and `frontend/src/pages/Settings.tsx` to import and use shared admin API types.
- [x] 2.3 Confirm the frontend still type-checks with the shared contract and no page-level response duplication remains.

## Phase 3: Verification

- [x] 3.1 Run `cd backend && npm test` and confirm existing `/api/status` and `/api/settings` behavior is unchanged.
- [x] 3.2 Run `cd frontend && npm test` and `cd frontend && npm run build` to catch type drift in consumers.
- [x] 3.3 Run `cd backend && npm run build` to confirm the shared DTOs compile cleanly across the package boundary.

## Phase 4: Documentation Alignment

- [x] 4.1 Update `README.md` to include `/api/settings` in the API list and state that shared DTOs are the canonical contract.
- [x] 4.2 Update only the API-facing docs that describe routes/contracts (`architecture.md`, `design.md`, `docs/runbook.md`) so they match the live boundary.
