import { memo, useId, useMemo } from "react"
import type { MonsteraArtwork } from "./bloom-monstera-artwork"
import { gardenCharacter } from "./bloom-garden"
import { monsteraBladeTransform, type MonsteraBladeFrame, type MonsteraPetiole } from "./bloom-monstera-pose"
import { monsteraStudyPalette } from "./bloom-study-state"
import { monsteraInk } from "./bloom-monstera-ink"
import { SelectionHalo, type HaloState } from "./bloom-halo"
import { BloomHoverGrow } from "./bloom-hover-grow"
import { BLOOM_PIGMENTS, MONSTERA_STUDY_VARIEGATION_COLOR, MONSTERA_STUDY_VARIEGATION_OUTLINE } from "./bloom-tokens"

export type { MonsteraPetiole } from "./bloom-monstera-pose"
type Colors = ReturnType<typeof monsteraStudyPalette>

const Definitions = memo(function Definitions({ id, artwork, colors, lightX }: {
  id: string; artwork: MonsteraArtwork; colors: Colors; lightX: number
}) {
  const { anatomy, materials } = artwork
  return (
    <defs>
      <linearGradient id={`study-leaf-${id}`} x1={lightX} y1="0" x2={1 - lightX} y2="0.65">
        <stop offset="0" stopColor={colors.light} />
        <stop offset="0.5" stopColor={colors.middle} />
        <stop offset="1" stopColor={colors.dark} />
      </linearGradient>
      <clipPath id={`study-variegation-${id}`} clipPathUnits="userSpaceOnUse">
        {materials.paths.map((d, i) => <path key={i} d={d} clipRule="evenodd" />)}
      </clipPath>
      <clipPath id={`study-blade-${id}`}><path d={anatomy.edge} /></clipPath>
      <mask id={`study-cut-${id}`} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x={-85} y={-150} width={170} height={190} style={{ maskType: "luminance" }}>
        <path d={anatomy.outline} fill="white" />
        {anatomy.cuts.map((cut) => <path key={cut.id} d={cut.d} fill="black" data-cut={cut.id} />)}
        {anatomy.holes.map((hole) => <path key={hole.id} d={hole.d} transform={`rotate(${hole.rotation} ${hole.center.x} ${hole.center.y})`} fill="black" data-hole={hole.id} />)}
      </mask>
    </defs>
  )
})

const Materials = memo(function Materials({ artwork, id }: { artwork: MonsteraArtwork; id: string }) {
  return (
    <>
      <path d={artwork.anatomy.outline} fill={`url(#study-leaf-${id})`} />
      <g fill={MONSTERA_STUDY_VARIEGATION_COLOR.ivory} fillRule="evenodd" data-variegation-pattern={artwork.markings === "plain" ? undefined : artwork.markings}>
        {artwork.materials.paths.map((d, i) => <path key={i} d={d} />)}
      </g>
      <g clipPath={`url(#study-variegation-${id})`} fill={MONSTERA_STUDY_VARIEGATION_COLOR.pink} fillRule="evenodd" data-variegation-pink="true" data-pink-coverage={artwork.materials.pinkCoverage}>
        {artwork.materials.pinkPaths.map((d, i) => <path key={i} d={d} />)}
      </g>
    </>
  )
})

const Veins = memo(function Veins({ artwork }: { artwork: MonsteraArtwork }) {
  return (
    <g fill={BLOOM_PIGMENTS.monstera.veins}>
      {artwork.anatomy.veins.map((vein, i) => <path key={i} d={vein.d} data-vein-depth={vein.depth} data-finger={vein.finger} opacity={vein.depth === 0 ? 0.85 : vein.depth === 1 ? 0.6 : 0.22} />)}
    </g>
  )
})

const Holes = memo(function Holes({ artwork, id }: { artwork: MonsteraArtwork; id: string }) {
  return (
    <g clipPath={`url(#study-blade-${id})`} fill="none" stroke="currentColor" strokeWidth={0.45} opacity={0.6} strokeLinejoin="round">
      {artwork.anatomy.holes.map((hole) => <path key={hole.id} d={hole.d} transform={`rotate(${hole.rotation} ${hole.center.x} ${hole.center.y})`} />)}
    </g>
  )
})

export function OrganicMonsteraDrawing({ artwork, inkSeed, frame, petiole, lightness = 0, follow = false, lightX, halo, inkFilter }: {
  artwork: MonsteraArtwork; inkSeed: number; frame: MonsteraBladeFrame; petiole?: MonsteraPetiole; lightness?: number; follow?: boolean; lightX?: number
  halo?: HaloState
  inkFilter?: string
}) {
  const id = useId().replace(/:/g, "")
  const colors = useMemo(() => monsteraStudyPalette(artwork.age, lightness), [artwork.age, lightness])
  const character = useMemo(() => gardenCharacter(artwork.seed), [artwork.seed])
  const ink = useMemo(() => monsteraInk(artwork, petiole, inkSeed), [artwork, petiole, inkSeed])
  const transform = useMemo(() => monsteraBladeTransform(frame), [frame])
  const bladeHalo = useMemo(() => [artwork.anatomy.edge], [artwork.anatomy.edge])
  const stalkHalo = useMemo(() => petiole ? [petiole.outline] : [], [petiole])
  if (petiole && (petiole.end.x !== frame.attachment.x || petiole.end.y !== frame.attachment.y)) {
    throw new Error("Monstera blade frame must attach to its petiole endpoint")
  }
  return (
    <g color={BLOOM_PIGMENTS.monstera.ink} data-organic-monstera="true" data-splits={artwork.age}>
      <Definitions id={id} artwork={artwork} colors={colors} lightX={lightX ?? character.lightX} />
      {petiole && (
        <g data-monstera-stalk="true">
          <SelectionHalo paths={stalkHalo} state={halo} />
          <g filter={inkFilter}>
          <path d={petiole.outline} fill={colors.dark} />
          <ellipse cx={petiole.end.x} cy={petiole.end.y + 0.8} rx={petiole.tipWidth * 0.6} ry={petiole.tipWidth} fill={colors.dark} data-petiole-joint="true" />
          <g fill="none" opacity={0.65} strokeLinecap="round" strokeLinejoin="round">
            {ink.stalk.map((path, i) => <path key={i} d={path.d} stroke={path.stroke} strokeWidth={path.strokeWidth} />)}
          </g>
          </g>
        </g>
      )}
      <g transform={transform} data-leaf-frame={Math.cos(frame.rotation * Math.PI / 180) < 0 ? "hanging" : "upright"}>
        <g className={follow ? "bloom-leaf-follow" : undefined}>
        <BloomHoverGrow state={halo}>
        <SelectionHalo paths={bladeHalo} state={halo} />
        <g filter={inkFilter}>
        <g mask={`url(#study-cut-${id})`}>
          <Materials artwork={artwork} id={id} />
          <g clipPath={`url(#study-variegation-${id})`} fill="none" opacity={MONSTERA_STUDY_VARIEGATION_OUTLINE.opacity} strokeLinecap="round" strokeLinejoin="round" data-pink-outline="true">
            {ink.pink.map((path, i) => <path key={i} d={path.d} stroke={path.stroke} strokeWidth={path.strokeWidth} />)}
          </g>
          <g fill="none" opacity={MONSTERA_STUDY_VARIEGATION_OUTLINE.opacity} strokeLinecap="round" strokeLinejoin="round" data-variegation-outline="true">
            {ink.ivory.map((path, i) => <path key={i} d={path.d} stroke={path.stroke} strokeWidth={path.strokeWidth} />)}
          </g>
          <Veins artwork={artwork} />
        </g>
        <g opacity={0.65} fill="none" strokeLinecap="round" data-leaf-outline="true">
          {ink.leaf.map((path, i) => <path key={i} d={path.d} stroke={path.stroke} strokeWidth={path.strokeWidth} vectorEffect="non-scaling-stroke" />)}
        </g>
        <Holes artwork={artwork} id={id} />
        </g>
        </BloomHoverGrow>
        </g>
      </g>
    </g>
  )
}
