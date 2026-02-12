import { useMemo } from 'react'
import { Project } from '@/types'
import type { EisenhowerQuadrant } from '@/types'
import type { ProjectMapPosition } from '@/types'
import { mapBubbleLabel } from '@/lib/abbreviate'
import { getProjectMapPosition } from '@/lib/map-position'
import { MapProjectBubble } from './map-project-bubble'
import { cn } from '@/lib/utils'

const QUADRANT_LABELS: Record<EisenhowerQuadrant, { title: string; sub?: string }> = {
  1: { title: 'Urgente e Importante', sub: 'Fazer primeiro' },
  2: { title: 'Importante', sub: 'Agendar' },
  3: { title: 'Urgente', sub: 'Delegar' },
  4: { title: 'Nem urgente nem importante', sub: 'Eliminar ou depois' },
}

interface EisenhowerCanvasProps {
  projects: Project[]
  onProjectClick: (project: Project) => void
  onPositionChange: (projectId: string, position: ProjectMapPosition) => void
}

export function EisenhowerCanvas({
  projects,
  onProjectClick,
  onPositionChange,
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
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-border">
      {([1, 2, 3, 4] as EisenhowerQuadrant[]).map((q) => (
        <div
          key={q}
          draggable={false}
          onDrop={(e) => handleDrop(e, q)}
          onDragOver={handleDragOver}
          className={cn(
            'relative min-h-0 overflow-hidden rounded-none bg-muted/40',
            q === 1 && 'rounded-tl-lg',
            q === 2 && 'rounded-tr-lg',
            q === 3 && 'rounded-bl-lg',
            q === 4 && 'rounded-br-lg'
          )}
        >
          <div className="absolute left-2 top-2 z-0 text-xs font-medium text-muted-foreground">
            <span className="block">{QUADRANT_LABELS[q].title}</span>
            {QUADRANT_LABELS[q].sub && (
              <span className="text-[10px] opacity-80">{QUADRANT_LABELS[q].sub}</span>
            )}
          </div>
          <div className="absolute inset-0 p-2 pt-8">
            {byQuadrant[q].map(({ project, position }) => (
              <MapProjectBubble
                key={project.id}
                project={project}
                abbreviation={mapBubbleLabel(project.name)}
                x={position.x}
                y={position.y}
                onDragStart={handleDragStart}
                onClick={onProjectClick}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
