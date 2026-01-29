# 🔑 Guia de Configuração do GitHub

Este guia explica como configurar a integração com GitHub para buscar commits, informações de repositórios e contribuidores.

## 📋 Pré-requisitos

- Conta no GitHub
- Acesso aos repositórios que deseja integrar (públicos ou privados)

## 🚀 Passo a Passo

### 1. Criar um Personal Access Token (PAT)

1. Acesse: https://github.com/settings/tokens
2. Clique em **"Generate new token"** → **"Generate new token (classic)"**
3. Preencha os dados:
   - **Note**: Dê um nome descritivo (ex: "CDT-Inteligencia - Backend")
   - **Expiration**: Escolha a validade (recomendado: 90 dias ou "No expiration" para desenvolvimento)
   - **Scopes**: Selecione as permissões necessárias:
     - ✅ `public_repo` - Para acessar repositórios públicos
     - ✅ `repo` - Para acessar repositórios privados (se necessário)
     - ✅ `read:org` - Para acessar informações de organizações (opcional)
4. Clique em **"Generate token"**
5. **⚠️ IMPORTANTE**: Copie o token imediatamente! Você não conseguirá vê-lo novamente.

### 2. Configurar no Projeto

1. Abra o arquivo `.env.local` na **raiz do projeto** (ou `backend/.env` / `backend/.env.local` se não usar raiz).
2. Adicione a linha com seu token:
   ```env
   GITHUB_TOKEN=ghp_seu_token_aqui
   ```
   Exemplo:
   ```env
   GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz
   ```

### 3. Verificar Configuração

1. Reinicie o backend (pare com Ctrl+C e execute `npm run dev` novamente)
2. Verifique o console do backend - ele deve carregar o token automaticamente
3. Se o token estiver configurado, você verá mensagens de sucesso ao buscar dados do GitHub

## 🔍 Como Funciona

O sistema usa o token para fazer requisições à GitHub API através do Octokit. As rotas disponíveis são:

### Endpoints da API

- **GET `/api/github/repo?url=<github_url>`**
  - Busca informações do repositório (nome, descrição, linguagem, estrelas, etc.)

- **GET `/api/github/commits?url=<github_url>&limit=10`**
  - Busca commits recentes do repositório
  - Parâmetro `limit` (opcional): número de commits (padrão: 10)

- **GET `/api/github/contributors?url=<github_url>`**
  - Lista os contribuidores do repositório

### Exemplo de Uso

```bash
# Buscar informações do repositório
curl "http://localhost:3001/api/github/repo?url=https://github.com/JuanDalvit1/CDT-Inteligencia"

# Buscar últimos 5 commits
curl "http://localhost:3001/api/github/commits?url=https://github.com/JuanDalvit1/CDT-Inteligencia&limit=5"

# Buscar contribuidores
curl "http://localhost:3001/api/github/contributors?url=https://github.com/JuanDalvit1/CDT-Inteligencia"
```

## 🔒 Segurança

- **NUNCA** commite o arquivo `.env` ou `.env.local` no Git
- O arquivo `.env.local` já está no `.gitignore` por padrão
- Se acidentalmente commitar o token, revogue-o imediatamente no GitHub e crie um novo
- Use tokens com escopo mínimo necessário (só `public_repo` se não precisar de repositórios privados)

## 🐛 Troubleshooting

### Token não está funcionando

1. Verifique se o token está correto no arquivo `.env`
2. Verifique se o arquivo está no local correto (`backend/.env` ou `backend/.env.local`)
3. Reinicie o backend após adicionar o token
4. Verifique os logs do backend para mensagens de erro

### Erro 401 (Unauthorized)

- O token pode estar expirado ou inválido
- Verifique se o token tem as permissões corretas (`repo` ou `public_repo`)
- Gere um novo token e atualize o `.env`

### Erro 403 (Forbidden)

- O token não tem permissão para acessar o repositório
- Verifique se o repositório é privado e o token tem permissão `repo`
- Verifique se o token tem acesso à organização (se aplicável)

### Erro 404 (Not Found)

- A URL do repositório pode estar incorreta
- Verifique se o formato da URL está correto: `https://github.com/owner/repo`
- Verifique se o repositório existe e está acessível
- **Repositório em organização:** o GitHub devolve 404 quando o token **não tem acesso** ao repo (em vez de 403). Para token **fine-grained**: em https://github.com/settings/tokens?type=fine-grained, edite o token e em "Repository access" inclua a organização e os repositórios (ou "All repositories"). Se a organização usar **SAML SSO**, no mesmo token clique em **"Configure SSO"** e autorize para a organização.

## 🏢 Repositórios em organização (ex.: Flexibase-Projects/HUB)

Se os projetos estão em uma **organização** do GitHub, o token precisa ter acesso a ela. Você pode usar um token **classic** ou um **fine-grained**; para orgs, o fine-grained costuma ser mais simples.

### Opção A: Token fine-grained (recomendado para organizações)

1. Acesse: **https://github.com/settings/tokens?type=fine-grained**
2. Clique em **"Generate new token"**.
3. Preencha:
   - **Token name**: ex. `Central-de-Tarefas - Org repos`
   - **Expiration**: 90 dias ou No expiration (conforme política da org).
   - **Resource owner**: escolha a **organização** (ex. `Flexibase-Projects`), não sua conta pessoal.
   - **Repository access**: "All repositories" ou selecione os repositórios que o app vai usar.
   - **Permissions** (Repository permissions):
     - **Contents**: Read-only (para README e arquivos).
     - **Metadata**: Read-only (já vem marcado).
     - **Commit statuses**: Read-only (se precisar de status de commit).
4. Clique em **"Generate token"** e copie o token (começa com `github_pat_`).
5. Se a organização exigir aprovação, um owner precisa aprovar em: **Organização → Settings → Personal access tokens → Pending requests**.

Depois, coloque no `.env.local` na raiz (ou no backend):

```env
GITHUB_TOKEN=github_pat_xxxxxxxxxxxx
```

Reinicie o backend.

### Opção B: Token classic com acesso à organização

1. Acesse: **https://github.com/settings/tokens**
2. **"Generate new token"** → **"Generate new token (classic)"**.
3. Marque pelo menos:
   - **repo** (acesso total a repositórios, incluindo privados da org).
   - Ou só **public_repo** se todos os repositórios da org forem públicos.
4. Gere o token e copie (começa com `ghp_`).
5. **Autorizar o token na organização** (obrigatório para orgs):
   - Acesse a página da organização: `https://github.com/orgs/Flexibase-Projects/settings/profile` (troque pelo nome da org).
   - Menu lateral: **Settings** da organização → **Personal access tokens** (ou **Third-party access** / **OAuth**).
   - Ou, na lista dos seus tokens: https://github.com/settings/tokens — ao lado do token, se aparecer **"Configure SSO"** ou **"Enable SSO"** para a organização, clique e **autorize** o token para essa org.
6. Se a organização usar **SAML SSO**, clique em **"Configure SSO"** ao lado do token e autorize para a organização.

Se ainda não puxar dados depois disso, confira se o token está no `.env.local` correto (raiz do projeto ou backend, conforme configurado) e se o backend foi reiniciado.

## 📚 Recursos Adicionais

- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Personal Access Tokens Guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Octokit Documentation](https://octokit.github.io/rest.js/)
