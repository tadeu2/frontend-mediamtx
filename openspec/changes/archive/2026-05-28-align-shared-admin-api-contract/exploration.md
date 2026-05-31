## Exploration: align-shared-admin-api-contract

### Current State
`shared/admin-api.ts` is the intended cross-package contract, and it already covers the main read-only API shapes (`HealthResponse`, `StreamsResponse`, `LogsResponse`, `MetricsSummary`, `ConfigView`, `SafeDiagnosticsResponse`). Two endpoints sit outside that boundary today: `GET /api/status` is typed inline in `backend/src/routes/admin.ts` and consumed via a local `ServiceStatusResponse` in `frontend/src/api/client.ts`, while `GET /api/settings` is typed only in `frontend/src/api/client.ts` and backed by `SettingsManager` in `backend/src/services/settings.ts` / `backend/src/routes/settings.ts`.

### Affected Areas
- `shared/admin-api.ts` — missing canonical DTOs for `/api/status` and `/api/settings`.
- `backend/src/routes/admin.ts` — inline status response type creates contract drift.
- `backend/src/routes/settings.ts`, `backend/src/services/settings.ts` — source of `/api/settings` response shape.
- `frontend/src/api/client.ts` — local response interfaces duplicate backend shapes.
- `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Settings.tsx` — consume the duplicated types.
- `README.md`, `architecture.md`, `design.md`, `docs/runbook.md`, `tasks.md` — docs already lag behind the live shape/route set.

### Approaches
1. **Centralize both endpoint contracts in `shared/admin-api.ts`** — add canonical DTOs for `/api/status` and `/api/settings`, then replace local interfaces in backend/frontend.
   - Pros: single source of truth, lowest future drift, fits existing monorepo boundary.
   - Cons: touches backend, frontend, tests, and docs in one coordinated change.
   - Effort: Medium

2. **Leave the two endpoints local and document them only** — keep current code structure, but update docs to describe the real responses.
   - Pros: smallest immediate code churn.
   - Cons: preserves the contract split, keeps duplication, and contradicts the repo’s own “shared contracts” boundary.
   - Effort: Low

### Recommendation
Choose **centralize both endpoint contracts in `shared/admin-api.ts`**. It is the best proposal-worthy change because it has the highest leverage with the lowest risk: no product behavior changes, but it removes a real source of backend/frontend/doc drift at the repo’s core boundary.

### Risks
- Naming and shape decisions must avoid conflating service-status data with settings-status data.
- Docs and tests must be updated together or they will continue to disagree with the code.
- The no-secrets rule for `/api/settings` must remain explicit in the shared type/docs.

### Ready for Proposal
Yes — the next SDD change should be `/sdd-new align-shared-admin-api-contract`.
