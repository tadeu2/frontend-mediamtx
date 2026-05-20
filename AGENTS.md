# AGENTS.md

## Repo shape
- `backend/` is a separate npm package for the Fastify API/BFF.
- `frontend/` is a separate npm package for the Vite + React UI.
- `shared/admin-api.ts` is the canonical cross-package DTO contract.
- `docs/adr/` and `docs/deployment/` hold the decision record and ops notes.

## Commands
- Run npm commands **inside the package directory**, not from repo root.
- Backend: `cd backend; npm run dev|build`
- Frontend: `cd frontend; npm run dev|build`
- If `shared/admin-api.ts` changes, build **both** packages.

## Conventions
- Backend is TypeScript + Fastify, CommonJS, strict mode.
- Frontend is TypeScript + React + Vite, ESM, strict mode.
- Frontend API calls should use `credentials: 'include'` for cookie auth.
- Keep admin behavior read-only unless a new ADR says otherwise.

## Deployment / safety
- MVP deployment stays **same LXC + systemd**; do not introduce Docker by default.
- Do not add restart/reload controls in the UI without an explicit ADR.
- Keep secrets redacted in config/log views.

## Config knobs already in use
- Backend reads `BIND_ADDRESS`, `PORT`, `MEDIAMTX_API_URL`, `MEDIAMTX_METRICS_URL`, `MEDIAMTX_CONFIG_PATH`, `ADMIN_AUTH_TOKEN`, `CORS_ORIGIN`.
- Frontend dev server uses port `5173`.

## Versioning commitment
- **Every change MUST be reflected in `CHANGELOG.md`** before commit.
- **Every change MUST update `VERSIONING.md`** if the version policy changes.
- **Bump `backend/package.json` and `frontend/package.json`** together when releasing (`npm version` or manual edit).
- **Do not version-bump for pure README/docs-only changes**; still log them in `CHANGELOG.md`.
- **Keep `CHANGELOG.md` sections** organized by: `Security`, `Added`, `Changed`, `Fixed`, `Removed`.
- **Tag releases** with `git tag vX.Y.Z` and push tags.
