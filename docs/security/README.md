# Segurança

Resumo compacto da baseline de segurança atual do projeto e dos pontos que precisam ser consultados no dia a dia.

## Estado atual

- `npm audit --omit=dev`: `0` vulnerabilidades
- `npm audit`: `0` vulnerabilidades
- CI com build, lint, audit runtime e análise estática
- Backend com baseline Express endurecida
- Frontend sem persistência de senha em navegador
- Deploy documentado para build compilado, sem Vite exposto em produção

## Controles principais

### Backend

- Contexto autenticado padronizado em `authUserId`, `realUserId` e `effectiveUserId`
- Remoção de fallback inseguro por `req.query.userId`
- Autorização baseada no contexto autenticado resolvido
- `helmet`, `x-powered-by` desabilitado, CORS com allowlist, 404 e 500 centralizados
- Validação de entrada adicionada nas rotas mais sensíveis
- Logs de startup sem fragmentos de segredos

### Frontend

- Login só pode lembrar e-mail; senha não vai para `localStorage`
- Chamadas HTTP centralizadas em `frontend/src/lib/api.ts`
- Uso direto de `VITE_API_URL` removido das rotas e hooks principais
- Feature de canva em equipe temporariamente desativada para remover cadeia vulnerável de runtime

### Supply chain e pipeline

- GitHub Actions para CI e CodeQL
- Dependabot configurado
- Engines fixadas para Node `20.19.x` e npm `10.x`
- Deploy orientado a build compilado com PM2

## Onde olhar no código

- Backend bootstrap: `backend/src/index.ts`
- Auth e autorização: `backend/src/middleware/auth.ts`, `backend/src/middleware/permissions.ts`
- Validação: `backend/src/utils/validation.ts`
- Native admin: `backend/src/services/native-admin.ts`
- Cliente HTTP frontend: `frontend/src/lib/api.ts`
- Login: `frontend/src/pages/Login.tsx`
- Deploy: `docs/DEPLOY.md`
- Pipeline: `.github/workflows/ci.yml`, `.github/workflows/codeql.yml`, `.github/dependabot.yml`

## Regras operacionais

- `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN` e segredos equivalentes são server-only
- Apenas variáveis `VITE_*` podem entrar no bundle do navegador
- Produção deve servir `frontend/dist`; não expor Vite como baseline pública
- Toda atualização de dependência deve ser validada com build, lint e audit

## Consulta rápida

Checklist e rotina de manutenção: [docs/security/RUNBOOK.md](/Users/juand/Documents/GitHub/Central-de-Tarefas/docs/security/RUNBOOK.md)

Auditoria específica de backend e banco: [docs/security/BACKEND-DB-AUDIT.md](/Users/juand/Documents/GitHub/Central-de-Tarefas/docs/security/BACKEND-DB-AUDIT.md)
