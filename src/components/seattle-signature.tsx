import { SeattleSketch } from "@/components/lab/seattle-sketch"
import { SeattleCredit } from "@/components/seattle-credit"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface SeattleSignatureProps {
  animated?: boolean
  speed?: number
  compact?: boolean
  align?: "left" | "center"
  layout?: "stacked" | "beside"
  utilities?: ReactNode
  minimal?: boolean
}

export function SeattleSignature({ animated = true, speed = 1, compact = false, align = "center", layout = "stacked", utilities, minimal = false }: SeattleSignatureProps) {
  const beside = layout === "beside"
  const creditAlign = beside ? "left" : align
  return (
    <div className={cn(creditAlign === "left" ? "text-left" : "text-center", beside && "flex items-center gap-3", beside && (align === "center" ? "justify-center" : "justify-start"))}>
      <SeattleSketch
        raining={animated}
        speed={speed}
        tightFrame={beside}
        className={cn("w-44", !beside && align === "center" && "mx-auto", compact && "w-32", beside && "w-24 shrink-0")}
      />
      <div className={cn("mt-3", compact && "mt-1", beside && "mt-0 min-w-0 flex-1", beside && minimal && "w-fit flex-none")}>
        <SeattleCredit animated={animated} compact={compact} align={creditAlign} small={beside} minimal={minimal} />
        {utilities}
      </div>
    </div>
  )
}
