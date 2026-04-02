function isRelativePath(value: string | null | undefined): value is string {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'))
}

export function sanitizeAdminReturnTo(returnTo?: string | null): string {
  if (!isRelativePath(returnTo)) return '/admin'
  if (returnTo === '/admin/login') return '/admin'
  return returnTo.startsWith('/admin') ? returnTo : '/admin'
}

export function buildAdminLoginPath(returnTo?: string | null): string {
  const safeReturnTo = sanitizeAdminReturnTo(returnTo)
  return safeReturnTo === '/admin'
    ? '/admin/login'
    : `/admin/login?returnTo=${encodeURIComponent(safeReturnTo)}`
}
