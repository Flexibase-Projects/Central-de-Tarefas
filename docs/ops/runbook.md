# Runbook

## Start Local Stack

```bash
npm run dev
```

## Build Frontend Only

```bash
npm run build --workspace=frontend
```

## Lint Frontend Only

```bash
npm run lint --workspace=frontend
```

## Diagnose Frontend Runtime Warnings

1. Reproduce the issue on the target page or flow.
2. Check the compat layer first when the stack references `frontend/src/compat/mui/*`.
3. Verify wrappers do not change hook execution order between renders.
4. Re-run frontend lint/build after the fix.

## Enable Nano Banana MCP

Project-scoped MCP config lives in `.mcp.json` and now includes `nano-banana-2` via `npx -y nano-banana-2-mcp`, pinned to `NANO_BANANA_MODEL=gemini-3.1-flash-image-preview`.

Provide the API key in the local shell or user environment before opening the MCP client:

```powershell
$env:GEMINI_API_KEY="your-gemini-api-key"
```

Quick verification:

```powershell
$env:NANO_BANANA_MODEL="gemini-3.1-flash-image-preview"
npx -y nano-banana-2-mcp
```

If the key is configured correctly, the server should initialize instead of failing with an authentication error.

## Production Deploy Reference

Use `docs/DEPLOY.md` for the production deployment procedure and baseline.
