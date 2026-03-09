import express from 'express';
import { supabase } from '../config/supabase.js';
import { User, UserWithRole } from '../types/index.js';
import { checkRole } from '../middleware/permissions.js';
import { hasRole } from '../services/permissions.js';
import { isSupabaseConnectionRefused, SUPABASE_UNAVAILABLE_MESSAGE } from '../utils/supabase-errors.js';

const router = express.Router();

// Função auxiliar para verificar se é requisição de login (temporária)
const isLoginRequest = (req: express.Request): boolean => {
  return req.headers['x-user-id'] === 'temp' || !req.headers['x-user-id'];
};

// Listar usuários do Supabase Auth (apenas admin) — para dar acesso ao sistema
router.get('/auth-list', checkRole('admin'), async (req, res) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    if (authError) {
      console.error('Error listing auth users:', authError);
      return res.status(500).json({ error: authError.message || 'Failed to list auth users' });
    }

    const authUsers = authData?.users || [];
    const cdtIds = new Set<string>();

    if (authUsers.length > 0) {
      const { data: cdtRows } = await supabase
        .from('cdt_users')
        .select('id')
        .in('id', authUsers.map((u) => u.id));
      (cdtRows || []).forEach((r: { id: string }) => cdtIds.add(r.id));
    }

    const list = authUsers.map((u) => ({
      id: u.id,
      email: u.email ?? '',
      name: (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email?.split('@')[0] || '—',
      created_at: u.created_at,
      in_cdt: cdtIds.has(u.id),
    }));

    res.json(list);
  } catch (error: any) {
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error fetching auth users:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch auth users' });
  }
});

// Criar usuário no CDT a partir de um usuário Supabase Auth (dar acesso)
router.post('/from-auth', checkRole('admin'), async (req, res) => {
  try {
    const { id, email, name } = req.body;
    if (!id || !email) {
      return res.status(400).json({ error: 'id and email are required' });
    }

    const { data, error } = await supabase
      .from('cdt_users')
      .insert([{
        id,
        email: String(email).trim(),
        name: (name && String(name).trim()) || email.split('@')[0] || 'Usuário',
        avatar_url: null,
        is_active: true,
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Este usuário já possui acesso no sistema.' });
      }
      throw error;
    }
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Error creating user from auth:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

// Get all users with their roles
// Temporariamente permitir acesso sem autenticação para login inicial
// Para atribuição de responsáveis, qualquer usuário autenticado pode ver a lista
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const isForAssignment = req.query.for_assignment === 'true';
    // Se for para atribuição, qualquer usuário autenticado pode ver a lista
    if (isForAssignment) {
      // Verificar se está autenticado (não pode ser requisição de login)
      if (isLoginRequest(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { data: users, error: usersError } = await supabase
        .from('cdt_users')
        .select('id, name, email, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (usersError) throw usersError;
      return res.json(users || []);
    }
    
    // Se não for requisição de login, verificar permissão admin
    if (!isLoginRequest(req)) {
      // Verificar se tem permissão admin (middleware temporário)
      if (userId) {
        const isAdmin = await hasRole(userId, 'admin');
        if (!isAdmin) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
    }

    const { data: users, error: usersError } = await supabase
      .from('cdt_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    // Para cada usuário, buscar seu cargo
    const usersWithRoles = await Promise.all(
      (users || []).map(async (user: User) => {
        const { data: userRole } = await supabase
          .from('cdt_user_roles')
          .select(`
            role_id,
            cdt_roles (
              id,
              name,
              display_name,
              description
            )
          `)
          .eq('user_id', user.id)
          .single();

        return {
          ...user,
          role: userRole?.cdt_roles || null,
        };
      })
    );

    res.json(usersWithRoles);
  } catch (error: any) {
    if (isSupabaseConnectionRefused(error)) {
      console.warn('⚠️', SUPABASE_UNAVAILABLE_MESSAGE);
      return res.status(503).json({
        error: 'Serviço de banco de dados indisponível. Inicie o Supabase local com "supabase start" ou use a URL do projeto em nuvem no .env.local.',
      });
    }
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

// Perfil do usuário autenticado (não exige admin)
router.get('/me', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId || isLoginRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { data: user, error: userError } = await supabase
      .from('cdt_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: userRole } = await supabase
      .from('cdt_user_roles')
      .select(`
        role_id,
        cdt_roles (
          id,
          name,
          display_name,
          description
        )
      `)
      .eq('user_id', userId)
      .single();

    res.json({
      ...user,
      role: userRole?.cdt_roles || null,
    });
  } catch (error: any) {
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch user' });
  }
});

// Get user by ID
router.get('/:id', checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { data: user, error: userError } = await supabase
      .from('cdt_users')
      .select('*')
      .eq('id', id)
      .single();

    if (userError) throw userError;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Buscar cargo do usuário
    const { data: userRole } = await supabase
      .from('cdt_user_roles')
      .select(`
        role_id,
        cdt_roles (
          id,
          name,
          display_name,
          description
        )
      `)
      .eq('user_id', id)
      .single();

    res.json({
      ...user,
      role: userRole?.cdt_roles || null,
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch user' });
  }
});

// Create new user
router.post('/', checkRole('admin'), async (req, res) => {
  try {
    const { email, name, avatar_url } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'email and name are required' });
    }

    const { data, error } = await supabase
      .from('cdt_users')
      .insert([{
        email,
        name,
        avatar_url: avatar_url || null,
        is_active: true,
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

// Update user
router.put('/:id', checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, avatar_url, is_active } = req.body;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('cdt_users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(data);
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message || 'Failed to update user' });
  }
});

// Delete user (soft delete - desativar)
router.delete('/:id', checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('cdt_users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(data);
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

// Assign role to user
router.post('/:id/role', checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role_id, assigned_by } = req.body;

    if (!role_id) {
      return res.status(400).json({ error: 'role_id is required' });
    }

    // Remover cargo anterior do usuário (se houver)
    await supabase
      .from('cdt_user_roles')
      .delete()
      .eq('user_id', id);

    // Atribuir novo cargo
    const { data, error } = await supabase
      .from('cdt_user_roles')
      .insert([{
        user_id: id,
        role_id,
        assigned_by: assigned_by || null,
      }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error assigning role to user:', error);
    res.status(500).json({ error: error.message || 'Failed to assign role' });
  }
});

// Remove role from user
router.delete('/:id/role', checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('cdt_user_roles')
      .delete()
      .eq('user_id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error: any) {
    console.error('Error removing role from user:', error);
    res.status(500).json({ error: error.message || 'Failed to remove role' });
  }
});

export default router;
