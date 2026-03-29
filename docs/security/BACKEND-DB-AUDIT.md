# Auditoria de Backend e Banco

## Resumo executivo

O backend e o banco ainda têm gaps relevantes para um sistema interno que concentra projetos, atividades, usuários, organograma e custos. O maior risco atual não está mais em dependências, e sim em autorização incompleta, ausência de defesa no banco e exposição desnecessária de dados internos.

## Escopo considerado

- API Express em `backend/src`
- uso do Supabase via backend
- schema e migrações SQL em `supabase-schema.sql` e `backend/migrations`
- objetivo do produto: gestão interna de tarefas, pessoas, estrutura organizacional e custos

## Findings

### Crítico

`SEC-001` Rotas centrais de projetos e tarefas continuam sem exigência explícita de autenticação/autorização.

Impacto: um cliente não autenticado ou um chamador indevido consegue ler ou alterar entidades centrais do produto se alcançar essas rotas.

Evidências:

- `backend/src/routes/projects.ts:53`
- `backend/src/routes/projects.ts:351`
- `backend/src/routes/projects.ts:411`
- `backend/src/routes/projects.ts:480`
- `backend/src/routes/tasks.ts:8`
- `backend/src/routes/tasks.ts:47`
- `backend/src/routes/tasks.ts:74`
- `backend/src/routes/tasks.ts:101`
- `backend/src/routes/activities.ts:45`

### Alto

`SEC-002` O backend usa `SUPABASE_SERVICE_ROLE_KEY` como cliente padrão para praticamente toda a API, enquanto o schema publicado ainda recomenda RLS desabilitada para tabelas-base.

Impacto: qualquer falha de autorização no backend vira acesso irrestrito ao conjunto de dados, sem uma segunda barreira no banco.

Evidências:

- `backend/src/config/supabase.ts:9`
- `backend/src/config/supabase.ts:20`
- `supabase-schema.sql:163`
- `supabase-schema.sql:168`
- `backend/migrations/001_gamification.sql:167`
- `backend/migrations/001_gamification.sql:197`

`SEC-003` Upload e leitura de capas de atividades seguem modelo público, inadequado para dados internos do time.

Impacto: qualquer pessoa com a URL pública pode acessar imagens e artefatos visuais ligados à operação interna.

Evidências:

- `backend/src/routes/activities.ts:172`
- `backend/src/routes/activities.ts:183`
- `backend/src/routes/activities.ts:189`
- `backend/src/routes/activities.ts:207`
- `docs/STORAGE-ACTIVITY-COVERS.md:10`
- `docs/STORAGE-ACTIVITY-COVERS.md:18`
- `supabase-schema.sql:201`

`SEC-004` A impersonação ainda depende do header `x-user-id` no request path normal.

Impacto: mesmo com checagem de admin, a troca de contexto fica acoplada a um header genérico que pode ser propagado por proxy, cliente ou código futuro de forma insegura.

Evidências:

- `backend/src/middleware/auth.ts:14`
- `backend/src/middleware/auth.ts:76`
- `backend/src/middleware/auth.ts:134`
- `backend/src/middleware/auth.ts:142`

### Moderado

`SEC-005` O onboarding manual cria usuários confirmados com senha temporária global de ambiente.

Impacto: amplia risco operacional de credenciais previsíveis/reutilizadas e reduz garantias de posse do e-mail.

Evidências:

- `backend/src/routes/users.ts:225`
- `backend/src/routes/users.ts:228`
- `backend/src/routes/users.ts:245`

`SEC-006` Endpoints administrativos de custos, departamentos e organograma ainda aceitam payloads frouxos e retornam erros brutos do banco.

Impacto: aumenta risco de inconsistência de dados, vazamento de detalhes internos e mudanças destrutivas em áreas sensíveis como custo e estrutura organizacional.

Evidências:

- `backend/src/routes/departments.ts:42`
- `backend/src/routes/departments.ts:59`
- `backend/src/routes/departments.ts:174`
- `backend/src/routes/cost-items.ts:47`
- `backend/src/routes/cost-items.ts:82`
- `backend/src/routes/org.ts:139`
- `backend/src/routes/org.ts:179`

`SEC-007` A rota legada de tarefas mistura autorização ausente com operação em tabela inconsistente.

Impacto: além do acesso indevido, o delete pode atuar sobre `tasks` em vez de `cdt_tasks`, causando comportamento inesperado e enfraquecendo integridade operacional.

Evidências:

- `backend/src/routes/tasks.ts:101`
- `backend/src/routes/tasks.ts:105`

`SEC-008` Algumas respostas ainda devolvem `details` e `hint` vindos do Supabase para o cliente.

Impacto: facilita enumeração de schema, colunas e estado interno da API.

Evidências:

- `backend/src/routes/projects.ts:403`
- `backend/src/routes/projects.ts:405`

### Operacional

`SEC-009` O schema e a documentação principal do banco estão defasados em relação às tabelas reais `cdt_*` e às migrações atuais.

Impacto: aumenta chance de operadores aplicarem setup inseguro, sem RLS efetiva ou com tabelas erradas.

Evidências:

- `supabase-schema.sql:163`
- `supabase-schema.sql:174`
- `SUPABASE_SCHEMA.md:186`
- `SUPABASE_SCHEMA.md:206`

## To-dos priorizados

- `[TODO-SEC-001]` Fechar todas as rotas de `projects`, `tasks` e leituras de `activities` com `requireAuth` e regras de autorização por papel/escopo.
- `[TODO-SEC-002]` Separar cliente Supabase de leitura autenticada do cliente `service role`; usar `service role` apenas em fluxos administrativos estritos.
- `[TODO-SEC-003]` Definir e aplicar RLS real para tabelas críticas: `cdt_users`, `cdt_projects`, `cdt_project_todos`, `cdt_activities`, `cdt_comments`, `cdt_notifications`, `cdt_user_roles`, `cdt_user_org`, custos e departamentos.
- `[TODO-SEC-004]` Substituir impersonação por fluxo explícito de `view as` no backend, com trilha de auditoria e sem depender de `x-user-id` genérico.
- `[TODO-SEC-005]` Tornar `activity-covers` privado e servir acesso por signed URL curta ou proxy autenticado.
- `[TODO-SEC-006]` Validar tipo, faixa e referência cruzada em todos os endpoints de `departments`, `cost-items` e `org`; padronizar respostas 4xx/5xx sem ecoar erro bruto do banco.
- `[TODO-SEC-007]` Remover ou reescrever a rota legada `tasks` para usar a tabela correta, autenticação obrigatória e regras alinhadas ao domínio atual.
- `[TODO-SEC-008]` Revisar onboarding manual: senha temporária única por usuário, expiração curta, rotação obrigatória e confirmação controlada.
- `[TODO-SEC-009]` Remover `details` e `hint` de respostas públicas e centralizar sanitização de erros do Supabase.
- `[TODO-SEC-010]` Atualizar `supabase-schema.sql` e `SUPABASE_SCHEMA.md` para refletirem apenas o modelo `cdt_*`, a baseline de RLS e o fluxo de migrações válido.

## Ordem recomendada de execução

1. `TODO-SEC-001`
2. `TODO-SEC-002`
3. `TODO-SEC-003`
4. `TODO-SEC-004`
5. `TODO-SEC-005`
6. `TODO-SEC-006`
7. `TODO-SEC-007`
8. `TODO-SEC-008`
9. `TODO-SEC-009`
10. `TODO-SEC-010`
