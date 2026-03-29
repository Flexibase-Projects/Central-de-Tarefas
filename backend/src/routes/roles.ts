import express from 'express';
import { supabase } from '../config/supabase.js';
import { Role } from '../types/index.js';
import { checkRole } from '../middleware/permissions.js';
import { getTrimmedString, isValidationError, requireArrayOfStrings, requireString } from '../utils/validation.js';

const router = express.Router();

// Get all roles with their permissions
router.get('/', async (req, res) => {
  try {
    const { data: roles, error: rolesError } = await supabase
      .from('cdt_roles')
      .select('*')
      .order('display_name', { ascending: true });

    if (rolesError) throw rolesError;

    // Para cada role, buscar suas permissões
    const rolesWithPermissions = await Promise.all(
      (roles || []).map(async (role: Role) => {
        const { data: permissions } = await supabase
          .from('cdt_role_permissions')
          .select(`
            permission_id,
            cdt_permissions (
              id,
              name,
              display_name,
              description,
              category
            )
          `)
          .eq('role_id', role.id);

        return {
          ...role,
          permissions: (permissions || []).map((p: any) => p.cdt_permissions).filter(Boolean),
        };
      })
    );

    res.json(rolesWithPermissions);
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch roles' });
  }
});

// Get role by ID with permissions
router.get('/:id', async (req, res) => {
  try {
    const id = requireString(req.params.id, 'id', { minLength: 1, maxLength: 128 });
    const { data: role, error: roleError } = await supabase
      .from('cdt_roles')
      .select('*')
      .eq('id', id)
      .single();

    if (roleError) throw roleError;
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Buscar permissões do cargo
    const { data: permissions } = await supabase
      .from('cdt_role_permissions')
      .select(`
        permission_id,
        cdt_permissions (
          id,
          name,
          display_name,
          description,
          category
        )
      `)
      .eq('role_id', id);

    res.json({
      ...role,
      permissions: (permissions || []).map((p: any) => p.cdt_permissions).filter(Boolean),
    });
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error fetching role:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch role' });
  }
});

// Create new role
router.post('/', checkRole('admin'), async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = requireString(body.name, 'name', { minLength: 2, maxLength: 128 });
    const displayName = requireString(body.display_name, 'display_name', { minLength: 2, maxLength: 200 });
    const description = getTrimmedString(body.description);

    const { data, error } = await supabase
      .from('cdt_roles')
      .insert([{
        name,
        display_name: displayName,
        description,
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating role:', error);
    res.status(500).json({ error: error.message || 'Failed to create role' });
  }
});

// Update role
router.put('/:id', checkRole('admin'), async (req, res) => {
  try {
    const id = requireString(req.params.id, 'id', { minLength: 1, maxLength: 128 });
    const body = req.body as Record<string, unknown>;
    const displayName = body.display_name !== undefined ? requireString(body.display_name, 'display_name', { minLength: 2, maxLength: 200 }) : undefined;
    const description = body.description !== undefined ? getTrimmedString(body.description) : undefined;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (displayName !== undefined) updateData.display_name = displayName;
    if (description !== undefined) updateData.description = description;

    const { data, error } = await supabase
      .from('cdt_roles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json(data);
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error updating role:', error);
    res.status(500).json({ error: error.message || 'Failed to update role' });
  }
});

// Delete role
router.delete('/:id', checkRole('admin'), async (req, res) => {
  try {
    const id = requireString(req.params.id, 'id', { minLength: 1, maxLength: 128 });

    // Verificar se há usuários com este cargo
    const { data: userRoles } = await supabase
      .from('cdt_user_roles')
      .select('id')
      .eq('role_id', id)
      .limit(1);

    if (userRoles && userRoles.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete role',
        message: 'There are users assigned to this role. Please reassign them first.'
      });
    }

    const { error } = await supabase
      .from('cdt_roles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error deleting role:', error);
    res.status(500).json({ error: error.message || 'Failed to delete role' });
  }
});

// Assign permissions to a role
router.post('/:id/permissions', checkRole('admin'), async (req, res) => {
  try {
    const id = requireString(req.params.id, 'id', { minLength: 1, maxLength: 128 });
    const permissionIds = requireArrayOfStrings((req.body as Record<string, unknown>).permission_ids, 'permission_ids', { minLength: 1 });

    // Remover permissões existentes do cargo
    await supabase
      .from('cdt_role_permissions')
      .delete()
      .eq('role_id', id);

    // Adicionar novas permissões
    if (permissionIds.length > 0) {
      const rolePermissions = permissionIds.map((permissionId: string) => ({
        role_id: id,
        permission_id: permissionId,
      }));

      const { error } = await supabase
        .from('cdt_role_permissions')
        .insert(rolePermissions);

      if (error) throw error;
    }

    res.json({ success: true });
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error assigning permissions to role:', error);
    res.status(500).json({ error: error.message || 'Failed to assign permissions' });
  }
});

// Remove permission from role
router.delete('/:id/permissions/:permissionId', checkRole('admin'), async (req, res) => {
  try {
    const id = requireString(req.params.id, 'id', { minLength: 1, maxLength: 128 });
    const permissionId = requireString(req.params.permissionId, 'permissionId', { minLength: 1, maxLength: 128 });

    const { error } = await supabase
      .from('cdt_role_permissions')
      .delete()
      .eq('role_id', id)
      .eq('permission_id', permissionId);

    if (error) throw error;
    res.status(204).send();
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error removing permission from role:', error);
    res.status(500).json({ error: error.message || 'Failed to remove permission' });
  }
});

export default router;
