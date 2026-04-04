# Deploy

This file is the SDD entrypoint for deploy concerns.

The detailed production procedure already lives in `docs/DEPLOY.md`.

## Current Baseline

- Install dependencies with `npm ci`
- Build with `npm run build`
- Start production with `pm2 start ecosystem.config.cjs --env production`
- Serve the built SPA through the backend process

## Operational Rule

Do not treat `npm run dev` or `npm run dev:server` as production deploy modes.
