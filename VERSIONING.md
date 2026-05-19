# Versioning

`mediamtx-admin-ui` follows **Semantic Versioning 2.0.0**: `MAJOR.MINOR.PATCH`.

## Current version: 0.1.0

- **MAJOR** — Stable API and deployment (1.0.0 once MVP is validated in production).
- **MINOR** — New features, new endpoints, new pages, ADR additions.
- **PATCH** — Bug fixes, security patches, dependency updates, documentation.

## Version sources

Both packages share the same version number:

| Package | File |
|---------|------|
| Backend | `backend/package.json` → `"version": "0.1.0"` |
| Frontend | `frontend/package.json` → `"version": "0.1.0"` |

When bumping, update **both** files to keep them in sync.

## Release workflow

```
1. Update CHANGELOG.md
2. Bump version in backend/package.json and frontend/package.json
3. Commit: "chore(release): vX.Y.Z"
4. Tag: git tag vX.Y.Z
5. Push: git push --tags
```

## Branch model

```
main           ── Production-ready code
  └── feat/*   ── Feature branches from main
  └── fix/*    ── Bugfix branches from main
  └── docs/*   ── Documentation changes
```

No `develop` branch. Features merge directly to `main` via PR.

## Changelog conventions

- `### Added` — new features, endpoints, pages
- `### Changed` — behavior changes, migrations
- `### Fixed` — bug fixes, security patches
- `### Removed` — deprecated features removed
- `### Security` — security-related changes

Each entry references the PR or issue when applicable.
