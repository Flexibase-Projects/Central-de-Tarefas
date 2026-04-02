import { supabase } from '../config/supabase.js';

export type WorkspaceModuleStateReason =
  | 'enabled'
  | 'definition_inactive'
  | 'not_configured'
  | 'disabled'
  | 'dependency_disabled';

export type WorkspaceModuleState = {
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
  reason: WorkspaceModuleStateReason;
};

type ModuleDefinitionRow = {
  id: string;
  key: string;
  category: string | null;
  display_name: string;
  description: string | null;
  is_active: boolean;
};

type ModuleInstanceRow = {
  id: string;
  module_definition_id: string;
  slug: string | null;
  title_override: string | null;
  is_enabled: boolean | null;
  updated_at?: string | null;
  created_at?: string | null;
};

const MANAGERIAL_ROLE_KEYS = new Set(['admin', 'gerente', 'gestor']);
const TRACKED_MODULE_KEYS = new Set(['gamification', 'ranking']);

export function isManagerialWorkspaceRole(roleKey: string | null | undefined): boolean {
  if (!roleKey) return false;
  return MANAGERIAL_ROLE_KEYS.has(roleKey.trim().toLowerCase());
}

function compareModuleInstances(a: ModuleInstanceRow, b: ModuleInstanceRow): number {
  const left = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
  const right = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
  return right - left;
}

export async function listWorkspaceModules(workspaceId: string): Promise<WorkspaceModuleState[]> {
  const [{ data: definitions, error: definitionsError }, { data: dependencies, error: dependenciesError }, { data: instances, error: instancesError }] =
    await Promise.all([
      supabase
        .from('cdt_module_definitions')
        .select('id, key, category, display_name, description, is_active'),
      supabase
        .from('cdt_module_dependencies')
        .select('module_definition_id, dependency_definition_id'),
      supabase
        .from('cdt_module_instances')
        .select('id, module_definition_id, slug, title_override, is_enabled, updated_at, created_at')
        .eq('workspace_id', workspaceId),
    ]);

  if (definitionsError) throw definitionsError;
  if (dependenciesError) throw dependenciesError;
  if (instancesError) throw instancesError;

  const definitionRows = ((definitions ?? []) as ModuleDefinitionRow[]).filter(
    (row) => row.is_active || TRACKED_MODULE_KEYS.has(row.key),
  );

  const definitionById = new Map(definitionRows.map((row) => [row.id, row] as const));
  const definitionByKey = new Map(definitionRows.map((row) => [row.key, row] as const));
  const dependencyKeysByDefinitionId = new Map<string, string[]>();

  for (const dependency of (dependencies ?? []) as Array<{
    module_definition_id: string;
    dependency_definition_id: string;
  }>) {
    const dependencyDefinition = definitionById.get(dependency.dependency_definition_id);
    if (!dependencyDefinition) continue;
    const current = dependencyKeysByDefinitionId.get(dependency.module_definition_id) ?? [];
    current.push(dependencyDefinition.key);
    dependencyKeysByDefinitionId.set(dependency.module_definition_id, current);
  }

  const instanceByDefinitionId = new Map<string, ModuleInstanceRow>();
  const groupedInstances = new Map<string, ModuleInstanceRow[]>();

  for (const instance of (instances ?? []) as ModuleInstanceRow[]) {
    const current = groupedInstances.get(instance.module_definition_id) ?? [];
    current.push(instance);
    groupedInstances.set(instance.module_definition_id, current);
  }

  for (const [definitionId, items] of groupedInstances.entries()) {
    instanceByDefinitionId.set(definitionId, [...items].sort(compareModuleInstances)[0] as ModuleInstanceRow);
  }

  const provisional = new Map<string, WorkspaceModuleState>();

  for (const definition of definitionRows) {
    const instance = instanceByDefinitionId.get(definition.id) ?? null;
    provisional.set(definition.key, {
      key: definition.key,
      category: definition.category ?? null,
      display_name: definition.display_name,
      description: definition.description ?? null,
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

  for (const key of TRACKED_MODULE_KEYS) {
    if (provisional.has(key)) continue;
    const definition = definitionByKey.get(key);
    if (definition) continue;
  }

  for (const state of provisional.values()) {
    const dependenciesEnabled = state.dependency_keys.every((dependencyKey) => {
      const dependency = provisional.get(dependencyKey);
      return dependency?.is_enabled === true;
    });

    if (!definitionByKey.get(state.key)?.is_active) {
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

  return Array.from(provisional.values()).sort((a, b) => a.display_name.localeCompare(b.display_name, 'pt-BR'));
}

export async function listWorkspaceModuleStates(workspaceId: string): Promise<WorkspaceModuleState[]> {
  return listWorkspaceModules(workspaceId);
}

export async function getWorkspaceModuleStateMap(workspaceId: string): Promise<Record<string, WorkspaceModuleState>> {
  const modules = await listWorkspaceModules(workspaceId);
  return Object.fromEntries(modules.map((module) => [module.key, module]));
}

export async function getWorkspaceModuleState(
  workspaceId: string,
  moduleKey: string,
): Promise<WorkspaceModuleState | null> {
  const modules = await getWorkspaceModuleStateMap(workspaceId);
  return modules[moduleKey] ?? null;
}

export async function isWorkspaceModuleEnabled(
  workspaceId: string,
  moduleKey: string,
): Promise<boolean> {
  const state = await getWorkspaceModuleState(workspaceId, moduleKey);
  return state?.available === true;
}
