import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Box, Paper, Typography, useTheme } from '@mui/material';
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
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 280, maxWidth: 280 }}>
      {/* Cabeçalho da coluna */}
      <Box sx={{ mb: 1.5, mt: 2, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="subtitle2" fontWeight={600} color="text.primary" sx={{ fontSize: 13 }}>
          {title}
        </Typography>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 20,
            height: 20,
            px: 0.75,
            borderRadius: 999,
            bgcolor: isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
            color: 'text.secondary',
          }}
        >
          <Typography variant="caption" fontWeight={600} sx={{ fontSize: 11, lineHeight: 1 }}>
            {projects.length}
          </Typography>
        </Box>
      </Box>

      <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <Paper
          ref={setNodeRef}
          variant="outlined"
          elevation={0}
          sx={{
            flex: 1,
            p: 1.5,
            border: `1px solid ${highlight ? theme.palette.primary.main : theme.palette.divider}`,
            bgcolor: highlight
              ? isLight ? 'rgba(37,99,235,0.04)' : 'rgba(96,165,250,0.06)'
              : isLight ? 'background.paper' : 'rgba(255,255,255,0.02)',
            overflowY: 'auto',
            overflowX: 'hidden',
            transition: 'border-color 0.15s ease, background-color 0.15s ease',
            borderRadius: 2,
            /* Remove animação de borda giratória das colunas — só nos cards */
            '&::before': { display: 'none' },
            '&::after': { display: 'none' },
            '& > *': { position: 'static !important' },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {projects.map((project) => (
              <KanbanCard key={project.id} project={project} onClick={() => onProjectClick(project)} />
            ))}

            {/* Placeholder de drop */}
            {isDraggedOver && activeDragId && !projects.some((p) => p.id === activeDragId) && (
              <Box
                sx={{
                  height: 72,
                  border: `2px dashed ${theme.palette.primary.light}`,
                  borderRadius: 1.5,
                  bgcolor: isLight ? 'rgba(37,99,235,0.04)' : 'rgba(96,165,250,0.06)',
                  opacity: 0.7,
                }}
              />
            )}

            {/* Empty state */}
            {projects.length === 0 && !isDraggedOver && (
              <Typography
                variant="body2"
                color="text.disabled"
                textAlign="center"
                sx={{ py: 4, px: 2, fontSize: 13 }}
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
