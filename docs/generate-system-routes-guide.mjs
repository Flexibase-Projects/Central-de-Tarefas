import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const outputDir = path.join(rootDir, 'output')
const backendIndexPath = path.join(rootDir, 'backend', 'src', 'index.ts')
const backendRoutesDir = path.join(rootDir, 'backend', 'src', 'routes')

const generatedAt = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
}).format(new Date())

const FRONTEND_ROUTES = [
  {
    scope: 'Global',
    route: '/',
    type: 'Redirect',
    access: 'Público',
    title: 'Entrada raiz',
    summary: 'Redireciona sempre para /workspaces.',
  },
  {
    scope: 'Global',
    route: '/login',
    type: 'Redirect',
    access: 'Público',
    title: 'Alias legado de entrada',
    summary: 'Redireciona para /workspaces.',
  },
  {
    scope: 'Global',
    route: '*',
    type: 'Redirect',
    access: 'Público',
    title: 'Fallback global',
    summary: 'Qualquer rota desconhecida fora do workspace volta para /workspaces.',
  },
  {
    scope: 'Global',
    route: '/workspaces',
    type: 'Tela',
    access: 'Público',
    title: 'Seletor de workspace',
    summary: 'Lista áreas, grupos e direciona para login ou entrada direta.',
  },
  {
    scope: 'Global',
    route: '/auth/callback',
    type: 'Callback',
    access: 'Público',
    title: 'Retorno do SSO central',
    summary: 'Troca code/state por sessão local e envia o usuário de volta ao destino seguro.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/login',
    type: 'Tela',
    access: 'Público contextual',
    title: 'Acesso ao workspace',
    summary: 'Concentra SSO, login legado, primeiro acesso e solicitação de acesso.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug',
    type: 'Tela',
    access: 'Autenticado + acesso ao workspace',
    title: 'Dashboard',
    summary: 'Ponto de entrada após o AuthGuard dentro do contexto escolhido.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/mapa',
    type: 'Tela',
    access: 'Autenticado + acesso ao workspace',
    title: 'Mapa',
    summary: 'Visão de leitura ampla da operação e das frentes do workspace.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/prioridades',
    type: 'Tela',
    access: 'Autenticado + acesso ao workspace',
    title: 'Prioridades',
    summary: 'Organiza leitura de importância e urgência.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/desenvolvimentos',
    type: 'Tela',
    access: 'Permissão access_desenvolvimentos',
    title: 'Projetos',
    summary: 'Área de projetos/desenvolvimentos com quadro operacional.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/atividades',
    type: 'Tela',
    access: 'Permissão access_atividades',
    title: 'Atividades',
    summary: 'Fluxo de atividades detalhadas e execução diária.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/canva-equipe',
    type: 'Tela',
    access: 'Autenticado + acesso ao workspace',
    title: 'Canva em equipe',
    summary: 'Espaço colaborativo de desenho e organização visual do time.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/indicadores',
    type: 'Tela',
    access: 'Autenticado + acesso ao workspace',
    title: 'Indicadores',
    summary: 'Métricas, pendências e leitura analítica do workspace.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/perfil',
    type: 'Tela',
    access: 'Autenticado + acesso ao workspace',
    title: 'Perfil',
    summary: 'Visão individual do usuário no contexto do workspace.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/conquistas',
    type: 'Tela',
    access: 'Autenticado + acesso ao workspace',
    title: 'Conquistas',
    summary: 'Lista de achievements e progresso desbloqueado.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/niveis',
    type: 'Tela',
    access: 'Autenticado + acesso ao workspace',
    title: 'Níveis',
    summary: 'Progressão de level/xp do usuário.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/tutorial',
    type: 'Tela',
    access: 'Autenticado + acesso ao workspace',
    title: 'Tutorial',
    summary: 'Explica a lógica do sistema e do modo de funcionamento.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/organograma',
    type: 'Tela',
    access: 'Admin',
    title: 'Organograma',
    summary: 'Área administrativa de estrutura organizacional. ProtectedRoute redireciona para a raiz se o cargo não for admin.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/custos-departamento',
    type: 'Tela',
    access: 'Admin',
    title: 'Custos',
    summary: 'Mapa de custos por departamento, também protegido por cargo admin.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/configuracoes',
    type: 'Tela',
    access: 'Admin',
    title: 'Configurações',
    summary: 'Hub administrativo com aba Visão geral como índice interno.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/configuracoes/administracao',
    type: 'Tela',
    access: 'Admin',
    title: 'Administração',
    summary: 'Usuários, cargos, permissões e conquistas. As abas internas não criam novas URLs.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/configuracoes/organograma',
    type: 'Alias',
    access: 'Admin',
    title: 'Atalho administrativo',
    summary: 'Redireciona para /w/:workspaceSlug/organograma.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/configuracoes/custos-departamento',
    type: 'Alias',
    access: 'Admin',
    title: 'Atalho administrativo',
    summary: 'Redireciona para /w/:workspaceSlug/custos-departamento.',
  },
  {
    scope: 'Workspace',
    route: '/w/:workspaceSlug/admin',
    type: 'Alias',
    access: 'Admin',
    title: 'Atalho legado',
    summary: 'Redireciona para /w/:workspaceSlug/configuracoes/administracao.',
  },
]

const FRONTEND_NOTES = [
  'Todo /w/:workspaceSlug/* passa pelo AuthGuard antes de renderizar o layout principal.',
  'O AuthGuard envia usuários sem sessão ou sem vínculo válido para /w/:workspaceSlug/login com returnTo seguro.',
  'ProtectedRoute protege páginas de administração e devolve o usuário para a raiz do workspace quando falta cargo ou permissão.',
  'A página /w/:workspaceSlug/configuracoes/administracao contém abas internas (Usuários, Cargos, Permissões e Conquistas), mas sem novas rotas.',
]

const MODULE_DESCRIPTIONS = {
  '/api/health': 'Health check público do backend.',
  '/api/achievements': 'Cadastro e manutenção das conquistas do sistema.',
  '/api/activities': 'CRUD de atividades e upload de capa.',
  '/api/auth': 'Catálogo público de workspaces, primeiro acesso e solicitação de acesso.',
  '/api/cost-items': 'Itens de custo e suas alocações.',
  '/api/cost-management': 'Resumo e grafo agregado da gestão de custos.',
  '/api/cost-map': 'Persistência do layout visual do mapa de custos.',
  '/api/departments': 'Departamentos, membros e custos associados.',
  '/api/github': 'Leitura de dados de repositório no GitHub.',
  '/api/indicators': 'Indicadores consolidados do workspace.',
  '/api/me/progress': 'Progresso gamificado do usuário autenticado.',
  '/api/notifications': 'Listagem e leitura de notificações.',
  '/api/org': 'Árvore organizacional e detalhes de subárvore.',
  '/api/permissions': 'Consulta das permissões cadastradas.',
  '/api/project-comments': 'Comentários vinculados a projetos e atividades.',
  '/api/projects': 'Projetos, ordenação e cartões resumo.',
  '/api/roles': 'Cargos e vínculo de permissões.',
  '/api/sso': 'Início, configuração e logout do SSO central.',
  '/api/tasks': 'Tarefas associadas aos projetos.',
  '/api/team-canvas': 'Estado persistido do canvas de equipe.',
  '/api/todos': 'Todos de projeto/atividade e reordenação.',
  '/api/users': 'Identidade de usuário, vínculo de cargo e bootstrap de conta.',
  '/api/workspaces': 'Contexto, membros e catálogo do workspace atual.',
}

const API_NOTES = [
  'GET /api/health é a única rota antes do authMiddleware.',
  'Depois do health check, todo /api/* passa pelo authMiddleware, que hidrata o usuário a partir do JWT quando ele existe.',
  'Os módulos montados com requireWorkspaceAccess exigem contexto do workspace e validam o vínculo do usuário antes da lógica do domínio.',
  'Em produção, rotas não-API caem no build da SPA; rotas /api/* desconhecidas retornam 404 em JSON.',
]

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function endpointFullPath(basePath, entryPath) {
  return entryPath === '/' ? basePath : `${basePath}${entryPath}`
}

function badgeClassForType(type) {
  if (type === 'Tela') return 'badge badge-screen'
  if (type === 'Redirect') return 'badge badge-redirect'
  if (type === 'Alias') return 'badge badge-alias'
  if (type === 'Callback') return 'badge badge-callback'
  return 'badge'
}

function badgeClassForAccess(access) {
  if (access === 'Público' || access === 'Público contextual') return 'badge badge-public'
  if (access === 'Admin') return 'badge badge-admin'
  if (access.startsWith('Permissão')) return 'badge badge-permission'
  return 'badge badge-auth'
}

async function parseBackendModules() {
  const indexContent = await fs.readFile(backendIndexPath, 'utf8')
  const routeFiles = await fs.readdir(backendRoutesDir)
  const importToFile = new Map()
  const fileMounts = new Map()

  for (const match of indexContent.matchAll(/import\s+(\w+)\s+from\s+'\.\/routes\/([^']+)\.js';/g)) {
    importToFile.set(match[1], `${match[2]}.ts`)
  }

  for (const match of indexContent.matchAll(/app\.use\('([^']+)',\s*(requireWorkspaceAccess,\s*)?(\w+)\);/g)) {
    const fileName = importToFile.get(match[3])
    if (!fileName) continue

    fileMounts.set(fileName, {
      basePath: match[1],
      requiresWorkspaceAccess: Boolean(match[2]),
    })
  }

  const modules = []

  for (const fileName of routeFiles.filter((item) => item.endsWith('.ts')).sort()) {
    const source = await fs.readFile(path.join(backendRoutesDir, fileName), 'utf8')
    const mount = fileMounts.get(fileName)
    if (!mount) continue

    const entries = []

    for (const match of source.matchAll(/router\.(get|post|put|patch|delete|options)\(\s*['"`]([^'"`]+)['"`]/g)) {
      entries.push({
        method: match[1].toUpperCase(),
        path: match[2],
      })
    }

    for (const match of source.matchAll(/router\.route\(\s*['"`]([^'"`]+)['"`]\s*\)([\s\S]*?)(?=\nrouter\.|\nexport default|$)/g)) {
      const routePath = match[1]
      const routeBlock = match[2]
      for (const method of ['get', 'post', 'put', 'patch', 'delete', 'options']) {
        if (new RegExp(`\\.${method}\\(`).test(routeBlock)) {
          entries.push({
            method: method.toUpperCase(),
            path: routePath,
          })
        }
      }
    }

    const uniqueEntries = Array.from(new Map(entries.map((entry) => [`${entry.method}:${entry.path}`, entry])).values())
      .sort((left, right) => endpointFullPath(mount.basePath, left.path).localeCompare(endpointFullPath(mount.basePath, right.path)))

    modules.push({
      fileName,
      basePath: mount.basePath,
      requiresWorkspaceAccess: mount.requiresWorkspaceAccess,
      description: MODULE_DESCRIPTIONS[mount.basePath] || 'Módulo sem descrição manual registrada.',
      entries: uniqueEntries,
    })
  }

  const healthModule = {
    fileName: 'index.ts',
    basePath: '/api/health',
    requiresWorkspaceAccess: false,
    description: MODULE_DESCRIPTIONS['/api/health'],
    entries: [{ method: 'GET', path: '/' }],
  }

  return [healthModule, ...modules]
}

function renderSummaryCard(label, value, hint) {
  return `
    <article class="summary-card">
      <span class="summary-label">${escapeHtml(label)}</span>
      <strong class="summary-value">${escapeHtml(value)}</strong>
      <span class="summary-hint">${escapeHtml(hint)}</span>
    </article>
  `
}

function buildUserFlowMermaid() {
  return `
flowchart TB
    Entry["Entrada pública<br/>/, /login e *"]
    Catalog["/workspaces<br/>seleção do contexto"]
    Access{"Já existe sessão válida<br/>e acesso ao workspace?"}
    Login["/w/:workspaceSlug/login<br/>SSO, login legado,<br/>primeiro acesso e solicitação"]
    Sso["SSO central<br/>/api/sso/start"]
    Callback["/auth/callback"]
    Legacy["Login legado"]
    First["Definir senha inicial<br/>/api/auth/set-initial-password"]
    Request["Solicitar acesso<br/>/api/auth/request-access"]
    Pending["Fila de aprovação"]
    Guard["AuthGuard<br/>protege /w/:workspaceSlug/*"]
    Root["/w/:workspaceSlug<br/>raiz do workspace"]
    Dashboard["/ (Dashboard)"]
    Projects["/desenvolvimentos"]
    Activities["/atividades"]
    TeamCanvas["/canva-equipe"]
    Map["/mapa"]
    Priorities["/prioridades"]
    Indicators["/indicadores"]
    Profile["/perfil"]
    Achievements["/conquistas"]
    Levels["/niveis"]
    Tutorial["/tutorial"]
    AdminGuard["ProtectedRoute<br/>role=admin"]
    Org["/organograma"]
    Costs["/custos-departamento"]
    Settings["/configuracoes"]
    SettingsAdmin["/configuracoes/administracao"]
    AdminAliases["Atalhos admin<br/>/admin<br/>/configuracoes/organograma<br/>/configuracoes/custos-departamento"]

    Entry --> Catalog --> Access
    Access -->|Não| Login
    Access -->|Sim| Guard
    Login -->|Fluxo SSO| Sso --> Callback --> Guard
    Login -->|E-mail e senha| Legacy --> Guard
    Login -->|Primeiro acesso| First --> Guard
    Login -->|Sem acesso| Request --> Pending
    Guard --> Root

    Root --> Dashboard
    Root --> Projects
    Root --> Activities
    Root --> TeamCanvas
    Root --> Map
    Root --> Priorities
    Root --> Indicators
    Root --> Profile
    Root --> Achievements
    Root --> Levels
    Root --> Tutorial
    Root --> AdminGuard
    AdminGuard --> Org
    AdminGuard --> Costs
    AdminGuard --> Settings --> SettingsAdmin
    Settings --> AdminAliases

    classDef public fill:#e8f1ff,stroke:#2d6cdf,color:#163b78,stroke-width:1.5px;
    classDef auth fill:#effbf5,stroke:#2f855a,color:#164c34,stroke-width:1.5px;
    classDef workspace fill:#f8f6ff,stroke:#6b46c1,color:#3b256c,stroke-width:1.5px;
    classDef admin fill:#fff5eb,stroke:#c56b18,color:#7a420b,stroke-width:1.5px;
    classDef pending fill:#fff3f3,stroke:#c53030,color:#7a1e1e,stroke-width:1.5px;

    class Entry,Catalog,Callback public;
    class Login,Sso,Legacy,First,Guard auth;
    class Root,Dashboard,Projects,Activities,TeamCanvas,Map,Priorities,Indicators,Profile,Achievements,Levels,Tutorial workspace;
    class AdminGuard,Org,Costs,Settings,SettingsAdmin,AdminAliases admin;
    class Request,Pending pending;
  `.trim()
}

function buildApiFlowMermaid() {
  return `
flowchart TB
    Client["Cliente / SPA"]
    Health["GET /api/health<br/>health check público"]
    Auth["authMiddleware<br/>extrai usuário do JWT Supabase"]
    Global["Módulos globais ou token-aware<br/>/api/auth<br/>/api/sso<br/>/api/workspaces<br/>/api/users<br/>/api/roles<br/>/api/permissions<br/>/api/github<br/>/api/achievements<br/>/api/me/progress"]
    WorkspaceGate["requireWorkspaceAccess<br/>valida x-workspace-slug e vínculo"]
    Workspace["Módulos com escopo de workspace<br/>/api/projects<br/>/api/tasks<br/>/api/activities<br/>/api/todos<br/>/api/project-comments<br/>/api/notifications<br/>/api/indicators<br/>/api/team-canvas<br/>/api/org<br/>/api/departments<br/>/api/cost-items<br/>/api/cost-map<br/>/api/cost-management"]
    Api404["/api/* desconhecido<br/>404 JSON"]
    SpaFallback["Produção: não-API<br/>frontend/dist/index.html"]

    Client --> Health
    Client --> Auth
    Auth --> Global
    Auth --> WorkspaceGate --> Workspace
    Global --> Api404
    Workspace --> Api404
    Client --> SpaFallback

    classDef public fill:#e8f1ff,stroke:#2d6cdf,color:#163b78,stroke-width:1.5px;
    classDef auth fill:#effbf5,stroke:#2f855a,color:#164c34,stroke-width:1.5px;
    classDef workspace fill:#fff5eb,stroke:#c56b18,color:#7a420b,stroke-width:1.5px;
    classDef neutral fill:#f5f7fb,stroke:#7b8794,color:#334155,stroke-width:1.5px;

    class Client,SpaFallback neutral;
    class Health public;
    class Auth,Global auth;
    class WorkspaceGate,Workspace workspace;
    class Api404 neutral;
  `.trim()
}

function renderFrontendTable() {
  return FRONTEND_ROUTES.map((route) => {
    return `
      <tr>
        <td>${escapeHtml(route.scope)}</td>
        <td><code>${escapeHtml(route.route)}</code></td>
        <td><span class="${badgeClassForType(route.type)}">${escapeHtml(route.type)}</span></td>
        <td><span class="${badgeClassForAccess(route.access)}">${escapeHtml(route.access)}</span></td>
        <td>
          <strong>${escapeHtml(route.title)}</strong>
          <div class="route-summary">${escapeHtml(route.summary)}</div>
        </td>
      </tr>
    `
  }).join('')
}

function renderApiCards(modules) {
  return modules.map((module) => {
    const scopeBadgeClass = module.requiresWorkspaceAccess ? 'badge badge-workspace-scope' : 'badge badge-global-scope'
    const scopeBadgeLabel = module.requiresWorkspaceAccess ? 'Workspace scope' : 'Global / public-aware'
    const endpointItems = module.entries.map((entry) => {
      const fullPath = endpointFullPath(module.basePath, entry.path)
      return `
        <li>
          <span class="method method-${entry.method.toLowerCase()}">${escapeHtml(entry.method)}</span>
          <code>${escapeHtml(fullPath)}</code>
        </li>
      `
    }).join('')

    return `
      <article class="api-card">
        <div class="api-card-head">
          <div>
            <h3>${escapeHtml(module.basePath)}</h3>
            <p>${escapeHtml(module.description)}</p>
          </div>
          <div class="api-card-badges">
            <span class="${scopeBadgeClass}">${scopeBadgeLabel}</span>
            <span class="badge badge-count">${module.entries.length} endpoints</span>
          </div>
        </div>
        <div class="api-card-meta">
          <span>Fonte: backend/src/${escapeHtml(module.fileName)}</span>
        </div>
        <ul class="endpoint-list">
          ${endpointItems}
        </ul>
      </article>
    `
  }).join('')
}

function buildHtml({ backendModules, backendEndpointCount, frontendScreenCount, frontendRedirectCount }) {
  const workspaceScopedCount = backendModules.filter((module) => module.requiresWorkspaceAccess).length
  const globalApiCount = backendModules.length - workspaceScopedCount

  return `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Guia de Rotas do Sistema</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <style>
      :root {
        --bg: #eff3f8;
        --surface: rgba(255, 255, 255, 0.92);
        --surface-strong: #ffffff;
        --line: #d7e0ec;
        --ink: #122033;
        --muted: #5a6980;
        --blue: #2563eb;
        --green: #2f855a;
        --amber: #c56b18;
        --purple: #6b46c1;
        --red: #c53030;
        --shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
      }

      * {
        box-sizing: border-box;
      }

      @page {
        size: A3 landscape;
        margin: 12mm;
      }

      body {
        margin: 0;
        font-family: 'Manrope', 'Segoe UI', sans-serif;
        color: var(--ink);
        background:
          linear-gradient(180deg, rgba(37, 99, 235, 0.06), rgba(197, 107, 24, 0.03) 38%, rgba(255, 255, 255, 0) 100%),
          linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
          linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
          var(--bg);
        background-size: auto, 28px 28px, 28px 28px, auto;
      }

      main {
        width: 100%;
      }

      .sheet {
        background: var(--surface);
        border: 1px solid rgba(215, 224, 236, 0.95);
        border-radius: 28px;
        box-shadow: var(--shadow);
        padding: 28px 32px;
        backdrop-filter: blur(10px);
        margin-bottom: 18px;
      }

      .hero {
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 24px;
        align-items: stretch;
      }

      .hero-tag {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        border: 1px solid rgba(37, 99, 235, 0.16);
        border-radius: 999px;
        padding: 7px 12px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--blue);
        background: rgba(37, 99, 235, 0.08);
      }

      h1 {
        margin: 18px 0 12px;
        font-size: 42px;
        line-height: 1.08;
        letter-spacing: -0.04em;
      }

      .hero p,
      .section-copy,
      .note-list li,
      .summary-hint,
      .api-card p,
      .route-summary,
      .api-card-meta,
      footer {
        color: var(--muted);
      }

      .hero p {
        margin: 0;
        font-size: 15px;
        line-height: 1.72;
        max-width: 900px;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .summary-card {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 18px;
        border-radius: 22px;
        background: var(--surface-strong);
        border: 1px solid rgba(215, 224, 236, 0.95);
      }

      .summary-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
        font-weight: 700;
      }

      .summary-value {
        font-size: 28px;
        line-height: 1;
      }

      .summary-hint {
        font-size: 12px;
        line-height: 1.5;
      }

      .section-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
      }

      .section-head h2 {
        margin: 0;
        font-size: 28px;
        line-height: 1.1;
        letter-spacing: -0.03em;
      }

      .section-eyebrow {
        display: inline-block;
        margin-bottom: 8px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--blue);
        font-weight: 800;
      }

      .section-copy {
        max-width: 720px;
        font-size: 14px;
        line-height: 1.7;
      }

      .diagram-wrap {
        padding: 20px;
        border-radius: 24px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.96));
        border: 1px solid rgba(215, 224, 236, 0.95);
        overflow: hidden;
      }

      .diagram-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 18px;
      }

      .mermaid {
        margin: 0 auto;
        text-align: center;
      }

      .mermaid svg {
        max-width: 100%;
        height: auto;
      }

      .note-list {
        margin: 16px 0 0;
        padding-left: 18px;
        font-size: 13px;
        line-height: 1.65;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        overflow: hidden;
        border-radius: 22px;
        background: var(--surface-strong);
        border: 1px solid rgba(215, 224, 236, 0.95);
      }

      thead {
        background: rgba(15, 23, 42, 0.03);
      }

      th,
      td {
        padding: 12px 14px;
        text-align: left;
        vertical-align: top;
        border-bottom: 1px solid rgba(215, 224, 236, 0.75);
        font-size: 13px;
      }

      th {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }

      tbody tr:last-child td {
        border-bottom: none;
      }

      code {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 12px;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border-radius: 999px;
        padding: 5px 10px;
        font-size: 11px;
        font-weight: 700;
        border: 1px solid transparent;
        white-space: nowrap;
      }

      .badge-screen {
        background: rgba(37, 99, 235, 0.08);
        color: #1747b8;
        border-color: rgba(37, 99, 235, 0.14);
      }

      .badge-redirect,
      .badge-alias {
        background: rgba(107, 70, 193, 0.08);
        color: #5a2faf;
        border-color: rgba(107, 70, 193, 0.14);
      }

      .badge-callback {
        background: rgba(47, 133, 90, 0.1);
        color: #1e6a45;
        border-color: rgba(47, 133, 90, 0.16);
      }

      .badge-public,
      .badge-global-scope {
        background: rgba(37, 99, 235, 0.08);
        color: #1747b8;
        border-color: rgba(37, 99, 235, 0.14);
      }

      .badge-auth,
      .badge-workspace-scope {
        background: rgba(47, 133, 90, 0.1);
        color: #1e6a45;
        border-color: rgba(47, 133, 90, 0.16);
      }

      .badge-admin {
        background: rgba(197, 107, 24, 0.1);
        color: #8c470c;
        border-color: rgba(197, 107, 24, 0.18);
      }

      .badge-permission {
        background: rgba(197, 107, 24, 0.08);
        color: #8c470c;
        border-color: rgba(197, 107, 24, 0.14);
      }

      .badge-count {
        background: rgba(15, 23, 42, 0.05);
        color: #334155;
        border-color: rgba(15, 23, 42, 0.08);
      }

      .api-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }

      .api-card {
        background: var(--surface-strong);
        border: 1px solid rgba(215, 224, 236, 0.95);
        border-radius: 22px;
        padding: 16px;
        break-inside: avoid;
      }

      .api-card-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: flex-start;
      }

      .api-card-head h3 {
        margin: 0 0 6px;
        font-size: 17px;
        letter-spacing: -0.02em;
      }

      .api-card-head p {
        margin: 0;
        font-size: 12px;
        line-height: 1.55;
      }

      .api-card-badges {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: flex-end;
      }

      .api-card-meta {
        margin-top: 12px;
        font-size: 11px;
      }

      .endpoint-list {
        list-style: none;
        margin: 14px 0 0;
        padding: 0;
        display: grid;
        gap: 8px;
      }

      .endpoint-list li {
        display: grid;
        grid-template-columns: 58px minmax(0, 1fr);
        gap: 10px;
        align-items: start;
        padding: 8px 10px;
        border-radius: 14px;
        background: rgba(15, 23, 42, 0.03);
      }

      .method {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        padding: 3px 8px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }

      .method-get {
        background: rgba(37, 99, 235, 0.12);
        color: #1747b8;
      }

      .method-post {
        background: rgba(47, 133, 90, 0.14);
        color: #1e6a45;
      }

      .method-put,
      .method-patch {
        background: rgba(197, 107, 24, 0.14);
        color: #8c470c;
      }

      .method-delete {
        background: rgba(197, 48, 48, 0.12);
        color: #9b2226;
      }

      footer {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 11px;
        margin-top: 10px;
      }

      .page-break {
        break-before: page;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="sheet hero">
        <div>
          <span class="hero-tag">Processo • Fluxograma • Rotas reais do código</span>
          <h1>Guia de Rotas do Sistema</h1>
          <p>
            Documento gerado a partir do roteamento do frontend e dos mounts do Express no backend.
            O objetivo é mostrar o fluxo de navegação do usuário, os guards que mudam o caminho
            dentro do workspace e o mapa completo dos endpoints disponíveis na API.
          </p>
          <p style="margin-top: 12px;">
            Fontes principais: frontend/src/App.tsx, frontend/src/components/layout/AppSidebar.tsx,
            frontend/src/components/auth/AuthGuard.tsx, frontend/src/components/auth/ProtectedRoute.tsx,
            backend/src/index.ts e backend/src/routes/*.ts.
          </p>
        </div>
        <div class="summary-grid">
          ${renderSummaryCard('Telas frontend', String(frontendScreenCount), 'Rotas de tela, callback e entrada contextual.')}
          ${renderSummaryCard('Redirecionamentos', String(frontendRedirectCount), 'Aliases, fallbacks e atalhos administrativos.')}
          ${renderSummaryCard('Módulos da API', String(backendModules.length), `${globalApiCount} globais e ${workspaceScopedCount} com escopo de workspace.`)}
          ${renderSummaryCard('Endpoints mapeados', String(backendEndpointCount), 'Contagem total extraída das rotas Express atuais.')}
        </div>
      </section>

      <section class="sheet">
        <div class="section-head">
          <div>
            <span class="section-eyebrow">Frontend</span>
            <h2>Fluxo principal de navegação</h2>
          </div>
          <div class="section-copy">
            O fluxo parte do catálogo público de workspaces, decide entre entrada direta ou autenticação
            contextual e, só então, libera o conjunto de rotas internas do workspace.
          </div>
        </div>
        <div class="diagram-wrap">
          <div class="diagram-grid">
            <pre class="mermaid">${escapeHtml(buildUserFlowMermaid())}</pre>
          </div>
        </div>
        <ul class="note-list">
          ${FRONTEND_NOTES.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}
        </ul>
      </section>

      <section class="sheet">
        <div class="section-head">
          <div>
            <span class="section-eyebrow">Backend</span>
            <h2>Pipeline das rotas de API</h2>
          </div>
          <div class="section-copy">
            O backend deixa o health check fora da autenticação, hidrata contexto por token no authMiddleware
            e só exige vínculo com workspace nos módulos montados com requireWorkspaceAccess.
          </div>
        </div>
        <div class="diagram-wrap">
          <pre class="mermaid">${escapeHtml(buildApiFlowMermaid())}</pre>
        </div>
        <ul class="note-list">
          ${API_NOTES.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}
        </ul>
      </section>

      <section class="sheet page-break">
        <div class="section-head">
          <div>
            <span class="section-eyebrow">Inventário</span>
            <h2>Mapa completo das rotas do frontend</h2>
          </div>
          <div class="section-copy">
            Lista consolidada com caminho final, natureza da rota e observação operacional.
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Escopo</th>
              <th>Rota</th>
              <th>Tipo</th>
              <th>Acesso</th>
              <th>Uso</th>
            </tr>
          </thead>
          <tbody>
            ${renderFrontendTable()}
          </tbody>
        </table>
      </section>

      <section class="sheet page-break">
        <div class="section-head">
          <div>
            <span class="section-eyebrow">Inventário</span>
            <h2>Mapa de endpoints da API</h2>
          </div>
          <div class="section-copy">
            Cards organizados por mount do Express, já com caminho final completo e método HTTP.
          </div>
        </div>
        <div class="api-grid">
          ${renderApiCards(backendModules)}
        </div>
      </section>

      <footer>
        <span>Central de Tarefas • guia gerado automaticamente em ${escapeHtml(generatedAt)}</span>
        <span>Arquivo destino: output/guia-rotas-sistema.pdf</span>
      </footer>
    </main>

    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'

      window.__diagramReady = false

      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'loose',
        flowchart: {
          htmlLabels: true,
          curve: 'basis',
          nodeSpacing: 34,
          rankSpacing: 48,
        },
        themeVariables: {
          fontFamily: 'Manrope, Segoe UI, sans-serif',
          fontSize: '15px',
          primaryColor: '#e8f1ff',
          primaryTextColor: '#122033',
          primaryBorderColor: '#2d6cdf',
          lineColor: '#5a6980',
          tertiaryColor: '#ffffff',
          background: '#ffffff',
        },
      })

      try {
        await mermaid.run({ querySelector: '.mermaid' })
        window.__diagramReady = true
        document.body.dataset.diagrams = 'ready'
      } catch (error) {
        console.error(error)
        document.body.dataset.diagrams = 'failed'
      }
    </script>
  </body>
</html>
  `.trim()
}

async function generate() {
  const backendModules = await parseBackendModules()
  const backendEndpointCount = backendModules.reduce((sum, module) => sum + module.entries.length, 0)
  const frontendScreenCount = FRONTEND_ROUTES.filter((route) => route.type === 'Tela' || route.type === 'Callback').length
  const frontendRedirectCount = FRONTEND_ROUTES.filter((route) => route.type === 'Redirect' || route.type === 'Alias').length

  const html = buildHtml({
    backendModules,
    backendEndpointCount,
    frontendScreenCount,
    frontendRedirectCount,
  })

  await fs.mkdir(outputDir, { recursive: true })

  const htmlPath = path.join(outputDir, 'guia-rotas-sistema.html')
  const pdfPath = path.join(outputDir, 'guia-rotas-sistema.pdf')
  const previewPath = path.join(outputDir, 'guia-rotas-sistema.png')

  await fs.writeFile(htmlPath, html, 'utf8')

  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage({
      viewport: { width: 1680, height: 980 },
      deviceScaleFactor: 2,
    })

    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__diagramReady === true, null, { timeout: 30000 })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: previewPath, fullPage: true })
    await page.pdf({
      path: pdfPath,
      format: 'A3',
      landscape: true,
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    })
  } finally {
    await browser.close()
  }

  console.log(`HTML: ${htmlPath}`)
  console.log(`PDF: ${pdfPath}`)
  console.log(`PNG: ${previewPath}`)
}

generate().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
