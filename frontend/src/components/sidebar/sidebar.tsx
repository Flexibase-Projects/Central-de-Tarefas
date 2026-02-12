import * as React from "react"
import { useSidebar } from "./sidebar-provider"
import { cn } from "@/lib/utils"
import { PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ side = "left", variant = "sidebar", collapsible = "offcanvas", className, children, ...props }, ref) => {
    const { state, open, setOpen, isMobile } = useSidebar()

    if (collapsible === "none") {
      return (
        <div
          ref={ref}
          data-side={side}
          data-variant={variant}
          className={cn(
            "group/sidebar flex h-full w-[240px] flex-col bg-sidebar text-sidebar-foreground",
            "border-r border-sidebar-border",
            className
          )}
          {...props}
        >
          {children}
        </div>
      )
    }

    return (
      <>
        <div
          ref={ref}
          data-side={side}
          data-variant={variant}
          data-state={state}
          data-collapsible={collapsible ?? ""}
          data-mobile={isMobile}
          className={cn(
            "group/sidebar peer flex h-full shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 ease-linear",
            "w-[240px] data-[state=collapsed]:w-[56px]",
            "border-r border-sidebar-border",
            isMobile && "fixed inset-y-0 z-50 w-[240px] data-[state=collapsed]:-translate-x-full",
            !isMobile && "relative",
            className
          )}
          {...props}
        >
          {children}
        </div>
        {isMobile && open && (
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setOpen(false)}
          />
        )}
      </>
    )
  }
)
Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={toggleSidebar}
      {...props}
    >
      <PanelLeft className="h-5 w-5" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarRail = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="rail"
      className={cn(
        "absolute inset-y-0 z-50 hidden w-1 -translate-x-full bg-sidebar-border transition-all group-data-[collapsible=icon]:translate-x-0 group-data-[collapsible=icon]:bg-sidebar-accent group-data-[side=right]:translate-x-full",
        className
      )}
      {...props}
    />
  )
})
SidebarRail.displayName = "SidebarRail"

export { Sidebar, SidebarTrigger, SidebarRail }
