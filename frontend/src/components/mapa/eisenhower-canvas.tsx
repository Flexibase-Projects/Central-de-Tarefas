import { useMemo } from 'react'
import { Box, Typography } from '@/compat/mui/material'
import { Project } from '@/types'
import type { EisenhowerQuadrant } from '@/types'
import type { ProjectMapPosition } from '@/types'
import { mapBubbleLabel } from '@/lib/abbreviate'
import { getProjectMapPosition } from '@/lib/map-position'
import { MapProjectBubble } from './map-project-bubble'

const QUADRANT_LABELS: Record<EisenhowerQuadrant, { title: string; sub?: string }> = {
  1: { title: 'Urgente e Importante', sub: 'Fazer primeiro' },
  2: { title: 'Importante', sub: 'Agendar' },
  3: { title: 'Urgente', sub: 'Delegar' },
  4: { title: 'Nem urgente nem importante', sub: 'Eliminar ou depois' },
}

/** Cores semânticas dos quadrantes — light/dark via opacidade */
const QUADRANT_SX: Record<
  EisenhowerQuadrant,
  { box: object; labelColor: string }
> = {
  1: {
    box: {
      bgcolor: 'rgba(220, 38, 38, 0.05)',
      borderColor: 'rgba(220, 38, 38, 0.2)',
    },
    labelColor: '#DC2626',
  },
  2: {
    box: {
      bgcolor: 'rgba(37, 99, 235, 0.05)',
      borderColor: 'rgba(37, 99, 235, 0.2)',
    },
    labelColor: '#2563EB',
  },
  3: {
    box: {
      bgcolor: 'rgba(217, 119, 6, 0.05)',
      borderColor: 'rgba(217, 119, 6, 0.2)',
    },
    labelColor: '#D97706',
  },
  4: {
    box: {
      bgcolor: 'rgba(5, 150, 105, 0.05)',
      borderColor: 'rgba(5, 150, 105, 0.2)',
    },
    labelColor: '#059669',
  },
}

interface EisenhowerCanvasProps {
  projects: Project[]
  onProjectClick: (project: Project) => void
  onPositionChange: (projectId: string, position: ProjectMapPosition) => void
  readOnly?: boolean
}

export function EisenhowerCanvas({
  projects,
  onProjectClick,
  onPositionChange,
  readOnly = false,
}: EisenhowerCanvasProps) {
  const noPositionIndex = useMemo(() => {
    const arr = projects.filter(
      (p) =>
        p.map_quadrant == null || p.map_x == null || p.map_y == null
    )
    return (id: string) => arr.findIndex((p) => p.id === id)
  }, [projects])

  const projectsWithPosition = useMemo(() => {
    return projects.map((project) => ({
      project,
      position: getProjectMapPosition(
        project,
        noPositionIndex(project.id) >= 0 ? noPositionIndex(project.id) : 0
      ),
    }))
  }, [projects, noPositionIndex])

  const byQuadrant = useMemo(() => {
    const map: Record<EisenhowerQuadrant, typeof projectsWithPosition> = {
      1: [],
      2: [],
      3: [],
      4: [],
    }
    projectsWithPosition.forEach((pp) => {
      map[pp.position.quadrant].push(pp)
    })
    return map
  }, [projectsWithPosition])

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('application/project-id', projectId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (e: React.DragEvent, quadrant: EisenhowerQuadrant) => {
    if (readOnly) return
    e.preventDefault()
    const projectId = e.dataTransfer.getData('application/project-id')
    if (!projectId) return
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const clampedX = Math.max(5, Math.min(95, x))
    const clampedY = Math.max(5, Math.min(95, y))
    onPositionChange(projectId, { quadrant, x: clampedX, y: clampedY })
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (readOnly) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const borderRadii = {
    1: { borderTopLeftRadius: 8 },
    2: { borderTopRightRadius: 8 },
    3: { borderBottomLeftRadius: 8 },
    4: { borderBottomRightRadius: 8 },
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        height: '100%',
        width: '100%',
        gap: '1px',
        bgcolor: 'divider',
      }}
    >
      {([1, 2, 3, 4] as EisenhowerQuadrant[]).map((q) => (
        <Box
          key={q}
          draggable={false}
          onDrop={(e) => handleDrop(e, q)}
          onDragOver={handleDragOver}
          sx={{
            position: 'relative',
            minHeight: 0,
            overflow: 'hidden',
            border: '1px solid',
            ...QUADRANT_SX[q].box,
            ...borderRadii[q],
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: 12,
              top: 12,
              zIndex: 0,
              color: QUADRANT_SX[q].labelColor,
              fontWeight: 600,
            }}
          >
            <Typography component="span" sx={{ display: 'block', fontSize: 12 }}>
              {QUADRANT_LABELS[q].title}
            </Typography>
            {QUADRANT_LABELS[q].sub && (
              <Typography component="span" sx={{ fontSize: 10, opacity: 0.85, display: 'block', mt: 0.25 }}>
                {QUADRANT_LABELS[q].sub}
              </Typography>
            )}
          </Box>
          <Box sx={{ position: 'absolute', inset: 0, p: 1.5, pt: 7 }}>
            {byQuadrant[q].map(({ project, position }) => (
              <MapProjectBubble
                key={project.id}
                project={project}
                abbreviation={mapBubbleLabel(project.name)}
                x={position.x}
                y={position.y}
                onDragStart={handleDragStart}
                onClick={onProjectClick}
                readOnly={readOnly}
              />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  )
}
