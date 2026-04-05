# ADR 0002: Avatares de perfil por workspace no Supabase Storage

## Status

Aceito.

## Contexto

O perfil por workspace (`cdt_workspace_user_profiles`) armazena `avatar_url`. A UI passou a permitir upload de arquivo local (até 5MB) em vez de colar URL externa.

## Decisão

- Usar um bucket dedicado **`workspace-profile-avatars`**, **público**, com objetos em `{workspaceId}/{userId}/avatar.{ext}` e **upsert** para substituir a foto sem acumular lixo por timestamp.
- **Somente o backend** envia ao Storage (cliente Supabase com service role), exposto como `POST /api/workspaces/:slug/my-profile/avatar` retornando a URL pública; o cliente grava essa URL com `PUT .../my-profile`.
- Tipos permitidos: PNG, JPEG, WebP (sem SVG no upload por risco de conteúdo executável em alguns contextos de `<img>`).

## Consequências

- Operações dependem de `SUPABASE_SERVICE_ROLE_KEY` no backend para criar bucket e fazer upload.
- URLs são públicas; não há URLs assinadas por objeto. Aceitável para avatares de perfil visíveis na UI.
- O backend tenta criar o bucket na subida do processo (como já ocorre com `activity-covers`).
