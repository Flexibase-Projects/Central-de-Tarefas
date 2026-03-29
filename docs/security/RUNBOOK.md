# Runbook de Segurança

Guia curto para manter a baseline de segurança saudável ao longo do tempo.

## Pré-requisitos

- Node `20.19.x`
- npm `10.x`

Verifique com:

```bash
node -v
npm -v
```

## Verificação padrão

Rode antes de merge, release ou upgrade relevante:

```bash
npm run lint
npm run build
npm run audit:runtime
npm run audit:full
```

## Critérios mínimos

- `npm run build` precisa passar
- `npm run audit:runtime` precisa ficar em `0`
- `npm run audit:full` precisa ficar em `0`
- `lint` pode ter warnings conhecidos, mas não deve ter errors

## Revisão de ambiente

Confirme estes pontos:

- `SUPABASE_SERVICE_ROLE_KEY` não aparece em arquivos do frontend
- `GITHUB_TOKEN` não aparece em logs de startup
- `FRONTEND_URL` e allowlist de CORS refletem o ambiente real
- `NATIVE_ADMIN_EMAILS` está definido por ambiente quando necessário

## Quando mexer em auth ou permissões

Revalidar manualmente:

- usuário anônimo não acessa rotas protegidas
- usuário comum não escala acesso por query/header
- impersonation só ocorre pelo fluxo autorizado
- respostas de erro não vazam stack, token ou detalhe interno sensível

## Quando mexer em dependências

- priorizar primeiro dependências de runtime
- evitar `npm audit fix --force` sem validação
- registrar remoção temporária de feature se um pacote crítico bloquear o fechamento do audit

## Decisões atuais

- `CanvaEquipe` está desativado temporariamente para manter runtime audit em `0`
- ESLint foi migrado para flat config em `eslint.config.cjs`
- CI deve ser tratada como gate de segurança básica, não apenas qualidade

## Recuperação rápida

Se o audit voltar a acusar vulnerabilidades:

1. Rode `npm audit --omit=dev` para separar runtime de tooling.
2. Corrija runtime primeiro.
3. Se a vulnerabilidade estiver presa a uma feature isolada, considere desativação temporária.
4. Revalide com build, lint e audit completo.
