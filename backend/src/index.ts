// IMPORTANT: Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env: prioridade para .env.local na raiz do projeto (fonte única)
const backendEnvPath = path.resolve(__dirname, '../.env');
const backendEnvLocalPath = path.resolve(__dirname, '../.env.local');
const rootEnvPath = path.resolve(__dirname, '../../.env');
const rootEnvLocalPath = path.resolve(__dirname, '../../.env.local');

let loadedFile = '';
if (existsSync(rootEnvLocalPath)) {
  dotenv.config({ path: rootEnvLocalPath });
  loadedFile = '.env.local (root)';
} else if (existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
  loadedFile = 'backend/.env';
} else if (existsSync(backendEnvLocalPath)) {
  dotenv.config({ path: backendEnvLocalPath });
  loadedFile = 'backend/.env.local';
} else if (existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
  loadedFile = '.env (root)';
} else {
  dotenv.config();
  loadedFile = 'default location';
}

console.log(`📄 Loaded: ${loadedFile}`);

// Now import other modules (they will have access to process.env)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import projectsRoutes from './routes/projects.js';
import tasksRoutes from './routes/tasks.js';
import activitiesRoutes from './routes/activities.js';
import githubRoutes from './routes/github.js';
import todosRoutes from './routes/todos.js';
import projectCommentsRoutes from './routes/project-comments.js';
import permissionsRoutes from './routes/permissions.js';
import rolesRoutes from './routes/roles.js';
import usersRoutes from './routes/users.js';
import authHintRoutes from './routes/auth-hint.js';
import workspacesRoutes from './routes/workspaces.js';
import ssoRoutes from './routes/sso.js';
import notificationsRoutes from './routes/notifications.js';
import indicatorsRoutes from './routes/indicators.js';
import homeRoutes from './routes/home.js';
import teamCanvasRoutes from './routes/team-canvas.js';
import progressRoutes from './routes/progress.js';
import achievementsRoutes from './routes/achievements.js';
import orgRoutes from './routes/org.js';
import departmentsRoutes from './routes/departments.js';
import costItemsRoutes from './routes/cost-items.js';
import costMapRoutes from './routes/cost-map.js';
import costManagementSummaryRoutes from './routes/cost-management-summary.js';
import { authMiddleware } from './middleware/auth.js';
import { requireWorkspaceAccess } from './middleware/workspace.js';
import { ensureTemporaryNativeAdminBootstrap } from './services/native-admin.js';
import { isSupabaseConnectionRefused, SUPABASE_UNAVAILABLE_MESSAGE } from './utils/supabase-errors.js';

// Função para limpar notificações órfãs na inicialização
async function initializeCleanup() {
  try {
    const { supabase } = await import('./config/supabase.js');
    
    // Buscar todas as notificações relacionadas a TODOs
    const { data: todoNotifications, error: fetchError } = await supabase
      .from('cdt_notifications')
      .select('id, related_id')
      .eq('related_type', 'todo');

    if (fetchError) {
      if (isSupabaseConnectionRefused(fetchError)) {
        console.warn('⚠️', SUPABASE_UNAVAILABLE_MESSAGE);
      } else {
        console.error('Error fetching notifications for cleanup:', fetchError);
      }
      return;
    }

    if (!todoNotifications || todoNotifications.length === 0) {
      return;
    }

    // Buscar todos os IDs de TODOs existentes
    const { data: existingTodos, error: todosError } = await supabase
      .from('cdt_project_todos')
      .select('id');

    if (todosError) {
      if (isSupabaseConnectionRefused(todosError)) {
        console.warn('⚠️', SUPABASE_UNAVAILABLE_MESSAGE);
      } else {
        console.error('Error fetching todos for cleanup:', todosError);
      }
      return;
    }

    const existingTodoIds = new Set(existingTodos?.map((t: { id: string }) => t.id) || []);

    // Encontrar notificações órfãs
    const orphanedNotificationIds = todoNotifications
      .filter((n: { related_id: string | null }) => n.related_id && !existingTodoIds.has(n.related_id))
      .map((n: { id: string }) => n.id);

    if (orphanedNotificationIds.length > 0) {
      // Deletar notificações órfãs
      const { error: deleteError } = await supabase
        .from('cdt_notifications')
        .delete()
        .in('id', orphanedNotificationIds);

      if (deleteError) {
        console.error('Error deleting orphaned notifications:', deleteError);
      } else {
        console.log(`🧹 Limpadas ${orphanedNotificationIds.length} notificações órfãs na inicialização`);
      }
    }
  } catch (error: unknown) {
    if (isSupabaseConnectionRefused(error)) {
      console.warn('⚠️', SUPABASE_UNAVAILABLE_MESSAGE);
    } else {
      console.error('Error in initializeCleanup:', error);
    }
  }
}

const ACTIVITY_COVERS_BUCKET = 'activity-covers';

/** Cria o bucket de capas de atividades no Storage se não existir (requer SERVICE_ROLE). */
async function ensureActivityCoversBucket() {
  try {
    const { supabase } = await import('./config/supabase.js');
    const { error: createError } = await supabase.storage.createBucket(ACTIVITY_COVERS_BUCKET, {
      public: true,
    });
    if (createError) {
      const msg = (createError.message || String(createError)).toLowerCase();
      if (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('bucket already')) {
        return;
      }
      console.warn('⚠️ Storage createBucket activity-covers:', createError.message);
      return;
    }
    console.log(`✅ Bucket "${ACTIVITY_COVERS_BUCKET}" criado no Storage`);
  } catch (error: unknown) {
    if (isSupabaseConnectionRefused(error)) {
      console.warn('⚠️', SUPABASE_UNAVAILABLE_MESSAGE);
    } else {
      console.warn('⚠️ ensureActivityCoversBucket:', error);
    }
  }
}

const app = express();
app.disable('x-powered-by');
// Lê PORT ou BACKEND_PORT (compatível com .env.local que usa BACKEND_PORT).
const PORT = Number(process.env.PORT) || Number(process.env.BACKEND_PORT) || 3002;

const DEV_ORIGINS = [
  'http://localhost:3003',
  'http://127.0.0.1:3003',
  'http://localhost:8088',
  'http://127.0.0.1:8088',
];

function buildCorsAllowlist(): string[] {
  const raw = String(process.env.FRONTEND_URL || process.env.CORS_ORIGINS || '');
  const configured = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowlist = new Set<string>(configured);
  if (process.env.NODE_ENV !== 'production') {
    for (const origin of DEV_ORIGINS) {
      allowlist.add(origin);
    }
  }
  return Array.from(allowlist);
}

const corsAllowlist = buildCorsAllowlist();

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (corsAllowlist.length === 0) {
      callback(null, process.env.NODE_ENV !== 'production');
      return;
    }

    const allowed = corsAllowlist.some((candidate) => {
      try {
        return new URL(candidate).origin === new URL(origin).origin;
      } catch {
        return candidate === origin;
      }
    });

    callback(null, allowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-Id', 'X-Workspace-Slug'],
}));

// Limite 15mb para permitir upload de capa em base64 (imagem até 10MB)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb', parameterLimit: 100 }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Autenticação: extrai usuário do JWT Supabase e define x-user-id
app.use(authMiddleware);

// Routes
app.use('/api/workspaces', workspacesRoutes);
app.use('/api/projects', requireWorkspaceAccess, projectsRoutes);
app.use('/api/tasks', requireWorkspaceAccess, tasksRoutes);
app.use('/api/activities', requireWorkspaceAccess, activitiesRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/todos', requireWorkspaceAccess, todosRoutes);
app.use('/api/project-comments', requireWorkspaceAccess, projectCommentsRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/auth', authHintRoutes);
app.use('/api/sso', ssoRoutes);
app.use('/api/notifications', requireWorkspaceAccess, notificationsRoutes);
app.use('/api/home', requireWorkspaceAccess, homeRoutes);
app.use('/api/indicators', requireWorkspaceAccess, indicatorsRoutes);
app.use('/api/team-canvas', requireWorkspaceAccess, teamCanvasRoutes);
app.use('/api/me/progress', progressRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/org', requireWorkspaceAccess, orgRoutes);
app.use('/api/departments', requireWorkspaceAccess, departmentsRoutes);
app.use('/api/cost-items', requireWorkspaceAccess, costItemsRoutes);
app.use('/api/cost-map', requireWorkspaceAccess, costMapRoutes);
app.use('/api/cost-management', requireWorkspaceAccess, costManagementSummaryRoutes);

// Tratamento de payload too large (413) em JSON para o cliente
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.status === 413 || err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Imagem muito grande. O tamanho máximo é 10MB.' });
  }
  next(err);
});

// Produção: servir SPA (build do frontend) na mesma porta da API
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  next();
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled backend error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : undefined;
if (HOST) {
  app.listen(PORT, HOST, async () => {
    console.log(`🚀 Backend server running on http://${HOST}:${PORT}`);
    await logStartupStatus();
  });
} else {
  app.listen(PORT, async () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    await logStartupStatus();
  });
}

async function logStartupStatus() {
  const hasSupabase = process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
  if (hasSupabase) {
    console.log('✅ Supabase configured - database operations enabled');
    await initializeCleanup();
    await ensureActivityCoversBucket();
    await ensureTemporaryNativeAdminBootstrap();
  } else {
    console.warn('⚠️  Supabase not configured - database operations will fail');
    console.warn('⚠️  Create backend/.env.local with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');
  }
  const hasGitHubToken = process.env.GITHUB_TOKEN;
  if (hasGitHubToken) {
    console.log('✅ GitHub token configured - GitHub API operations enabled');
  } else {
    console.warn('⚠️  GitHub token not configured - GitHub API operations will be limited');
    console.warn('⚠️  Add GITHUB_TOKEN to backend/.env.local to enable full GitHub integration');
  }
}
