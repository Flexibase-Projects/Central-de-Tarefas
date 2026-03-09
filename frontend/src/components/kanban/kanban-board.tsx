import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core'
import { Project } from '@/types'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { usePermissions } from '@/hooks/use-permissions'
import { useState, useEffect, useRef } from 'react'

const columns = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
] as const

type ColumnId = typeof columns[number]['id']

interface KanbanBoardProps {
  projects: Project[]
  onProjectMove: (projectId: string, newStatus: ColumnId) => void
  onProjectClick: (project: Project) => void
}

export function KanbanBoard({ projects, onProjectMove, onProjectClick }: KanbanBoardProps) {
  const { hasPermission } = usePermissions()
  const canMoveCard = hasPermission('move_card')
  
  // Estado local otimista para atualização em tempo real
  const [localProjects, setLocalProjects] = useState<Project[]>(projects)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedOverColumn, setDraggedOverColumn] = useState<ColumnId | null>(null)
  // Movimento otimista pendente: não sobrescrever local com props até o pai refletir
  const pendingMoveRef = useRef<{ projectId: string; targetColumn: ColumnId } | null>(null)

  // Sincronizar projetos locais quando props mudarem (mas não durante drag)
  // Não sincronizar se acabamos de soltar e o pai ainda não atualizou (evita "volta" do card)
  useEffect(() => {
    if (activeId) return

    const pending = pendingMoveRef.current
    if (pending) {
      const projectInProps = projects.find((p) => p.id === pending.projectId)
      const propsAlreadyUpdated = projectInProps?.status === pending.targetColumn
      if (!propsAlreadyUpdated) {
        return // Mantém estado otimista até o pai receber a nova lista
      }
      pendingMoveRef.current = null
    }

    setLocalProjects(projects)
  }, [projects, activeId])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
      disabled: !canMoveCard,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over || !activeId) {
      setDraggedOverColumn(null)
      return
    }

    const projectId = activeId as string
    const newStatus = over.id as ColumnId
    
    // Validar se é uma coluna válida
    if (columns.some(col => col.id === newStatus)) {
      setDraggedOverColumn(newStatus)
      setLocalProjects(prev => {
        const project = prev.find(p => p.id === projectId)
        // Só atualizar se realmente mudou de coluna
        if (project && project.status !== newStatus) {
          return prev.map(p => 
            p.id === projectId ? { ...p, status: newStatus } : p
          )
        }
        return prev
      })
    } else {
      setDraggedOverColumn(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, collisions } = event
    const projectId = active.id as string

    // Limpar estados de drag
    setActiveId(null)
    setDraggedOverColumn(null)

    let targetColumn: ColumnId | null = null

    // Se tem over direto, usar ele
    if (over) {
      const overId = over.id as string
      if (columns.some(col => col.id === overId)) {
        targetColumn = overId as ColumnId
      }
    }

    // Se não encontrou coluna direta, procurar nas colisões
    if (!targetColumn && collisions) {
      for (const collision of collisions) {
        const collisionId = collision.id as string
        if (columns.some(col => col.id === collisionId)) {
          targetColumn = collisionId as ColumnId
          break
        }
      }
    }

    // Se ainda não encontrou, usar a coluna que estava sendo arrastada sobre
    if (!targetColumn && draggedOverColumn) {
      targetColumn = draggedOverColumn
    }

    // Se não encontrou nenhuma coluna válida, restaurar estado original
    if (!targetColumn) {
      setLocalProjects(projects)
      return
    }

    // Buscar o projeto original (antes do drag)
    const originalProject = projects.find(p => p.id === projectId)
    
    if (!originalProject) {
      setLocalProjects(projects)
      return
    }

    // Se o status realmente mudou, atualizar backend
    if (originalProject.status !== targetColumn) {
      pendingMoveRef.current = { projectId, targetColumn }
      // Manter o estado otimista; não sincronizar com props até o pai refletir
      Promise.resolve(
        (onProjectMove(projectId, targetColumn) as Promise<unknown> | undefined)
      ).catch((error: unknown) => {
        console.error('Error moving project:', error)
        pendingMoveRef.current = null
        setLocalProjects(projects)
      })
    } else {
      setLocalProjects(projects)
    }
  }

  const getProjectsByStatus = (status: ColumnId) => {
    return localProjects.filter(p => p.status === status)
  }

  const activeProject = activeId ? localProjects.find(p => p.id === activeId) : null

  // Função customizada de detecção de colisão que sempre encontra a coluna mais próxima
  const collisionDetection = (args: any) => {
    // Primeiro tenta pointerWithin (se o ponteiro está dentro de algo)
    const pointerCollisions = pointerWithin(args)
    
    // Se encontrou colisões com pointer, filtra para colunas válidas
    if (pointerCollisions.length > 0) {
      const columnCollisions = pointerCollisions.filter((collision: any) => 
        columns.some(col => col.id === collision.id)
      )
      if (columnCollisions.length > 0) {
        return columnCollisions
      }
    }

    // Se não encontrou com pointer, usa rectIntersection (intersecção de retângulos)
    const rectCollisions = rectIntersection(args)
    if (rectCollisions.length > 0) {
      const columnCollisions = rectCollisions.filter((collision: any) => 
        columns.some(col => col.id === collision.id)
      )
      if (columnCollisions.length > 0) {
        return columnCollisions
      }
    }

    // Por último, usa closestCorners para encontrar a coluna mais próxima
    const closestCollisions = closestCorners(args)
    const columnCollisions = closestCollisions.filter((collision: any) => 
      columns.some(col => col.id === collision.id)
    )
    
    return columnCollisions.length > 0 ? columnCollisions : closestCollisions
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 h-full overflow-x-auto overflow-y-hidden">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            projects={getProjectsByStatus(column.id)}
            onProjectClick={onProjectClick}
            isDraggedOver={draggedOverColumn === column.id}
            activeDragId={activeId}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeProject ? (
          <div className="rotate-2 opacity-95">
            <KanbanCard project={activeProject} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
