import { useState, useEffect } from 'react';
import { Project } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, Box, Typography, useTheme } from '@mui/material';
import { Person, CheckSquare } from '@/components/ui/icons';

function GitHubIconSmall() {
  const size = 12;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} style={{ display: 'block' }}>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

import { useGitHub } from '@/hooks/use-github';
import { useTodos } from '@/hooks/use-todos';
import { useUsersList } from '@/hooks/use-users-list';
import { getApiBase } from '@/lib/api';

interface KanbanCardProps {
  project: Project;
  onClick?: () => void;
}

/** Barra lateral de status — cores semânticas */
const STATUS_STRIPE: Record<string, string> = {
  backlog:     '#94A3B8', // slate-400
  todo:        '#2563EB', // blue-600
  in_progress: '#D97706', // amber-600
  review:      '#7C3AED', // violet-700
  done:        '#059669', // emerald-600
};

export function KanbanCard({ project, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });
  const { getCommitsCount } = useGitHub();
  const { todos } = useTodos({ projectId: project.id });
  const { users } = useUsersList();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const [commitsCount, setCommitsCount] = useState<number | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    if (project.github_url) {
      getCommitsCount(project.github_url)
        .then(setCommitsCount)
        .catch(() => setCommitsCount(0));
    } else {
      setCommitsCount(0);
    }
  }, [project.github_url, getCommitsCount]);

  useEffect(() => {
    if (!project.project_url) { setOnline(null); return; }
    const base = getApiBase();
    const url = base
      ? `${base}/api/projects/health-check?url=${encodeURIComponent(project.project_url)}`
      : `/api/projects/health-check?url=${encodeURIComponent(project.project_url)}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : { ok: false }))
      .then((d) => setOnline(d.ok === true))
      .catch(() => setOnline(false));
  }, [project.project_url]);

  const pendingTodos = todos.filter((t) => !t.completed);
  const todosByAssignee = pendingTodos.reduce(
    (acc, todo) => {
      const id = todo.assigned_to || 'unassigned';
      if (!acc[id]) acc[id] = [];
      acc[id].push(todo);
      return acc;
    },
    {} as Record<string, typeof pendingTodos>
  );
  const assigneesWithCounts = Object.entries(todosByAssignee)
    .map(([assigneeId, list]) => {
      const user = assigneeId !== 'unassigned' ? users.find((u) => u.id === assigneeId) : null;
      return { assigneeId, count: list.length, userName: user?.name || 'Sem responsável' };
    })
    .sort((a, b) => b.count - a.count);

  const style = { transform: CSS.Transform.toString(transform), transition };
  const displayNumber = commitsCount !== null ? commitsCount : 0;
  const stripeColor = STATUS_STRIPE[project.status] || STATUS_STRIPE.backlog;
  const dotColor = !project.project_url ? '#94A3B8' : online === true ? '#059669' : online === false ? '#EF4444' : '#94A3B8';
  const hasCover = Boolean(project.cover_image_url);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      variant="outlined"
      sx={{
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
        position: 'relative',
        border: `1px solid ${theme.palette.divider}`,
        opacity: isDragging ? 0.45 : 1,
        bgcolor: 'background.paper',
        color: 'text.primary',
        overflow: 'hidden',
        boxShadow: isLight
          ? '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.03)'
          : '0 1px 3px rgba(0,0,0,0.2)',
      }}
    >
      {/* Imagem de capa */}
      {hasCover && (
        <Box
          sx={{
            width: '100%',
            height: 96,
            backgroundImage: `url(${project.cover_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            flexShrink: 0,
          }}
        />
      )}

      {/* Barra de status */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: hasCover ? 96 : 0,
          bottom: 0,
          width: 3,
          bgcolor: stripeColor,
          borderRadius: hasCover ? 0 : '8px 0 0 8px',
        }}
      />

      <CardContent sx={{ pl: 2.5, py: 1.5, pr: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Header: dot + título + github badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <Box
            sx={{
              flexShrink: 0,
              width: 7,
              height: 7,
              borderRadius: '50%',
              bgcolor: dotColor,
              border: `1.5px solid ${theme.palette.background.paper}`,
            }}
            title={
              project.project_url
                ? online === true ? 'Online' : online === false ? 'Offline' : 'Verificando...'
                : 'Link não configurado'
            }
          />
          <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0, fontSize: 13 }}>
            {project.name}
          </Typography>
          {project.github_url && (
            <Box
              sx={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                height: 20,
                px: 0.875,
                borderRadius: 1,
                bgcolor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${theme.palette.divider}`,
                color: 'text.secondary',
              }}
            >
              <GitHubIconSmall />
              <Typography component="span" variant="caption" fontWeight={600} sx={{ fontSize: 11, lineHeight: 1 }}>
                {commitsCount !== null ? String(displayNumber).padStart(2, '0') : '--'}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Descrição */}
        {project.description && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              mt: 0.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.4,
              fontSize: 12,
            }}
          >
            {project.description}
          </Typography>
        )}

        {/* Tarefas pendentes por responsável */}
        {pendingTodos.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
            {assigneesWithCounts.map((a) => (
              <Box
                key={a.assigneeId}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 0.875,
                  py: 0.375,
                  borderRadius: 1,
                  bgcolor: isLight ? 'background.default' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <CheckSquare size={12} style={{ color: theme.palette.text.secondary, flexShrink: 0 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  {a.count} pendente{a.count !== 1 ? 's' : ''}
                </Typography>
                <Person size={11} style={{ color: theme.palette.text.disabled, flexShrink: 0 }} />
                <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 11 }}>
                  {a.userName}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
