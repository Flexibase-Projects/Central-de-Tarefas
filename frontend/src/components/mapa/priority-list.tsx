import { useMemo } from 'react'
import { Box, Typography, Button } from '@/compat/mui/material'
import { Project } from '@/types'
import type { EisenhowerQuadrant } from '@/types'
import { getProjectMapPosition } from '@/lib/map-position'

const QUADRANT_ORDER: EisenhowerQuadrant[] = [1, 2, 3, 4]

interface PriorityListProps {
  projects: Project[]
  onProjectClick?: (project: Project) => void
}

export function PriorityList({ projects, onProjectClick }: PriorityListProps) {
  const noPositionIndex = useMemo(() => {
    const arr = projects.filter(
      (p) => p.map_quadrant == null || p.map_x == null || p.map_y == null
    )
    return (id: string) => arr.findIndex((p) => p.id === id)
  }, [projects])

  const ordered = useMemo(() => {
    const withQuadrant = projects.map((project) => ({
      project,
      quadrant: getProjectMapPosition(
        project,
        noPositionIndex(project.id) >= 0 ? noPositionIndex(project.id) : 0
      ).quadrant,
    }))
    const byQ: Record<EisenhowerQuadrant, Project[]> = { 1: [], 2: [], 3: [], 4: [] }
    withQuadrant.forEach(({ project, quadrant }) => byQ[quadrant].push(project))
    return QUADRANT_ORDER.flatMap((q) => byQ[q])
  }, [projects, noPositionIndex])

  if (ordered.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Nenhum projeto. Arraste os projetos no mapa para definir prioridade.
      </Typography>
    )
  }

  return (
    <Box sx={{ width: '100%', overflowX: 'auto', whiteSpace: 'nowrap' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
        <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ flexShrink: 0 }}>
          Ordem de prioridade (Eisenhower):
        </Typography>
        <Box component="ol" sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, listStyle: 'none', m: 0, p: 0 }}>
          {ordered.map((project, index) => (
            <Box component="li" key={project.id} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Button
                size="small"
                onClick={() => onProjectClick?.(project)}
                sx={{
                  textTransform: 'none',
                  minWidth: 'auto',
                  px: 1,
                  py: 0.5,
                  '&:hover': { bgcolor: 'primary.main', color: 'primary.contrastText' },
                }}
              >
                <Typography component="span" variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>{index + 1}.</Typography>
                {project.name}
              </Button>
              {index < ordered.length - 1 && (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ opacity: 0.6 }} aria-hidden>→</Typography>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
