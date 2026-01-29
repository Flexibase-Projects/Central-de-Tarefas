# Versionamento no deploy

Este documento explica como expor a versão do seu projeto em produção para que a Central de Tarefas possa comparar o deploy com o último commit do GitHub e exibir **Atualizado — Última versão** ou **Desatualizado — Atualize o deploy** no card do projeto.

## O que a Central de Tarefas tenta hoje (sem você fazer nada)

1. **Endpoints JSON:**  
   GET `{url_do_projeto}/version` ou `{url_do_projeto}/api/version` esperando resposta JSON com o commit/versão (7 primeiros caracteres do SHA do Git).

2. **Página HTML:**  
   GET da URL base do projeto e busca no HTML por:
   - Meta tags: `name="version"`, `name="build-id"`, `name="git-commit"` com `content` contendo o SHA (7 caracteres).
   - Comentários: `<!-- version: abc1234 -->`, `<!-- build: abc1234 -->`, `<!-- commit: abc1234 -->`.
   - Atributos: `data-version`, `data-build`, `data-commit` em `body` ou `#root`.

Se nenhuma dessas opções retornar um valor que pareça um SHA curto (7 hex), a Central exibe **Não foi possível validar a versão**.

---

## Como inserir versionamento no seu projeto (próxima atualização)

Escolha **uma** das opções abaixo. O valor deve ser os **7 primeiros caracteres do SHA do commit** do build (ex.: `a1b2c3d`).

### Opção A (recomendada): endpoint JSON

Crie um endpoint no seu projeto que retorne o commit do build, por exemplo:

- **GET** `/version` ou **GET** `/api/version`
- **Resposta:** JSON com um dos campos: `commit`, `sha`, `version`, `git_commit` ou `buildId`.

Exemplo de resposta:

```json
{
  "commit": "a1b2c3d"
}
```

No build (CI ou script local), injete o SHA do Git no código ou em variável de ambiente e sirva nesse endpoint. Exemplo em Node/Express:

```js
// Exemplo: ler de variável de ambiente definida no build
app.get('/api/version', (req, res) => {
  res.json({ commit: process.env.GIT_COMMIT_SHA?.slice(0, 7) || 'unknown' });
});
```

No CI (GitHub Actions, GitLab CI, etc.), defina `GIT_COMMIT_SHA` com o commit do build antes do deploy.

### Opção B: meta tag na página principal

Injete na página principal (ex.: `index.html`) uma meta tag com o SHA curto do commit do build:

```html
<meta name="version" content="a1b2c3d">
```

Ou:

```html
<meta name="build-id" content="a1b2c3d">
```

O valor deve ser os 7 primeiros caracteres do commit (ex.: gerado no build com `git rev-parse --short=7 HEAD`).

---

## Resumo

| Objetivo                         | Ação |
|----------------------------------|------|
| Mostrar "Atualizado" no card      | Expor o commit do build (7 chars) via endpoint JSON ou meta tag. |
| Endpoint recomendado             | GET `/version` ou GET `/api/version` → `{ "commit": "a1b2c3d" }`. |
| Alternativa sem backend          | Meta tag na página: `<meta name="version" content="a1b2c3d">`. |

Com isso, na próxima atualização do seu projeto a Central de Tarefas conseguirá validar se o sistema em produção está na última versão do GitHub.
