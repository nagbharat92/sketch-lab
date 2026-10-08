import { memo, useLayoutEffect, useMemo, useRef } from "react"
import { stickerSizeFactor } from "./bloom-sticker-size"

export type HaloState = "hover" | "selected"
export type HaloContour = { d: string; transform?: string }

type HaloProps = {
  state?: HaloState
} & (
  | { paths: readonly string[]; contours?: never }
  | { contours: readonly HaloContour[]; paths?: never }
)

export const SelectionHalo = memo(function SelectionHalo({ paths, contours, state }: HaloProps) {
  const shapes = useMemo<readonly HaloContour[]>(() => contours ?? paths.map((d) => ({ d })), [paths, contours])
  const backing = useRef<SVGGElement>(null)
  useLayoutEffect(() => {
    const element = backing.current
    if (!element || !element.ownerSVGElement) throw new Error("Sticker backing must belong to an SVG")
    const measure = () => {
      const bounds = element.getBBox()
      const matrix = element.getScreenCTM()
      if (!matrix) throw new Error("Sticker backing must have a screen transform")
      // Measure the resting artwork, not its transient hover enlargement.
      let growth = 1
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (parent.classList.contains("bloom-hover-grow")) growth *= Number(getComputedStyle(parent).scale)
      }
      const factor = stickerSizeFactor(
        bounds.width * Math.hypot(matrix.a, matrix.b) / growth,
        bounds.height * Math.hypot(matrix.c, matrix.d) / growth,
      )
      element.style.setProperty("--bloom-sticker-size", String(factor))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element.ownerSVGElement)
    return () => observer.disconnect()
  }, [shapes])
  if (!shapes.length || shapes.some((shape) => !shape.d.trim())) {
    throw new Error("A selectable garden element must provide its own silhouette")
  }

  return (
    <g ref={backing} className="bloom-halo" data-halo={state ?? "idle"} aria-hidden="true" pointerEvents="none">
      {/* A solid backing beneath the artwork also fills its cutouts and openings. */}
      <g className="bloom-halo-paper" strokeLinecap="round" strokeLinejoin="round">
        {shapes.map((shape, i) => <path key={i} d={shape.d} transform={shape.transform} vectorEffect="non-scaling-stroke" />)}
      </g>
    </g>
  )
})

/** The ladybird is drawn from radii rather than a path, so give its halo a shell to trace. */
export function shellHaloPath(cy: number, rx: number, ry: number) {
  if (![cy, rx, ry].every(Number.isFinite) || rx <= 0 || ry <= 0) {
    throw new RangeError("A ladybird halo needs a finite, positive shell")
  }
  const k = 0.5523
  return `M0 ${cy - ry} C${rx * k} ${cy - ry} ${rx} ${cy - ry * k} ${rx} ${cy}`
    + ` C${rx} ${cy + ry * k} ${rx * k} ${cy + ry} 0 ${cy + ry}`
    + ` C${-rx * k} ${cy + ry} ${-rx} ${cy + ry * k} ${-rx} ${cy}`
    + ` C${-rx} ${cy - ry * k} ${-rx * k} ${cy - ry} 0 ${cy - ry} Z`
}
