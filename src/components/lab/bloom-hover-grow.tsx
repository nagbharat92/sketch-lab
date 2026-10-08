import type { ReactNode } from "react"
import type { HaloState } from "./bloom-halo"

export function BloomHoverGrow({ state, x = 0, y = 0, children }: {
  state?: HaloState; x?: number; y?: number; children: ReactNode
}) {
  return (
    <g className="bloom-hover-grow" data-growing={state ? "true" : undefined}
      style={{ transformOrigin: `${x}px ${y}px` }}>
      {children}
    </g>
  )
}
