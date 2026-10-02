// The parametric "bloom" — the site-wide SELECTED-swatch mark.
//
// A radial silhouette: the radius rises to a petal tip and falls to a valley,
// `petals` times around. `bulge` sets how deep the valleys cut; `round` shapes
// the petal (fat & overlapping → slim & separated). The bloom is SYMMETRIC by
// construction — the endless spin (CSS `.animate-bloom-spin`) supplies the
// motion, so there's no rotation/jitter baked into the geometry.
//
//   r(θ) = R · (rMin + (1 − rMin) · lobe(θ)^round),   rMin = 1 − bulge

export type BloomShape = {
  petals: number
  bulge: number
  round: number
}

/** The flower silhouette as an SVG path `d` string (before roughjs ink). */
export function bloomPath(cx: number, cy: number, R: number, s: BloomShape): string {
  const steps = 140
  const rMin = 1 - s.bulge
  let d = ""
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const lobe = 0.5 + 0.5 * Math.cos(s.petals * t) // 1 at tip, 0 at valley
    const r = R * (rMin + (1 - rMin) * Math.pow(lobe, s.round))
    d += (i === 0 ? "M" : "L") + (cx + r * Math.cos(t)).toFixed(2) + " " + (cy + r * Math.sin(t)).toFixed(2) + " "
  }
  return d + "Z"
}

/** Hand-tweaked blooms we rotate through as the active shape. A selection picks
 *  one at random, never repeating the last (see `randomBloomIndex`). */
export const BLOOM_PRESETS: BloomShape[] = [
  { petals: 4, bulge: 0.5, round: 0.6 },
  { petals: 5, bulge: 0.4, round: 0.6 },
  { petals: 5, bulge: 0.46, round: 1.05 },
  { petals: 6, bulge: 0.31, round: 1.1 },
  { petals: 6, bulge: 0.26, round: 0.6 },
  { petals: 7, bulge: 0.47, round: 0.6 },
  { petals: 8, bulge: 0.23, round: 0.6 },
]

/** A sensible default bloom, used before any selection re-rolls the shape.
 *  (Constant — never call `randomBloomIndex` during render; it's impure.) */
export const DEFAULT_BLOOM: BloomShape = { petals: 6, bulge: 0.4, round: 1.2 }

/** Pick a preset INDEX at random, never returning `exclude` — so consecutive
 *  rolls always change the shape. The shift-past-excluded trick keeps a uniform
 *  distribution over the remaining presets. Call only from event handlers. */
export function randomBloomIndex(exclude: number, random = Math.random): number {
  const n = BLOOM_PRESETS.length
  if (n <= 1) return 0
  if (exclude < 0 || exclude >= n) return Math.floor(random() * n)
  let i = Math.floor(random() * (n - 1))
  if (i >= exclude) i++ // skip the excluded slot
  return i
}

/** Stable per-name seed so each swatch keeps its own hand-drawn sketch. */
export const bloomSeed = (name: string) => name.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
