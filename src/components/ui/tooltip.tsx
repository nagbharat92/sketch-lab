import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"
import { InkBoilText } from "@/components/ui/ink-boil"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 8, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "tooltip-pop z-50 rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground",
        className
      )}
      {...props}
    >
      <InkBoilText>{children}</InkBoilText>
      <TooltipPrimitive.Arrow asChild width={16} height={6} className="fill-primary">
        <svg viewBox="0 0 16 6" aria-hidden="true">
          <path d="M0 0 C3 0 3.5 0.6 5 2.5 L6.5 4.5 Q8 7.5 9.5 4.5 L11 2.5 C12.5 0.6 13 0 16 0 Z" />
        </svg>
      </TooltipPrimitive.Arrow>
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
