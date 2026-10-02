import { useId, useMemo } from "react"
import type { CSSProperties } from "react"
import { roughPathInfos, ROUGH_OPTIONS } from "@/components/lab/rough"
import { cn } from "@/lib/utils"
import { useBoilSeed } from "@/hooks/use-boil-seed"

const doodleInk = {
  ...ROUGH_OPTIONS,
  roughness: 1.6,
  bowing: 1.2,
  disableMultiStroke: true,
  preserveVertices: false,
  stroke: "currentColor",
  fill: "none",
}
const skylineShapes = [
  "M42 216 L43 175 L65 174 L66 153 L89 155 L88 212",
  "M91 205 L92 136 L108 131 L117 135 L117 209",
  "M186 208 L187 139 L201 138 L204 123 L221 126 L223 213",
  "M227 210 L226 167 L250 163 L263 176 L264 214",
  "M65 219 Q76 212 88 218 Q97 224 112 218",
  "M191 219 Q213 225 231 218 Q247 213 276 221",
]
const skylinePaths = skylineShapes.flatMap((d, i) => roughPathInfos(d, {
  ...doodleInk,
  roughness: 2,
  strokeWidth: 3.5,
  seed: 201 + i,
}))
const needleShapes = [
  { d: "M150 44 Q151 54 149 64", weight: 4.5 },
  { d: "M139 70 Q150 65 164 71", weight: 4.8 },
  { d: "M116 83 Q147 73 186 81", weight: 6.2 },
  { d: "M123 89 Q151 98 181 87", weight: 5 },
  { d: "M130 99 C139 123 150 141 149 163 C148 183 141 204 137 217", weight: 5.4 },
  { d: "M174 97 C165 121 156 141 157 163 C158 186 167 204 173 217", weight: 5.8 },
  { d: "M151 103 C154 140 151 181 154 215", weight: 4.4 },
  { d: "M132 222 Q151 226 178 220", weight: 2.6 },
]
const drops = Array.from({ length: 32 }, (_, i) => {
  const depth = ((i * 137 + 43) % 997) / 997
  const length = 4 + depth * 9
  const duration = 2.6 - depth * 1.2
  return {
    x: 38 + ((i * 79 + 17) % 257),
    length,
    depth,
    duration,
    delay: -duration * (((i * 311 + 109) % 997) / 997),
    paths: roughPathInfos(`M0 0 L${-length * 0.14} ${length}`, {
      ...ROUGH_OPTIONS,
      seed: 121 + i,
      roughness: 0.75,
      disableMultiStroke: true,
      strokeWidth: 0.65 + depth * 0.65,
      stroke: "currentColor",
      fill: "none",
    }),
  }
})
const splashPaths = roughPathInfos("M-4 0 Q0 -1.8 4 0 Q0 1.8 -4 0", {
  ...ROUGH_OPTIONS,
  seed: 181,
  roughness: 0.7,
  disableMultiStroke: true,
  stroke: "currentColor",
  fill: "none",
  strokeWidth: 0.7,
})

interface SeattleSketchProps {
  raining?: boolean
  speed?: number
  className?: string
  tightFrame?: boolean
}

/** Only the Needle cycles ink seeds; skyline and rain paths stay fixed. */
export function SeattleSketch({ raining = true, speed = 1, className, tightFrame = false }: SeattleSketchProps) {
  const clipId = `seattle-rain-${useId().replace(/:/g, "")}`
  const needleSeed = useBoilSeed(81, raining)
  const needlePaths = useMemo(
    () => needleShapes.map((shape, i) => roughPathInfos(shape.d, {
      ...doodleInk,
      strokeWidth: shape.weight,
      seed: needleSeed + i,
    })),
    [needleSeed],
  )
  return (
    <svg
      viewBox={tightFrame ? "28 28 264 204" : "0 0 320 240"}
      aria-hidden="true"
      className={cn("seattle-sketch block w-full text-foreground", className)}
      data-raining={raining}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="16" y="12" width="288" height="218" rx="12" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} className="text-muted-foreground">
        {drops.map((drop, i) => (
          <g key={i} transform={`translate(${drop.x} 0)`}>
            <g
              className="seattle-rain-drop"
              style={{
                animationDelay: `${drop.delay / speed}s`,
                animationDuration: `${drop.duration / speed}s`,
                "--rain-opacity": 0.22 + drop.depth * 0.35,
                "--rain-end-y": `${218 - drop.length}px`,
              } as CSSProperties}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
            >
              {drop.paths.map((path, j) => <path key={j} d={path.d} strokeWidth={path.strokeWidth} />)}
            </g>
          </g>
        ))}
        {drops.filter((drop) => drop.depth > 0.7).map((drop, i) => (
          <g key={`splash-${i}`} transform={`translate(${drop.x - 20} 218)`}>
            <g
              className="seattle-rain-splash"
              style={{
                animationDelay: `${drop.delay / speed}s`,
                animationDuration: `${drop.duration / speed}s`,
              }}
              strokeLinecap="round"
            >
              {splashPaths.map((path, j) => (
                <path key={j} d={path.d} stroke={path.stroke} fill="none" strokeWidth={path.strokeWidth} />
              ))}
            </g>
          </g>
        ))}
      </g>
      <g strokeLinecap="round" strokeLinejoin="round">
        <g opacity="0.4">
          {skylinePaths.map((path, i) => (
            <path key={i} d={path.d} stroke={path.stroke} fill="none" strokeWidth={path.strokeWidth} />
          ))}
        </g>
        <g data-sketch="needle">
          {needlePaths.flatMap((paths, i) => paths.map((path, j) => (
            <path key={`${i}-${j}`} d={path.d} stroke={path.stroke} fill={path.fill ?? "none"} strokeWidth={path.strokeWidth} />
          )))}
        </g>
      </g>
    </svg>
  )
}
