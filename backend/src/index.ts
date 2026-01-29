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
import projectsRoutes from './routes/projects.js';
import tasksRoutes from './routes/tasks.js';
import activitiesRoutes from './routes/activities.js';
import githubRoutes from './routes/github.js';
import todosRoutes from './routes/todos.js';
import projectCommentsRoutes from './routes/project-comments.js';
import permissionsRoutes from './routes/permissions.js';
import rolesRoutes from './routes/roles.js';
import usersRoutes from './routes/users.js';
import notificationsRoutes from './routes/notifications.js';
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

    const existingTodoIds = new Set(existingTodos?.map(t => t.id) || []);

    // Encontrar notificações órfãs
    const orphanedNotificationIds = todoNotifications
      .filter(n => n.related_id && !existingTodoIds.has(n.related_id))
      .map(n => n.id);

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

const app = express();
const PORT = Number(process.env.PORT) || 3002;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3003',
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/projects', projectsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/todos', todosRoutes);
app.use('/api/project-comments', projectCommentsRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);

// Produção: servir SPA (build do frontend) na mesma porta da API
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

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
    console.log(`   URL: ${process.env.SUPABASE_URL?.substring(0, 30)}...`);
    console.log(`   Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON'} key set`);
    await initializeCleanup();
  } else {
    console.warn('⚠️  Supabase not configured - database operations will fail');
    console.warn('⚠️  Create backend/.env.local with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');
    console.log('   Current env vars:');
    console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
  }
  const hasGitHubToken = process.env.GITHUB_TOKEN;
  if (hasGitHubToken) {
    console.log('✅ GitHub token configured - GitHub API operations enabled');
    console.log(`   Token: ${process.env.GITHUB_TOKEN.substring(0, 7)}...${process.env.GITHUB_TOKEN.substring(process.env.GITHUB_TOKEN.length - 4)}`);
  } else {
    console.warn('⚠️  GitHub token not configured - GitHub API operations will be limited');
    console.warn('⚠️  Add GITHUB_TOKEN to backend/.env.local to enable full GitHub integration');
  }
}
