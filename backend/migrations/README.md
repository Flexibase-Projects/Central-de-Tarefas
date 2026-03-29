# Migrações do banco de dados

Execute no **Supabase SQL Editor** (ou via psql) na **ordem abaixo**. As migrações usam `IF NOT EXISTS` onde possível, então podem ser reexecutadas sem efeitos colaterais.

## Ordem obrigatória

1. **001_gamification.sql** – Adiciona colunas de gamificação em `cdt_project_todos` e `cdt_activities` (`xp_reward`, `deadline`, `achievement_id`, `completed_at`), cria tabelas `cdt_achievements`, `cdt_user_achievements`, `cdt_user_xp_log` e seeds.
2. **002_gamification_decimal_admin.sql** – Converte `xp_reward` para `numeric(10,2)`, adiciona `deadline_bonus_percent` e `achievement_id` onde faltar, e ajustes de idempotência no XP log.
3. **003_cost_management.sql** – Organograma (`cdt_user_org`: `person_name`, hierarquia por `reports_to_id` → `cdt_user_org.id`) e custos por departamento (`cdt_departments`, `cdt_cost_items`, vínculos, membros, layout do mapa, alocações). Requer função `update_updated_at_column()` (recriada no script se necessário).

4. **004_org_person_name_hierarchy.sql** – Só necessário se o `003` já foi aplicado na forma antiga (com `user_id`). Converte a tabela para nome livre e hierarquia por id da linha.

5. **005_org_person_salary_cost.sql** – Colunas `monthly_salary` e `monthly_cost` em `cdt_user_org` (opcionais).

6. **006_activity_todos_and_comments.sql** – To-dos vinculados só à atividade (`cdt_project_todos.activity_id`, `project_id` opcional) e comentários por atividade (`cdt_comments.activity_id`). Exige exatamente um “pai”: projeto **ou** atividade (to-dos); projeto, task **ou** atividade (comentários).

7. **007_todo_assignment_and_xp_queue.sql** – Adiciona `assigned_at` em `cdt_project_todos`, cria índice para feed de to-dos atribuídos recentemente e ajusta os índices do XP log para permitir múltiplos ciclos de `todo_completed`/`todo_uncompleted`.

8. **012_central_identity_sso.sql** – Adiciona vínculo explícito com identidade central (`central_user_id`, `identity_status`, `last_identity_sync_at`) em `cdt_users`, preservando IDs locais e preparando o adapter de SSO central.

Se aparecer erro **"column cdt_activities.xp_reward does not exist"** (ou equivalente em `cdt_project_todos`):

- **Opção A (recomendado):** execute **001** e depois **002** (gamificação completa, achievements, seeds).
- **Opção B (só colunas em activities/todos):** execute **`003_minimal_gamification_columns_only.sql`** no SQL Editor. Depois, quando possível, rode **001** e **002** para alinhar o restante do schema.

A API pode devolver **503** com `quickFixSql` no JSON — o mesmo SQL está em **003** e no código em `backend/src/constants/gamificationMigrationSql.ts`.
