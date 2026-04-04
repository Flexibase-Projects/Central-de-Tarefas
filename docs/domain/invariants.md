# Domain Invariants

- Workspace-scoped screens must preserve the current context while background refresh is happening.
- Server-only credentials and privileged integration calls must remain on the backend.
- The frontend must not reintroduce direct `@mui/*` imports after the MUI package removal.
- Shared feedback components should communicate loading/sync state without breaking route rendering.
