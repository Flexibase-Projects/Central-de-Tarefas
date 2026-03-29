# Prompt Generico para Preparar Qualquer Projeto para o SSO Central

```text
Voce e o agente responsavel por preparar um sistema web interno para o nosso SSO central.

Contexto fixo:
- Existe um unico Supabase Auth central para todo o ecossistema.
- Todas as aplicacoes compartilham o mesmo dominio raiz.
- O login central sera operacionalizado por um Portal SSO proprio.
- O Portal SSO e o unico lugar onde a identidade global sera gerenciada.
- Cada aplicacao consumidora recebe sua propria sessao local depois de trocar um authorization code curto.
- O modelo de autorizacao e contextual: application + workspace + role + membership.
- Nenhuma aplicacao consumidora pode continuar sendo dona da autenticacao global.
- Nenhuma aplicacao consumidora pode armazenar senha fora do Supabase central.
- Nenhuma aplicacao consumidora pode perder dados locais existentes.

Seu objetivo:
- descobrir como o projeto autentica hoje;
- preparar o projeto para consumir o Portal SSO central com o minimo de ruptura;
- preservar 100 por cento dos dados atuais;
- tornar o projeto compativel com membership por workspace;
- deixar o projeto pronto para rollout gradual, sem exigir o corte imediato do login legado.

O que voce deve descobrir primeiro:
1. Se o projeto e SPA pura, app com backend proprio ou fullstack.
2. Onde o login atual acontece.
3. Como a sessao local e armazenada hoje.
4. Onde os usuarios locais sao persistidos.
5. Quais tabelas referenciam usuario ou autoria.
6. Se existe tenant, workspace, org, squad, unidade ou equivalente.
7. Se existe RBAC, permissoes ou papeis globais.
8. Se existe RLS.
9. Se o backend depende de service role de forma ampla.
10. Se existem rotas sensiveis sem autenticacao.
11. Se existe storage publico com conteudo sensivel.

Arquitetura obrigatoria a seguir:
- O usuario nao faz login local direto como fluxo principal.
- O app redireciona para o Portal SSO.
- O Portal verifica sessao global.
- O Portal emite authorization code curto e de uso unico.
- O app troca o code por sessao local.
- O app carrega o contexto do usuario e suas memberships.
- O app aplica escopo de workspace antes de liberar uso.

Regras obrigatorias:
- Nao apagar a tabela local de usuarios.
- Nao sobrescrever autoria historica.
- Nao fundir usuarios automaticamente.
- Nao usar localStorage como mecanismo principal de SSO entre apps.
- Nao confiar em x-user-id ou headers equivalentes como mecanismo cross-app.
- Nao usar service role como unica barreira de seguranca.
- Toda migracao deve ser reversivel, idempotente e com dry-run.

Se precisar mapear usuario local para usuario central, use esta estrategia:
1. auth user id ja conhecido
2. email normalizado
3. revisao manual

O que a preparacao deve implementar:
- rota de login via redirect para o Portal
- callback handler
- validacao de state e nonce
- troca de authorization code por sessao local
- bootstrap do usuario autenticado
- leitura de memberships por app e workspace
- logout local
- logout global
- fallback controlado para login legado enquanto existir feature flag

Para projetos com backend:
- preferir troca server-side do code
- preferir cookie httpOnly para sessao local
- sanitizar erros
- nao expor detalhes internos para o frontend

Para SPAs puras:
- usar callback controlado
- nunca armazenar segredo de app no frontend
- documentar claramente os limites

Seguranca obrigatoria:
- aplicar escopo por workspace antes de liberar dados
- storage interno deve ser privado para conteudo sensivel
- signed URLs curtas ou proxy autenticado para arquivos privados
- auditoria de login, callback, logout e falha de membership

Entregaveis esperados:
1. resumo do estado atual do projeto
2. desenho da integracao com o Portal SSO
3. mudancas de frontend
4. mudancas de backend
5. mudancas de banco
6. estrategia de vinculo entre usuario local e usuario central
7. estrategia de rollout
8. testes funcionais e de seguranca
9. riscos e pontos de atencao
10. checklist final de implementacao

Formato obrigatorio:
- Titulo
- Resumo
- Estado atual encontrado
- Arquitetura de integracao
- Mudancas por camada
- Migracao e preservacao de dados
- Testes e aceite
- Riscos
- Checklist final

Importante:
- Seja decision complete.
- Nao deixe decisoes criticas abertas.
- Preserve os dados atuais do projeto.
- A resposta precisa ser reutilizavel para qualquer sistema do ecossistema.
```
