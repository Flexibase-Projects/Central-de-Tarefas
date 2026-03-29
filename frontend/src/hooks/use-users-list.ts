import { useState, useEffect, useCallback } from 'react'
import type { User } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'

const TTL_MS = 5 * 60 * 1000

let cacheUserId: string | null = null
let cacheUsers: User[] = []
let cacheAt = 0
let inFlight: Promise<User[]> | null = null

/**
 * Lista usuários para atribuição em to-dos.
 * Cache em memória (por usuário logado + TTL) evita várias requisições ao abrir cards/diálogos.
 */
export function useUsersList() {
  const { currentUser, getAuthHeaders } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    if (!currentUser?.id) {
      setUsers([])
      setLoading(false)
      setError(null)
      return
    }

    const uid = currentUser.id

    if (cacheUserId === uid && Date.now() - cacheAt < TTL_MS) {
      setUsers(cacheUsers)
      setLoading(false)
      setError(null)
      return
    }

    const url = apiUrl('/api/users', { for_assignment: true })

    if (!inFlight) {
      inFlight = (async () => {
        const response = await fetch(url, { headers: getAuthHeaders() })
        if (!response.ok) {
          throw new Error('Falha ao buscar usuários')
        }
        const data = (await response.json()) as User[]
        cacheUsers = data
        cacheUserId = uid
        cacheAt = Date.now()
        return data
      })().finally(() => {
        inFlight = null
      })
    }

    setLoading(true)
    setError(null)
    try {
      const data = await inFlight
      setUsers(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar usuários')
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUser?.id, getAuthHeaders])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  return {
    users,
    loading,
    error,
    refreshUsers: fetchUsers,
  }
}
