# STATE

## Snapshot

- Date: 2026-04-04
- Versão no `package.json` da raiz: **1.2.4** (exibida na sidebar abaixo do tema; valor injetado no build a partir desse arquivo)
- Overall status: active development (branch work: multisystem / workspace modules)
- Current baseline: frontend and backend build successfully from the workspace root

## Recent Important Changes (alinhado aos commits recentes no git)

Ordem do mais novo ao mais antigo; use os hashes para cruzar com `git show`.

- **1.2.4** — Indicador visual de versão na sidebar (abaixo de Modo escuro/claro), texto mínimo; valor vem do `package.json` da raiz injetado no build pelo Vite.
- **b01dc86** — Funil público de workspaces: landing e login reutilizável; seletor de tema fixo alinhado ao grid nas telas pré-login; ajustes em Ranking e no serviço de workspaces no backend. Versão **1.2.3**.
- **505ed62** — Configurações e administração com visual mais enxuto: espaçamentos e tipografia; cabeçalhos densos em tabelas; troca do select nativo de cargo por lista em Menu (tema claro/escuro); layout em sidebar, ranking, custos, organograma e compat MUI onde aplicável.
- **2ba79b4** — Remoção das dependências MUI; ponte de compatibilidade em `frontend/src/compat/mui/`.
- **2dbe1ef** — Refinamento do funil de acesso ao workspace e do fluxo de entrada na administração.
- **1008fa6** — Snapshot explícito do estado do workspace (contexto multisystem).
- **42e1d57** — Preparação do CDT para SSO central e UX escopada por workspace (ver também `docs/auth/*`).
- **e748e8d** — Stack ampliada de skills Codex para UI e fluxos de contexto (ver `docs/CODEX_SKILLS.md` se aplicável).
- **1a236e7** — Base de UI multisystem refinada.
- **e0bb8ae / f5e7ecb** — Releases anteriores documentados nos próprios commits (1.2.2 Kanban/to-do; 1.2.1 primeiro acesso, criação de usuários, proxy Vite).

## Estado atual do produto (contexto que pode estar só na branch de trabalho)

Isto complementa o histórico acima com o que ainda pode não estar mergeado; revise após cada merge.

- Workspace navigation is driven by `frontend/src/features/workspace/module-manifest.tsx` (sections: central, execution, insights, administration) plus static sidebar entries (e.g. Prioridades, Mapa).
- **Canva em Equipe** (`teams`): shared Excalidraw-style board with workspace persistence; surfaced under execution in the manifest. Migration `016_team_canvas_module_category.sql` aligns the `teams` module category in `cdt_module_definitions` with execution for admin/global consistency.
- **Prioridades** and related project UX live under execution flows (`/prioridades`, projetos/mapa) with dedicated components under `frontend/src/components/priorities/` and `frontend/src/components/team-canvas/` where applicable.
- Cursor: regra persistente `.cursor/rules/sdd-guardian.mdc` (`alwaysApply`) exige leitura e manutenção do pacote SDD em todo trabalho em modo Agent, alinhada à skill [sdd-guardian](https://github.com/JuanDalvit1/sdd-guardian).

## Active Risks

- The compat UI bridge is still a transitional layer and can hide React/runtime regressions if wrappers violate hook rules or DOM expectations.
- Frontend lint currently passes with pre-existing warnings that are not resolved in this state snapshot.
- Frontend production build still reports large chunks that should be reduced with better code-splitting.
- Module manifest keys and Supabase `cdt_module_definitions` must stay aligned when adding or re-categorizing modules.

## Next Actions

- Continue shrinking `frontend/src/compat/mui/` in favor of native local primitives.
- Triage existing frontend lint warnings and heavy bundle areas.
- After merges that touch modules or deploy paths, update `PROJECT.md` / `STATE.md` and the relevant `docs/architecture` or `docs/ops` files in the same delivery.

## Validation Notes

- `npm run lint --workspace=frontend`: passes with warnings only
- `npm run build --workspace=frontend`: passes
