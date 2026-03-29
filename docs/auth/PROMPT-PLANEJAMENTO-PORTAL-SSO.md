# Prompt de Planejamento para o Novo Projeto do Portal SSO

```text
Voce e o agente responsavel por planejar um novo projeto chamado Portal SSO.

Este novo projeto sera o unico lugar do ecossistema onde:
- usuarios poderao ser registrados;
- identidade global sera administrada;
- login central sera realizado;
- sessao global sera mantida;
- applications, workspaces, memberships e papeis gerais serao administrados.

Contexto fixo:
- O ecossistema possui varias ferramentas web internas.
- Todas vivem no mesmo dominio raiz.
- O nucleo de identidade sera um unico Supabase Auth central.
- Nao sera criado outro IdP externo.
- O Portal SSO sera a camada central por cima do Supabase Auth.
- Cada sistema consumidor recebera sessao local depois de trocar um authorization code curto.
- O Portal SSO deve ser o unico lugar de cadastro, administracao geral de acesso, login central e logout global.

Seu trabalho neste momento e apenas planejar.
Nao implemente codigo agora.
Crie um plano decision complete para o novo projeto.

Objetivo do projeto:
- criar o Portal SSO central do ecossistema;
- permitir login unico entre todas as ferramentas;
- centralizar cadastro e governanca de usuarios;
- centralizar applications, workspaces, memberships, roles e auditoria;
- oferecer uma base segura e escalavel para integrar todos os projetos atuais e futuros.

O que o planejamento precisa cobrir:
1. arquitetura geral do Portal
2. fronteiras entre Supabase Auth e Portal SSO
3. dominio e estrategia de cookies
4. fluxo de login central
5. fluxo de logout global
6. fluxo de authorization code interno
7. suporte a apps com backend
8. suporte a apps SPA puras
9. modelo de banco central
10. administracao de usuarios
11. administracao de applications
12. administracao de workspaces
13. memberships, roles e permissions
14. auditoria
15. observabilidade
16. seguranca
17. rollout
18. estrategia de integracao para apps existentes
19. estrategia para apps novos
20. testes e aceite

Diretrizes obrigatorias:
- O Portal SSO e o unico lugar que pode registrar usuarios do ecossistema.
- Aplicacoes consumidoras nao podem ter base propria de senha.
- O Portal deve expor contratos claros para integracao.
- O SSO deve usar redirect + code exchange, nunca copiar sessao por localStorage.
- O Portal deve sustentar logout global.
- Membership e role devem ser contextuais por application e workspace.
- Revogacao de acesso deve ser logica, nunca destrutiva.
- Toda acao sensivel deve ser auditada.
- O desenho deve permitir rollout gradual sem quebrar as aplicacoes existentes.

O planejamento deve propor pelo menos:
- arquitetura de repositorio e modulos
- componentes principais do sistema
- schema inicial do banco
- contratos de API
- tipos principais
- estrategia de configuracao por ambiente
- estrategia de feature flags
- estrategia de migration e provisioning
- estrategia de rollback
- fases de execucao
- definicao de pronto

Formato obrigatorio da resposta:
- Titulo
- Resumo executivo
- Visao do produto
- Escopo e nao escopo
- Arquitetura alvo
- Componentes do sistema
- Modelo de dados
- APIs e contratos
- Seguranca
- Observabilidade
- Estrategia de rollout
- Fases de implementacao
- Testes e aceite
- Riscos
- Checklist final

Importante:
- Seja extremamente concreto.
- Tome as decisoes necessarias.
- Nao deixe perguntas arquiteturais centrais em aberto.
- O resultado deve permitir que outro agente execute o projeto depois sem redesenhar o SSO do zero.
```
