export type Point = { x: number; y: number }
export type Curve = readonly [Point, Point, Point, Point]

export function sceneRandom(seed: number, label: string) {
  let state = seed
  for (const character of label) state = (Math.imul(state, 31) + character.charCodeAt(0)) >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

export function studySeed(seed: number, label: string) {
  if (!Number.isSafeInteger(seed) || seed < 1) throw new RangeError("Study seed must be a positive safe integer")
  let value = Math.floor(sceneRandom(seed, label)() * 4294967296)
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d)
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b)
  return (value ^ (value >>> 16)) >>> 0
}

export function curvePoint(curve: Curve, t: number): Point {
  const u = 1 - t
  return {
    x: u ** 3 * curve[0].x + 3 * u ** 2 * t * curve[1].x + 3 * u * t ** 2 * curve[2].x + t ** 3 * curve[3].x,
    y: u ** 3 * curve[0].y + 3 * u ** 2 * t * curve[1].y + 3 * u * t ** 2 * curve[2].y + t ** 3 * curve[3].y,
  }
}

export const curvePath = (curve: Curve) =>
  `M${curve[0].x} ${curve[0].y} C${curve[1].x} ${curve[1].y} ${curve[2].x} ${curve[2].y} ${curve[3].x} ${curve[3].y}`

export function branchCurve(start: Point, end: Point): Curve {
  return [
    start,
    { x: start.x + (end.x - start.x) * 0.2, y: start.y + (end.y - start.y) * 0.6 },
    { x: start.x + (end.x - start.x) * 0.75, y: end.y + 7 },
    end,
  ]
}

export function pointInsidePolygon(p: Point, polygon: readonly Point[]) {
  let result = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j]
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) result = !result
  }
  return result
}

export function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}

export function boundaryClearance(p: Point, polygon: readonly Point[]) {
  let closest = Infinity
  for (let i = 0; i < polygon.length; i++) {
    closest = Math.min(closest, distanceToSegment(p, polygon[i], polygon[(i + 1) % polygon.length]))
  }
  return closest
}
