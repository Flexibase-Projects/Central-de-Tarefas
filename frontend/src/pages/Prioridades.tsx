import { useCallback, useMemo, useState } from 'react'
import { Box, Chip, Paper, Typography } from '@/compat/mui/material'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from '@/components/ui/icons'
import { PageSyncScreen, WorkspaceSyncBanner } from '@/components/system/WorkspaceSyncFeedback'
import { PriorityAnalyticsCharts } from '@/components/priorities/priority-analytics-charts'
import { useAuth } from '@/contexts/AuthContext'
import { useProjects } from '@/hooks/use-projects'
import { useTodoCardSummary } from '@/hooks/use-todo-card-summary'
import type { Project } from '@/types'

const STATUS_LABELS: Record<Project['status'], string> = {
  backlog: 'Backlog',
  todo: 'A fazer',
  in_progress: 'Em progresso',
  review: 'Revisao',
  done: 'Concluido',
}

function SortableProjectCard({ project, index, canDrag }: { project: Project; index: number; canDrag: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ id: project.id, disabled: !canDrag })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: 'transform 0.22s cubic-bezier(0.25, 0.1, 0.25, 1)',
  }

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      variant="outlined"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 1,
        opacity: isDragging ? 0.6 : 1,
        cursor: canDrag ? 'grab' : 'default',
        border: '1px solid',
        borderColor: 'divider',
        ...(canDrag && { '&:active': { cursor: 'grabbing' } }),
        '&:hover': { bgcolor: 'action.hover' },
        willChange: isDragging ? 'transform' : undefined,
      }}
    >
      {canDrag ? (
        <Box
          {...attributes}
          {...listeners}
          sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}
        >
          <GripVertical size={20} />
        </Box>
      ) : null}
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 24 }}>
        {index + 1}.
      </Typography>
      <Typography variant="body1" fontWeight={500} sx={{ flex: 1, minWidth: 0 }} noWrap>
        {project.name}
      </Typography>
      <Chip
        size="small"
        label={STATUS_LABELS[project.status]}
        sx={{ fontWeight: 500, flexShrink: 0 }}
      />
    </Paper>
  )
}

export default function Prioridades() {
  const { projects, loading, error, updatePriorityOrder } = useProjects()
  const { rows: summaryRows, loading: summaryLoading, error: summaryError } = useTodoCardSummary()
  const { hasRole } = useAuth()
  const isAdmin = hasRole('admin')
  const [savingOrder, setSavingOrder] = useState(false)

  const summaryByProjectId = useMemo(() => {
    return new Map(
      summaryRows
        .filter((row) => row.entity_type === 'project')
        .map((row) => [row.project_id, row]),
    )
  }, [summaryRows])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = projects.findIndex((project) => project.id === active.id)
      const newIndex = projects.findIndex((project) => project.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(projects, oldIndex, newIndex)
      const orderedIds = reordered.map((project) => project.id)
      setSavingOrder(true)
      try {
        await updatePriorityOrder(orderedIds)
      } finally {
        setSavingOrder(false)
      }
    },
    [projects, updatePriorityOrder],
  )

  if (error && projects.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ p: 2, flexShrink: 0 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Prioridades
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {isAdmin
            ? 'Arraste os cards para ordenar: o item no topo e o mais importante. A ordem e salva automaticamente.'
            : 'Prioridades dos projetos definidas pelo administrador.'}{' '}
          Os gráficos abaixo cruzam a posição na fila com to-dos concluídos e abertos (somente to-dos do cartão do projeto).
        </Typography>
        {savingOrder ? (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Salvando ordem...
          </Typography>
        ) : null}
        {error ? (
          <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
            {error}
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <WorkspaceSyncBanner
          active={loading && projects.length > 0}
          title="Atualizando prioridades"
          description="A ordem atual continua visivel enquanto sincronizamos a fila e os dados operacionais do workspace."
        />

        {projects.length > 0 ? (
          <PriorityAnalyticsCharts
            projects={projects}
            summaryByProjectId={summaryByProjectId}
            loadingSummary={summaryLoading}
            summaryError={summaryError}
          />
        ) : null}

        {loading && projects.length === 0 ? (
          <PageSyncScreen
            title="Sincronizando prioridades"
            description="Estamos montando a fila de projetos para voce retomar a priorizacao sem encarar uma tela vazia."
            minHeight="100%"
          />
        ) : projects.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              textAlign: 'center',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography color="text.secondary">
              Nenhum desenvolvimento cadastrado. Crie projetos em Desenvolvimentos para lista-los aqui.
            </Typography>
          </Paper>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={projects.map((project) => project.id)}
              strategy={verticalListSortingStrategy}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {projects.map((project, index) => (
                  <SortableProjectCard key={project.id} project={project} index={index} canDrag={isAdmin} />
                ))}
              </Box>
            </SortableContext>
          </DndContext>
        )}
      </Box>
    </Box>
  )
}
