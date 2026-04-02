const MANAGERIAL_ROLE_KEYS = new Set(['admin', 'gerente', 'gestor'])

export function isManagerialWorkspaceRole(roleKey?: string | null): boolean {
  if (!roleKey) return false
  return MANAGERIAL_ROLE_KEYS.has(roleKey.toLowerCase())
}

export function formatWorkspaceRoleDisplayName(roleKey?: string | null): string | null {
  if (!roleKey) return null

  switch (roleKey.toLowerCase()) {
    case 'admin':
      return 'Administrador'
    case 'gerente':
      return 'Gerente'
    case 'gestor':
      return 'Gestor'
    case 'owner':
      return 'Proprietario'
    case 'viewer':
      return 'Visualizador'
    case 'member':
      return 'Membro'
    default:
      return roleKey
        .split(/[_-]+/g)
        .map((part) => (part ? `${part[0]?.toUpperCase() ?? ''}${part.slice(1).toLowerCase()}` : part))
        .join(' ')
    }
}
