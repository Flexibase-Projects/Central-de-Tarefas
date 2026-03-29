import express from 'express';
import { supabase } from '../config/supabase.js';
import { User } from '../types/index.js';
import { checkRole } from '../middleware/permissions.js';
import { getAuthUserId, getRequesterId } from '../middleware/auth.js';
import { hasRole } from '../services/permissions.js';
import { isNativeAdminUserId } from '../services/native-admin.js';
import {
  findCdtUserByField,
  insertCdtUserCompat,
  updateCdtUserByIdCompat,
} from '../services/cdt-users.js';
import {
  isSupabaseConnectionRefused,
  SUPABASE_UNAVAILABLE_MESSAGE,
} from '../utils/supabase-errors.js';
import { isValidationError, optionalBoolean, optionalString, requireArrayOfStrings, requireOneOf, requireString } from '../utils/validation.js';

const router = express.Router();

async function ensureAdmin(
  req: express.Request,
  res: express.Response,
): Promise<string | null> {
  const requesterId = getRequesterId(req);
  if (!requesterId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const isAdmin = await hasRole(requesterId, 'admin');
  if (!isAdmin) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  return requesterId;
}

async function getUserRole(userId: string) {
  const { data } = await supabase
    .from('cdt_user_roles')
    .select(
      `
      role_id,
      cdt_roles (
        id,
        name,
        display_name,
        description
      )
    `,
    )
    .eq('user_id', userId)
    .maybeSingle();

  return data?.cdt_roles ?? null;
}

async function assignRoleToUser(params: {
  userId: string;
  roleId: string;
  assignedBy: string | null;
}): Promise<void> {
  const { data: role, error: roleError } = await supabase
    .from('cdt_roles')
    .select('id, name')
    .eq('id', params.roleId)
    .maybeSingle();

  if (roleError || !role?.id) {
    throw new Error('Cargo informado nao existe.');
  }

  const nativeAdmin = await isNativeAdminUserId(params.userId);
  if (nativeAdmin && role.name !== 'admin') {
    throw new Error('Usuario admin nativo deve permanecer com cargo admin.');
  }

  await supabase.from('cdt_user_roles').delete().eq('user_id', params.userId);

  const { error: insertError } = await supabase.from('cdt_user_roles').insert({
    user_id: params.userId,
    role_id: params.roleId,
    assigned_by: params.assignedBy,
  });

  if (insertError) throw insertError;
}

function buildLinkedIdentityFields(authUserId: string) {
  return {
    central_user_id: authUserId,
    identity_status: 'linked' as const,
    last_identity_sync_at: new Date().toISOString(),
  };
}

// List users from Supabase Auth (admin only) to approve access.
router.get('/auth-list', checkRole('admin'), async (_req, res) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

    if (authError) {
      return res.status(500).json({ error: authError.message || 'Failed to list auth users' });
    }

    const authUsers = authData?.users || [];
    const cdtIds = new Set<string>();

    if (authUsers.length > 0) {
      const { data: cdtRows } = await supabase
        .from('cdt_users')
        .select('id')
        .in(
          'id',
          authUsers.map((user) => user.id),
        );
      (cdtRows || []).forEach((row: { id: string }) => cdtIds.add(row.id));
    }

    const list = authUsers.map((user) => ({
      id: user.id,
      email: user.email ?? '',
      name:
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        user.email?.split('@')[0] ||
        '-',
      created_at: user.created_at,
      in_cdt: cdtIds.has(user.id),
    }));

    res.json(list);
  } catch (error: unknown) {
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error fetching auth users:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch auth users',
    });
  }
});

// Grant access from an existing Supabase Auth user, with optional role assignment.
router.post('/from-auth', checkRole('admin'), async (req, res) => {
  try {
    const requesterId = getRequesterId(req);
    const body = req.body as Record<string, unknown>;
    const id = requireString(body.id, 'id', { minLength: 1, maxLength: 128 });
    const email = requireString(body.email, 'email', { minLength: 3, maxLength: 320 }).toLowerCase();
    const role_id = optionalString(body.role_id, 'role_id', { maxLength: 128 });
    const normalizedEmail = email;
    const displayName = optionalString(body.name, 'name', { maxLength: 200 }) || normalizedEmail.split('@')[0] || 'Usuario';
    let targetUserId = id;

    const byCentralId = await findCdtUserByField({
      field: 'central_user_id',
      value: id,
      includeColumns: ['central_user_id'],
    });

    if (byCentralId?.id) {
      targetUserId = byCentralId.id;
      await updateCdtUserByIdCompat(targetUserId, {
        email: normalizedEmail,
        name: displayName,
        is_active: true,
        updated_at: new Date().toISOString(),
        ...buildLinkedIdentityFields(id),
      });
    } else {
      const byId = await findCdtUserByField({
        field: 'id',
        value: id,
        includeColumns: ['central_user_id'],
      });

      if (byId?.id) {
        if (byId.central_user_id && byId.central_user_id !== id) {
          return res.status(409).json({ error: 'Este usuario ja esta vinculado a outra identidade central.' });
        }

        targetUserId = byId.id;
        await updateCdtUserByIdCompat(targetUserId, {
          email: normalizedEmail,
          name: displayName,
          is_active: true,
          updated_at: new Date().toISOString(),
          ...buildLinkedIdentityFields(id),
        });
      } else {
        const byEmail = await findCdtUserByField({
          field: 'email',
          value: normalizedEmail,
          includeColumns: ['central_user_id'],
        });

        if (byEmail?.id) {
          if (byEmail.central_user_id && byEmail.central_user_id !== id) {
            return res.status(409).json({ error: 'Este email ja esta vinculado a outra identidade central.' });
          }

          targetUserId = byEmail.id;
          await updateCdtUserByIdCompat(targetUserId, {
            email: normalizedEmail,
            name: displayName,
            is_active: true,
            updated_at: new Date().toISOString(),
            ...buildLinkedIdentityFields(id),
          });
        } else {
          await insertCdtUserCompat({
            id,
            email: normalizedEmail,
            name: displayName,
            avatar_url: null,
            is_active: true,
            ...buildLinkedIdentityFields(id),
          });
        }
      }
    }

    if (role_id) {
      await assignRoleToUser({
        userId: targetUserId,
        roleId: role_id,
        assignedBy: requesterId,
      });
    }

    const { data: userRow, error: userError } = await supabase
      .from('cdt_users')
      .select('*')
      .eq('id', targetUserId)
      .single();
    if (userError || !userRow) {
      throw userError ?? new Error('Failed to load granted user');
    }

    const role = await getUserRole(targetUserId);
    res.status(201).json({ ...userRow, role });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof Error && /admin nativo/i.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error granting access from auth:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to grant user access',
    });
  }
});

// Criar usuario no Supabase Auth + cdt_users (senha temporaria via env), para primeiro acesso definir senha na tela de login.
router.post('/with-auth', checkRole('admin'), async (req, res) => {
  try {
    const requesterId = getRequesterId(req);
    const tempPassword = String(process.env.MANUAL_INVITE_TEMP_PASSWORD ?? '').trim();
    if (!tempPassword || tempPassword.length < 6) {
      return res.status(503).json({
        error:
          'MANUAL_INVITE_TEMP_PASSWORD nao configurada ou muito curta no servidor (defina no .env.local, min. 6 caracteres).',
      });
    }

    const body = req.body as Record<string, unknown>;
    const normalizedEmail = requireString(body.email, 'email', { minLength: 3, maxLength: 320 }).toLowerCase();
    const displayName = requireString(body.name, 'name', { minLength: 2, maxLength: 200 });
    const avatarUrl = optionalString(body.avatar_url, 'avatar_url', { maxLength: 2048 });
    const roleId = optionalString(body.role_id, 'role_id', { maxLength: 128 });

    const { data: authCreated, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: displayName, name: displayName },
    });

    if (authError || !authCreated?.user?.id) {
      const msg = authError?.message || 'Falha ao criar usuario no Auth';
      if (/already|registered|exists/i.test(msg) || (authError as { status?: number })?.status === 422) {
        return res.status(409).json({ error: 'Este email ja esta cadastrado no Supabase Auth.' });
      }
      throw authError ?? new Error(msg);
    }

    const authUserId = authCreated.user.id;

    try {
      await insertCdtUserCompat({
        id: authUserId,
        ...buildLinkedIdentityFields(authUserId),
        email: normalizedEmail,
        name: displayName,
        avatar_url: avatarUrl,
        is_active: true,
        must_set_password: true,
      });
    } catch (insertError) {
      console.error('[with-auth] cdt_users insert failed after auth create:', insertError);
      return res.status(500).json({
        error:
          (insertError instanceof Error ? insertError.message : String(insertError)) ||
          'Usuario criado no Auth mas falhou ao gravar em cdt_users. Corrija manualmente ou remova o usuario no painel Auth.',
      });
    }

    if (roleId) {
      await assignRoleToUser({
        userId: authUserId,
        roleId,
        assignedBy: requesterId,
      });
    }

    const { data: userRow, error: userError } = await supabase
      .from('cdt_users')
      .select('*')
      .eq('id', authUserId)
      .single();
    if (userError || !userRow) {
      throw userError ?? new Error('Failed to load created user');
    }

    const role = await getUserRole(authUserId);
    res.status(201).json({ ...userRow, role });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof Error && /admin nativo/i.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error creating user with auth:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create user with auth',
    });
  }
});

// Get users.
// - for_assignment=true: any approved/authenticated user can list active users.
// - otherwise: admin only.
router.get('/', async (req, res) => {
  try {
    const requesterId = getRequesterId(req);
    const forAssignmentRaw = String(req.query.for_assignment ?? '').trim().toLowerCase();
    const isForAssignment = forAssignmentRaw === 'true' || forAssignmentRaw === '1' || forAssignmentRaw === 'yes';

    if (!requesterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (isForAssignment) {
      const { data: users, error } = await supabase
        .from('cdt_users')
        .select('id, name, email, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return res.json(users || []);
    }

    const isAdmin = await hasRole(requesterId, 'admin');
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data: users, error: usersError } = await supabase
      .from('cdt_users')
      .select('*')
      .order('created_at', { ascending: false });
    if (usersError) throw usersError;

    const usersWithRoles = await Promise.all(
      (users || []).map(async (user: User) => ({
        ...user,
        role: await getUserRole(user.id),
      })),
    );

    res.json(usersWithRoles);
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch users',
    });
  }
});

// Marca primeiro login concluido (senha ja redefinida no fluxo de login).
router.post('/me/finish-first-login', async (req, res) => {
  try {
    const requesterId = getRequesterId(req);
    if (!requesterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await updateCdtUserByIdCompat(requesterId, {
      must_set_password: false,
      updated_at: new Date().toISOString(),
    });
    res.json({ ok: true });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error finish-first-login:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update user',
    });
  }
});

// Current authenticated user profile.
router.get('/me', async (req, res) => {
  try {
    const requesterId = getRequesterId(req);
    const authUserId = getAuthUserId(req);

    if (!authUserId && !requesterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!requesterId) {
      return res.status(403).json({
        error: 'Acesso pendente de liberacao pelo administrador.',
        code: 'ACCESS_PENDING',
      });
    }

    const { data: user, error: userError } = await supabase
      .from('cdt_users')
      .select('*')
      .eq('id', requesterId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const role = await getUserRole(requesterId);
    res.json({ ...user, role });
  } catch (error: unknown) {
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error fetching current user:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch user',
    });
  }
});

// Get user by id (admin only).
router.get('/:id', checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { data: user, error: userError } = await supabase
      .from('cdt_users')
      .select('*')
      .eq('id', id)
      .single();

    if (userError) throw userError;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const role = await getUserRole(id);
    res.json({ ...user, role });
  } catch (error: unknown) {
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error fetching user:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch user',
    });
  }
});

// Create user manually (admin only).
router.post('/', checkRole('admin'), async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const email = requireString(body.email, 'email', { minLength: 3, maxLength: 320 }).toLowerCase();
    const name = requireString(body.name, 'name', { minLength: 2, maxLength: 200 });
    const avatarUrl = optionalString(body.avatar_url, 'avatar_url', { maxLength: 2048 });

    const { data, error } = await supabase
      .from('cdt_users')
      .insert({
        email,
        name,
        avatar_url: avatarUrl,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: unknown) {
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error creating user:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create user',
    });
  }
});

// Update user (admin only).
router.put('/:id', checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const email = optionalString(body.email, 'email', { maxLength: 320 });
    const name = optionalString(body.name, 'name', { maxLength: 200 });
    const avatarUrl = optionalString(body.avatar_url, 'avatar_url', { maxLength: 2048 });
    const isActive = optionalBoolean(body.is_active, 'is_active');

    const nativeAdmin = await isNativeAdminUserId(id);
    if (nativeAdmin && isActive === false) {
      return res.status(400).json({ error: 'Admin nativo nao pode ser desativado.' });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (email !== undefined && email !== null) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;
    if (isActive !== undefined) updateData.is_active = isActive;

    await updateCdtUserByIdCompat(id, updateData);
    const { data, error } = await supabase.from('cdt_users').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'User not found' });

    res.json(data);
  } catch (error: unknown) {
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error updating user:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update user',
    });
  }
});

// Soft delete user (admin only).
router.delete('/:id', checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const nativeAdmin = await isNativeAdminUserId(id);
    if (nativeAdmin) {
      return res.status(400).json({ error: 'Admin nativo nao pode ser desativado.' });
    }

    await updateCdtUserByIdCompat(id, { is_active: false, updated_at: new Date().toISOString() });
    const { data, error } = await supabase.from('cdt_users').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'User not found' });
    res.json(data);
  } catch (error: unknown) {
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error deleting user:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete user',
    });
  }
});

// Assign role (admin only).
router.post('/:id/role', checkRole('admin'), async (req, res) => {
  try {
    const requesterId = getRequesterId(req);
    const { id } = req.params;
    const role_id = requireString((req.body as Record<string, unknown>).role_id, 'role_id', { minLength: 1, maxLength: 128 });

    await assignRoleToUser({
      userId: id,
      roleId: role_id,
      assignedBy: requesterId,
    });

    res.json({ success: true });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof Error && /admin nativo/i.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error assigning role:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to assign role',
    });
  }
});

// Remove role (admin only).
router.delete('/:id/role', checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const nativeAdmin = await isNativeAdminUserId(id);
    if (nativeAdmin) {
      return res.status(400).json({ error: 'Admin nativo nao pode ficar sem cargo.' });
    }

    const { error } = await supabase.from('cdt_user_roles').delete().eq('user_id', id);
    if (error) throw error;
    res.status(204).send();
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error removing role:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to remove role',
    });
  }
});

export default router;
