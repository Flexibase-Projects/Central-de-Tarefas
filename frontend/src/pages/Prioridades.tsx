import { useState, useCallback, useEffect } from 'react'
import { Box, Typography, Paper, Chip, CircularProgress } from '@mui/material'
import { GripVertical } from '@/components/ui/icons'
import { useGitHub } from '@/hooks/use-github'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useProjects } from '@/hooks/use-projects'
import { useAuth } from '@/contexts/AuthContext'
import type { Project } from '@/types'

const STATUS_LABELS: Record<Project['status'], string> = {
  backlog: 'Backlog',
  todo: 'A fazer',
  in_progress: 'Em progresso',
  review: 'Revisão',
  done: 'Concluído',
}

function GitHubIconSmall() {
  const size = 12
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} style={{ display: 'block' }}>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

function SortableProjectCard({ project, index, canDrag }: { project: Project; index: number; canDrag: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ id: project.id, disabled: !canDrag })
  const { getCommitsCount } = useGitHub()
  const [commitsCount, setCommitsCount] = useState<number | null>(null)

  useEffect(() => {
    if (project.github_url) {
      getCommitsCount(project.github_url)
        .then(setCommitsCount)
        .catch(() => setCommitsCount(0))
    } else {
      setCommitsCount(null)
    }
  }, [project.github_url, getCommitsCount])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: 'transform 0.22s cubic-bezier(0.25, 0.1, 0.25, 1)',
  }

  const displayCommits = commitsCount !== null ? commitsCount : '--'

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
      {canDrag && (
        <Box
          {...attributes}
          {...listeners}
          sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}
        >
          <GripVertical size={20} />
        </Box>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 24 }}>
        {index + 1}.
      </Typography>
      {project.github_url && (
        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            height: 20,
            px: 1,
            borderRadius: 1,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.secondary',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'inherit' }}>
            <GitHubIconSmall />
          </Box>
          <Typography component="span" variant="caption" fontWeight={600} sx={{ fontSize: 11, lineHeight: 1 }}>
            {String(displayCommits).padStart(2, '0')}
          </Typography>
        </Box>
      )}
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
  const { hasRole } = useAuth()
  const isAdmin = hasRole('admin')
  const [savingOrder, setSavingOrder] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = projects.findIndex((p) => p.id === active.id)
      const newIndex = projects.findIndex((p) => p.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(projects, oldIndex, newIndex)
      const orderedIds = reordered.map((p) => p.id)
      setSavingOrder(true)
      try {
        await updatePriorityOrder(orderedIds)
      } finally {
        setSavingOrder(false)
      }
    },
    [projects, updatePriorityOrder]
  )

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={40} />
      </Box>
    )
  }

  if (error) {
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
            ? 'Arraste os cards para ordenar: o item no topo é o mais importante. A ordem é salva automaticamente.'
            : 'Prioridades dos projetos definidas pelo administrador.'}
        </Typography>
        {savingOrder && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Salvando ordem...
          </Typography>
        )}
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: 2, pb: 2 }}>
        {projects.length === 0 ? (
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
              Nenhum desenvolvimento cadastrado. Crie projetos em Desenvolvimentos para listá-los aqui.
            </Typography>
          </Paper>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={projects.map((p) => p.id)}
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
