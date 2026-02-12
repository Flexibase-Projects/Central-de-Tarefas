import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"
import { cn } from "@/lib/utils"

interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const SidebarContent = React.forwardRef<HTMLDivElement, SidebarContentProps>(
  ({ className, children, dir: _dir, ...props }, ref) => {
    return (
      <ScrollAreaPrimitive.Root
        ref={ref}
        data-sidebar="content"
        className={cn("flex-1 overflow-hidden", className)}
        {...props}
      >
        <ScrollAreaPrimitive.Viewport className="h-full w-full">
          {children}
        </ScrollAreaPrimitive.Viewport>
        <ScrollAreaPrimitive.Scrollbar
          className="flex touch-none select-none transition-colors"
          orientation="vertical"
        >
          <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-sidebar-border" />
        </ScrollAreaPrimitive.Scrollbar>
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>
    )
  }
)
SidebarContent.displayName = "SidebarContent"

export { SidebarContent }
