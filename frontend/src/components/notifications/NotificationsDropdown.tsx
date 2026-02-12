import { useState, useMemo } from 'react';
import { Bell, Check, Loader2, CheckSquare2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNotifications } from '@/hooks/use-notifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Notification } from '@/types';
import { cn } from '@/lib/utils';

export function NotificationsDropdown() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const unreadNotifications = notifications.filter((n) => !n.read);
  
  // Agrupar notificações não lidas por projeto para preview
  const unreadByProject = useMemo(() => {
    const groups: { [key: string]: { name: string; count: number } } = {};
    
    unreadNotifications.forEach((notification) => {
      if (notification.project_id) {
        const projectName = notification.message?.match(/projeto "([^"]+)"/)?.[1] || 'Projeto';
        if (!groups[notification.project_id]) {
          groups[notification.project_id] = { name: projectName, count: 0 };
        }
        groups[notification.project_id].count++;
      }
    });
    
    return Object.values(groups);
  }, [unreadNotifications]);

  // Agrupar notificações por projeto
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {};
    const withoutProject: Notification[] = [];

    notifications.forEach((notification) => {
      if (notification.project_id) {
        if (!groups[notification.project_id]) {
          groups[notification.project_id] = [];
        }
        groups[notification.project_id].push(notification);
      } else {
        withoutProject.push(notification);
      }
    });

    return { groups, withoutProject };
  }, [notifications]);

  const handleNotificationClick = (notification: Notification) => {
    if (notification.project_id) {
      // Marcar como lida
      if (!notification.read) {
        markAsRead(notification.id);
      }
      // Fechar popover
      setOpen(false);
      // Navegar para desenvolvimentos com o project_id e todo_id se houver
      const params = new URLSearchParams({ project: notification.project_id });
      if (notification.related_id && notification.related_type === 'todo') {
        params.set('todo', notification.related_id);
      }
      navigate(`/desenvolvimentos?${params.toString()}`);
    }
  };

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className={cn(
                  "h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center shadow-lg border-2 border-background shrink-0",
                  "bg-destructive text-destructive-foreground",
                  "ring-2 ring-destructive/50 ring-offset-1",
                  "animate-pulse"
                )}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "relative h-10 px-3 gap-2 transition-all",
                    unreadCount > 0 && "bg-primary/10 hover:bg-primary/20"
                  )}
                >
                  <Bell className={cn(
                    "h-5 w-5 transition-all shrink-0",
                    unreadCount > 0 && "text-primary"
                  )} />
                  {unreadCount > 0 && (
                    <span className="text-sm font-semibold text-primary hidden sm:inline">
                      {unreadCount} {unreadCount === 1 ? 'pendente' : 'pendentes'}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
            </div>
          </TooltipTrigger>
          {unreadCount > 0 && (
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-semibold text-sm">Você tem {unreadCount} {unreadCount === 1 ? 'tarefa pendente' : 'tarefas pendentes'}</p>
                {unreadByProject.length > 0 && (
                  <div className="text-xs space-y-0.5">
                    {unreadByProject.slice(0, 3).map((project, idx) => (
                      <p key={idx} className="text-muted-foreground">
                        • {project.count} {project.count === 1 ? 'TO-DO' : 'TO-DOs'} em {project.name}
                      </p>
                    ))}
                    {unreadByProject.length > 3 && (
                      <p className="text-muted-foreground italic">
                        +{unreadByProject.length - 3} {unreadByProject.length - 3 === 1 ? 'projeto' : 'projetos'} mais
                      </p>
                    )}
                  </div>
                )}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {unreadNotifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-7 text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            <div className="divide-y">
              {/* Notificações agrupadas por projeto */}
              {Object.entries(groupedNotifications.groups).map(([projectId, projectNotifications]) => {
                const projectName = projectNotifications[0]?.message?.match(/projeto "([^"]+)"/)?.[1] || 'Projeto';
                
                return (
                  <div key={projectId} className="divide-y">
                    <div className="px-4 py-2 bg-muted/50 border-b">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {projectName}
                      </h4>
                    </div>
                    {projectNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                          !notification.read ? 'bg-muted/30' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0">
                            <CheckSquare2 className={`h-4 w-4 ${
                              !notification.read ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-medium">{notification.title}</h4>
                              {!notification.read && (
                                <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                              )}
                            </div>
                            {notification.message && (
                              <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                                {notification.message}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              
              {/* Notificações sem projeto */}
              {groupedNotifications.withoutProject.length > 0 && (
                <div className="divide-y">
                  {groupedNotifications.withoutProject.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-muted/50 transition-colors ${
                        !notification.read ? 'bg-muted/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium">{notification.title}</h4>
                            {!notification.read && (
                              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          {notification.message && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
