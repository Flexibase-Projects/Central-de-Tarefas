import { useMemo } from 'react'
import type { User } from '@/types'
import { useWorkspaceMembers } from '@/hooks/use-workspace-members'

/**
 * Lista usuarios ativos do workspace atual para atribuicao em atividades, to-dos e custos.
 * Mantem cache por workspace para evitar requisicoes repetidas entre dialogs e telas.
 */
export function useUsersList() {
  const { members, loading, error, refresh } = useWorkspaceMembers()

  const users = useMemo<User[]>(() => {
    return members
      .map((member) => ({
        id: member.id,
        central_user_id: member.central_user_id,
        email: member.email ?? '',
        name: member.name,
        avatar_url: member.avatar_url,
        is_active: member.is_active,
        created_at: '',
        updated_at: '',
      }))
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
  }, [members])

  return {
    users,
    loading,
    error,
    refreshUsers: refresh,
  }
}
