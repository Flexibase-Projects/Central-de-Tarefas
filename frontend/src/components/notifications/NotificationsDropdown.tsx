import { useState, useMemo } from 'react'
import {
  IconButton,
  Button,
  Menu,
  Box,
  Typography,
  CircularProgress,
  Tooltip,
  Badge,
  Paper,
} from '@/compat/mui/material'
import { Bell, Check, CheckCheck } from '@/components/ui/icons'
import { useNotifications } from '@/hooks/use-notifications'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { Notification } from '@/types'

function getNotificationRoute(notification: Notification): string | null {
  const message = notification.message?.toLowerCase() ?? ''
  const looksLikeActivity =
    notification.type.startsWith('activity_') ||
    notification.type.includes('activity') ||
    message.includes(' atividade "') ||
    message.includes(' na atividade ')

  if (notification.project_id) {
    const params = new URLSearchParams(
      looksLikeActivity
        ? { activity: notification.project_id }
        : { project: notification.project_id },
    )
    if (notification.related_id && notification.related_type === 'todo') {
      params.set('todo', notification.related_id)
    }
    return looksLikeActivity
      ? `/atividades?${params.toString()}`
      : `/desenvolvimentos?${params.toString()}`
  }

  if (notification.related_type === 'activity' && notification.related_id) {
    return `/atividades?activity=${notification.related_id}`
  }

  if (notification.related_type === 'todo' && notification.related_id) {
    return `/atividades?todo=${notification.related_id}`
  }

  return null
}

export function NotificationsDropdown() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const navigate = useNavigate()

  const unreadNotifications = notifications.filter((notification) => !notification.read)

  const unreadByProject = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    unreadNotifications.forEach((notification) => {
      if (notification.project_id) {
        const name = notification.message?.match(/(?:projeto|atividade) "([^"]+)"/i)?.[1] || 'Projeto'
        const current = map.get(notification.project_id)
        if (current) current.count++
        else map.set(notification.project_id, { name, count: 1 })
      }
    })
    return Array.from(map.values())
  }, [unreadNotifications])

  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {}
    const withoutProject: Notification[] = []
    notifications.forEach((notification) => {
      if (notification.project_id) {
        if (!groups[notification.project_id]) groups[notification.project_id] = []
        groups[notification.project_id].push(notification)
      } else {
        withoutProject.push(notification)
      }
    })
    return { groups, withoutProject }
  }, [notifications])

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleNotificationClick = (notification: Notification) => {
    const route = getNotificationRoute(notification)
    if (!route) return

    if (!notification.read) {
      void markAsRead(notification.id)
    }
    handleClose()
    navigate(route)
  }

  return (
    <>
      <Tooltip
        title={
          unreadCount > 0 ? (
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {unreadCount} {unreadCount === 1 ? 'notificacao nao lida' : 'notificacoes nao lidas'}
              </Typography>
              {unreadByProject.length > 0 && (
                <Box sx={{ mt: 0.5 }}>
                  {unreadByProject.slice(0, 3).map((project, idx) => (
                    <Typography key={idx} variant="caption" display="block" sx={{ opacity: 0.9 }}>
                      • {project.name}: {project.count}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          ) : (
            'Notificacoes'
          )
        }
      >
        <IconButton
          onClick={handleOpen}
          aria-label="Notificacoes"
          aria-controls={open ? 'notifications-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          size="small"
          sx={{
            width: 40,
            height: 40,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            '&:hover': {
              bgcolor: 'action.hover',
            },
            ...(unreadCount > 0 && {
              color: 'primary.main',
              borderColor: 'primary.light',
            }),
          }}
        >
          <Badge badgeContent={unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : 0} color="error" max={99}>
            <Bell size={18} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        id="notifications-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 'min(480px, 80vh)',
            mt: 1.5,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          },
        }}
        MenuListProps={{ disablePadding: true }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: 'action.hover',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
              Notificacoes
            </Typography>
            {unreadNotifications.length > 0 && (
              <Button
                size="small"
                variant="text"
                startIcon={<CheckCheck size={16} />}
                onClick={markAllAsRead}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Marcar todas como lidas
              </Button>
            )}
          </Box>
        </Box>

        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ py: 6, px: 3, textAlign: 'center' }}>
              <Bell size={48} style={{ marginBottom: 8 }} />
              <Typography variant="body2" color="text.secondary">
                Nenhuma notificacao
              </Typography>
            </Box>
          ) : (
            <Box sx={{ py: 0.5 }}>
              {Object.entries(groupedNotifications.groups).map(([projectId, projectNotifications]) => {
                const projectName = projectNotifications[0]?.message?.match(/(?:projeto|atividade) "([^"]+)"/i)?.[1] || 'Projeto'
                return (
                  <Box key={projectId}>
                    <Box sx={{ px: 2, py: 0.75 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {projectName}
                      </Typography>
                    </Box>
                    {projectNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={() => markAsRead(notification.id)}
                        onClick={() => handleNotificationClick(notification)}
                      />
                    ))}
                  </Box>
                )
              })}

              {groupedNotifications.withoutProject.length > 0 && (
                <Box>
                  <Box sx={{ px: 2, py: 0.75 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Geral e atividades
                    </Typography>
                  </Box>
                  {groupedNotifications.withoutProject.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={() => markAsRead(notification.id)}
                      onClick={() => handleNotificationClick(notification)}
                    />
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Menu>
    </>
  )
}

function NotificationItem({
  notification,
  onMarkRead,
  onClick,
}: {
  notification: Notification
  onMarkRead: () => void
  onClick: () => void
}) {
  const isUnread = !notification.read
  const hasRoute = Boolean(getNotificationRoute(notification))

  return (
    <Paper
      elevation={0}
      sx={{
        mx: 1,
        mb: 0.5,
        borderRadius: 1.5,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: isUnread ? 'primary.light' : 'divider',
        bgcolor: isUnread ? 'action.selected' : 'transparent',
        cursor: hasRoute ? 'pointer' : 'default',
        transition: 'background-color 0.15s, border-color 0.15s',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
      onClick={onClick}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={isUnread ? 600 : 500} sx={{ lineHeight: 1.35 }}>
            {notification.title}
          </Typography>
          {notification.message && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                mt: 0.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {notification.message}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
          </Typography>
        </Box>
        {isUnread && (
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation()
              onMarkRead()
            }}
            sx={{ flexShrink: 0, color: 'primary.main' }}
            title="Marcar como lida"
          >
            <Check size={20} />
          </IconButton>
        )}
      </Box>
    </Paper>
  )
}
