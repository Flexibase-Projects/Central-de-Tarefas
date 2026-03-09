import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Box, Paper, Typography } from '@mui/material';
import { Project } from '@/types';
import { KanbanCard } from './kanban-card';

interface KanbanColumnProps {
  id: string;
  title: string;
  projects: Project[];
  onProjectClick: (project: Project) => void;
  isDraggedOver?: boolean;
  activeDragId?: string | null;
}

export function KanbanColumn({
  id,
  title,
  projects,
  onProjectClick,
  isDraggedOver = false,
  activeDragId = null,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const highlight = isOver || isDraggedOver;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 280, maxWidth: 280 }}>
      <Box sx={{ mb: 1.5, mt: 2, flexShrink: 0 }}>
        <Typography variant="subtitle1" fontWeight={600} color="text.primary">
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}
        </Typography>
      </Box>
      <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <Paper
          ref={setNodeRef}
          variant="outlined"
          elevation={0}
          sx={{
            flex: 1,
            p: 1.5,
            border: '1px solid',
            borderColor: highlight ? 'primary.main' : 'divider',
            bgcolor: (theme) =>
              highlight
                ? theme.palette.action.selected
                : theme.palette.mode === 'dark'
                  ? theme.palette.background.paper
                  : 'grey.50',
            overflowY: 'auto',
            overflowX: 'hidden',
            transition: 'border-color 0.2s ease, background-color 0.2s ease',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {projects.map((project) => (
              <KanbanCard key={project.id} project={project} onClick={() => onProjectClick(project)} />
            ))}
            {isDraggedOver && activeDragId && !projects.some((p) => p.id === activeDragId) && (
              <Box
                sx={{
                  height: 80,
                  border: '2px dashed',
                  borderColor: 'primary.light',
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  opacity: 0.7,
                }}
              />
            )}
            {projects.length === 0 && (
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
                sx={{ py: 4, px: 2 }}
              >
                Arraste projetos aqui
              </Typography>
            )}
          </Box>
        </Paper>
      </SortableContext>
    </Box>
  );
}
