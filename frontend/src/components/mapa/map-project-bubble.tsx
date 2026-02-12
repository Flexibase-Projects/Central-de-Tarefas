import { Project } from '@/types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

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
          <div
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
            className={cn(
              'absolute z-10 flex h-11 w-11 cursor-grab items-center justify-center rounded-full border-2 border-primary/30 bg-primary/15 text-sm font-semibold text-foreground shadow-sm transition-shadow active:cursor-grabbing hover:shadow-md hover:bg-primary/25'
            )}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {abbreviation}
          </div>
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
