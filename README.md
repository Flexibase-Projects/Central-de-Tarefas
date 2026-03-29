# CDT-Inteligência

Central de Tarefas do Departamento de Inteligência da Flexibase

## 📋 Sobre o Projeto

Sistema de gerenciamento de tarefas e projetos desenvolvido para o Departamento de Inteligência. Inclui:

- **Sidebar Padronizada**: Menu lateral seguindo as especificações do Achromatic (shadcn/ui)
- **Kanban Board**: Sistema de gerenciamento visual de projetos com drag-and-drop
- **Integração GitHub**: Preparado para integração com GitHub API (commits, repositórios, contribuidores)
- **Backend API**: API RESTful com Node.js/Express/TypeScript
- **Banco de Dados**: Supabase para armazenamento de dados

## 🚀 Tecnologias

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- @dnd-kit (drag-and-drop)
- React Router

### Backend
- Node.js + Express
- TypeScript
- Supabase Client
- Octokit (GitHub API)

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ e npm
- Conta no Supabase
- (Opcional) Token de acesso pessoal do GitHub

### Passos

1. **Clone o repositório**
```bash
git clone https://github.com/JuanDalvit1/CDT-Inteligencia.git
cd CDT-Inteligencia
```

2. **Instale as dependências**
```bash
npm run install:all
```

3. **Configure o banco de dados Supabase**
   - Acesse o [Supabase Dashboard](https://app.supabase.com)
   - Vá em **SQL Editor**
   - Abra o arquivo `supabase-schema.sql` deste projeto
   - Copie e cole todo o conteúdo no SQL Editor
   - Clique em **Run** para executar o script
   - Verifique se todas as tabelas foram criadas em **Table Editor**

4. **Configure as variáveis de ambiente**

Crie um arquivo `.env` na raiz do projeto:
```env
VITE_API_URL=http://localhost:3002
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

Crie um arquivo `backend/.env` ou `backend/.env.local`:
```env
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_do_supabase
GITHUB_TOKEN=seu_token_github_opcional
PORT=3002
FRONTEND_URL=http://localhost:3003
```

**Nota:** As portas padrão foram alteradas temporariamente para evitar conflitos:
- Frontend: `http://localhost:3003` (antes: 3000)
- Backend: `http://localhost:3002` (antes: 3001)

### 🔑 Configuração do GitHub Token (Opcional)

Para usar a integração com GitHub e puxar commits dos projetos, você precisa criar um **Personal Access Token** no GitHub:

1. **Criar o Token no GitHub:**
   - Acesse: https://github.com/settings/tokens
   - Clique em **"Generate new token"** → **"Generate new token (classic)"**
   - Dê um nome descritivo (ex: "CDT-Inteligencia")
   - Selecione as permissões necessárias:
     - ✅ `repo` (acesso completo a repositórios privados) - se precisar acessar repositórios privados
     - ✅ `public_repo` (acesso a repositórios públicos) - se só precisar de repositórios públicos
   - Clique em **"Generate token"**
   - **IMPORTANTE**: Copie o token imediatamente (você não conseguirá vê-lo novamente!)

2. **Adicionar ao arquivo de ambiente:**
   - Abra `backend/.env` ou `backend/.env.local`
   - Adicione a linha:
   ```env
   GITHUB_TOKEN=ghp_seu_token_aqui
   ```

3. **Reiniciar o backend:**
   - Pare o servidor (Ctrl+C)
   - Execute novamente: `npm run dev`

4. **Verificar se está funcionando:**
   - O backend mostrará no console se o token foi carregado
   - Ao criar/editar um projeto com URL do GitHub, o sistema tentará buscar informações automaticamente

**Nota**: Sem o token, o sistema ainda funciona normalmente, mas não conseguirá buscar commits e informações dos repositórios do GitHub.

4. **Configure o banco de dados**

Acesse o Supabase Dashboard > SQL Editor e execute o script completo do arquivo `supabase-schema.sql`. Isso criará todas as tabelas necessárias (`projects`, `tasks`, `comments`, `project_assignments`, `github_repositories`) com índices e triggers.

5. **Execute o projeto**
```bash
npm run dev
```

Isso iniciará:
- Backend na porta 3001
- Frontend na porta 3000

Acesse `http://localhost:3000` no navegador.

## 📁 Estrutura do Projeto

```
CDT-Inteligencia/
├── backend/                 # Backend Node.js/Express
│   ├── src/
│   │   ├── routes/         # Rotas da API
│   │   ├── services/       # Lógica de negócio
│   │   ├── config/         # Configurações
│   │   └── types/          # TypeScript types
│   └── package.json
├── frontend/               # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   │   ├── sidebar/   # Componentes da sidebar
│   │   │   ├── kanban/    # Componentes do Kanban
│   │   │   └── ui/        # Componentes shadcn/ui
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── hooks/         # React hooks customizados
│   │   └── lib/           # Utilitários
│   └── package.json
├── SUPABASE_SCHEMA.md      # Documentação do schema
├── supabase-schema.sql     # Script SQL para criar as tabelas
└── package.json           # Workspace root
```

## 🎨 Funcionalidades

### Sidebar
- Largura: 240px (expandido) / 56px (colapsado)
- Altura dos itens de menu: 36px
- Padding de grupos configurado
- Suporte a tooltips quando colapsado
- Responsivo para mobile

### Kanban Board
- 5 colunas: Backlog, To Do, In Progress, Review, Done
- Drag-and-drop entre colunas
- Cards de projeto com informações do GitHub
- Modal de detalhes do projeto
- Criação de novos projetos

### Integração GitHub (Preparada)
- Estrutura pronta para buscar informações de repositórios
- Lista de commits recentes
- Contribuidores do repositório
- Requer token GitHub configurado

## 🔧 Scripts Disponíveis

- `npm run dev` - Inicia frontend e backend simultaneamente (desenvolvimento local)
- `npm run build` - Build de produção (frontend + backend)
- `npm run start` - Inicia apenas o backend (serve API + SPA na mesma porta; use após o build)
- `npm run install:all` - Instala dependências de todos os workspaces

Para deploy em produção (PM2, Nginx, porta única), veja [docs/DEPLOY.md](docs/DEPLOY.md).
Para a documentação consolidada de segurança, veja [docs/security/README.md](docs/security/README.md).
Para o adapter de SSO central do CDT, veja [docs/auth/CDT-CENTRAL-SSO-ADAPTER.md](docs/auth/CDT-CENTRAL-SSO-ADAPTER.md).

## 📝 Próximos Passos

1. Configurar autenticação com Supabase Auth
2. Implementar sistema de comentários
3. Adicionar atribuições de usuários
4. Expandir sidebar com novos departamentos/projetos
5. Implementar notificações de atividades

## 🤝 Contribuindo

Este é um projeto interno do Departamento de Inteligência da Flexibase.

## Codex Skills

Este repositório agora possui um pacote recomendado de skills para trabalho com Codex, com destaque para a skill customizada `uncodixfy`, para o pacote avançado de comunidade e para a instalação local de `ui-ux-pro-max` dentro do projeto.

Veja a definição completa em [docs/CODEX_SKILLS.md](docs/CODEX_SKILLS.md).

## 📄 Licença

Proprietário - Flexibase
