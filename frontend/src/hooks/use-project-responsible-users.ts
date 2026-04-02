import { useMemo } from 'react'
import type { User } from '@/types'
import { useWorkspaceMembers } from '@/hooks/use-workspace-members'

export function useProjectResponsibleUsers() {
  const { members, loading, error, refresh } = useWorkspaceMembers()

  const users = useMemo<User[]>(() => {
    const deduped = new Map<string, User>()

    for (const member of members) {
      const resolvedId = member.central_user_id ?? member.id
      if (deduped.has(resolvedId)) continue

      deduped.set(resolvedId, {
        id: resolvedId,
        central_user_id: member.central_user_id,
        email: member.email ?? '',
        name: member.name,
        avatar_url: member.avatar_url,
        is_active: member.is_active,
        created_at: '',
        updated_at: '',
      })
    }

    return Array.from(deduped.values()).sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
  }, [members])

  return {
    users,
    loading,
    error,
    refreshUsers: refresh,
  }
}
