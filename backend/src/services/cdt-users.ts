import { supabase } from '../config/supabase.js';

const REQUIRED_USER_COLUMNS = ['id', 'email', 'name', 'avatar_url', 'is_active'] as const;

const OPTIONAL_USER_COLUMNS = [
  'central_user_id',
  'identity_status',
  'last_identity_sync_at',
  'created_at',
  'updated_at',
  'must_set_password',
] as const;

type OptionalUserColumn = (typeof OPTIONAL_USER_COLUMNS)[number];

export type CdtUserLookupField = 'id' | 'email' | 'central_user_id';

export type CdtUserCompatRow = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
  central_user_id: string | null;
  identity_status: string | null;
  last_identity_sync_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  must_set_password: boolean | null;
};

function dedupeColumns(columns: string[]): string[] {
  return Array.from(new Set(columns.filter(Boolean)));
}

function getMissingOptionalUserColumn(error: unknown): OptionalUserColumn | null {
  const msg = String((error as { message?: string } | null)?.message || '');

  const quoted = msg.match(/'([^']+)' column/i)?.[1];
  if (quoted && OPTIONAL_USER_COLUMNS.includes(quoted as OptionalUserColumn)) {
    return quoted as OptionalUserColumn;
  }

  for (const column of OPTIONAL_USER_COLUMNS) {
    if (
      msg.includes(column) &&
      (/does not exist/i.test(msg) || /Could not find/i.test(msg) || /schema cache/i.test(msg))
    ) {
      return column;
    }
  }

  return null;
}

function normalizeUserRow(row: Record<string, unknown> | null): CdtUserCompatRow | null {
  if (!row?.id || typeof row.id !== 'string') return null;

  return {
    id: row.id,
    email: typeof row.email === 'string' ? row.email : null,
    name: typeof row.name === 'string' ? row.name : null,
    avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    is_active: typeof row.is_active === 'boolean' ? row.is_active : null,
    central_user_id: typeof row.central_user_id === 'string' ? row.central_user_id : null,
    identity_status: typeof row.identity_status === 'string' ? row.identity_status : null,
    last_identity_sync_at:
      typeof row.last_identity_sync_at === 'string' ? row.last_identity_sync_at : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
    must_set_password:
      typeof row.must_set_password === 'boolean' ? row.must_set_password : null,
  };
}

async function selectUsersCompat(params: {
  field: CdtUserLookupField | 'id';
  op: 'eq' | 'in';
  value: string | string[];
  includeColumns?: string[];
  maybeSingle?: boolean;
}): Promise<CdtUserCompatRow | CdtUserCompatRow[] | null> {
  let columns = dedupeColumns([
    ...REQUIRED_USER_COLUMNS,
    ...(params.includeColumns ?? OPTIONAL_USER_COLUMNS),
  ]);
  const removed = new Set<string>();

  while (true) {
    let query = supabase.from('cdt_users').select(columns.join(', '));
    query =
      params.op === 'in'
        ? query.in(params.field, params.value as string[])
        : query.eq(params.field, params.value as string);

    const result = params.maybeSingle ? await query.maybeSingle() : await query;

    if (!result.error) {
      if (params.maybeSingle) {
        return normalizeUserRow((result.data as Record<string, unknown> | null) ?? null);
      }

      return ((result.data as Record<string, unknown>[] | null) ?? [])
        .map((row) => normalizeUserRow(row))
        .filter((row): row is CdtUserCompatRow => Boolean(row));
    }

    const missingColumn = getMissingOptionalUserColumn(result.error);
    if (!missingColumn) {
      throw result.error;
    }

    if (params.field === missingColumn) {
      return params.maybeSingle ? null : [];
    }

    if (removed.has(missingColumn) || !columns.includes(missingColumn)) {
      throw result.error;
    }

    removed.add(missingColumn);
    columns = columns.filter((column) => column !== missingColumn);
  }
}

async function mutateUserCompat(
  mode: 'insert' | 'update',
  params: {
    id?: string;
    data: Record<string, unknown>;
  },
): Promise<void> {
  let payload = { ...params.data };
  const removed = new Set<string>();

  while (true) {
    if (Object.keys(payload).length === 0) return;

    const result =
      mode === 'insert'
        ? await supabase.from('cdt_users').insert(payload)
        : await supabase.from('cdt_users').update(payload).eq('id', params.id ?? '');

    if (!result.error) return;

    const missingColumn = getMissingOptionalUserColumn(result.error);
    if (!missingColumn || removed.has(missingColumn) || !(missingColumn in payload)) {
      throw result.error;
    }

    removed.add(missingColumn);
    const nextPayload = { ...payload };
    delete nextPayload[missingColumn];
    payload = nextPayload;
  }
}

export async function findCdtUserByField(params: {
  field: CdtUserLookupField;
  value: string;
  includeColumns?: string[];
}): Promise<CdtUserCompatRow | null> {
  return (await selectUsersCompat({
    field: params.field,
    op: 'eq',
    value: params.value,
    includeColumns: params.includeColumns,
    maybeSingle: true,
  })) as CdtUserCompatRow | null;
}

export async function listCdtUsersByIds(
  ids: string[],
  includeColumns?: string[],
): Promise<CdtUserCompatRow[]> {
  if (ids.length === 0) return [];

  return (await selectUsersCompat({
    field: 'id',
    op: 'in',
    value: ids,
    includeColumns,
    maybeSingle: false,
  })) as CdtUserCompatRow[];
}

export async function updateCdtUserByIdCompat(
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  await mutateUserCompat('update', { id, data });
}

export async function insertCdtUserCompat(data: Record<string, unknown>): Promise<void> {
  await mutateUserCompat('insert', { data });
}
