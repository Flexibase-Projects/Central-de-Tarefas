# Environments

## Local Development

- Frontend default: `http://localhost:3003`
- Backend default: `http://localhost:3002`
- Root scripts orchestrate both workspaces for common local development

## Production

- The backend serves both API traffic and the compiled frontend bundle
- Reverse proxies should target the backend process port

## Variable Contract

- `VITE_*`: public-by-design browser variables
- `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN`, and similar secrets: backend only
- `GEMINI_API_KEY`: local MCP/tooling secret for the Nano Banana 2 image server; never expose in frontend code or commit it into the repository
- `NANO_BANANA_MODEL`: optional local override for the Nano Banana MCP model; project config pins `gemini-3.1-flash-image-preview`
- `VITE_SUPABASE_ANON_KEY`: allowed in the client, but must never be confused with server credentials

## Environment Discipline

- Keep local and production URLs aligned with the scripts and proxy configuration
- Do not move privileged integration logic into the frontend
- Keep agent and MCP secrets in the local machine environment, not in tracked `.json`, `.ts`, or `.env.example` files
