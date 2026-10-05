import { useId } from "react"
import { pigment } from "./bloom-geometry"
import { BLOOM_PIGMENTS } from "./bloom-tokens"
import type { LadybirdAppearance } from "./bloom-ladybird-geometry"

export function LadybirdDrawing({ appearance }: { appearance: LadybirdAppearance }) {
  const id = useId().replace(/:/g, "")
  const { variety, rx, ry, marks, lightness } = appearance
  const colors = BLOOM_PIGMENTS.ladybird
  return (
    <g data-ladybird-variety={variety.id} data-wing-markings={marks.length}>
      <defs><clipPath id={`ladybird-shell-${id}`}><ellipse cy={2} rx={rx} ry={ry} /></clipPath></defs>
      <g fill="none" stroke={colors.black} strokeWidth={0.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M-6 -4 L-11 -8 L-13 -7 M-7 0 L-12 0 L-14 3 M-6 6 L-10 9 L-11 13 M6 -4 L11 -8 L13 -7 M7 0 L12 0 L14 3 M6 6 L10 9 L11 13" />
        <path className="bloom-ladybird-antennae" d="M-2.8 -11 Q-4 -14 -5.5 -15 M2.8 -11 Q4 -14 5.5 -15" />
      </g>
      <ellipse cy={-10.5} rx={3.5} ry={3.2} fill={colors.black} />
      <path d="M-5.8 -7.2 Q-6 -11.7 0 -12 Q6 -11.7 5.8 -7.2 Q0 -4.8 -5.8 -7.2Z"
        fill={variety.collar} stroke={colors.black} strokeWidth={0.55} />
      <ellipse cy={2} rx={rx} ry={ry} fill={pigment(variety.shell, lightness)} stroke={colors.black} strokeWidth={0.7} />
      <g clipPath={`url(#ladybird-shell-${id})`}>
        <g fill={variety.marking}>
          {marks.map((mark, i) => <ellipse key={i} cx={mark.x} cy={mark.y} rx={mark.rx} ry={mark.ry}
            transform={`rotate(${mark.rotation} ${mark.x} ${mark.y})`} />)}
        </g>
        <path d={`M0 ${2 - ry} Q-.35 2 0 ${2 + ry}`} fill="none"
          stroke={variety.shell === colors.black ? colors.cream : colors.black} strokeWidth={0.6} opacity={0.65} />
      </g>
    </g>
  )
}
