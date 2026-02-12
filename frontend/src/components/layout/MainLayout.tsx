import { ReactNode } from 'react'
import { useLocation, Link } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/sidebar'
import { LayoutDashboard, Code2, CheckSquare, Settings, LogOut, Map } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown'

interface MainLayoutProps {
  children: ReactNode
}

// Estrutura de menu por categorias
const menuCategories = [
  {
    label: 'Insight',
    items: [
      {
        title: 'Dashboard',
        url: '/',
        icon: LayoutDashboard,
        permission: null, // Sempre visível
      },
      {
        title: 'Mapa',
        url: '/mapa',
        icon: Map,
        permission: null, // Sempre visível (vazio por enquanto)
      },
    ],
  },
  {
    label: 'Lançamentos',
    items: [
      {
        title: 'Desenvolvimentos',
        url: '/desenvolvimentos',
        icon: Code2,
        permission: 'access_desenvolvimentos',
      },
      {
        title: 'Atividades',
        url: '/atividades',
        icon: CheckSquare,
        permission: 'access_atividades',
      },
    ],
  },
  {
    label: 'Gestão',
    items: [
      {
        title: 'Administração',
        url: '/admin',
        icon: Settings,
        permission: 'admin', // Verificar role ao invés de permission
        requireRole: 'admin',
      },
    ],
  },
]

function MainLayoutContent({ children }: MainLayoutProps) {
  const location = useLocation()
  const { state } = useSidebar()
  const { hasPermission, hasRole } = usePermissions()
  const { logout, currentUser } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Obter título e descrição baseado na rota atual
  const getPageInfo = () => {
    for (const category of menuCategories) {
      const item = category.items.find(item => item.url === location.pathname)
      if (item) {
        if (item.url === '/desenvolvimentos') {
          return {
            title: 'Desenvolvimentos',
            description: 'Gerencie seus projetos de desenvolvimento em um Kanban interativo'
          }
        }
        if (item.url === '/atividades') {
          return {
            title: 'Atividades',
            description: 'Gerencie suas atividades em um Kanban interativo'
          }
        }
        if (item.url === '/') {
          return {
            title: 'Dashboard',
            description: 'Visão geral do departamento de Inteligência'
          }
        }
        if (item.url === '/admin') {
          return {
            title: 'Administração',
            description: 'Gerencie usuários, cargos e permissões do sistema'
          }
        }
        if (item.url === '/mapa') {
          return {
            title: 'Mapa',
            description: 'Visualização em mapa dos projetos e atividades'
          }
        }
      }
    }
    return { title: '', description: '' }
  }

  const pageInfo = getPageInfo()

  return (
    <div className="flex h-screen w-full">
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader>
          <div className={cn(
            "flex items-center w-full",
            state === 'expanded' ? "gap-2 px-2" : "justify-center px-0"
          )}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Code2 className="h-4 w-4" />
            </div>
            {state === 'expanded' && (
              <div className="flex flex-col min-w-0">
                <div className="text-sm font-semibold truncate">CDT Inteligência</div>
                <div className="text-xs text-sidebar-foreground/70 truncate">Central de Tarefas</div>
              </div>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent>
          {menuCategories.map((category) => {
            // Filtrar itens baseado em permissões
            const visibleItems = category.items.filter((item) => {
              if ('requireRole' in item && item.requireRole) {
                // Verificar role (admin)
                return hasRole('admin')
              }
              if (item.permission) {
                // Verificar permissão específica
                return hasPermission(item.permission)
              }
              // Sem verificação de permissão (sempre visível)
              return true
            })

            // Não mostrar categoria se não houver itens visíveis
            if (visibleItems.length === 0) return null

            return (
              <SidebarGroup key={category.label} label={state === 'expanded' ? category.label : undefined}>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.url

                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                        >
                          <Link to={item.url} className="flex items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0" />
                            {state === 'expanded' && <span>{item.title}</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroup>
            )
          })}
        </SidebarContent>
        {currentUser && (
          <SidebarFooter>
            <div className={cn(
              "flex items-center w-full gap-2",
              state === 'expanded' ? "justify-between" : "justify-center"
            )}>
              {state === 'expanded' && (
                <span className="text-sm text-sidebar-foreground truncate flex-1">
                  {currentUser.name}
                </span>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className={cn(
                  "h-8 w-8 p-0",
                  state === 'expanded' && "h-8 w-auto px-2"
                )}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {state === 'expanded' && <span className="ml-2 text-sm">Sair</span>}
              </Button>
            </div>
          </SidebarFooter>
        )}
      </Sidebar>
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-4 border-b border-border px-6 py-4 min-h-[80px]">
          <SidebarTrigger />
          {pageInfo.title && (
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">{pageInfo.title}</h1>
              {pageInfo.description && (
                <p className="text-sm text-muted-foreground mt-1">{pageInfo.description}</p>
              )}
            </div>
          )}
          {!pageInfo.title && <div className="flex-1" />}
          <div className="flex items-center gap-2">
            <NotificationsDropdown />
          </div>
        </header>
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </SidebarProvider>
  )
}
