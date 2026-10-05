import { useId, type CSSProperties, type ReactNode } from "react"
import { useBoilSeed } from "@/hooks/use-boil-seed"
import { useBloomVisibility } from "@/hooks/use-bloom-visibility"
import { BLOOM_MOTION, BLOOM_STUDY_MOTION } from "./bloom-tokens"

export function BloomStudyStage({ seed, label, children, sway = true, boil = true, settle = true, displace = true }: {
  seed: number; label: string; sway?: boolean; boil?: boolean; settle?: boolean; displace?: boolean
  children: (inkSeed: number, filter: string | undefined, active: boolean) => ReactNode
}) {
  const { ref, active } = useBloomVisibility()
  const inkSeed = useBoilSeed(BLOOM_MOTION.inkSeed, active && boil)
  const id = `study-ink-${useId().replace(/:/g, "")}`
  const style: CSSProperties & Record<"--study-settle" | "--study-sway", string> = {
    "--study-settle": BLOOM_STUDY_MOTION.settleDuration,
    "--study-sway": BLOOM_STUDY_MOTION.swayDuration,
  }

  const filtered = active && boil && displace
  return (
    <div ref={ref} style={style} className="bloom-study-stage" data-active={active} data-sway={sway} data-settle={settle} data-generation={seed} role="group" aria-label={label}>
      {filtered && <svg className="bloom-study-filter" aria-hidden="true" width={0} height={0}>
        <defs>
          <filter id={id} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.065" numOctaves={2} seed={inkSeed} result="ink" />
            <feDisplacementMap in="SourceGraphic" in2="ink" scale={active && boil ? BLOOM_STUDY_MOTION.displacement : 0} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>}
      <div className="bloom-study-sway">
        <div className="bloom-study-arrival" key={settle ? seed : undefined}>
          {children(inkSeed, filtered ? `url(#${id})` : undefined, active)}
        </div>
        <span className="sr-only" role="status">{label}. Drawing {seed}.</span>
      </div>
    </div>
  )
}
