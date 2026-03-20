import { Box } from '@mui/material'
import { Project } from '@/types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface MapProjectBubbleProps {
  project: Project
  abbreviation: string
  x: number
  y: number
  onDragStart: (e: React.DragEvent, projectId: string) => void
  onClick: (project: Project) => void
}

export function MapProjectBubble({
  project,
  abbreviation,
  x,
  y,
  onDragStart,
  onClick,
}: MapProjectBubbleProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Box
            component="span"
            role="button"
            tabIndex={0}
            draggable
            onDragStart={(e) => onDragStart(e, project.id)}
            onClick={(e) => {
              e.stopPropagation()
              onClick(project)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick(project)
              }
            }}
            sx={{
              position: 'absolute',
              zIndex: 10,
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: '2px solid',
              borderColor: 'primary.main',
              bgcolor: 'primary.main',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'grab',
              boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              transition: 'box-shadow 0.2s, background-color 0.15s',
              '&:hover': {
                boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
                bgcolor: 'primary.light',
              },
              '&:active': {
                cursor: 'grabbing',
              },
            }}
          >
            {abbreviation}
          </Box>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="font-medium">{project.name}</p>
          {project.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
