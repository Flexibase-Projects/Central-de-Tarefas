import { supabase } from '../config/supabase.js';

export type WorkspaceMembershipCompatStatus = 'active' | 'pending' | 'revoked' | 'blocked';

export type WorkspaceMembershipCompatRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role_key: string | null;
  role_name: string | null;
  role_display_name: string | null;
  membership_status: WorkspaceMembershipCompatStatus;
  is_default: boolean;
  joined_at: string;
  created_at: string;
  updated_at: string;
  role_id: string | null;
  source: string | null;
  approved_at: string | null;
  revoked_at: string | null;
  legacy_is_active: boolean | null;
  legacy_left_at: string | null;
};

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
  'role_display_name',
  'source',
  'approved_at',
  'revoked_at',
] as const;

type OptionalMembershipColumn = (typeof MEMBERSHIP_OPTIONAL_COLUMNS)[number];

function getMissingMembershipColumn(error: unknown): OptionalMembershipColumn | null {
  const msg = String((error as { message?: string } | null)?.message || '');

  const quoted = msg.match(/'([^']+)' column/i)?.[1];
  if (quoted && MEMBERSHIP_OPTIONAL_COLUMNS.includes(quoted as OptionalMembershipColumn)) {
    return quoted as OptionalMembershipColumn;
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

function normalizeMembershipStatus(row: Record<string, unknown>): WorkspaceMembershipCompatStatus {
  const legacyIsActive = typeof row.is_active === 'boolean' ? row.is_active : null;
  const legacyLeftAt = typeof row.left_at === 'string' ? row.left_at : null;
  const rawStatus =
    (typeof row.membership_status === 'string' ? row.membership_status : null) ??
    (typeof row.status === 'string' ? row.status : null) ??
    (legacyIsActive === null ? null : legacyIsActive ? 'active' : legacyLeftAt ? 'revoked' : 'blocked') ??
    'active';

  switch (rawStatus.toLowerCase()) {
    case 'active':
      return 'active';
    case 'pending':
      return 'pending';
    case 'revoked':
      return 'revoked';
    default:
      return 'blocked';
  }
}

function normalizeWorkspaceMembershipRow(
  row: Record<string, unknown> | null,
): WorkspaceMembershipCompatRow | null {
  if (!row?.id || typeof row.id !== 'string') return null;
  if (typeof row.workspace_id !== 'string' || typeof row.user_id !== 'string') return null;

  const roleKey =
    (typeof row.role_key === 'string' ? row.role_key : null) ??
    (typeof row.role_name === 'string' ? row.role_name : null) ??
    null;

  return {
    id: row.id,
    workspace_id: row.workspace_id,
    user_id: row.user_id,
    role_key: roleKey,
    role_name: roleKey,
    role_display_name: typeof row.role_display_name === 'string' ? row.role_display_name : null,
    membership_status: normalizeMembershipStatus(row),
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
    source: typeof row.source === 'string' ? row.source : null,
    approved_at: typeof row.approved_at === 'string' ? row.approved_at : null,
    revoked_at: typeof row.revoked_at === 'string' ? row.revoked_at : null,
    legacy_is_active: typeof row.is_active === 'boolean' ? row.is_active : null,
    legacy_left_at: typeof row.left_at === 'string' ? row.left_at : null,
  };
}

function omitOptionalMembershipColumn<T extends Record<string, unknown>>(
  payload: T,
  column: OptionalMembershipColumn,
): T {
  const next = { ...payload };
  delete next[column];
  return next;
}

export function sortWorkspaceMembershipRows(
  rows: WorkspaceMembershipCompatRow[],
): WorkspaceMembershipCompatRow[] {
  return [...rows].sort((a, b) => {
    if (a.is_default !== b.is_default) {
      return a.is_default ? -1 : 1;
    }

    return (a.joined_at || '').localeCompare(b.joined_at || '');
  });
}

export async function loadWorkspaceMembershipRows(params: {
  workspaceId?: string;
  userId?: string;
  status?: WorkspaceMembershipCompatStatus | WorkspaceMembershipCompatStatus[];
}): Promise<WorkspaceMembershipCompatRow[]> {
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
      const rows = ((result.data ?? []) as Record<string, unknown>[])
        .map((row) => normalizeWorkspaceMembershipRow(row))
        .filter((row): row is WorkspaceMembershipCompatRow => Boolean(row));

      if (!params.status) {
        return rows;
      }

      const allowed = new Set(Array.isArray(params.status) ? params.status : [params.status]);
      return rows.filter((row) => allowed.has(row.membership_status));
    }

    const missingColumn = getMissingMembershipColumn(result.error);
    if (!missingColumn || removed.has(missingColumn) || !columns.includes(missingColumn)) {
      throw result.error;
    }

    removed.add(missingColumn);
    columns = columns.filter((column) => column !== missingColumn);
  }
}

export async function loadWorkspaceMembershipByWorkspaceAndUser(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceMembershipCompatRow | null> {
  const rows = await loadWorkspaceMembershipRows({ workspaceId, userId });
  return sortWorkspaceMembershipRows(rows)[0] ?? null;
}

export async function listActiveWorkspaceUserIds(workspaceId: string): Promise<string[]> {
  const rows = await loadWorkspaceMembershipRows({ workspaceId, status: 'active' });
  return Array.from(new Set(rows.map((row) => row.user_id)));
}

export async function insertWorkspaceMembershipCompat(insertData: Record<string, unknown>) {
  let payload = { ...insertData };
  const removed = new Set<string>();

  while (true) {
    const result = await supabase
      .from('cdt_workspace_memberships')
      .insert(payload)
      .select('id, workspace_id, user_id')
      .maybeSingle();

    if (!result.error) return result;

    const missingColumn = getMissingMembershipColumn(result.error);
    if (!missingColumn || removed.has(missingColumn) || !(missingColumn in payload)) {
      return result;
    }

    removed.add(missingColumn);
    payload = omitOptionalMembershipColumn(payload, missingColumn);
  }
}

export async function updateWorkspaceMembershipCompat(
  membershipId: string,
  updateData: Record<string, unknown>,
) {
  let payload = { ...updateData };
  const removed = new Set<string>();

  while (true) {
    const result = await supabase
      .from('cdt_workspace_memberships')
      .update(payload)
      .eq('id', membershipId)
      .select('id, workspace_id, user_id')
      .maybeSingle();

    if (!result.error) return result;

    const missingColumn = getMissingMembershipColumn(result.error);
    if (!missingColumn || removed.has(missingColumn) || !(missingColumn in payload)) {
      return result;
    }

    removed.add(missingColumn);
    payload = omitOptionalMembershipColumn(payload, missingColumn);
  }
}
