import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Retorna a contagem de TO-DOs pendentes (não concluídos) atribuídos ao usuário logado.
 * Usa Supabase diretamente para uma query leve, sem carregar todos os registros.
 */
export function useMyPendingTodosCount() {
  const { currentUser } = useAuth()
  const [count, setCount] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    if (!currentUser?.id) {
      setCount(null)
      return
    }
    const { count: c, error } = await supabase
      .from('cdt_project_todos')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', currentUser.id)
      .eq('completed', false)

    if (!error) setCount(c ?? 0)
  }, [currentUser?.id])

  useEffect(() => {
    void refresh()

    // Recarrega quando um todo é concluído (evento disparado pelo todo-list)
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
