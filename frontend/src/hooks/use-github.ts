import { useState, useCallback } from 'react'
import { GitHubRepository, GitHubCommit } from '@/types'
import { apiUrl } from '@/lib/api'

export function useGitHub() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getRepositoryInfo = useCallback(async (url: string): Promise<GitHubRepository | null> => {
      try {
      setLoading(true)
      setError(null)
      const response = await fetch(apiUrl('/api/github/repo', { url }))
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch repository info')
      }
      return await response.json()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching repository info:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getRecentCommits = useCallback(async (url: string, limit: number = 10): Promise<GitHubCommit[]> => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(apiUrl('/api/github/commits', { url, limit }))
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch commits')
      }
      return await response.json()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching commits:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getContributors = useCallback(async (url: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(apiUrl('/api/github/contributors', { url }))
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch contributors')
      }
      return await response.json()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching contributors:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getReadme = useCallback(async (url: string): Promise<string | null> => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(apiUrl('/api/github/readme', { url }))
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch README')
      }
      const data = await response.json()
      return data.content || null
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching README:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getCommitsCount = useCallback(async (url: string): Promise<number> => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(apiUrl('/api/github/commits-count', { url }))
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch commit count')
      }
      const data = await response.json()
      return data.count || 0
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching commit count:', err)
      return 0
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getRepositoryInfo,
    getRecentCommits,
    getContributors,
    getReadme,
    getCommitsCount,
  }
}
