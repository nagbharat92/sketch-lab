import { branchCurve, sceneRandom, studySeed, type Curve, type Point } from "./bloom-math.ts"
import { monsteraStudyStalk, organicMonsteraBlade, petioleOutline } from "./bloom-monstera-study-geometry.ts"
import { BLOOM_COMPOSITION, BLOOM_SCENE, MONSTERA_GARDEN_POSE, MONSTERA_STUDY_FRAME } from "./bloom-tokens.ts"

export type MonsteraBladeFrame = { attachment: Point; rotation: number; scale: Point }
export type MonsteraPetiole = { curve: Curve; end: Point; outline: string; width: number; tipWidth: number }
export type MonsteraPose = { blade: MonsteraBladeFrame; petiole: MonsteraPetiole }
export type GardenMonsteraFacing = "inward" | "outward"
export type GardenMonsteraPose = MonsteraPose & { facing: GardenMonsteraFacing }
export type MonsteraPlacement = {
  root: Point
  placement: { tipTarget: Point; stalkLean: number }
  size: number
  fullness: number
  stemWidth: number
}
export type GardenMonsteraComposition = { center: Point; facing: GardenMonsteraFacing; lean: number; scale?: number }

export function gardenMonsteraAnatomySeed(sceneSeed: number, id: string) {
  return studySeed(sceneSeed % 4294967296 + 1, `garden-monstera:${id}`)
}

export function gardenMonsteraFacing(sceneSeed: number, index: number): GardenMonsteraFacing {
  if (!Number.isSafeInteger(index) || index < 0) throw new RangeError("Monstera index must be a non-negative safe integer")
  const outwardParity = studySeed(sceneSeed % 4294967296 + 1, "garden-leaf-facing") % 2
  return index % 2 === outwardParity ? "outward" : "inward"
}

export function monsteraProjection(frame: MonsteraBladeFrame) {
  const radians = frame.rotation * Math.PI / 180
  const cos = Math.cos(radians), sin = Math.sin(radians)
  return (point: Point): Point => {
    const x = point.x * frame.scale.x, y = point.y * frame.scale.y
    return { x: frame.attachment.x + x * cos - y * sin,
      y: frame.attachment.y + x * sin + y * cos }
  }
}

export function projectMonsteraPoint(frame: MonsteraBladeFrame, point: Point): Point {
  return monsteraProjection(frame)(point)
}

export function monsteraBladeTransform(frame: MonsteraBladeFrame) {
  return `translate(${frame.attachment.x} ${frame.attachment.y}) rotate(${frame.rotation}) scale(${frame.scale.x} ${frame.scale.y})`
}

export function monsteraStudyViewBox(boundary: readonly Point[], pose: MonsteraPose) {
  if (boundary.length === 0) throw new RangeError("Monstera study framing needs a blade boundary")
  const points = [...boundary.map(monsteraProjection(pose.blade)), ...pose.petiole.curve]
  if (points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
    throw new RangeError("Monstera study framing needs finite coordinates")
  }
  const { padding, aspectRatio } = MONSTERA_STUDY_FRAME
  const left = Math.min(...points.map((point) => point.x)), right = Math.max(...points.map((point) => point.x))
  const top = Math.min(...points.map((point) => point.y)), bottom = Math.max(...points.map((point) => point.y))
  // The margin includes stalk thickness, living ink and the garden's sway envelope.
  const width = Math.max(right - left + padding * 2, (bottom - top + padding * 2) * aspectRatio)
  const height = width / aspectRatio
  return { x: (left + right - width) / 2, y: (top + bottom - height) / 2, width, height }
}

export function createGardenMonsteraPose(sceneSeed: number, index: number, plant: MonsteraPlacement, anatomySeed: number, composition?: GardenMonsteraComposition): GardenMonsteraPose {
  const values = [plant.root.x, plant.root.y, plant.placement.tipTarget.x, plant.placement.tipTarget.y,
    plant.placement.stalkLean, plant.size, plant.fullness, plant.stemWidth]
  if (values.some((value) => !Number.isFinite(value)) || plant.size <= 0 || plant.fullness <= 0 || plant.stemWidth <= 0) {
    throw new RangeError("Monstera placement must have finite coordinates and positive dimensions")
  }
  if (composition && (![composition.center.x, composition.center.y, composition.lean].every(Number.isFinite)
    || composition.lean <= 0 || composition.lean >= 90
    || !Number.isFinite(composition.scale ?? 1) || (composition.scale ?? 1) <= 0 || (composition.scale ?? 1) > 1
    || !["inward", "outward"].includes(composition.facing))) {
    throw new RangeError("Monstera composition needs a finite center, facing, lean between 0 and 90, and scale above 0 through 1")
  }
  const anatomy = organicMonsteraBlade(anatomySeed)
  const stalkRadians = plant.placement.stalkLean * Math.PI / 180
  const attachmentHeight = plant.size * BLOOM_SCENE.monsteraAttachmentHeight / BLOOM_SCENE.monsteraLength * (composition?.scale ?? 1)
  const facing = composition?.facing ?? gardenMonsteraFacing(sceneSeed, index)
  const posture = sceneRandom(anatomySeed, "garden-leaf-joint")
  posture() // Preserve the approved posture stream's first draw.
  const side = plant.root.x < BLOOM_SCENE.centerX ? -1 : 1
  const lean = composition?.lean ?? (MONSTERA_GARDEN_POSE.lean[0] + posture() * (MONSTERA_GARDEN_POSE.lean[1] - MONSTERA_GARDEN_POSE.lean[0]))
  const lengthScale = attachmentHeight / Math.abs(anatomy.tip.y)
  const blade: MonsteraBladeFrame = {
    attachment: { x: plant.placement.tipTarget.x + Math.sin(stalkRadians) * attachmentHeight,
      y: plant.placement.tipTarget.y - Math.cos(stalkRadians) * attachmentHeight },
    rotation: 180 + (facing === "outward" ? -side : side) * lean,
    scale: { x: lengthScale / anatomy.height * plant.fullness, y: lengthScale },
  }
  const local = { ...blade, attachment: { x: 0, y: 0 } }
  const boundary = anatomy.boundary.map(monsteraProjection(local))
  const left = Math.min(...boundary.map((p) => p.x)), right = Math.max(...boundary.map((p) => p.x))
  const top = Math.min(...boundary.map((p) => p.y)), bottom = Math.max(...boundary.map((p) => p.y))
  const frame = BLOOM_COMPOSITION.monstera, inset = MONSTERA_GARDEN_POSE.verticalInset
  if (right - left > frame.right - frame.left || bottom - top > BLOOM_SCENE.baseline - inset * 2) {
    throw new RangeError("Monstera blade does not fit the garden frame")
  }
  if (composition) blade.attachment = {
    x: composition.center.x - (left + right) / 2,
    y: composition.center.y - (top + bottom) / 2,
  }
  blade.attachment = {
    x: Math.max(frame.left - left, Math.min(frame.right - right, blade.attachment.x)),
    y: Math.max(inset - top, Math.min(BLOOM_SCENE.baseline - inset - bottom, blade.attachment.y)),
  }
  const guide = branchCurve(plant.root, blade.attachment)
  const bend = (sceneRandom(anatomySeed, "garden-petiole")() - 0.5) * 30
  const curve: Curve = [guide[0], { ...guide[1], x: guide[1].x + bend },
    { ...guide[2], x: guide[2].x + bend * 0.5 }, guide[3]]
  const width = plant.stemWidth, tipWidth = width * 0.55
  return { blade, facing,
    petiole: { curve, end: blade.attachment, width, tipWidth, outline: petioleOutline(curve, width, tipWidth) } }
}

export function createStudyMonsteraPose(seed: number, height: number): MonsteraPose {
  if (!Number.isFinite(height) || height <= 0) throw new RangeError("Monstera study height must be positive and finite")
  const stalk = monsteraStudyStalk(seed)
  return {
    blade: { attachment: stalk.curve[3], rotation: stalk.leafRotation, scale: { x: 1, y: height } },
    petiole: { curve: stalk.curve, end: stalk.curve[3], outline: stalk.outline, width: stalk.width, tipWidth: stalk.tipWidth },
  }
}
