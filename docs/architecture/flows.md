# Critical Flows

## Local Development

1. `npm run dev` starts the orchestrated workspace development flow.
2. Frontend runs through Vite.
3. Backend runs through the TypeScript watch/dev server.
4. The browser talks to the backend API while the frontend shell handles routing and workspace UI state.

## Frontend Runtime Data Flow

1. App bootstrap mounts providers and router state.
2. Auth/workspace guards decide whether a module route can render.
3. Pages fetch or refresh workspace-scoped data.
4. Shared feedback components such as sync banners and loading surfaces communicate in-flight refresh state without dropping the current page context.

## Production Serving

1. `npm run build` produces `frontend/dist` and backend output.
2. PM2 starts the backend process.
3. The backend serves API responses and compiled SPA assets from one runtime.
4. Nginx or another reverse proxy should forward public traffic to that backend process, not to a Vite dev server.
