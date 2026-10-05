import { leafAnatomy, leafBoundary } from "./bloom-geometry.ts"
import { noiseVariegation } from "./bloom-monstera-variegation.ts"
import { LEAF_MARKINGS, LEAF_STUDY } from "./bloom-tokens.ts"

export function leafStudyVariegation(seed: number, anatomy: ReturnType<typeof leafAnatomy>, pattern: typeof LEAF_MARKINGS[number], coverage: number) {
  const boundary = leafBoundary(anatomy.edge)
  const width = Math.max(...boundary.map((point) => point.x)) - Math.min(...boundary.map((point) => point.x))
  const markings = noiseVariegation(seed, pattern, boundary, { spine: anatomy.spine, width }, 0, { coverage, pink: false, rounding: LEAF_STUDY.markingRounding, profile: "leaf" })
  return coverage === 1 && pattern !== "plain" ? { ...markings, paths: [anatomy.edge] } : markings
}
