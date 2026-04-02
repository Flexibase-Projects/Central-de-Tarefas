export function isGlobalAdminRoleName(roleName?: string | null): boolean {
  const normalized = roleName?.trim().toLowerCase() ?? ''
  return normalized === 'admin' || normalized === 'developer'
}
