import { SeattleSketch } from "@/components/lab/seattle-sketch"
import { SeattleCredit } from "@/components/seattle-credit"
import { cn } from "@/lib/utils"

interface SeattleSignatureProps {
  animated?: boolean
  speed?: number
  compact?: boolean
}

export function SeattleSignature({ animated = true, speed = 1, compact = false }: SeattleSignatureProps) {
  return (
    <div className="text-center">
      <SeattleSketch
        raining={animated}
        speed={speed}
        className={cn("mx-auto w-44", compact && "w-32")}
      />
      <div className={cn("mt-3", compact && "mt-1")}>
        <SeattleCredit animated={animated} compact={compact} />
      </div>
    </div>
  )
}
