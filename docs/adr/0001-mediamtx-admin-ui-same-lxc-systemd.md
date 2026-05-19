# ADR 0001: mediamtx-admin-ui in the same LXC with systemd

## Status
Accepted

## Context
We need an MVP admin UI for a single MediaMTX instance.

The spec requires:
- read-only-first behavior
- operational safety
- bounded diagnostics and logs
- no restart/reload or other state-changing actions
- a deployment that can be disabled without changing MediaMTX core behavior

## Decision
Build `mediamtx-admin-ui` as a separate service in the **same LXC** as MediaMTX and manage it with **systemd**.

Additional constraints:
- **No Docker by default** for the MVP.
- The UI is **read-only-first**; mutation controls are out of scope.
- Any diagnostics exposed by the UI must be bounded, read-only, and non-destructive.
- Secrets, tokens, and credentials must never be rendered in UI views or logs.

## Consequences
- Deployment stays simple and local to the existing host boundary.
- Disable/rollback is straightforward: stop or disable the UI service, leaving MediaMTX untouched.
- The MVP remains intentionally narrow and does not assume HA or multi-node topologies.
- Future state-changing capabilities will require a new ADR.

## Disable and rollback rules
- Disabling the UI service must not affect MediaMTX runtime behavior.
- Rollback means removing or disabling only the admin UI service and its assets.
- If the deployment topology changes away from same-LXC systemd, revisit this ADR before implementation.
