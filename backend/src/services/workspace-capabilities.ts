import { hasRole } from './permissions.js';
import type { WorkspaceModuleState, WorkspaceModuleStateReason } from './workspace-modules.js';
import { isManagerialWorkspaceRole } from './workspace-roles.js';

const MANAGERIAL_MODULE_KEYS = new Set(['org_chart', 'costs']);

export interface WorkspaceModuleCapability {
  module_key: string;
  can_access: boolean;
  is_visible: boolean;
  is_managerial_only: boolean;
  reason: WorkspaceModuleStateReason;
}

export interface WorkspaceCapabilitySet {
  is_global_admin: boolean;
  is_workspace_manager: boolean;
  can_manage_workspace: boolean;
  accessible_module_keys: string[];
  visible_module_keys: string[];
  module_capabilities: Record<string, WorkspaceModuleCapability>;
}

function buildModuleCapability(params: {
  module: WorkspaceModuleState;
  canManageWorkspace: boolean;
}): WorkspaceModuleCapability {
  const isManagerialOnly = MANAGERIAL_MODULE_KEYS.has(params.module.key);
  const baseAccess = params.module.available && params.module.is_enabled;
  const canAccess = baseAccess && (!isManagerialOnly || params.canManageWorkspace);

  return {
    module_key: params.module.key,
    can_access: canAccess,
    is_visible: canAccess,
    is_managerial_only: isManagerialOnly,
    reason: params.module.reason,
  };
}

export async function resolveWorkspaceCapabilitySet(params: {
  requesterUserId: string;
  membershipRoleKey?: string | null;
  modules: WorkspaceModuleState[];
}): Promise<WorkspaceCapabilitySet> {
  const isGlobalAdmin = await hasRole(params.requesterUserId, 'admin');
  const isWorkspaceManager =
    isGlobalAdmin || isManagerialWorkspaceRole(params.membershipRoleKey ?? null);
  const canManageWorkspace = isWorkspaceManager || isGlobalAdmin;

  const moduleCapabilities = Object.fromEntries(
    params.modules.map((module) => {
      const capability = buildModuleCapability({
        module,
        canManageWorkspace,
      });
      return [module.key, capability] as const;
    }),
  );

  const accessibleModuleKeys = Object.values(moduleCapabilities)
    .filter((capability) => capability.can_access)
    .map((capability) => capability.module_key);

  const visibleModuleKeys = Object.values(moduleCapabilities)
    .filter((capability) => capability.is_visible)
    .map((capability) => capability.module_key);

  return {
    is_global_admin: isGlobalAdmin,
    is_workspace_manager: isWorkspaceManager,
    can_manage_workspace: canManageWorkspace,
    accessible_module_keys: accessibleModuleKeys,
    visible_module_keys: visibleModuleKeys,
    module_capabilities: moduleCapabilities,
  };
}
