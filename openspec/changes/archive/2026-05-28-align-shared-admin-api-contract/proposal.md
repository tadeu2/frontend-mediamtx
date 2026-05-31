# Proposal: Align Shared Admin API Contract

## Intent

Reduce backend/frontend contract drift by making `shared/admin-api.ts` the single source of truth for `/api/status` and `/api/settings` response shapes. This is a low-risk cleanup: it changes types and documentation, not runtime behavior.

## Scope

### In Scope
- Add canonical DTOs for `/api/status` and `/api/settings` to `shared/admin-api.ts`.
- Replace local response interfaces in backend/frontend with the shared DTOs.
- Update docs that describe the API surface (`README.md`, `architecture.md`, `design.md`, `docs/runbook.md`, `tasks.md`).

### Out of Scope
- No endpoint behavior changes.
- No auth, UI, or permission changes.
- No new endpoints or settings mutation support.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None.

## Approach

Keep the existing endpoints and behavior, but move their response shapes into the shared contract file. Update backend handlers and frontend consumers to import the shared DTOs, then refresh the stale docs so the repository boundary matches the code.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `shared/admin-api.ts` | Modified | Add canonical status/settings DTOs |
| `backend/src/routes/admin.ts` | Modified | Use shared status response type |
| `backend/src/routes/settings.ts` | Modified | Align `/api/settings` response contract |
| `frontend/src/api/client.ts` | Modified | Remove local duplicate response interfaces |
| `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Settings.tsx` | Modified | Consume shared types |
| `README.md`, `architecture.md`, `design.md`, `docs/runbook.md`, `tasks.md` | Modified | Update route/contract documentation |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| DTO naming mismatch between status and settings | Low | Define distinct shared types with clear names and responsibilities |
| Docs remain stale after code changes | Medium | Update docs in the same change and verify route listings |
| Hidden secrets leak into the new shared settings shape | Low | Preserve existing redaction/no-secrets behavior and keep the settings DTO status-only |

## Rollback Plan

Revert the DTO additions and restore the local interfaces if the shared contract introduces friction. Because behavior is unchanged, rollback is limited to type and doc edits.

## Dependencies

- Existing OpenSpec workflow and current backend/frontend test coverage.

## Success Criteria

- [ ] `/api/status` and `/api/settings` use shared DTOs end-to-end.
- [ ] No local duplicate response interfaces remain for those endpoints.
- [ ] Repo docs match the live API surface.
- [ ] Changes stay reviewable within the 400-line budget.
