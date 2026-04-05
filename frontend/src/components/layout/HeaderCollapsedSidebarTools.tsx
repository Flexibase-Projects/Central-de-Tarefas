import { useEffect, useLayoutEffect, useState } from 'react'
import { Box } from '@/compat/mui/material'
import { DemandCard } from '@/components/layout/AppSidebar'
import type { UserProgress } from '@/types'
import { buildWorkspacePath } from '@/lib/workspace-routing'
import { useAuth } from '@/contexts/AuthContext'

const ENTER_DURATION_MS = 780
const EXIT_DURATION_MS = 600

function getExitDelayMs(): number {
  if (typeof window === 'undefined') return EXIT_DURATION_MS
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : EXIT_DURATION_MS
}

export interface HeaderCollapsedSidebarToolsProps {
  /** Quando a sidebar está recolhida o bloco de demandas aparece no header. */
  show: boolean
  pendingTodosCount: number | null
  progressData: UserProgress | null
  progressLoading: boolean
}

export function HeaderCollapsedSidebarTools({
  show,
  pendingTodosCount,
}: HeaderCollapsedSidebarToolsProps) {
  const { currentWorkspace } = useAuth()
  const [rendered, setRendered] = useState(show)

  useLayoutEffect(() => {
    if (show) setRendered(true)
  }, [show])

  useEffect(() => {
    if (!show && rendered) {
      const t = setTimeout(() => setRendered(false), getExitDelayMs())
      return () => clearTimeout(t)
    }
  }, [show, rendered])

  if (!rendered) return null

  const motionSx = {
    '@keyframes demandHeaderSlideIn': {
      from: {
        opacity: 0,
        transform: 'translateX(-18px)',
      },
      to: {
        opacity: 1,
        transform: 'translateX(0)',
      },
    },
    '@keyframes demandHeaderSlideOut': {
      from: {
        opacity: 1,
        transform: 'translateX(0)',
      },
      to: {
        opacity: 0,
        transform: 'translateX(-18px)',
      },
    },
    animation: show
      ? `demandHeaderSlideIn ${ENTER_DURATION_MS / 1000}s cubic-bezier(0.22, 1, 0.36, 1) both`
      : `demandHeaderSlideOut ${EXIT_DURATION_MS / 1000}s cubic-bezier(0.4, 0, 1, 1) forwards`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
      opacity: show ? 1 : 0,
      transform: 'none',
      transition: 'opacity 120ms ease',
    },
  } as const

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: 0,
        flexShrink: 1,
        overflow: 'hidden',
        maxHeight: 40,
        ...motionSx,
      }}
    >
      <DemandCard
        count={pendingTodosCount}
        headerInline
        targetPath={buildWorkspacePath(currentWorkspace?.slug)}
      />
    </Box>
  )
}
