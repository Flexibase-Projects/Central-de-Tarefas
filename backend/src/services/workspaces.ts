import { supabase } from '../config/supabase.js';
import {
  type CdtUserCompatRow,
  findCdtUserByField,
  insertCdtUserCompat,
  listCdtUsersByIds,
  updateCdtUserByIdCompat,
} from './cdt-users.js';
import { isGlobalAdminUserId } from './global-admin.js';
import { listWorkspaceResolvedUserProfiles } from './workspace-user-profiles.js';

export type WorkspaceRouteStatus = 'success' | 'pending' | 'blocked' | 'not_found';
export type WorkspaceAccessState = 'active' | 'pending' | 'blocked' | 'none';

export type WorkspaceGroupRow = {
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_public: boolean;
};

export type WorkspaceRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  group_key: string;
  avatar_url: string | null;
  is_public: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type WorkspaceGroupSummary = Pick<WorkspaceGroupRow, 'key' | 'label' | 'description'>;

export type WorkspaceCatalogItem = WorkspaceRow & {
  group: WorkspaceGroupSummary | null;
  has_access: boolean;
  access_state: WorkspaceAccessState;
  membership_id: string | null;
  membership_status: string | null;
  is_default_membership: boolean;
  joined_at: string | null;
};

export type WorkspaceMembershipRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role_key: string;
  membership_status: string;
  is_default: boolean;
  joined_at: string;
  created_at: string;
  updated_at: string;
  role_id?: string | null;
  legacy_is_active?: boolean | null;
  legacy_left_at?: string | null;
};

export type WorkspaceAccessRequestRow = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  requested_email: string;
  requested_name: string;
  message: string | null;
  status: string;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type WorkspaceUserRow = {
  id: string;
  central_user_id: string | null;
  email: string;
  name: string;
  avatar_url: string | null;
  is_active: boolean;
  identity_status: string | null;
};

export type WorkspaceMemberRow = {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  central_user_id: string | null;
  role_key: string;
  role_display_name: string;
  membership_status: string;
  is_default: boolean;
  joined_at: string;
};

export type WorkspaceIdentityResolution = {
  user: WorkspaceUserRow | null;
  source: 'requester' | 'central_user_id' | 'id' | 'email' | 'none';
};

export type WorkspaceAccessSnapshot = {
  status: WorkspaceRouteStatus;
  workspace: (WorkspaceRow & { group: WorkspaceGroupSummary | null }) | null;
  subjectUser: WorkspaceUserRow | null;
  membership: WorkspaceMembershipRow | null;
  request: WorkspaceAccessRequestRow | null;
  access_state: WorkspaceAccessState;
  message: string | null;
};

export type PublicWorkspacePayload = {
  groups: WorkspaceGroupSummary[];
  workspaces: WorkspaceCatalogItem[];
};

function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';

  return code === '42703' || /column .* does not exist|does not exist/i.test(message);
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';

  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    /relation .* does not exist/i.test(message) ||
    /Could not find the table/i.test(message)
  );
}

const MEMBERSHIP_REQUIRED_COLUMNS = ['id', 'workspace_id', 'user_id'] as const;

const MEMBERSHIP_OPTIONAL_COLUMNS = [
  'role_key',
  'membership_status',
  'is_default',
  'joined_at',
  'created_at',
  'updated_at',
  'role_id',
  'is_active',
  'left_at',
  'status',
  'role_name',
] as const;

type OptionalMembershipReadColumn = (typeof MEMBERSHIP_OPTIONAL_COLUMNS)[number];

function getMissingWorkspaceMembershipColumn(error: unknown): OptionalMembershipReadColumn | null {
  const msg = String((error as { message?: string } | null)?.message || '');

  const quoted = msg.match(/'([^']+)' column/i)?.[1];
  if (quoted && MEMBERSHIP_OPTIONAL_COLUMNS.includes(quoted as OptionalMembershipReadColumn)) {
    return quoted as OptionalMembershipReadColumn;
  }

  for (const column of MEMBERSHIP_OPTIONAL_COLUMNS) {
    if (
      msg.includes(column) &&
      (/does not exist/i.test(msg) || /Could not find/i.test(msg) || /schema cache/i.test(msg))
    ) {
      return column;
    }
  }

  return null;
}

function normalizeWorkspaceMembershipRow(row: Record<string, unknown> | null): WorkspaceMembershipRow | null {
  if (!row?.id || typeof row.id !== 'string') return null;
  if (typeof row.workspace_id !== 'string' || typeof row.user_id !== 'string') return null;

  const legacyIsActive = typeof row.is_active === 'boolean' ? row.is_active : null;
  const legacyLeftAt = typeof row.left_at === 'string' ? row.left_at : null;
  const membershipStatusRaw =
    (typeof row.membership_status === 'string' ? row.membership_status : null) ??
    (typeof row.status === 'string' ? row.status : null) ??
    (legacyIsActive === null ? null : legacyIsActive ? 'active' : legacyLeftAt ? 'revoked' : 'blocked') ??
    'active';

  return {
    id: row.id,
    workspace_id: row.workspace_id,
    user_id: row.user_id,
    role_key:
      (typeof row.role_key === 'string' ? row.role_key : null) ??
      (typeof row.role_name === 'string' ? row.role_name : null) ??
      'member',
    membership_status: membershipStatusRaw.toLowerCase(),
    is_default: typeof row.is_default === 'boolean' ? row.is_default : false,
    joined_at:
      (typeof row.joined_at === 'string' ? row.joined_at : null) ??
      (typeof row.created_at === 'string' ? row.created_at : null) ??
      '',
    created_at:
      (typeof row.created_at === 'string' ? row.created_at : null) ??
      (typeof row.joined_at === 'string' ? row.joined_at : null) ??
      '',
    updated_at:
      (typeof row.updated_at === 'string' ? row.updated_at : null) ??
      (typeof row.created_at === 'string' ? row.created_at : null) ??
      '',
    role_id: typeof row.role_id === 'string' ? row.role_id : null,
    legacy_is_active: legacyIsActive,
    legacy_left_at: legacyLeftAt,
  };
}

function sortWorkspaceMembershipRows(rows: WorkspaceMembershipRow[]): WorkspaceMembershipRow[] {
  return [...rows].sort((a, b) => {
    if (a.is_default !== b.is_default) {
      return a.is_default ? -1 : 1;
    }

    return (a.joined_at || '').localeCompare(b.joined_at || '');
  });
}

async function loadWorkspaceMembershipRows(params: {
  workspaceId?: string;
  userId?: string;
}): Promise<WorkspaceMembershipRow[]> {
  let columns = [...MEMBERSHIP_REQUIRED_COLUMNS, ...MEMBERSHIP_OPTIONAL_COLUMNS];
  const removed = new Set<string>();

  while (true) {
    let query = supabase.from('cdt_workspace_memberships').select(columns.join(', '));

    if (params.workspaceId) {
      query = query.eq('workspace_id', params.workspaceId);
    }

    if (params.userId) {
      query = query.eq('user_id', params.userId);
    }

    const result = await query;

    if (!result.error) {
      return ((result.data ?? []) as Record<string, unknown>[])
        .map((row) => normalizeWorkspaceMembershipRow(row))
        .filter((row): row is WorkspaceMembershipRow => Boolean(row));
    }

    const missingColumn = getMissingWorkspaceMembershipColumn(result.error);
    if (!missingColumn || removed.has(missingColumn) || !columns.includes(missingColumn)) {
      throw result.error;
    }

    removed.add(missingColumn);
    columns = columns.filter((column) => column !== missingColumn);
  }
}

async function loadWorkspaceMembershipByWorkspaceAndUser(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceMembershipRow | null> {
  const rows = await loadWorkspaceMembershipRows({ workspaceId, userId });
  return sortWorkspaceMembershipRows(rows)[0] ?? null;
}

async function loadWorkspaceAccessRequestRows(
  workspaceId?: string,
): Promise<WorkspaceAccessRequestRow[]> {
  const selectColumns =
    'id, workspace_id, user_id, requested_email, requested_name, message, status, decision_reason, created_at, updated_at, reviewed_at, reviewed_by';

  for (const table of ['cdt_workspace_access_requests', 'cdt_access_requests'] as const) {
    let query = supabase.from(table).select(selectColumns);
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error) {
      return (data ?? []) as WorkspaceAccessRequestRow[];
    }

    if (isMissingRelationError(error) || isMissingColumnError(error)) {
      continue;
    }

    throw error;
  }

  return [];
}

function withWorkspaceDefaults(
  workspace: Partial<WorkspaceRow> & Pick<WorkspaceRow, 'id' | 'slug' | 'name'>,
): WorkspaceRow {
  return {
    id: workspace.id,
    slug: workspace.slug,
    name: workspace.name,
    description: workspace.description ?? null,
    group_key: workspace.group_key ?? 'core',
    avatar_url: workspace.avatar_url ?? null,
    is_public: workspace.is_public ?? true,
    is_active: workspace.is_active ?? true,
    sort_order: workspace.sort_order ?? 0,
    created_at: workspace.created_at ?? '',
    updated_at: workspace.updated_at ?? '',
  };
}

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase() ?? '';
  return trimmed || null;
}

function toWorkspaceUserRow(user: CdtUserCompatRow | null): WorkspaceUserRow | null {
  if (!user?.id) return null;

  return {
    id: user.id,
    central_user_id: user.central_user_id ?? null,
    email: user.email ?? '',
    name: user.name ?? 'Usuario',
    avatar_url: user.avatar_url ?? null,
    is_active: user.is_active !== false,
    identity_status: user.identity_status ?? null,
  };
}

function titleize(value: string): string {
  return value
    .split(/[_-]+/g)
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : part)
    .join(' ');
}

function buildGlobalWorkspaceMembership(params: {
  workspaceId: string;
  userId: string;
  isDefault?: boolean;
}): WorkspaceMembershipRow {
  const nowIso = new Date().toISOString();

  return {
    id: `global:${params.workspaceId}:${params.userId}`,
    workspace_id: params.workspaceId,
    user_id: params.userId,
    role_key: 'admin',
    membership_status: 'active',
    is_default: params.isDefault ?? false,
    joined_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
    role_id: null,
    legacy_is_active: true,
    legacy_left_at: null,
  };
}

export function normalizeWorkspaceSlug(value: string): string {
  const slug = value.trim().toLowerCase();
  if (!slug) {
    throw new Error('workspace_slug is required');
  }
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    throw new Error('workspace_slug must contain only lowercase letters, numbers and hyphens');
  }
  return slug;
}

async function loadWorkspaceGroupByKey(key: string): Promise<WorkspaceGroupSummary | null> {
  const { data, error } = await supabase
    .from('cdt_workspace_groups')
    .select('key, label, description')
    .eq('key', key)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function loadWorkspaceBySlug(slug: string): Promise<(WorkspaceRow & { group: WorkspaceGroupSummary | null }) | null> {
  const richQuery = await supabase
    .from('cdt_workspaces')
    .select(
      'id, slug, name, description, group_key, avatar_url, is_public, is_active, sort_order, created_at, updated_at',
    )
    .eq('slug', slug)
    .maybeSingle();

  let data = richQuery.data as WorkspaceRow | null;
  if (richQuery.error && !isMissingColumnError(richQuery.error)) throw richQuery.error;

  if (richQuery.error && isMissingColumnError(richQuery.error)) {
    const fallbackQuery = await supabase
      .from('cdt_workspaces')
      .select('id, slug, name, description, group_key, is_active')
      .eq('slug', slug)
      .maybeSingle();

    if (!fallbackQuery.error && fallbackQuery.data) {
      data = withWorkspaceDefaults(fallbackQuery.data as Partial<WorkspaceRow> & Pick<WorkspaceRow, 'id' | 'slug' | 'name'>);
    } else {
      if (fallbackQuery.error && !isMissingColumnError(fallbackQuery.error)) throw fallbackQuery.error;

      const minimalQuery = await supabase
        .from('cdt_workspaces')
        .select('id, slug, name, description')
        .eq('slug', slug)
        .maybeSingle();

      if (minimalQuery.error) throw minimalQuery.error;
      if (!minimalQuery.data) return null;

      data = withWorkspaceDefaults(minimalQuery.data as Partial<WorkspaceRow> & Pick<WorkspaceRow, 'id' | 'slug' | 'name'>);
    }
  }

  if (!data) return null;

  const group = await loadWorkspaceGroupByKey(data.group_key).catch(() => null);
  return {
    ...data,
    group,
  };
}

async function loadWorkspaceById(workspaceId: string): Promise<(WorkspaceRow & { group: WorkspaceGroupSummary | null }) | null> {
  const rows = await loadWorkspaceRows();
  const workspace = rows.find((item) => item.id === workspaceId) ?? null;
  if (!workspace) return null;

  const group = await loadWorkspaceGroupByKey(workspace.group_key).catch(() => null);
  return {
    ...workspace,
    group,
  };
}

export async function resolveWorkspaceUser(params: {
  requesterUserId?: string | null;
  authUserId?: string | null;
  authUserEmail?: string | null;
  email?: string | null;
  includeInactive?: boolean;
}): Promise<WorkspaceIdentityResolution> {
  const includeInactive = params.includeInactive ?? true;
  const normalizedEmail = normalizeEmail(params.email) ?? normalizeEmail(params.authUserEmail);
  const candidates: Array<{ field: 'central_user_id' | 'id' | 'email'; value: string }> = [];

  if (params.requesterUserId) {
    candidates.push({ field: 'id', value: params.requesterUserId });
  }
  if (params.authUserId) {
    candidates.push({ field: 'central_user_id', value: params.authUserId });
    candidates.push({ field: 'id', value: params.authUserId });
  }
  if (normalizedEmail) {
    candidates.push({ field: 'email', value: normalizedEmail });
  }

  for (const candidate of candidates) {
    const data = await findCdtUserByField({
      field: candidate.field,
      value: candidate.value,
      includeColumns: ['central_user_id', 'identity_status'],
    });
    const workspaceUser = toWorkspaceUserRow(data);

    if (!workspaceUser) {
      continue;
    }
    if (!includeInactive && workspaceUser.is_active === false) {
      continue;
    }
    return {
      user: workspaceUser,
      source: candidate.field,
    };
  }

  return {
    user: null,
    source: 'none',
  };
}

function mapAccessState(params: {
  workspace: WorkspaceRow;
  membership: WorkspaceMembershipRow | null;
  request: WorkspaceAccessRequestRow | null;
}): { accessState: WorkspaceAccessState; routeStatus: WorkspaceRouteStatus; message: string | null } {
  if (!params.workspace.is_active) {
    return {
      accessState: 'blocked',
      routeStatus: 'blocked',
      message: 'Workspace bloqueado.',
    };
  }

  const membershipStatus = params.membership?.membership_status?.toLowerCase() ?? '';
  if (membershipStatus === 'active') {
    return {
      accessState: 'active',
      routeStatus: 'success',
      message: null,
    };
  }
  if (membershipStatus === 'pending') {
    return {
      accessState: 'pending',
      routeStatus: 'pending',
      message: 'Acesso pendente de aprovacao.',
    };
  }
  if (membershipStatus === 'blocked' || membershipStatus === 'revoked') {
    return {
      accessState: 'blocked',
      routeStatus: 'blocked',
      message: 'Acesso bloqueado para este workspace.',
    };
  }

  const requestStatus = params.request?.status?.toLowerCase() ?? '';
  if (requestStatus === 'pending') {
    return {
      accessState: 'pending',
      routeStatus: 'pending',
      message: 'Solicitacao de acesso pendente.',
    };
  }
  if (requestStatus === 'blocked' || requestStatus === 'rejected' || requestStatus === 'cancelled') {
    return {
      accessState: 'blocked',
      routeStatus: 'blocked',
      message: 'Acesso bloqueado para este workspace.',
    };
  }

  return {
    accessState: 'none',
    routeStatus: 'success',
    message: null,
  };
}

async function loadWorkspaceAccessSnapshot(params: {
  slug: string;
  subjectUser: WorkspaceUserRow | null;
}): Promise<WorkspaceAccessSnapshot> {
  const workspace = await loadWorkspaceBySlug(params.slug);
  if (!workspace) {
    return {
      status: 'not_found',
      workspace: null,
      subjectUser: params.subjectUser,
      membership: null,
      request: null,
      access_state: 'none',
      message: 'Workspace nao encontrado.',
    };
  }

  const hasGlobalAccess = params.subjectUser
    ? await isGlobalAdminUserId(params.subjectUser.id)
    : false;

  const membership = params.subjectUser
    ? hasGlobalAccess
      ? buildGlobalWorkspaceMembership({
          workspaceId: workspace.id,
          userId: params.subjectUser.id,
        })
      : await loadWorkspaceMembershipByWorkspaceAndUser(workspace.id, params.subjectUser.id)
    : null;

  let request: WorkspaceAccessRequestRow | null = null;
  if (params.subjectUser && !hasGlobalAccess) {
    const normalizedEmail = normalizeEmail(params.subjectUser.email);
    const requestRows = await loadWorkspaceAccessRequestRows(workspace.id);
    request =
      requestRows.find((row: WorkspaceAccessRequestRow) => row.user_id === params.subjectUser?.id) ??
      (normalizedEmail
        ? requestRows.find(
            (row: WorkspaceAccessRequestRow) => normalizeEmail(row.requested_email) === normalizedEmail,
          )
        : null) ??
      null;
  }

  const access = mapAccessState({
    workspace,
    membership,
    request,
  });

  return {
    status: access.routeStatus,
    workspace,
    subjectUser: params.subjectUser,
    membership,
    request,
    access_state: access.accessState,
    message: access.message,
  };
}

function formatRoleKey(roleKey: string): string {
  switch (roleKey.toLowerCase()) {
    case 'owner':
      return 'Proprietário';
    case 'admin':
      return 'Administrador';
    case 'editor':
      return 'Editor';
    case 'viewer':
      return 'Visualizador';
    case 'member':
      return 'Membro';
    default:
      return titleize(roleKey);
  }
}

async function loadWorkspaceMembershipsForUser(userId: string): Promise<WorkspaceMembershipRow[]> {
  return sortWorkspaceMembershipRows(await loadWorkspaceMembershipRows({ userId }));
}

async function loadWorkspaceRequestsForUser(subjectUser: WorkspaceUserRow): Promise<WorkspaceAccessRequestRow[]> {
  const normalizedEmail = normalizeEmail(subjectUser.email);
  const requestRows = await loadWorkspaceAccessRequestRows();
  return requestRows.filter((row: WorkspaceAccessRequestRow) => {
    if (row.user_id === subjectUser.id) return true;
    if (!normalizedEmail) return false;
    return normalizeEmail(row.requested_email) === normalizedEmail;
  });
}

async function loadWorkspaceGroups(): Promise<WorkspaceGroupRow[]> {
  const richQuery = await supabase
    .from('cdt_workspace_groups')
    .select('key, label, description, sort_order, is_public')
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (!richQuery.error) {
    return (richQuery.data ?? []) as WorkspaceGroupRow[];
  }

  if (!isMissingColumnError(richQuery.error)) {
    throw richQuery.error;
  }

  const fallbackQuery = await supabase
    .from('cdt_workspace_groups')
    .select('key, label, description')
    .order('label', { ascending: true });

  if (fallbackQuery.error) throw fallbackQuery.error;

  return ((fallbackQuery.data ?? []) as Array<Pick<WorkspaceGroupRow, 'key' | 'label' | 'description'>>).map(
    (group, index) => ({
      ...group,
      sort_order: index,
      is_public: true,
    }),
  );
}

async function loadWorkspaceRows(): Promise<WorkspaceRow[]> {
  const richQuery = await supabase
    .from('cdt_workspaces')
    .select('id, slug, name, description, group_key, avatar_url, is_public, is_active, sort_order, created_at, updated_at')
    .order('group_key', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (!richQuery.error) {
    return (richQuery.data ?? []) as WorkspaceRow[];
  }

  if (!isMissingColumnError(richQuery.error)) {
    throw richQuery.error;
  }

  const fallbackQuery = await supabase
    .from('cdt_workspaces')
    .select('id, slug, name, description, group_key, is_active')
    .order('group_key', { ascending: true })
    .order('name', { ascending: true });

  if (!fallbackQuery.error) {
    return ((fallbackQuery.data ?? []) as Array<Partial<WorkspaceRow> & Pick<WorkspaceRow, 'id' | 'slug' | 'name'>>).map(
      (workspace) => withWorkspaceDefaults(workspace),
    );
  }

  if (!isMissingColumnError(fallbackQuery.error)) {
    throw fallbackQuery.error;
  }

  const minimalQuery = await supabase
    .from('cdt_workspaces')
    .select('id, slug, name, description')
    .order('name', { ascending: true });

  if (minimalQuery.error) throw minimalQuery.error;

  return ((minimalQuery.data ?? []) as Array<Partial<WorkspaceRow> & Pick<WorkspaceRow, 'id' | 'slug' | 'name'>>).map(
    (workspace) => withWorkspaceDefaults(workspace),
  );
}

export async function loadWorkspaceCatalog(subjectUserId: string | null): Promise<PublicWorkspacePayload> {
  const [groupsRes, workspacesRes, membershipsRes, requestsRes, hasGlobalAccess] = await Promise.all([
    loadWorkspaceGroups(),
    loadWorkspaceRows(),
    subjectUserId ? loadWorkspaceMembershipsForUser(subjectUserId) : Promise.resolve([] as WorkspaceMembershipRow[]),
    subjectUserId
      ? resolveWorkspaceUser({ requesterUserId: subjectUserId, includeInactive: true }).then(async (resolved) => {
          if (!resolved.user) return [] as WorkspaceAccessRequestRow[];
          return loadWorkspaceRequestsForUser(resolved.user);
        })
      : Promise.resolve([] as WorkspaceAccessRequestRow[]),
    subjectUserId ? isGlobalAdminUserId(subjectUserId) : Promise.resolve(false),
  ]);

  const groupRows = groupsRes as WorkspaceGroupRow[];
  const workspaceRows = workspacesRes as WorkspaceRow[];
  const membershipRows = membershipsRes as WorkspaceMembershipRow[];
  const requestRows = requestsRes as WorkspaceAccessRequestRow[];

  const groupMap = new Map(groupRows.map((group: WorkspaceGroupRow) => [group.key, group] as const));
  const membershipByWorkspace = new Map<string, WorkspaceMembershipRow>();
  for (const membership of membershipRows) {
    membershipByWorkspace.set(membership.workspace_id, membership);
  }

  const requestByWorkspace = new Map<string, WorkspaceAccessRequestRow>();
  for (const request of requestRows) {
    if (!requestByWorkspace.has(request.workspace_id)) {
      requestByWorkspace.set(request.workspace_id, request);
    }
  }

  const visibleWorkspaces = workspaceRows.filter((workspace: WorkspaceRow) => {
    if (!workspace.is_active || !workspace.is_public) return false;
    const group = groupMap.get(workspace.group_key) ?? null;
    return group?.is_public !== false;
  });

  const defaultWorkspaceId =
    (hasGlobalAccess
      ? membershipRows.find((membership) => membership.membership_status === 'active' && membership.is_default)?.workspace_id ??
        visibleWorkspaces[0]?.id ??
        null
      : null) ??
    null;

  const workspaces = visibleWorkspaces.map((workspace: WorkspaceRow) => {
      const membership = hasGlobalAccess && subjectUserId
        ? buildGlobalWorkspaceMembership({
            workspaceId: workspace.id,
            userId: subjectUserId,
            isDefault: workspace.id === defaultWorkspaceId,
          })
        : membershipByWorkspace.get(workspace.id) ?? null;
      const request = hasGlobalAccess ? null : requestByWorkspace.get(workspace.id) ?? null;
      const access = mapAccessState({ workspace, membership, request });
      const group = groupMap.get(workspace.group_key) ?? null;

      return {
        ...workspace,
        group: group
          ? {
              key: group.key,
              label: group.label,
              description: group.description,
            }
          : null,
        has_access: access.accessState === 'active',
        access_state: access.accessState,
        membership_id: membership?.id ?? null,
        membership_status: membership?.membership_status ?? null,
        is_default_membership: Boolean(membership?.is_default),
        joined_at: membership?.joined_at ?? null,
      };
    });

  const groups = workspaces.reduce<WorkspaceGroupSummary[]>((acc, workspace) => {
    if (acc.some((group) => group.key === workspace.group_key)) {
      return acc;
    }

    const group = groupMap.get(workspace.group_key) ?? null;
    acc.push({
      key: workspace.group_key,
      label: group?.label ?? titleize(workspace.group_key),
      description: group?.description ?? null,
    });
    return acc;
  }, []);

  return { groups, workspaces };
}

export async function resolveWorkspaceContext(params: {
  slug: string;
  requesterUserId: string | null;
  authUserId: string | null;
  authUserEmail: string | null;
}): Promise<WorkspaceAccessSnapshot> {
  const subjectUser = await resolveWorkspaceUser({
    requesterUserId: params.requesterUserId,
    authUserId: params.authUserId,
    authUserEmail: params.authUserEmail,
    includeInactive: true,
  });

  return loadWorkspaceAccessSnapshot({
    slug: params.slug,
    subjectUser: subjectUser.user,
  });
}

export async function loadWorkspaceMembersForSlug(params: {
  slug: string;
  requesterUserId: string | null;
  authUserId: string | null;
  authUserEmail: string | null;
}): Promise<WorkspaceAccessSnapshot & { members: WorkspaceMemberRow[] }> {
  const snapshot = await resolveWorkspaceContext(params);

  if (snapshot.status !== 'success' || !snapshot.workspace || !snapshot.subjectUser) {
    return {
      ...snapshot,
      members: [],
    };
  }

  const membershipRows = sortWorkspaceMembershipRows(
    (await loadWorkspaceMembershipRows({ workspaceId: snapshot.workspace.id })).filter(
      (membership: WorkspaceMembershipRow) => membership.membership_status === 'active',
    ),
  );
  const userIds = Array.from(new Set(membershipRows.map((membership: WorkspaceMembershipRow) => membership.user_id)));
  const usersById = new Map<string, WorkspaceUserRow>();

  if (userIds.length > 0) {
    const userRows = (await listCdtUsersByIds(userIds, [
      'central_user_id',
      'identity_status',
    ]))
      .map((user) => toWorkspaceUserRow(user))
      .filter((user): user is WorkspaceUserRow => Boolean(user));
    for (const user of userRows) {
      usersById.set(user.id, user);
    }
  }

  const resolvedProfiles = await listWorkspaceResolvedUserProfiles(
    snapshot.workspace.id,
    Array.from(usersById.keys()),
  );

  const members = membershipRows.flatMap((membership: WorkspaceMembershipRow) => {
    const user = usersById.get(membership.user_id) ?? null;
    if (!user) return [];
    const resolvedProfile = resolvedProfiles.get(user.id) ?? null;

    const member: WorkspaceMemberRow = {
      id: user.id,
      name: resolvedProfile?.effective_name ?? user.name,
      email: user.email ?? null,
      avatar_url: resolvedProfile?.effective_avatar_url ?? user.avatar_url,
      central_user_id: user.central_user_id,
      role_key: membership.role_key,
      role_display_name: formatRoleKey(membership.role_key),
      membership_status: membership.membership_status,
      is_default: membership.is_default,
      joined_at: membership.joined_at,
    };

    return [member];
  });

  return {
    ...snapshot,
    members,
  };
}

async function findAuthUserByEmail(email: string): Promise<string | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;
    const match = (data.users ?? []).find((user) => normalizeEmail(user.email) === email);
    if (match?.id) return match.id;
    if (!data.users || data.users.length < 1000) break;
  }

  return null;
}

async function deleteAuthUser(userId: string): Promise<void> {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    console.warn('[workspaces] Failed to delete orphan auth user:', error.message);
  }
}

async function ensureLocalWorkspaceUser(params: {
  authUserId: string;
  email: string;
  name: string;
}): Promise<{ user: WorkspaceUserRow | null; created: boolean }> {
  const nowIso = new Date().toISOString();
  const normalizedEmail = normalizeEmail(params.email) ?? params.email.toLowerCase();

  const byCentralUserId = toWorkspaceUserRow(await findCdtUserByField({
    field: 'central_user_id',
    value: params.authUserId,
    includeColumns: ['central_user_id', 'identity_status'],
  }));

  if (byCentralUserId?.id) {
    const nextIsActive = byCentralUserId.is_active !== false;
    await updateCdtUserByIdCompat(byCentralUserId.id, {
      email: normalizedEmail,
      name: params.name,
      is_active: nextIsActive,
      identity_status: nextIsActive ? 'linked' : 'manual_review',
      last_identity_sync_at: nowIso,
      updated_at: nowIso,
    });

    const resolved = toWorkspaceUserRow(await findCdtUserByField({
      field: 'id',
      value: byCentralUserId.id,
      includeColumns: ['central_user_id', 'identity_status'],
    }));

    return { user: resolved, created: false };
  }

  const byId = toWorkspaceUserRow(await findCdtUserByField({
    field: 'id',
    value: params.authUserId,
    includeColumns: ['central_user_id', 'identity_status'],
  }));

  if (byId?.id) {
    const nextIsActive = byId.is_active !== false;
    await updateCdtUserByIdCompat(byId.id, {
      email: normalizedEmail,
      name: params.name,
      central_user_id: byId.central_user_id ?? params.authUserId,
      is_active: nextIsActive,
      identity_status: nextIsActive ? 'linked' : 'manual_review',
      last_identity_sync_at: nowIso,
      updated_at: nowIso,
    });

    const resolved = toWorkspaceUserRow(await findCdtUserByField({
      field: 'id',
      value: byId.id,
      includeColumns: ['central_user_id', 'identity_status'],
    }));

    return { user: resolved, created: false };
  }

  const byEmail = toWorkspaceUserRow(await findCdtUserByField({
    field: 'email',
    value: normalizedEmail,
    includeColumns: ['central_user_id', 'identity_status'],
  }));

  if (byEmail?.id) {
    if (byEmail.central_user_id && byEmail.central_user_id !== params.authUserId) {
      throw new Error('Este email ja esta vinculado a outra identidade central.');
    }

    const nextIsActive = byEmail.is_active !== false;
    await updateCdtUserByIdCompat(byEmail.id, {
      email: normalizedEmail,
      name: params.name,
      central_user_id: params.authUserId,
      is_active: nextIsActive,
      identity_status: nextIsActive ? 'linked' : 'manual_review',
      last_identity_sync_at: nowIso,
      updated_at: nowIso,
    });

    const resolved = toWorkspaceUserRow(await findCdtUserByField({
      field: 'id',
      value: byEmail.id,
      includeColumns: ['central_user_id', 'identity_status'],
    }));

    return { user: resolved, created: false };
  }

  await insertCdtUserCompat({
    id: params.authUserId,
    central_user_id: params.authUserId,
    identity_status: 'manual_review',
    last_identity_sync_at: nowIso,
    email: normalizedEmail,
    name: params.name,
    avatar_url: null,
    is_active: false,
  });

  const inserted = toWorkspaceUserRow(await findCdtUserByField({
    field: 'id',
    value: params.authUserId,
    includeColumns: ['central_user_id', 'identity_status'],
  }));

  if (!inserted?.id) {
    throw new Error('Falha ao criar usuario local para solicitacao de acesso.');
  }

  return { user: inserted, created: true };
}

async function createAccessRequestRow(params: {
  workspaceId: string;
  user: WorkspaceUserRow;
  email: string;
  name: string;
  message: string | null;
}): Promise<WorkspaceAccessRequestRow> {
  const payload = {
    workspace_id: params.workspaceId,
    user_id: params.user.id,
    requested_email: params.email,
    requested_name: params.name,
    message: params.message,
    status: 'pending',
  };

  for (const table of ['cdt_workspace_access_requests', 'cdt_access_requests'] as const) {
    const { data, error } = await supabase
      .from(table)
      .insert(payload)
      .select(
        'id, workspace_id, user_id, requested_email, requested_name, message, status, decision_reason, created_at, updated_at, reviewed_at, reviewed_by',
      )
      .maybeSingle();

    if (!error && data) {
      return data as WorkspaceAccessRequestRow;
    }

    if (error && (isMissingRelationError(error) || isMissingColumnError(error))) {
      continue;
    }

    throw error ?? new Error('Falha ao registrar solicitacao de acesso.');
  }

  throw new Error('Fluxo de solicitacao de acesso indisponivel neste schema.');
}

async function findLatestAccessRequest(params: {
  workspaceId: string;
  email: string;
  userId?: string | null;
}): Promise<WorkspaceAccessRequestRow | null> {
  const normalizedEmail = normalizeEmail(params.email);
  const requestRows = await loadWorkspaceAccessRequestRows(params.workspaceId);
  const matches = requestRows.filter((row: WorkspaceAccessRequestRow) => {
    if (params.userId && row.user_id === params.userId) return true;
    return normalizeEmail(row.requested_email) === normalizedEmail;
  });

  return matches[0] ?? null;
}

export async function requestWorkspaceAccess(params: {
  workspaceSlug: string;
  email: string;
  name: string;
  password: string;
  message: string | null;
}): Promise<
  | {
      status: 'success';
      workspace: (WorkspaceRow & { group: WorkspaceGroupSummary | null }) | null;
      membership: WorkspaceMembershipRow | null;
      request: WorkspaceAccessRequestRow | null;
      auth_user_created: boolean;
      local_user: WorkspaceUserRow | null;
    }
  | {
      status: 'pending';
      workspace: (WorkspaceRow & { group: WorkspaceGroupSummary | null }) | null;
      membership: WorkspaceMembershipRow | null;
      request: WorkspaceAccessRequestRow | null;
      auth_user_created: boolean;
      local_user: WorkspaceUserRow | null;
    }
  | {
      status: 'blocked';
      workspace: (WorkspaceRow & { group: WorkspaceGroupSummary | null }) | null;
      membership: WorkspaceMembershipRow | null;
      request: WorkspaceAccessRequestRow | null;
      auth_user_created: boolean;
      local_user: WorkspaceUserRow | null;
    }
  | {
      status: 'not_found';
      workspace: null;
      membership: null;
      request: null;
      auth_user_created: false;
      local_user: null;
    }
> {
  const slug = normalizeWorkspaceSlug(params.workspaceSlug);
  const workspace = await loadWorkspaceBySlug(slug);
  if (!workspace) {
    return {
      status: 'not_found',
      workspace: null,
      membership: null,
      request: null,
      auth_user_created: false,
      local_user: null,
    };
  }

  if (!workspace.is_active) {
    return {
      status: 'blocked',
      workspace,
      membership: null,
      request: null,
      auth_user_created: false,
      local_user: null,
    };
  }

  const normalizedEmail = normalizeEmail(params.email);
  if (!normalizedEmail) {
    throw new Error('email is required');
  }

  const existingLocalUser = await resolveWorkspaceUser({
    email: normalizedEmail,
    includeInactive: true,
  });
  const existingRequest = await findLatestAccessRequest({
    workspaceId: workspace.id,
    email: normalizedEmail,
    userId: existingLocalUser.user?.id ?? null,
  });
  const existingMembership = existingLocalUser.user
    ? await loadWorkspaceMembershipByWorkspaceAndUser(workspace.id, existingLocalUser.user.id)
    : null;

  const accessBefore = mapAccessState({
    workspace,
    membership: existingMembership,
    request: existingRequest,
  });

  if (accessBefore.accessState === 'active') {
    return {
      status: 'success',
      workspace,
      membership: existingMembership,
      request: existingRequest,
      auth_user_created: false,
      local_user: existingLocalUser.user,
    };
  }

  if (accessBefore.accessState === 'pending') {
    return {
      status: 'pending',
      workspace,
      membership: existingMembership,
      request: existingRequest,
      auth_user_created: false,
      local_user: existingLocalUser.user,
    };
  }

  if (accessBefore.accessState === 'blocked') {
    return {
      status: 'blocked',
      workspace,
      membership: existingMembership,
      request: existingRequest,
      auth_user_created: false,
      local_user: existingLocalUser.user,
    };
  }

  const { data: authCreated, error: authError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: params.password,
    email_confirm: true,
    user_metadata: { full_name: params.name, name: params.name },
  });

  let authUserId = authCreated?.user?.id ?? null;
  let createdAuthUser = Boolean(authUserId);

  if (authError || !authUserId) {
    const msg = authError?.message || 'Falha ao criar usuario no Auth';
    const authErrorStatus = (authError as { status?: number } | null)?.status;
    if (/already|registered|exists/i.test(msg) || authErrorStatus === 422) {
      authUserId = await findAuthUserByEmail(normalizedEmail);
      createdAuthUser = false;
    }

    if (!authUserId) {
      throw new Error(msg);
    }
  }

  let localUser = existingLocalUser.user;
  let createdLocalUser = false;
  try {
    if (!localUser) {
      const ensured = await ensureLocalWorkspaceUser({
        authUserId,
        email: normalizedEmail,
        name: params.name,
      });
      localUser = ensured.user;
      createdLocalUser = ensured.created;
    } else if (localUser.central_user_id && localUser.central_user_id !== authUserId) {
      throw new Error('Este email ja esta vinculado a outra identidade central.');
    } else {
      const updated = await ensureLocalWorkspaceUser({
        authUserId,
        email: normalizedEmail,
        name: params.name,
      });
      localUser = updated.user;
      createdLocalUser = updated.created;
    }

    if (!localUser) {
      throw new Error('Nao foi possivel vincular o usuario local.');
    }

    const request = await createAccessRequestRow({
      workspaceId: workspace.id,
      user: localUser,
      email: normalizedEmail,
      name: params.name,
      message: params.message,
    });

    return {
      status: 'pending',
      workspace,
      membership: null,
      request,
      auth_user_created: createdAuthUser,
      local_user: localUser,
    };
  } catch (error) {
    if (createdAuthUser && authUserId) {
      await deleteAuthUser(authUserId);
    }
    if (createdLocalUser && localUser?.id) {
      const { error: deleteError } = await supabase.from('cdt_users').delete().eq('id', localUser.id);
      if (deleteError) {
        console.warn('[workspaces] Failed to rollback local user creation:', deleteError.message);
      }
    }
    throw error;
  }
}

export async function loadCurrentWorkspaceMembers(params: {
  requesterUserId: string | null;
  authUserId: string | null;
  authUserEmail: string | null;
}): Promise<
  | {
      status: 'success';
      workspace: (WorkspaceRow & { group: WorkspaceGroupSummary | null }) | null;
      members: WorkspaceMemberRow[];
    }
  | {
      status: 'pending';
      workspace: (WorkspaceRow & { group: WorkspaceGroupSummary | null }) | null;
      members: WorkspaceMemberRow[];
    }
  | {
      status: 'blocked';
      workspace: (WorkspaceRow & { group: WorkspaceGroupSummary | null }) | null;
      members: WorkspaceMemberRow[];
    }
  | {
      status: 'not_found';
      workspace: null;
      members: WorkspaceMemberRow[];
    }
> {
  const subjectUser = await resolveWorkspaceUser({
    requesterUserId: params.requesterUserId,
    authUserId: params.authUserId,
    authUserEmail: params.authUserEmail,
    includeInactive: true,
  });

  if (!subjectUser.user) {
    return {
      status: 'not_found',
      workspace: null,
      members: [],
    };
  }

  const hasGlobalAccess = await isGlobalAdminUserId(subjectUser.user.id);
  const membershipRows = await loadWorkspaceMembershipsForUser(subjectUser.user.id);
  const activeMembership = membershipRows.find((membership: WorkspaceMembershipRow) => membership.membership_status === 'active') ?? null;
  const selectedMembership = activeMembership ?? membershipRows[0] ?? null;

  if (!selectedMembership && !hasGlobalAccess) {
    const access =
      subjectUser.user.is_active
        ? 'success'
        : subjectUser.user.identity_status === 'disabled' || subjectUser.user.identity_status === 'conflict'
          ? 'blocked'
          : 'pending';
    return {
      status: access,
      workspace: null,
      members: [],
    };
  }

  const selectedWorkspaceId = selectedMembership?.workspace_id
    ?? (await loadWorkspaceRows()).find((workspace) => workspace.is_active)?.id
    ?? null;

  if (!selectedWorkspaceId) {
    return {
      status: 'not_found',
      workspace: null,
      members: [],
    };
  }

  const workspace = await loadWorkspaceById(selectedWorkspaceId);

  if (!workspace) {
    return {
      status: 'not_found',
      workspace: null,
      members: [],
    };
  }

  if (!workspace.is_active) {
    return {
      status: 'blocked',
      workspace,
      members: [],
    };
  }

  if (selectedMembership && !hasGlobalAccess) {
    const selectedStatus = selectedMembership.membership_status.toLowerCase();
    if (selectedStatus === 'blocked' || selectedStatus === 'revoked') {
      return {
        status: 'blocked',
        workspace,
        members: [],
      };
    }

    if (selectedStatus === 'pending') {
      return {
        status: 'pending',
        workspace,
        members: [],
      };
    }
  }

  if (!subjectUser.user.is_active) {
    return {
      status: 'pending',
      workspace,
      members: [],
    };
  }

  const workspaceMembers = await loadWorkspaceMembersForSlug({
    slug: workspace.slug,
    requesterUserId: subjectUser.user.id,
    authUserId: params.authUserId,
    authUserEmail: params.authUserEmail,
  });

  return {
    status: 'success',
    workspace,
    members: workspaceMembers.members,
  };
}
