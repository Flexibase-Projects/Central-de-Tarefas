import { useMemo } from 'react'
import { Project } from '@/types'
import type { EisenhowerQuadrant } from '@/types'
import { getProjectMapPosition } from '@/lib/map-position'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const QUADRANT_ORDER: EisenhowerQuadrant[] = [1, 2, 3, 4]

interface PriorityListProps {
  projects: Project[]
  onProjectClick?: (project: Project) => void
}

/**
 * Lista de prioridade na ordem de Eisenhower: Q1 primeiro, depois Q2, Q3, Q4.
 * Projetos sem posição aparecem como Q1 (primeiro).
 */
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
      <p className="text-sm text-muted-foreground">
        Nenhum projeto. Arraste os projetos no mapa para definir prioridade.
      </p>
    )
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex items-center gap-4 pb-2">
        <span className="text-xs font-medium text-muted-foreground shrink-0">
          Ordem de prioridade (Eisenhower):
        </span>
        <ol className="flex flex-wrap items-center gap-2">
          {ordered.map((project, index) => (
            <li key={project.id} className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => onProjectClick?.(project)}
                className={cn(
                  'rounded-md px-2 py-1 text-sm font-medium transition-colors',
                  'hover:bg-primary/15 hover:text-primary',
                  'focus:outline-none focus:ring-2 focus:ring-ring'
                )}
              >
                <span className="text-muted-foreground mr-1">{index + 1}.</span>
                {project.name}
              </button>
              {index < ordered.length - 1 && (
                <span className="text-muted-foreground/60" aria-hidden>
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </ScrollArea>
  )
}
