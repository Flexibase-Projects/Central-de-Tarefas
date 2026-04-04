import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { WorkspaceLoginPanel } from '@/components/auth/WorkspaceLoginPanel'

export default function Login() {
  const { workspaceSlug } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (!workspaceSlug) {
      navigate('/workspaces', { replace: true })
    }
  }, [navigate, workspaceSlug])

  if (!workspaceSlug) return null

  return <WorkspaceLoginPanel workspaceSlug={workspaceSlug} variant="page" />
}
