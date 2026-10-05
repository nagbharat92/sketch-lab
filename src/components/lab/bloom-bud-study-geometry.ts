import { curvePath, curvePoint, sceneRandom, type Curve, type Point } from "./bloom-math.ts"
import { petioleOutline } from "./bloom-monstera-study-geometry.ts"
import { BLOOM_PIGMENTS } from "./bloom-tokens.ts"
import { leafAnatomy, leafBoundary } from "./bloom-geometry.ts"

export type BudStage = "tight" | "full" | "opening"

export function studyBudGeometry(seed: number, label: string, selectedStage?: BudStage) {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError("Bud seed must be a non-negative safe integer")
  const random = sceneRandom(seed, `bud-anatomy:${label}`)
  const draw = random()
  const stage = selectedStage ?? (draw < 0.33 ? "tight" : draw < 0.66 ? "full" : "opening")
  const opening = stage === "tight" ? 0.15 + draw * 0.2 : stage === "full" ? 0.45 + draw * 0.15 : 0.78 + draw * 0.18
  const height = (stage === "tight" ? 44 : stage === "full" ? 51 : 48) + random() * 7
  const width = (stage === "tight" ? 10 : stage === "full" ? 16 : 22) + random() * 2
  const bend = (random() - 0.5) * 4, asymmetry = 0.94 + random() * 0.12
  const open = stage === "opening"
  const p = (x: number, y: number): Point => ({
    x: x * width * (x < 0 ? asymmetry : 2 - asymmetry) + bend * -y, y: y * height,
  })
  const shape = (coordinates: readonly (readonly [number, number])[]) => {
    let start = p(...coordinates[0])
    const curves: Curve[] = []
    for (let i = 1; i < coordinates.length; i += 3) {
      const curve: Curve = [start, p(...coordinates[i]), p(...coordinates[i + 1]), p(...coordinates[i + 2])]
      curves.push(curve)
      start = curve[3]
    }
    return { d: `M${curves[0][0].x} ${curves[0][0].y} ${curves.map(([, a, b, c]) => `C${a.x} ${a.y} ${b.x} ${b.y} ${c.x} ${c.y}`).join(" ")} Z`,
      boundary: curves.flatMap((curve) => Array.from({ length: 25 }, (_, i) => curvePoint(curve, i / 24))) }
  }
  const closed = shape([
    [0, 0], [-0.8, -0.13], [-1.06, -0.52], [-0.76, -0.79],
    [-0.55, -0.97], [-0.13, -1.04], [0.06, -1],
    [0.36, -0.98], [0.95, -0.72], [0.88, -0.46],
    [0.86, -0.21], [0.4, -0.04], [0, 0],
  ])
  const back = shape([
    [0, -0.02], [-0.6, -0.24], [-0.83, -0.71], [-0.42, -0.96],
    [-0.16, -1.12], [0.27, -1.07], [0.47, -0.93],
    [0.78, -0.67], [0.65, -0.28], [0, -0.02],
  ])
  const leftPetal = shape([
    [0, 0], [-0.73, -0.13], [-1.2, -0.52], [-1.03, -0.85],
    [-0.96, -1.01], [-0.69, -0.92], [-0.43, -0.71],
    [-0.09, -0.47], [0.27, -0.2], [0, 0],
  ])
  const rightPetal = shape([
    [0, 0], [0.72, -0.1], [1.21, -0.48], [1.08, -0.8],
    [1.01, -0.99], [0.69, -0.91], [0.4, -0.67],
    [0.04, -0.42], [-0.22, -0.13], [0, 0],
  ])
  const front = shape([
    [0, 0], [-0.49, -0.03], [-0.78, -0.31], [-0.75, -0.57],
    [-0.44, -0.67], [-0.12, -0.53], [0.09, -0.54],
    [0.3, -0.55], [0.59, -0.7], [0.78, -0.58],
    [0.83, -0.29], [0.46, -0.04], [0, 0],
  ])
  const panels = open
    ? [{ ...back, lightness: -9 }, { ...leftPetal, lightness: 4 }, { ...rightPetal, lightness: -3 }, { ...front, lightness: 9 }]
    : [{ ...closed, lightness: stage === "tight" ? 22 : 4 }]
  const edge = panels.map((panel) => panel.d).join(" ")
  const seams = (open ? [-0.42, 0.38] : [-0.24, 0.23]).map((side) => curvePath([
    p(side * 0.35, -0.05), p(side * 1.5, -0.3), p(side * 1.1, -0.67), p(side * 0.1, -0.93),
  ]))
  const sepalReach = stage === "tight" ? 0.73 : stage === "full" ? 0.45 : 0.3
  const sepals = [-1, 1].map((side) => shape([
    [0, 0.035], [side * 0.38, -0.04], [side * 0.66, -0.19], [side * 0.66, -sepalReach],
    [side * 0.32, -sepalReach * 0.7], [side * 0.14, -0.17], [0, 0.035],
  ]))
  const calyx = sepals.map((sepal) => sepal.d).join(" ")
  const boundary = [...panels.flatMap((panel) => panel.boundary), ...sepals.flatMap((sepal) => sepal.boundary)]
  const colors = BLOOM_PIGMENTS.buds
  const color = colors[Math.floor(sceneRandom(seed, "study-bud-color")() * colors.length)]
  return { edge, panels, seams, calyx, boundary, opening, stage, height, width, color }
}

export type StudyBud = ReturnType<typeof studyBudGeometry>

export function stalkDirection(curve: Curve, t: number): Point {
  if (!Number.isFinite(t) || t < 0 || t > 1) throw new RangeError("Stalk tangent position must be between 0 and 1")
  const u = 1 - t
  const x = 3 * u * u * (curve[1].x - curve[0].x) + 6 * u * t * (curve[2].x - curve[1].x) + 3 * t * t * (curve[3].x - curve[2].x)
  const y = 3 * u * u * (curve[1].y - curve[0].y) + 6 * u * t * (curve[2].y - curve[1].y) + 3 * t * t * (curve[3].y - curve[2].y)
  const length = Math.hypot(x, y)
  if (!Number.isFinite(length) || length === 0) throw new Error("Bud stalk needs a finite, non-degenerate tangent")
  return { x: x / length, y: y / length }
}

const directionAngle = (direction: Point) => Math.atan2(direction.x, -direction.y) * 180 / Math.PI

export function sprigGeometry(seed: number, count: number) {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError("Sprig seed must be a non-negative safe integer")
  if (!Number.isInteger(count) || count < 2 || count > 4) throw new RangeError("Sprig branch count must be between 2 and 4")
  const random = sceneRandom(seed, "study-sprig")
  const lean = (random() - 0.5) * 46
  const curve: Curve = [{ x: 0, y: 78 }, { x: -lean - 12, y: 16 },
    { x: lean + 18, y: -58 }, { x: lean * 0.65, y: -112 }]
  const stageOrder: BudStage[] = ["tight", "full", "opening"]
  const stageOffset = Math.floor(sceneRandom(seed, "study-bud-stages")() * stageOrder.length)
  const stageAt = (index: number) => stageOrder[(index + stageOffset) % stageOrder.length]
  const bud = { attachment: curve[3], angle: directionAngle(stalkDirection(curve, 1)), scale: 0.92 + random() * 0.22,
    anatomy: studyBudGeometry(seed, "leader", stageAt(0)) }
  const branches = Array.from({ length: count }, (_, i) => {
    const branchRandom = sceneRandom(seed, `study-sprig-branch:${i}`)
    const t = 0.25 + i / count * 0.5, start = curvePoint(curve, t)
    const direction = stalkDirection(curve, t), side = i % 2 === 0 ? -1 : 1
    const tip = { x: start.x + side * (54 + branchRandom() * 18), y: start.y - 38 + (branchRandom() - 0.5) * 8 }
    const angle = side * (28 + branchRandom() * 24), radians = angle * Math.PI / 180
    const branch: Curve = [start, { x: start.x + direction.x * 28, y: start.y + direction.y * 28 },
      { x: tip.x - Math.sin(radians) * 27, y: tip.y + Math.cos(radians) * 27 }, tip]
    const scale = 0.65 + branchRandom() * 0.35
    return { curve: branch, tip, angle, scale, outline: petioleOutline(branch, 2.4, 1.15),
      bud: { attachment: tip, angle, scale, anatomy: studyBudGeometry(seed, `branch:${i}`, stageAt(i + 1)) } }
  })
  const leaves = Array.from({ length: count + 1 }, (_, i) => {
    const leafRandom = sceneRandom(seed, `study-sprig-leaf:${i}`)
    const side = i % 2 === 0 ? 1 : -1
    const branchIndex = i === count ? Math.floor(leafRandom() * count) : -1
    const parent = branchIndex === -1 ? curve : branches[branchIndex].curve
    const t = branchIndex === -1 ? 0.12 + i / count * 0.44 + leafRandom() * 0.04 : 0.18 + leafRandom() * 0.12
    const node = curvePoint(parent, t), direction = stalkDirection(parent, t)
    const angle = side * (40 + leafRandom() * 30), radians = angle * Math.PI / 180
    const length = i === 0 ? 48 + leafRandom() * 13
      : branchIndex !== -1 ? 25 + leafRandom() * 13 : 31 + leafRandom() * 14
    const width = length * (0.46 + leafRandom() * 0.18)
    const attachment = { x: node.x + side * (9 + leafRandom() * 9), y: node.y - 8 - leafRandom() * 6 }
    const petiole: Curve = [node, { x: node.x + direction.x * 9, y: node.y + direction.y * 9 },
      { x: attachment.x - Math.sin(radians) * 7, y: attachment.y + Math.cos(radians) * 7 }, attachment]
    const anatomy = leafAnatomy(seed, `leaf:${attachment.x}:${attachment.y}:${angle}`, "lance")
    const boundary = leafBoundary(anatomy.edge).map((p) => {
      const x = p.x * width / 48, y = p.y * length / 104
      return { x: attachment.x + x * Math.cos(radians) - y * Math.sin(radians),
        y: attachment.y + x * Math.sin(radians) + y * Math.cos(radians) }
    })
    return { node, attachment, angle, length, width, parentBranch: branchIndex, t, boundary,
      petiole, outline: petioleOutline(petiole, 1.3, 0.65) }
  })
  const points = [...curve, ...branches.flatMap((branch) => branch.curve), ...leaves.flatMap((leaf) => [...leaf.petiole, ...leaf.boundary])]
  for (const pose of [bud, ...branches.map((branch) => branch.bud)]) {
    const radians = pose.angle * Math.PI / 180
    points.push(...pose.anatomy.boundary.map((p) => ({
      x: pose.attachment.x + (p.x * Math.cos(radians) - p.y * Math.sin(radians)) * pose.scale,
      y: pose.attachment.y + (p.x * Math.sin(radians) + p.y * Math.cos(radians)) * pose.scale,
    })))
  }
  const left = Math.min(...points.map((p) => p.x)), right = Math.max(...points.map((p) => p.x))
  const top = Math.min(...points.map((p) => p.y)), bottom = Math.max(...points.map((p) => p.y))
  const width = Math.max(right - left + 24, (bottom - top + 24) * 0.9), height = width / 0.9
  const viewBox = { x: (left + right - width) / 2, y: (top + bottom - height) / 2, width, height }
  return { curve, outline: petioleOutline(curve, 4, 1.7), bud, branches, leaves, viewBox }
}
