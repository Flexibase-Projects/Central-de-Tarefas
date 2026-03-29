const WORKSPACE_PREFIX_PATTERN = /^\/w\/([^/]+)(\/.*)?$/

function isRelativePath(value: string | null | undefined): value is string {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'))
}

export function getWorkspaceSlugFromPath(pathname: string): string | null {
  const match = pathname.match(WORKSPACE_PREFIX_PATTERN)
  return match?.[1] ?? null
}

export function buildWorkspacePath(workspaceSlug?: string | null, path = '/'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (normalizedPath.startsWith('/w/')) return normalizedPath
  if (!workspaceSlug) return '/workspaces'

  return normalizedPath === '/' ? `/w/${workspaceSlug}` : `/w/${workspaceSlug}${normalizedPath}`
}

export function buildWorkspaceLoginPath(workspaceSlug?: string | null, returnTo?: string | null): string {
  const loginPath = buildWorkspacePath(workspaceSlug, '/login')
  const safeReturnTo = sanitizeWorkspaceReturnTo(returnTo, workspaceSlug)

  if (!safeReturnTo) return loginPath

  return `${loginPath}?returnTo=${encodeURIComponent(safeReturnTo)}`
}

export function sanitizeWorkspaceReturnTo(returnTo?: string | null, workspaceSlug?: string | null): string | null {
  if (!isRelativePath(returnTo)) return null

  if (!workspaceSlug) return returnTo

  const workspaceRoot = buildWorkspacePath(workspaceSlug)
  if (returnTo === '/login' || returnTo === '/workspaces') return workspaceRoot
  if (returnTo.startsWith(`${workspaceRoot}/login`)) return workspaceRoot
  if (returnTo.startsWith(workspaceRoot)) return returnTo

  return workspaceRoot
}

export function stripWorkspacePrefix(pathname: string): string {
  const match = pathname.match(WORKSPACE_PREFIX_PATTERN)
  if (!match) return pathname
  return match[2] || '/'
}
