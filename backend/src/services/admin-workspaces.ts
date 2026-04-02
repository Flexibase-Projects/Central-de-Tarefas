import { supabase } from '../config/supabase.js';
import { insertWorkspaceMembershipCompat } from './workspace-memberships.js';
import { normalizeWorkspaceSlug } from './workspaces.js';

type WorkspaceGroupRow = {
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
};

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  group_key: string | null;
  parent_id: string | null;
  is_active: boolean;
  is_hidden: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ModuleDefinitionRow = {
  id: string;
  key: string;
  category: string | null;
  display_name: string;
  description: string | null;
  supports_multiple: boolean;
  is_active: boolean;
};

type ModuleInstanceRow = {
  id: string;
  workspace_id: string;
  module_definition_id: string;
  name: string;
  slug: string;
  title_override: string | null;
  is_enabled: boolean;
  config: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type ModuleDependencyRow = {
  module_definition_id: string;
  dependency_definition_id: string;
};

type AdminWorkspaceGroup = {
  key: string;
  label: string;
  description: string | null;
};

export type AdminWorkspaceModuleDefinition = {
  id: string;
  key: string;
  category: string | null;
  display_name: string;
  description: string | null;
  supports_multiple: boolean;
  is_active: boolean;
  dependency_keys: string[];
};

export type AdminWorkspaceModuleStateReason =
  | 'enabled'
  | 'definition_inactive'
  | 'not_configured'
  | 'disabled'
  | 'dependency_disabled';

export type AdminWorkspaceModuleState = {
  key: string;
  category: string | null;
  display_name: string;
  description: string | null;
  definition_id: string;
  instance_id: string | null;
  slug: string | null;
  title_override: string | null;
  is_enabled: boolean;
  available: boolean;
  dependency_keys: string[];
  reason: AdminWorkspaceModuleStateReason;
};

export type AdminWorkspaceRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  group_key: string;
  group_label: string;
  group_description: string | null;
  parent_id: string | null;
  is_active: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  modules: AdminWorkspaceModuleState[];
};

export type AdminWorkspaceCatalog = {
  groups: AdminWorkspaceGroup[];
  module_definitions: AdminWorkspaceModuleDefinition[];
  workspaces: AdminWorkspaceRecord[];
};

const WORKSPACE_REQUIRED_COLUMNS = ['id', 'name', 'slug'] as const;
const WORKSPACE_OPTIONAL_COLUMNS = [
  'description',
  'group_key',
  'parent_id',
  'is_active',
  'is_hidden',
  'is_public',
  'sort_order',
  'created_at',
  'updated_at',
] as const;

type OptionalWorkspaceColumn = (typeof WORKSPACE_OPTIONAL_COLUMNS)[number];

const MODULE_INSTANCE_OPTIONAL_COLUMNS = [
  'title_override',
  'config',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at',
] as const;

type OptionalModuleInstanceColumn = (typeof MODULE_INSTANCE_OPTIONAL_COLUMNS)[number];

function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';

  return code === '42703' || /column .* does not exist|Could not find the .* column/i.test(message);
}

function getMissingColumn<T extends readonly string[]>(
  error: unknown,
  allowedColumns: T,
): T[number] | null {
  const message = String((error as { message?: unknown } | null)?.message ?? '');

  const quoted = message.match(/'([^']+)' column/i)?.[1] ?? message.match(/column "?([^"\s]+)"?/i)?.[1] ?? null;
  if (quoted && allowedColumns.includes(quoted as T[number])) {
    return quoted as T[number];
  }

  for (const column of allowedColumns) {
    if (
      message.includes(column) &&
      (/does not exist/i.test(message) || /Could not find/i.test(message) || /schema cache/i.test(message))
    ) {
      return column;
    }
  }

  return null;
}

function isDuplicateError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';

  return code === '23505' || /duplicate|unique/i.test(message);
}

function omitPayloadColumn<T extends Record<string, unknown>, K extends string>(payload: T, column: K): T {
  const next = { ...payload };
  delete next[column];
  return next;
}

function normalizeWorkspaceGroupRow(row: Record<string, unknown> | null): WorkspaceGroupRow | null {
  if (!row?.key || typeof row.key !== 'string') return null;
  if (typeof row.label !== 'string' || !row.label.trim()) return null;

  return {
    key: row.key,
    label: row.label,
    description: typeof row.description === 'string' ? row.description : null,
    sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
  };
}

function normalizeWorkspaceRow(row: Record<string, unknown> | null): WorkspaceRow | null {
  if (!row?.id || typeof row.id !== 'string') return null;
  if (typeof row.name !== 'string' || typeof row.slug !== 'string') return null;

  const isHidden =
    typeof row.is_hidden === 'boolean'
      ? row.is_hidden
      : typeof row.is_public === 'boolean'
        ? !row.is_public
        : false;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: typeof row.description === 'string' ? row.description : null,
    group_key: typeof row.group_key === 'string' ? row.group_key : null,
    parent_id: typeof row.parent_id === 'string' ? row.parent_id : null,
    is_active: typeof row.is_active === 'boolean' ? row.is_active : true,
    is_hidden: isHidden,
    sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : '',
  };
}

function normalizeModuleDefinitionRow(row: Record<string, unknown> | null): ModuleDefinitionRow | null {
  if (!row?.id || typeof row.id !== 'string') return null;
  if (typeof row.key !== 'string' || typeof row.display_name !== 'string') return null;

  return {
    id: row.id,
    key: row.key,
    category: typeof row.category === 'string' ? row.category : null,
    display_name: row.display_name,
    description: typeof row.description === 'string' ? row.description : null,
    supports_multiple: typeof row.supports_multiple === 'boolean' ? row.supports_multiple : false,
    is_active: typeof row.is_active === 'boolean' ? row.is_active : true,
  };
}

function normalizeModuleInstanceRow(row: Record<string, unknown> | null): ModuleInstanceRow | null {
  if (!row?.id || typeof row.id !== 'string') return null;
  if (typeof row.workspace_id !== 'string' || typeof row.module_definition_id !== 'string') return null;
  if (typeof row.name !== 'string' || typeof row.slug !== 'string') return null;

  return {
    id: row.id,
    workspace_id: row.workspace_id,
    module_definition_id: row.module_definition_id,
    name: row.name,
    slug: row.slug,
    title_override: typeof row.title_override === 'string' ? row.title_override : null,
    is_enabled: typeof row.is_enabled === 'boolean' ? row.is_enabled : false,
    config:
      row.config && typeof row.config === 'object' && !Array.isArray(row.config)
        ? (row.config as Record<string, unknown>)
        : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

function compareModuleInstances(left: ModuleInstanceRow, right: ModuleInstanceRow): number {
  const leftTime = new Date(left.updated_at ?? left.created_at ?? 0).getTime();
  const rightTime = new Date(right.updated_at ?? right.created_at ?? 0).getTime();
  return rightTime - leftTime;
}

async function loadWorkspaceGroups(): Promise<WorkspaceGroupRow[]> {
  const richQuery = await supabase
    .from('cdt_workspace_groups')
    .select('key, label, description, sort_order')
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (!richQuery.error) {
    return ((richQuery.data ?? []) as Record<string, unknown>[])
      .map((row) => normalizeWorkspaceGroupRow(row))
      .filter((row): row is WorkspaceGroupRow => Boolean(row));
  }

  if (!isMissingColumnError(richQuery.error)) {
    throw richQuery.error;
  }

  const fallbackQuery = await supabase
    .from('cdt_workspace_groups')
    .select('key, label, description')
    .order('label', { ascending: true });

  if (fallbackQuery.error) throw fallbackQuery.error;

  return ((fallbackQuery.data ?? []) as Record<string, unknown>[])
    .map((row) => normalizeWorkspaceGroupRow(row))
    .filter((row): row is WorkspaceGroupRow => Boolean(row));
}

async function loadWorkspaceRows(): Promise<WorkspaceRow[]> {
  let columns = [...WORKSPACE_REQUIRED_COLUMNS, ...WORKSPACE_OPTIONAL_COLUMNS];
  const removed = new Set<string>();

  while (true) {
    let query = supabase.from('cdt_workspaces').select(columns.join(', '));

    if (columns.includes('group_key')) {
      query = query.order('group_key', { ascending: true });
    }
    if (columns.includes('sort_order')) {
      query = query.order('sort_order', { ascending: true });
    }
    query = query.order('name', { ascending: true });

    const result = await query;
    if (!result.error) {
      return ((result.data ?? []) as Record<string, unknown>[])
        .map((row) => normalizeWorkspaceRow(row))
        .filter((row): row is WorkspaceRow => Boolean(row));
    }

    const missingColumn = getMissingColumn(result.error, WORKSPACE_OPTIONAL_COLUMNS);
    if (!missingColumn || removed.has(missingColumn) || !columns.includes(missingColumn)) {
      throw result.error;
    }

    removed.add(missingColumn);
    columns = columns.filter((column) => column !== missingColumn);
  }
}

async function loadWorkspaceRowById(workspaceId: string): Promise<WorkspaceRow | null> {
  const rows = await loadWorkspaceRows();
  return rows.find((workspace) => workspace.id === workspaceId) ?? null;
}

async function loadModuleDefinitions(): Promise<ModuleDefinitionRow[]> {
  const { data, error } = await supabase
    .from('cdt_module_definitions')
    .select('id, key, category, display_name, description, supports_multiple, is_active')
    .order('category', { ascending: true })
    .order('display_name', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[])
    .map((row) => normalizeModuleDefinitionRow(row))
    .filter((row): row is ModuleDefinitionRow => Boolean(row));
}

async function loadModuleDependencies(): Promise<ModuleDependencyRow[]> {
  const { data, error } = await supabase
    .from('cdt_module_dependencies')
    .select('module_definition_id, dependency_definition_id');

  if (error) throw error;
  return (data ?? []) as ModuleDependencyRow[];
}

async function loadModuleInstances(): Promise<ModuleInstanceRow[]> {
  const { data, error } = await supabase
    .from('cdt_module_instances')
    .select('id, workspace_id, module_definition_id, name, slug, title_override, is_enabled, config, created_at, updated_at');

  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[])
    .map((row) => normalizeModuleInstanceRow(row))
    .filter((row): row is ModuleInstanceRow => Boolean(row));
}

function buildModuleDependencies(
  definitions: ModuleDefinitionRow[],
  dependencies: ModuleDependencyRow[],
): {
  dependencyKeysByDefinitionId: Map<string, string[]>;
  definitionsById: Map<string, ModuleDefinitionRow>;
} {
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition] as const));
  const dependencyKeysByDefinitionId = new Map<string, string[]>();

  for (const dependency of dependencies) {
    const dependencyDefinition = definitionsById.get(dependency.dependency_definition_id);
    if (!dependencyDefinition) continue;
    const current = dependencyKeysByDefinitionId.get(dependency.module_definition_id) ?? [];
    current.push(dependencyDefinition.key);
    dependencyKeysByDefinitionId.set(dependency.module_definition_id, current);
  }

  return { dependencyKeysByDefinitionId, definitionsById };
}

function buildModuleDefinitionsPayload(
  definitions: ModuleDefinitionRow[],
  dependencyKeysByDefinitionId: Map<string, string[]>,
): AdminWorkspaceModuleDefinition[] {
  return definitions
    .map((definition) => ({
      id: definition.id,
      key: definition.key,
      category: definition.category,
      display_name: definition.display_name,
      description: definition.description,
      supports_multiple: definition.supports_multiple,
      is_active: definition.is_active,
      dependency_keys: dependencyKeysByDefinitionId.get(definition.id) ?? [],
    }))
    .sort((left, right) => left.display_name.localeCompare(right.display_name, 'pt-BR'));
}

function buildWorkspaceModuleStates(
  workspaceId: string,
  definitions: ModuleDefinitionRow[],
  dependencyKeysByDefinitionId: Map<string, string[]>,
  instances: ModuleInstanceRow[],
): AdminWorkspaceModuleState[] {
  const groupedInstances = new Map<string, ModuleInstanceRow[]>();

  for (const instance of instances) {
    if (instance.workspace_id !== workspaceId) continue;
    const current = groupedInstances.get(instance.module_definition_id) ?? [];
    current.push(instance);
    groupedInstances.set(instance.module_definition_id, current);
  }

  const instanceByDefinitionId = new Map<string, ModuleInstanceRow>();
  for (const [definitionId, group] of groupedInstances.entries()) {
    instanceByDefinitionId.set(definitionId, [...group].sort(compareModuleInstances)[0] as ModuleInstanceRow);
  }

  const states = new Map<string, AdminWorkspaceModuleState>();

  for (const definition of definitions) {
    const instance = instanceByDefinitionId.get(definition.id) ?? null;
    states.set(definition.key, {
      key: definition.key,
      category: definition.category,
      display_name: definition.display_name,
      description: definition.description,
      definition_id: definition.id,
      instance_id: instance?.id ?? null,
      slug: instance?.slug ?? null,
      title_override: instance?.title_override ?? null,
      is_enabled: instance?.is_enabled === true,
      available: false,
      dependency_keys: dependencyKeysByDefinitionId.get(definition.id) ?? [],
      reason: definition.is_active ? 'not_configured' : 'definition_inactive',
    });
  }

  for (const state of states.values()) {
    const definition = definitions.find((item) => item.id === state.definition_id) ?? null;
    const dependenciesEnabled = state.dependency_keys.every((dependencyKey) => {
      const dependency = states.get(dependencyKey);
      return dependency?.is_enabled === true;
    });

    if (!definition?.is_active) {
      state.available = false;
      state.reason = 'definition_inactive';
      continue;
    }

    if (!state.instance_id) {
      state.available = false;
      state.reason = 'not_configured';
      continue;
    }

    if (!state.is_enabled) {
      state.available = false;
      state.reason = 'disabled';
      continue;
    }

    if (!dependenciesEnabled) {
      state.available = false;
      state.reason = 'dependency_disabled';
      continue;
    }

    state.available = true;
    state.reason = 'enabled';
  }

  return Array.from(states.values()).sort((left, right) =>
    left.display_name.localeCompare(right.display_name, 'pt-BR'),
  );
}

function mapGroupsPayload(groups: WorkspaceGroupRow[]): AdminWorkspaceGroup[] {
  return groups.map((group) => ({
    key: group.key,
    label: group.label,
    description: group.description,
  }));
}

async function insertWorkspaceRow(insertData: Record<string, unknown>) {
  let payload = { ...insertData };
  const removed = new Set<string>();

  while (true) {
    const result = await supabase
      .from('cdt_workspaces')
      .insert(payload)
      .select('id')
      .maybeSingle();

    if (!result.error) return result;

    const missingColumn = getMissingColumn(result.error, WORKSPACE_OPTIONAL_COLUMNS);
    if (!missingColumn || removed.has(missingColumn) || !(missingColumn in payload)) {
      return result;
    }

    removed.add(missingColumn);
    payload = omitPayloadColumn(payload, missingColumn);
  }
}

async function updateWorkspaceRow(workspaceId: string, updateData: Record<string, unknown>) {
  let payload = { ...updateData };
  const removed = new Set<string>();

  while (true) {
    const result = await supabase
      .from('cdt_workspaces')
      .update(payload)
      .eq('id', workspaceId)
      .select('id')
      .maybeSingle();

    if (!result.error) return result;

    const missingColumn = getMissingColumn(result.error, WORKSPACE_OPTIONAL_COLUMNS);
    if (!missingColumn || removed.has(missingColumn) || !(missingColumn in payload)) {
      return result;
    }

    removed.add(missingColumn);
    payload = omitPayloadColumn(payload, missingColumn);
  }
}

async function upsertModuleInstance(params: {
  workspaceId: string;
  definition: ModuleDefinitionRow;
  isEnabled: boolean;
  actorUserId?: string | null;
}) {
  const { data, error } = await supabase
    .from('cdt_module_instances')
    .select('id, workspace_id, module_definition_id, name, slug, title_override, is_enabled, config, created_at, updated_at')
    .eq('workspace_id', params.workspaceId)
    .eq('module_definition_id', params.definition.id);

  if (error) throw error;

  const rows = ((data ?? []) as Record<string, unknown>[])
    .map((row) => normalizeModuleInstanceRow(row))
    .filter((row): row is ModuleInstanceRow => Boolean(row))
    .sort(compareModuleInstances);

  const latest = rows[0] ?? null;

  if (latest) {
    let updatePayload: Record<string, unknown> = {
      is_enabled: params.isEnabled,
      updated_at: new Date().toISOString(),
    };

    if (params.actorUserId) {
      updatePayload.updated_by = params.actorUserId;
    }

    let removed = new Set<string>();
    while (true) {
      const result = await supabase
        .from('cdt_module_instances')
        .update(updatePayload)
        .eq('id', latest.id)
        .select('id')
        .maybeSingle();

      if (!result.error) return;

      const missingColumn = getMissingColumn(result.error, MODULE_INSTANCE_OPTIONAL_COLUMNS);
      if (!missingColumn || removed.has(missingColumn) || !(missingColumn in updatePayload)) {
        throw result.error;
      }

      removed.add(missingColumn);
      updatePayload = omitPayloadColumn(updatePayload, missingColumn);
    }
  }

  let insertPayload: Record<string, unknown> = {
    workspace_id: params.workspaceId,
    module_definition_id: params.definition.id,
    name: params.definition.key,
    slug: params.definition.key,
    is_enabled: params.isEnabled,
    config: {},
  };

  if (params.actorUserId) {
    insertPayload.created_by = params.actorUserId;
    insertPayload.updated_by = params.actorUserId;
  }

  const removed = new Set<string>();
  while (true) {
    const result = await supabase
      .from('cdt_module_instances')
      .insert(insertPayload)
      .select('id')
      .maybeSingle();

    if (!result.error) return;

    const missingColumn = getMissingColumn(result.error, MODULE_INSTANCE_OPTIONAL_COLUMNS);
    if (!missingColumn || removed.has(missingColumn) || !(missingColumn in insertPayload)) {
      throw result.error;
    }

    removed.add(missingColumn);
    insertPayload = omitPayloadColumn(insertPayload, missingColumn);
  }
}

async function ensureGroupExists(groupKey: string): Promise<void> {
  const groups = await loadWorkspaceGroups();
  if (!groups.some((group) => group.key === groupKey)) {
    throw new Error('Grupo de workspace invalido.');
  }
}

export async function loadAdminWorkspaceCatalog(): Promise<AdminWorkspaceCatalog> {
  const [groups, workspaces, definitions, dependencies, instances] = await Promise.all([
    loadWorkspaceGroups(),
    loadWorkspaceRows(),
    loadModuleDefinitions(),
    loadModuleDependencies(),
    loadModuleInstances(),
  ]);

  const { dependencyKeysByDefinitionId } = buildModuleDependencies(definitions, dependencies);
  const groupMap = new Map(groups.map((group) => [group.key, group] as const));

  const workspaceRecords: AdminWorkspaceRecord[] = workspaces.map((workspace) => {
    const group = groupMap.get(workspace.group_key ?? '') ?? null;
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      group_key: workspace.group_key ?? 'core',
      group_label: group?.label ?? 'Workspace',
      group_description: group?.description ?? null,
      parent_id: workspace.parent_id,
      is_active: workspace.is_active,
      is_hidden: workspace.is_hidden,
      created_at: workspace.created_at,
      updated_at: workspace.updated_at,
      modules: buildWorkspaceModuleStates(workspace.id, definitions, dependencyKeysByDefinitionId, instances),
    };
  });

  return {
    groups: mapGroupsPayload(groups),
    module_definitions: buildModuleDefinitionsPayload(definitions, dependencyKeysByDefinitionId),
    workspaces: workspaceRecords,
  };
}

export async function createAdminWorkspace(params: {
  name: string;
  slug: string;
  description?: string | null;
  groupKey?: string | null;
  isActive?: boolean;
  isHidden?: boolean;
  actorUserId?: string | null;
}): Promise<AdminWorkspaceRecord> {
  const normalizedSlug = normalizeWorkspaceSlug(params.slug);
  const trimmedName = params.name.trim();
  const resolvedGroupKey = params.groupKey?.trim() || 'core';

  await ensureGroupExists(resolvedGroupKey);

  const insertPayload: Record<string, unknown> = {
    name: trimmedName,
    slug: normalizedSlug,
    description: params.description?.trim() || null,
    group_key: resolvedGroupKey,
    is_active: params.isActive ?? true,
    is_hidden: params.isHidden ?? false,
  };

  const created = await insertWorkspaceRow(insertPayload);
  if (created.error || !created.data?.id) {
    if (isDuplicateError(created.error)) {
      throw new Error('Ja existe um workspace com este slug.');
    }
    throw created.error ?? new Error('Falha ao criar workspace.');
  }

  if (params.actorUserId) {
    const membershipResult = await insertWorkspaceMembershipCompat({
      workspace_id: created.data.id,
      user_id: params.actorUserId,
      role_key: 'admin',
      role_name: 'admin',
      role_display_name: 'Administrador',
      membership_status: 'active',
      status: 'active',
      is_default: false,
      source: 'admin_panel',
      joined_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
      approved_by: params.actorUserId,
    });

    if (membershipResult.error) {
      console.warn('[admin-workspaces] Failed to auto-create admin membership:', membershipResult.error.message);
    }
  }

  const catalog = await loadAdminWorkspaceCatalog();
  const workspace = catalog.workspaces.find((item) => item.id === created.data.id) ?? null;
  if (!workspace) {
    throw new Error('Workspace criado, mas nao foi possivel recarregar os dados.');
  }

  return workspace;
}

export async function updateAdminWorkspace(
  workspaceId: string,
  params: {
    name?: string;
    description?: string | null;
    groupKey?: string;
    isActive?: boolean;
    isHidden?: boolean;
  },
): Promise<AdminWorkspaceRecord> {
  const current = await loadWorkspaceRowById(workspaceId);
  if (!current) {
    throw new Error('Workspace nao encontrado.');
  }

  if (params.groupKey) {
    await ensureGroupExists(params.groupKey);
  }

  const updatePayload: Record<string, unknown> = {};
  if (params.name !== undefined) updatePayload.name = params.name.trim();
  if (params.description !== undefined) updatePayload.description = params.description?.trim() || null;
  if (params.groupKey !== undefined) updatePayload.group_key = params.groupKey;
  if (params.isActive !== undefined) updatePayload.is_active = params.isActive;
  if (params.isHidden !== undefined) updatePayload.is_hidden = params.isHidden;

  const updated = await updateWorkspaceRow(workspaceId, updatePayload);
  if (updated.error) {
    if (isDuplicateError(updated.error)) {
      throw new Error('Ja existe um workspace com este slug.');
    }
    throw updated.error;
  }

  const catalog = await loadAdminWorkspaceCatalog();
  const workspace = catalog.workspaces.find((item) => item.id === workspaceId) ?? null;
  if (!workspace) {
    throw new Error('Workspace atualizado, mas nao foi possivel recarregar os dados.');
  }

  return workspace;
}

export async function setAdminWorkspaceModuleState(params: {
  workspaceId: string;
  moduleKey: string;
  isEnabled: boolean;
  actorUserId?: string | null;
}): Promise<AdminWorkspaceRecord> {
  const workspace = await loadWorkspaceRowById(params.workspaceId);
  if (!workspace) {
    throw new Error('Workspace nao encontrado.');
  }

  const definitions = await loadModuleDefinitions();
  const definition = definitions.find((item) => item.key === params.moduleKey) ?? null;
  if (!definition) {
    throw new Error('Modulo nao encontrado.');
  }

  await upsertModuleInstance({
    workspaceId: params.workspaceId,
    definition,
    isEnabled: params.isEnabled,
    actorUserId: params.actorUserId,
  });

  const catalog = await loadAdminWorkspaceCatalog();
  const updatedWorkspace = catalog.workspaces.find((item) => item.id === params.workspaceId) ?? null;
  if (!updatedWorkspace) {
    throw new Error('Modulo atualizado, mas nao foi possivel recarregar os dados.');
  }

  return updatedWorkspace;
}
