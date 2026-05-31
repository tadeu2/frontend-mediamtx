# Shared Admin API Contract Specification

## Purpose

Define the lowest-risk contract cleanup for `/api/status` and `/api/settings` so backend, frontend, and API-facing docs share one canonical response boundary.

## Non-Goals

- Change endpoint behavior, auth, routing, or payload semantics.
- Add mutation capabilities or new endpoints.
- Refresh unrelated documentation.

## Requirements

### Requirement: Shared DTO Ownership

The system MUST define the canonical response types for `/api/status` and `/api/settings` in `shared/admin-api.ts`. Backend and frontend code MUST consume those shared types instead of maintaining local duplicate interfaces for the same endpoints.

#### Scenario: Status contract is centralized

- GIVEN the repository defines `/api/status`
- WHEN a developer inspects backend and frontend type declarations
- THEN the response shape is defined in `shared/admin-api.ts`
- AND the backend/frontend import that shared type instead of duplicating it locally

#### Scenario: Settings contract is centralized

- GIVEN the repository defines `/api/settings`
- WHEN a developer inspects backend and frontend type declarations
- THEN the response shape is defined in `shared/admin-api.ts`
- AND the backend/frontend import that shared type instead of duplicating it locally

### Requirement: Existing Response Semantics Are Preserved

The system MUST preserve the current runtime behavior of `/api/status` and `/api/settings` while centralizing their DTOs. `/api/settings` MUST remain status-only and MUST NOT expose secrets or credential values.

#### Scenario: Contract cleanup does not change endpoint behavior

- GIVEN a client already consuming `/api/status` or `/api/settings`
- WHEN the shared DTO change is applied
- THEN the endpoint routes and response semantics remain unchanged
- AND the change is limited to shared typing and aligned references

#### Scenario: Settings payload remains redacted

- GIVEN `/api/settings` returns configuration status
- WHEN the shared DTO is introduced
- THEN the contract includes only status-safe fields
- AND raw passwords, tokens, or usernames are not exposed by the response

### Requirement: API-Surface Documentation Matches the Shared Boundary

Documentation that explicitly describes the admin API surface MUST reflect the centralized contract boundary for `/api/status` and `/api/settings`. This documentation refresh SHOULD be limited to files that list endpoints, contracts, or current architecture constraints.

#### Scenario: Public API docs reflect the real route set

- GIVEN repository docs list admin API endpoints or shared contract ownership
- WHEN this change is completed
- THEN those docs include `/api/settings` where applicable
- AND they no longer describe the status/settings contracts as local-only definitions

#### Scenario: Unrelated docs are left alone

- GIVEN a documentation file does not describe API routes, DTO ownership, or current architecture constraints
- WHEN this change is completed
- THEN that file MAY remain unchanged
