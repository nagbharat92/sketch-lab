import type { MonsteraArtwork } from "./bloom-monstera-artwork"
import type { MonsteraPetiole } from "./bloom-monstera-pose"
import { roughPathInfos, ROUGH_OPTIONS } from "./rough"
import { MONSTERA_STUDY_STALK, MONSTERA_STUDY_VARIEGATION_COLOR, MONSTERA_STUDY_VARIEGATION_OUTLINE } from "./bloom-tokens"

type InkPaths = ReturnType<typeof roughPathInfos>
type InkFrame = { leaf: InkPaths; stalk: InkPaths; ivory: InkPaths; pink: InkPaths }
const cache = new WeakMap<MonsteraArtwork, WeakMap<object, Map<number, InkFrame>>>()

export function monsteraInk(artwork: MonsteraArtwork, petiole: MonsteraPetiole | undefined, seed: number): InkFrame {
  let poses = cache.get(artwork)
  if (!poses) { poses = new WeakMap(); cache.set(artwork, poses) }
  const pose = petiole ?? artwork
  let frames = poses.get(pose)
  if (!frames) { frames = new Map(); poses.set(pose, frames) }
  const cached = frames.get(seed)
  if (cached) return cached
  const draw = (paths: string[], stroke: string) => paths.flatMap((d, i) => roughPathInfos(d, {
    ...ROUGH_OPTIONS, seed: seed + i * MONSTERA_STUDY_VARIEGATION_OUTLINE.seedStep,
    roughness: MONSTERA_STUDY_VARIEGATION_OUTLINE.roughness, bowing: MONSTERA_STUDY_VARIEGATION_OUTLINE.bowing,
    stroke, strokeWidth: MONSTERA_STUDY_VARIEGATION_OUTLINE.width, fill: "none", disableMultiStroke: true,
  }))
  const frame = {
    leaf: roughPathInfos(artwork.anatomy.outline, {
      ...ROUGH_OPTIONS, seed, roughness: 0.5, bowing: 0.5, stroke: "currentColor", strokeWidth: 0.8, fill: "none",
    }),
    stalk: petiole ? roughPathInfos(petiole.outline, {
      ...ROUGH_OPTIONS, seed, roughness: MONSTERA_STUDY_STALK.roughness, bowing: MONSTERA_STUDY_STALK.bowing,
      stroke: "currentColor", strokeWidth: MONSTERA_STUDY_STALK.inkWidth, fill: "none", disableMultiStroke: true,
    }) : [],
    ivory: draw(artwork.materials.paths, MONSTERA_STUDY_VARIEGATION_COLOR.ivoryOutline),
    pink: draw(artwork.materials.pinkPaths, MONSTERA_STUDY_VARIEGATION_COLOR.pinkOutline),
  }
  if (frames.size === 8) {
    const oldest = frames.keys().next()
    if (!oldest.done) frames.delete(oldest.value)
  }
  frames.set(seed, frame)
  return frame
}
