import express from 'express';
import { supabase } from '../config/supabase.js';
import { getAuthUserEmail, getAuthUserId, getRequesterId } from '../middleware/auth.js';
import { getCurrentWorkspaceContextFromRequest } from '../services/workspace-access.js';
import { listCdtUsersByIds } from '../services/cdt-users.js';
import {
  getWorkspaceRankingSnapshot,
  getWorkspaceTeamGamificationSummary,
} from '../services/workspace-gamification.js';
import {
  insertWorkspaceMembershipCompat,
  loadWorkspaceMembershipByWorkspaceAndUser,
  loadWorkspaceMembershipRows,
  sortWorkspaceMembershipRows,
  updateWorkspaceMembershipCompat,
} from '../services/workspace-memberships.js';
import { listWorkspaceModuleStates } from '../services/workspace-modules.js';
import {
  formatWorkspaceRoleDisplayName,
  isManagerialWorkspaceRole,
} from '../services/workspace-roles.js';
import {
  getWorkspaceResolvedUserProfile,
  listWorkspaceResolvedUserProfiles,
  upsertWorkspaceUserProfile,
} from '../services/workspace-user-profiles.js';
import { resolveWorkspaceCapabilitySet } from '../services/workspace-capabilities.js';
import { isSupabaseConnectionRefused, SUPABASE_UNAVAILABLE_MESSAGE } from '../utils/supabase-errors.js';
import {
  isValidationError,
  optionalBoolean,
  optionalString,
  requireString,
} from '../utils/validation.js';
import {
  loadCurrentWorkspaceMembers,
  loadWorkspaceCatalog,
  loadWorkspaceMembersForSlug,
  normalizeWorkspaceSlug,
  resolveWorkspaceUser,
} from '../services/workspaces.js';

const router = express.Router();

function buildProfilePayload(
  profile:
    | {
        effective_name: string;
        effective_avatar_url: string | null;
        fallback_name: string;
        fallback_avatar_url: string | null;
        is_overridden: boolean;
      }
    | null
    | undefined,
) {
  if (!profile) return null;
  return {
    display_name: profile.effective_name,
    avatar_url: profile.effective_avatar_url,
    fallback_name: profile.fallback_name,
    fallback_avatar_url: profile.fallback_avatar_url,
    is_overridden: profile.is_overridden,
  };
}

async function withWorkspaceMemberPresentations(
  workspaceId: string | null | undefined,
  members: Array<{
    id: string;
    name: string;
    email?: string | null;
    avatar_url?: string | null;
  }>,
) {
  if (!workspaceId || members.length === 0) return members;

  const presentations = await listWorkspaceResolvedUserProfiles(
    workspaceId,
    members.map((member) => member.id),
  );

  return members.map((member) => {
    const presentation = presentations.get(member.id) ?? null;
    return {
      ...member,
      name: presentation?.effective_name ?? member.name,
      avatar_url: presentation?.effective_avatar_url ?? member.avatar_url ?? null,
    };
  });
}

function buildMembershipPayload(
  membership:
    | {
        id: string;
        workspace_id: string;
        user_id: string;
        role_id?: string | null;
        role_key?: string | null;
        role_name?: string | null;
        role_display_name?: string | null;
        status?: string | null;
        source?: string | null;
      }
    | null
    | undefined,
) {
  if (!membership) return null;
  const roleKey = membership.role_key ?? membership.role_name ?? null;
  return {
    id: membership.id,
    workspace_id: membership.workspace_id,
    user_id: membership.user_id,
    role_id: membership.role_id ?? null,
    role_key: roleKey,
    role_display_name: membership.role_display_name ?? roleKey,
    is_managerial: isManagerialWorkspaceRole(roleKey),
    membership_status: membership.status ?? null,
    status: membership.status ?? null,
    source: membership.source ?? null,
  };
}

type WorkspaceRoleOption = {
  id: string;
  name: string;
  display_name: string;
};

type WorkspaceManagedMember = {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  central_user_id: string | null;
  role: WorkspaceRoleOption | null;
  role_key: string | null;
  role_display_name: string | null;
  membership_status: string;
  is_active: boolean;
  is_default: boolean;
  joined_at: string;
};

async function loadWorkspaceRoleById(roleId: string): Promise<WorkspaceRoleOption | null> {
  const { data, error } = await supabase
    .from('cdt_roles')
    .select('id, name, display_name')
    .eq('id', roleId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id || typeof data.name !== 'string' || typeof data.display_name !== 'string') {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    display_name: data.display_name,
  };
}

async function loadDefaultWorkspaceRole(): Promise<WorkspaceRoleOption | null> {
  const { data, error } = await supabase
    .from('cdt_roles')
    .select('id, name, display_name')
    .order('display_name', { ascending: true });

  if (error) throw error;

  const roles = ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => {
      if (
        typeof row.id !== 'string' ||
        typeof row.name !== 'string' ||
        typeof row.display_name !== 'string'
      ) {
        return null;
      }
      return {
        id: row.id,
        name: row.name,
        display_name: row.display_name,
      } satisfies WorkspaceRoleOption;
    })
    .filter((role): role is WorkspaceRoleOption => Boolean(role));

  if (roles.length === 0) return null;

  const memberLike = roles.find((role) =>
    ['member', 'usuario', 'user', 'developer', 'colaborador', 'employee'].includes(
      role.name.toLowerCase(),
    ),
  );
  if (memberLike) return memberLike;

  const firstNonAdmin = roles.find((role) => role.name.toLowerCase() !== 'admin');
  return firstNonAdmin ?? roles[0] ?? null;
}

async function resolveWorkspaceRole(roleId?: string | null): Promise<WorkspaceRoleOption | null> {
  if (roleId) {
    return loadWorkspaceRoleById(roleId);
  }
  return loadDefaultWorkspaceRole();
}

async function countActiveWorkspaceMembers(workspaceId: string): Promise<number> {
  const rows = await loadWorkspaceMembershipRows({ workspaceId, status: 'active' });
  return rows.length;
}

async function listWorkspaceMembersDetailed(params: {
  workspaceId: string;
  includeInactive?: boolean;
}): Promise<WorkspaceManagedMember[]> {
  const memberships = sortWorkspaceMembershipRows(
    await loadWorkspaceMembershipRows({
      workspaceId: params.workspaceId,
      status: params.includeInactive ? ['active', 'pending', 'revoked', 'blocked'] : 'active',
    }),
  );

  if (memberships.length === 0) {
    return [];
  }

  const userIds = Array.from(new Set(memberships.map((membership) => membership.user_id)));
  const [users, presentations] = await Promise.all([
    listCdtUsersByIds(userIds, ['central_user_id']),
    listWorkspaceResolvedUserProfiles(params.workspaceId, userIds),
  ]);

  const userById = new Map(users.map((user) => [user.id, user] as const));

  return memberships
    .flatMap((membership) => {
      const user = userById.get(membership.user_id) ?? null;
      if (!user) return [];

      const presentation = presentations.get(membership.user_id) ?? null;
      const roleKey = membership.role_name ?? membership.role_key ?? null;

      return [
        {
          id: user.id,
          name:
            presentation?.effective_name ??
            user.name ??
            user.email ??
            'Usuario',
          email: user.email,
          avatar_url: presentation?.effective_avatar_url ?? user.avatar_url ?? null,
          central_user_id: user.central_user_id ?? null,
          role: roleKey
            ? {
                id: membership.role_id ?? '',
                name: roleKey,
                display_name: formatWorkspaceRoleDisplayName(
                  roleKey,
                ) ?? membership.role_display_name ?? roleKey,
              }
            : null,
          role_key: roleKey,
          role_display_name:
            membership.role_display_name ?? formatWorkspaceRoleDisplayName(roleKey),
          membership_status: membership.membership_status,
          is_active: membership.membership_status === 'active',
          is_default: membership.is_default,
          joined_at: membership.joined_at,
        } satisfies WorkspaceManagedMember,
      ];
    })
    .sort((left, right) => {
      if (left.is_active !== right.is_active) {
        return left.is_active ? -1 : 1;
      }
      if (left.is_default !== right.is_default) {
        return left.is_default ? -1 : 1;
      }
      return left.name.localeCompare(right.name, 'pt-BR');
    });
}

async function requireWorkspaceManagerContext(
  req: express.Request,
  res: express.Response,
) {
  const workspaceContext = await requireWorkspaceContext(req, res);
  if (!workspaceContext) return null;

  const roleKey =
    workspaceContext.membership.role_key ??
    workspaceContext.membership.role_name ??
    null;

  if (!isManagerialWorkspaceRole(roleKey)) {
    res.status(403).json({
      error: 'Apenas administradores ou gerentes deste workspace podem gerenciar membros.',
    });
    return null;
  }

  return workspaceContext;
}

async function requireWorkspaceContext(
  req: express.Request,
  res: express.Response,
) {
  const resolved = await getCurrentWorkspaceContextFromRequest(req);

  if (resolved.status === 'unauthorized') {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  if (resolved.status === 'missing_workspace') {
    res.status(400).json({
      error: 'Workspace slug is required.',
      code: 'WORKSPACE_REQUIRED',
    });
    return null;
  }

  if (resolved.status === 'not_found') {
    res.status(404).json({
      status: 'not_found',
      error: 'Workspace nao encontrado.',
    });
    return null;
  }

  if (resolved.status === 'pending') {
    res.status(403).json({
      status: 'pending',
      error: 'Acesso pendente de aprovacao.',
      workspace: resolved.workspace,
    });
    return null;
  }

  if (resolved.status === 'revoked') {
    res.status(403).json({
      status: 'blocked',
      error: 'Acesso revogado para este workspace.',
      workspace: resolved.workspace,
    });
    return null;
  }

  if (resolved.status === 'forbidden') {
    res.status(403).json({
      status: 'blocked',
      error: 'Voce nao possui membership ativa neste workspace.',
      workspace: resolved.workspace,
    });
    return null;
  }

  if (resolved.status === 'blocked') {
    res.status(403).json({
      status: 'blocked',
      error: 'Acesso bloqueado para este workspace.',
      workspace: resolved.workspace,
    });
    return null;
  }

  return resolved.payload;
}

function buildWorkspaceStatusPayload(
  result:
    | Awaited<ReturnType<typeof loadWorkspaceMembersForSlug>>
    | Awaited<ReturnType<typeof loadCurrentWorkspaceMembers>>,
) {
  return {
    status: result.status,
    workspace: result.workspace,
    members: result.members,
  };
}

router.get('/mine', async (req, res) => {
  try {
    const authUserId = getAuthUserId(req);
    const requesterUserId = getRequesterId(req);
    const authUserEmail = getAuthUserEmail(req);

    if (!authUserId && !requesterUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subjectUser = await resolveWorkspaceUser({
      requesterUserId,
      authUserId,
      authUserEmail,
      includeInactive: true,
    });

    if (!subjectUser.user) {
      return res.status(403).json({
        status: 'pending',
        code: 'ACCESS_PENDING',
        error: 'Acesso pendente de liberacao pelo administrador.',
        workspaces: [],
        pending_workspaces: [],
        blocked_workspaces: [],
        current_workspace: null,
      });
    }

    const catalog = await loadWorkspaceCatalog(subjectUser.user.id);
    const active = catalog.workspaces.filter((workspace) => workspace.access_state === 'active');
    const pending = catalog.workspaces.filter((workspace) => workspace.access_state === 'pending');
    const blocked = catalog.workspaces.filter((workspace) => workspace.access_state === 'blocked');
    const currentWorkspace =
      active.find((workspace) => workspace.is_default_membership) ?? active[0] ?? null;

    const status =
      subjectUser.user.is_active === false
        ? subjectUser.user.identity_status === 'disabled' || subjectUser.user.identity_status === 'conflict'
          ? 'blocked'
          : 'pending'
        : 'success';

    if (status !== 'success') {
      return res.status(403).json({
        status,
        error:
          status === 'blocked'
            ? 'Acesso bloqueado para este usuario.'
            : 'Acesso pendente de liberacao pelo administrador.',
        workspaces: active,
        pending_workspaces: pending,
        blocked_workspaces: blocked,
        current_workspace: currentWorkspace,
        subject_user: subjectUser.user,
      });
    }

    return res.json({
      status: 'success',
      workspaces: active,
      pending_workspaces: pending,
      blocked_workspaces: blocked,
      current_workspace: currentWorkspace,
      subject_user: subjectUser.user,
    });
  } catch (error: unknown) {
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('workspaces.mine:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao carregar workspaces do usuario',
    });
  }
});

router.get('/current/members', async (req, res) => {
  try {
    const authUserId = getAuthUserId(req);
    const result = await loadCurrentWorkspaceMembers({
      requesterUserId: getRequesterId(req),
      authUserId,
      authUserEmail: getAuthUserEmail(req),
    });

    if (result.status === 'success') {
      return res.json(await withWorkspaceMemberPresentations(result.workspace?.id, result.members));
    }

    if (result.status === 'not_found' && authUserId) {
      return res.status(403).json({
        status: 'pending',
        code: 'ACCESS_PENDING',
        error: 'Acesso pendente de liberacao pelo administrador.',
        workspace: null,
        members: [],
      });
    }

    return res.status(result.status === 'not_found' ? 404 : 403).json(buildWorkspaceStatusPayload(result));
  } catch (error: unknown) {
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('workspaces.current.members:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao carregar membros do workspace atual',
    });
  }
});

router.get('/:workspaceSlug/context', async (req, res) => {
  try {
    const workspaceSlug = normalizeWorkspaceSlug(req.params.workspaceSlug);
    const workspaceContext = await requireWorkspaceContext(req, res);
    if (!workspaceContext) return;
    const subjectUser = await resolveWorkspaceUser({
      requesterUserId: getRequesterId(req),
      authUserId: getAuthUserId(req),
      authUserEmail: getAuthUserEmail(req),
      includeInactive: true,
    });

    const context = await loadWorkspaceMembersForSlug({
      slug: workspaceSlug,
      requesterUserId: getRequesterId(req),
      authUserId: getAuthUserId(req),
      authUserEmail: getAuthUserEmail(req),
    });
    const modules = await listWorkspaceModuleStates(workspaceContext.workspace.id);
    const membershipPayload = buildMembershipPayload(workspaceContext.membership);
    const roleKey = membershipPayload?.role_key ?? null;
    const capabilities = await resolveWorkspaceCapabilitySet({
      requesterUserId: getRequesterId(req) ?? workspaceContext.membership.user_id,
      membershipRoleKey: roleKey,
      modules,
    });

    return res.json({
      status: 'success',
      workspace: workspaceContext.workspace,
      access_state: context.access_state,
      membership: membershipPayload,
      workspace_role_flags: {
        is_managerial: capabilities.is_workspace_manager,
        is_global_admin: capabilities.is_global_admin,
        can_manage_workspace: capabilities.can_manage_workspace,
      },
      modules,
      capabilities,
      request: context.request,
      subject_user: subjectUser.user,
      members: await withWorkspaceMemberPresentations(workspaceContext.workspace.id, context.members),
    });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('workspaces.context:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao carregar o contexto do workspace',
    });
  }
});

router.get('/:workspaceSlug/my-profile', async (req, res) => {
  try {
    const workspaceContext = await requireWorkspaceContext(req, res);
    if (!workspaceContext) return;

    const membershipPayload = buildMembershipPayload(workspaceContext.membership);
    const roleKey = membershipPayload?.role_key ?? null;
    const modules = await listWorkspaceModuleStates(workspaceContext.workspace.id);
    const capabilities = await resolveWorkspaceCapabilitySet({
      requesterUserId: getRequesterId(req) ?? workspaceContext.membership.user_id,
      membershipRoleKey: roleKey,
      modules,
    });
    const gamificationModule = modules.find((module) => module.key === 'gamification') ?? null;
    const gamificationEnabled = Boolean(gamificationModule?.available && gamificationModule.is_enabled);
    const [profile, teamSummary] = await Promise.all([
      getWorkspaceResolvedUserProfile(workspaceContext.workspace.id, workspaceContext.membership.user_id),
      isManagerialWorkspaceRole(roleKey) && gamificationEnabled
        ? getWorkspaceTeamGamificationSummary(workspaceContext.workspace.id)
        : Promise.resolve(null),
    ]);

    return res.json({
      workspace: workspaceContext.workspace,
      membership: membershipPayload,
      workspace_role_flags: {
        is_managerial: capabilities.is_workspace_manager,
        is_global_admin: capabilities.is_global_admin,
        can_manage_workspace: capabilities.can_manage_workspace,
      },
      modules,
      capabilities,
      profile: buildProfilePayload(profile),
      team_gamification_summary: {
        enabled: gamificationEnabled,
        reason: gamificationEnabled ? null : gamificationModule?.reason ?? 'not_configured',
        summary: teamSummary,
      },
    });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('workspaces.my-profile:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao carregar o perfil do workspace',
    });
  }
});

router.get('/:workspaceSlug/ranking', async (req, res) => {
  try {
    const workspaceContext = await requireWorkspaceContext(req, res);
    if (!workspaceContext) return;

    const modules = await listWorkspaceModuleStates(workspaceContext.workspace.id);
    const gamificationModule = modules.find((module) => module.key === 'gamification') ?? null;
    const rankingModule = modules.find((module) => module.key === 'ranking') ?? null;
    const gamificationEnabled = Boolean(gamificationModule?.available && gamificationModule.is_enabled);
    const rankingEnabled = Boolean(rankingModule?.available && rankingModule.is_enabled);
    const available = gamificationEnabled && rankingEnabled;

    if (!available) {
      return res.json({
        workspace: workspaceContext.workspace,
        enabled: false,
        reason:
          !rankingEnabled
            ? rankingModule?.reason ?? 'not_configured'
            : gamificationModule?.reason ?? 'not_configured',
        ranking: null,
      });
    }

    const requesterUserId = getRequesterId(req) ?? workspaceContext.membership.user_id;
    const ranking = await getWorkspaceRankingSnapshot(workspaceContext.workspace.id, requesterUserId);

    return res.json({
      workspace: workspaceContext.workspace,
      enabled: true,
      reason: null,
      ranking,
    });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('workspaces.ranking:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao carregar ranking do workspace',
    });
  }
});

async function updateMyProfileHandler(req: express.Request, res: express.Response) {
  try {
    const workspaceContext = await requireWorkspaceContext(req, res);
    if (!workspaceContext) return;

    const body = (req.body ?? {}) as {
      display_name?: string | null;
      avatar_url?: string | null;
    };
    const actorUserId = getAuthUserId(req) ?? workspaceContext.membership.user_id;
    const profile = await upsertWorkspaceUserProfile({
      workspaceId: workspaceContext.workspace.id,
      userId: workspaceContext.membership.user_id,
      actorUserId,
      displayName: body.display_name ?? null,
      avatarUrl: body.avatar_url ?? null,
    });

    return res.json({
      workspace: workspaceContext.workspace,
      membership: buildMembershipPayload(workspaceContext.membership),
      profile: buildProfilePayload(profile),
    });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('workspaces.update-my-profile:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao atualizar o perfil do workspace',
    });
  }
}

router.put('/:workspaceSlug/my-profile', updateMyProfileHandler);

router.patch('/:workspaceSlug/my-profile', updateMyProfileHandler);

router.get('/:workspaceSlug/members', async (req, res) => {
  try {
    const includeInactiveRaw = String(req.query.include_inactive ?? '').trim().toLowerCase();
    const includeInactive =
      includeInactiveRaw === '1' ||
      includeInactiveRaw === 'true' ||
      includeInactiveRaw === 'yes';

    const workspaceContext = includeInactive
      ? await requireWorkspaceManagerContext(req, res)
      : await requireWorkspaceContext(req, res);
    if (!workspaceContext) return;

    const members = await listWorkspaceMembersDetailed({
      workspaceId: workspaceContext.workspace.id,
      includeInactive,
    });

    return res.json({
      status: 'success',
      workspace: workspaceContext.workspace,
      members,
    });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('workspaces.members:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao carregar membros do workspace',
    });
  }
});

router.post('/:workspaceSlug/members', async (req, res) => {
  try {
    const workspaceContext = await requireWorkspaceManagerContext(req, res);
    if (!workspaceContext) return;

    const body = (req.body ?? {}) as Record<string, unknown>;
    const userId = requireString(body.user_id, 'user_id', { minLength: 1, maxLength: 128 });
    const roleId = optionalString(body.role_id, 'role_id', { maxLength: 128 });

    const [user] = await listCdtUsersByIds([userId], ['central_user_id']);
    if (!user?.id) {
      return res.status(404).json({ error: 'Usuario nao encontrado.' });
    }
    if (user.is_active === false) {
      return res.status(400).json({ error: 'Nao e possivel adicionar um usuario inativo ao workspace.' });
    }

    const resolvedRole = await resolveWorkspaceRole(roleId);
    if (!resolvedRole?.id) {
      return res.status(400).json({ error: 'Cargo invalido para membership do workspace.' });
    }

    const nowIso = new Date().toISOString();
    const existingMembership = await loadWorkspaceMembershipByWorkspaceAndUser(
      workspaceContext.workspace.id,
      userId,
    );

    if (existingMembership?.id) {
      const updateResult = await updateWorkspaceMembershipCompat(existingMembership.id, {
        role_id: resolvedRole.id,
        role_key: resolvedRole.name,
        role_name: resolvedRole.name,
        role_display_name: resolvedRole.display_name,
        membership_status: 'active',
        status: 'active',
        is_active: true,
        left_at: null,
        revoked_at: null,
        approved_at: existingMembership.approved_at ?? nowIso,
        updated_at: nowIso,
      });

      if (updateResult.error) {
        throw updateResult.error;
      }
    } else {
      const insertResult = await insertWorkspaceMembershipCompat({
        workspace_id: workspaceContext.workspace.id,
        user_id: userId,
        role_id: resolvedRole.id,
        role_key: resolvedRole.name,
        role_name: resolvedRole.name,
        role_display_name: resolvedRole.display_name,
        membership_status: 'active',
        status: 'active',
        is_active: true,
        is_default: false,
        source: 'workspace_settings',
        joined_at: nowIso,
        approved_at: nowIso,
        approved_by: workspaceContext.membership.user_id,
      });

      if (insertResult.error) {
        throw insertResult.error;
      }
    }

    const members = await listWorkspaceMembersDetailed({
      workspaceId: workspaceContext.workspace.id,
      includeInactive: true,
    });
    const member = members.find((item) => item.id === userId) ?? null;

    return res.status(existingMembership?.id ? 200 : 201).json({
      status: 'success',
      workspace: workspaceContext.workspace,
      member,
    });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('workspaces.members.create:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao adicionar membro ao workspace',
    });
  }
});

router.patch('/:workspaceSlug/members/:userId', async (req, res) => {
  try {
    const workspaceContext = await requireWorkspaceManagerContext(req, res);
    if (!workspaceContext) return;

    const userId = requireString(req.params.userId, 'userId', { minLength: 1, maxLength: 128 });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const roleId = optionalString(body.role_id, 'role_id', { maxLength: 128 });
    const isActive = optionalBoolean(body.is_active, 'is_active');

    if (roleId === undefined && isActive === undefined) {
      return res.status(400).json({ error: 'Informe ao menos role_id ou is_active.' });
    }

    const membership = await loadWorkspaceMembershipByWorkspaceAndUser(
      workspaceContext.workspace.id,
      userId,
    );
    if (!membership?.id) {
      return res.status(404).json({ error: 'Membership do usuario nao encontrada neste workspace.' });
    }

    if (
      isActive === false &&
      membership.membership_status === 'active' &&
      (await countActiveWorkspaceMembers(workspaceContext.workspace.id)) <= 1
    ) {
      return res.status(400).json({
        error: 'Este workspace precisa manter ao menos um usuario ativo.',
      });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (roleId !== undefined) {
      const resolvedRole = await resolveWorkspaceRole(roleId);
      if (!resolvedRole?.id) {
        return res.status(400).json({ error: 'Cargo invalido para membership do workspace.' });
      }

      updateData.role_id = resolvedRole.id;
      updateData.role_key = resolvedRole.name;
      updateData.role_name = resolvedRole.name;
      updateData.role_display_name = resolvedRole.display_name;
    }

    if (isActive !== undefined) {
      const nowIso = new Date().toISOString();
      updateData.membership_status = isActive ? 'active' : 'revoked';
      updateData.status = isActive ? 'active' : 'revoked';
      updateData.is_active = isActive;
      updateData.left_at = isActive ? null : nowIso;
      updateData.revoked_at = isActive ? null : nowIso;
      if (isActive) {
        updateData.approved_at = membership.approved_at ?? nowIso;
      }
    }

    const result = await updateWorkspaceMembershipCompat(membership.id, updateData);
    if (result.error) {
      throw result.error;
    }

    const members = await listWorkspaceMembersDetailed({
      workspaceId: workspaceContext.workspace.id,
      includeInactive: true,
    });
    const member = members.find((item) => item.id === userId) ?? null;

    return res.json({
      status: 'success',
      workspace: workspaceContext.workspace,
      member,
    });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('workspaces.members.update:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao atualizar membro do workspace',
    });
  }
});

export default router;
