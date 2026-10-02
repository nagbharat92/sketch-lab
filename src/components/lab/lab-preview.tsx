import { Bloom } from "@/components/lab/color-swatch"
import { SeattleSketch } from "@/components/lab/seattle-sketch"
import { circlePaths, linePaths, roughPathInfos, roundedPolygonPath, ROUGH_OPTIONS } from "@/components/lab/rough"
import { RoughBox, RoughLine } from "@/components/ui/rough-ink"
import { DEFAULT_BLOOM } from "@/lib/bloom"
import { cn } from "@/lib/utils"

const folderPaths = roughPathInfos(
  roundedPolygonPath([
    { x: 12, y: 18 }, { x: 48, y: 18 }, { x: 62, y: 34 },
    { x: 124, y: 34 }, { x: 124, y: 94 }, { x: 12, y: 94 },
  ], 8),
  { ...ROUGH_OPTIONS, seed: 7, fill: "none", stroke: "currentColor" },
)
const controlPaths = [
  ...linePaths(14, 38, 126, 38, 41),
  ...circlePaths(82, 38, 20, 42),
  ...linePaths(46, 77, 88, 77, 43),
]

export function LabPreview({ id, active, compact = false }: { id: string; active: boolean; compact?: boolean }) {
  switch (id) {
    case "seattle":
      return <SeattleSketch raining={active} className={cn("w-40 [--lab-surface:var(--surface-raised)]", compact && "w-11 [--lab-surface:var(--surface)]")} />
    case "folder-lab":
      return (
        <svg width={compact ? 40 : 136} height={compact ? 32 : 108} viewBox="0 0 136 108" className={cn(active && compact && "ink-boil-on")}>
          <g fill="none" stroke="currentColor" strokeWidth={compact ? 3 : ROUGH_OPTIONS.strokeWidth} strokeLinecap="round">
            {folderPaths.map((path, i) => <path key={i} d={path.d} />)}
          </g>
        </svg>
      )
    case "type-pairing":
      return (
        <div className="flex items-baseline gap-2">
          <span className={cn("font-display text-6xl", compact && "text-xl", active && compact && "ink-boil-on")}>Aa</span>
          {!compact && <span className="text-4xl text-muted-foreground">Bb</span>}
        </div>
      )
    case "backgrounds":
      return (
        <div className={cn("flex gap-3", compact && "gap-1")}>
          {["var(--accent-yellow)", "var(--accent-blue)", "var(--accent-green)"].map((color, i) => (
            <div key={color} style={{ backgroundColor: color }} className={cn("relative size-12 rounded-lg", compact && "size-2.5 rounded-full", compact && active && "ink-boil-on")}>
              {!compact && <RoughBox seed={51 + i} />}
            </div>
          ))}
        </div>
      )
    case "motion":
      return (
        <div className={cn("flex w-32 flex-col gap-3", compact && "w-8 gap-0.5")}>
          {[61, 62, 63].map((seed) => <RoughLine key={seed} seed={seed} boil={active} bowing={2} />)}
        </div>
      )
    case "flower-lab":
      return <Bloom size={compact ? 36 : 112} radius={compact ? 15 : 46} shape={DEFAULT_BLOOM} fill="var(--accent-primary)" seed={7} centerHole spin={active} />
    case "text-boil":
      return <span className={cn("text-4xl font-bold", compact && "text-xl", active && "ink-boil-on")}>{compact ? "Aa" : "Hello."}</span>
    case "controls":
      return (
        <svg width={compact ? 40 : 140} height={compact ? 32 : 108} viewBox="0 0 140 108" className={cn(active && compact && "ink-boil-on")}>
          <g fill="none" stroke="currentColor" strokeWidth={compact ? 3 : ROUGH_OPTIONS.strokeWidth} strokeLinecap="round">
            {controlPaths.map((d, i) => <path key={i} d={d} />)}
          </g>
        </svg>
      )
    default:
      return <RoughLine className={compact ? "w-8" : "w-32"} />
  }
}
