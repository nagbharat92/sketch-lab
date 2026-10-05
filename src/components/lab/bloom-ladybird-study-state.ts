import { leafAnatomy, leafBoundary } from "./bloom-geometry.ts"
import { boundaryClearance, pointInsidePolygon, sceneRandom, studySeed } from "./bloom-math.ts"
import { LEAF_FAMILIES } from "./bloom-tokens.ts"
import { createLadybirdAppearance } from "./bloom-ladybird-geometry.ts"
import type { LadybirdAppearance } from "./bloom-ladybird-geometry.ts"

export function ladybirdLanding(anatomy: ReturnType<typeof leafAnatomy>, appearance: LadybirdAppearance, random: () => number) {
  const boundary = leafBoundary(anatomy.edge)
  const scale = (0.55 + random() * 0.1) * appearance.variety.size
  const radius = appearance.radius * scale
  const candidates = []
  for (let y = -85; y <= -20; y += 2) {
    for (let x = -30; x <= 30; x += 2) {
      const p = { x, y }
      if (pointInsidePolygon(p, boundary) && boundaryClearance(p, boundary) > radius) candidates.push(p)
    }
  }
  if (!candidates.length) throw new Error("Ladybird leaf has no safe interior landing positions")
  const position = candidates[Math.floor(random() * candidates.length)]
  return { ...position, scale, appearance }
}

export function createLadybirdSpecimen(seed: number) {
  const anatomySeed = studySeed(seed, "ladybird-study")
  const random = sceneRandom(anatomySeed, "ladybird-leaf")
  const family = LEAF_FAMILIES[Math.floor(random() * LEAF_FAMILIES.length)]
  const anatomy = leafAnatomy(anatomySeed, "leaf:0:0:0", family)
  const appearance = createLadybirdAppearance(seed)
  const ladybird = ladybirdLanding(anatomy, appearance, random)
  return { seed, anatomySeed, family, width: 100 + Math.floor(random() * 4) * 5,
    ladybird: { ...ladybird, angle: random() * 360 }, radius: appearance.radius * ladybird.scale }
}
