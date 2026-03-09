import { ReactNode, useState } from 'react'
import { Box } from '@mui/material'
import { AppSidebar } from './AppSidebar'
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown'

interface MainLayoutProps {
  children: ReactNode
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const sidebarWidth = sidebarCollapsed ? 72 : 240

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppSidebar isCollapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          ml: `${sidebarWidth}px`,
          transition: (theme) => theme.transitions.create('margin', { duration: 300 }),
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
      <NotificationsDropdown />
    </Box>
  )
}

export default function MainLayout({ children }: MainLayoutProps) {
  return <MainLayoutContent>{children}</MainLayoutContent>
}
