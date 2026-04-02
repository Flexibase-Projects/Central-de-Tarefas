import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'

type SidebarSummaryResponse = {
  pendingTodos?: number | null
}

/**
 * Retorna a contagem de TO-DOs pendentes atribuídos ao usuário logado
 * sempre no contexto da workspace atual.
 */
export function useMyPendingTodosCount() {
  const { currentUser, currentWorkspace, getAuthHeaders } = useAuth()
  const [count, setCount] = useState<number | null>(null)
  const requestIdRef = useRef(0)

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current

    if (!currentUser?.id || !currentWorkspace?.slug) {
      setCount(null)
      return
    }

    try {
      const response = await fetch(apiUrl('/api/home/sidebar-summary'), {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error('Falha ao carregar pendências do workspace')
      }

      const body = (await response.json().catch(() => null)) as SidebarSummaryResponse | null
      if (requestId !== requestIdRef.current) return

      setCount(typeof body?.pendingTodos === 'number' ? body.pendingTodos : 0)
    } catch {
      if (requestId !== requestIdRef.current) return
      setCount(null)
    }
  }, [currentUser?.id, currentWorkspace?.slug, getAuthHeaders])

  useEffect(() => {
    requestIdRef.current += 1
    setCount(null)
  }, [currentUser?.id, currentWorkspace?.slug])

  useEffect(() => {
    void refresh()

    // Recarrega quando um todo muda e precisa refletir no resumo do workspace atual.
    const handler = () => void refresh()
    window.addEventListener('cdt-todo-completed', handler)
    window.addEventListener('cdt-todos-invalidated', handler)
    return () => {
      window.removeEventListener('cdt-todo-completed', handler)
      window.removeEventListener('cdt-todos-invalidated', handler)
    }
  }, [refresh])

  return { count, refresh }
}
