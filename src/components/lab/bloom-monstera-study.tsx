import { useId, useMemo, type CSSProperties } from "react"
import { createMonsteraArtwork, type MonsteraArtwork } from "./bloom-monstera-artwork"
import { OrganicMonsteraDrawing } from "./bloom-monstera-drawing"
import { organicMonsteraSilhouette } from "./bloom-monstera-study-geometry"
import { createStudyMonsteraPose, monsteraBladeTransform, type MonsteraPose } from "./bloom-monstera-pose"
import { gardenCharacter } from "./bloom-garden"
import { plantMotion } from "./bloom-geometry"
import { monsteraStudyPalette } from "./bloom-study-state"
import { BLOOM_MOTION, BLOOM_SCENE_STYLE, MONSTERA_MARKINGS, MONSTERA_STUDY_SHADOW, MONSTERA_STUDY_STALK } from "./bloom-tokens"

export function OrganicMonsteraStudy({ seed, age, markings, inkSeed, shadow = false, stalk = false, prepared, pose: preparedPose, viewBox: fittedViewBox, animated = false }: {
  seed: number; age: number; markings: typeof MONSTERA_MARKINGS[number]; inkSeed: number; shadow?: boolean; stalk?: boolean; prepared?: MonsteraArtwork; pose?: MonsteraPose
  viewBox?: { x: number; y: number; width: number; height: number }; animated?: boolean
}) {
  const id = useId().replace(/:/g, "")
  const artwork = useMemo(() => prepared ?? createMonsteraArtwork(seed, age, markings), [prepared, seed, age, markings])
  const pose = useMemo(() => stalk ? preparedPose ?? createStudyMonsteraPose(seed, artwork.anatomy.height) : undefined, [preparedPose, seed, stalk, artwork.anatomy.height])
  const silhouette = useMemo(() => shadow ? organicMonsteraSilhouette(artwork.anatomy) : undefined, [artwork, shadow])
  const character = useMemo(() => gardenCharacter(seed), [seed])
  const colors = useMemo(() => monsteraStudyPalette(age), [age])
  const { anatomy } = artwork
  const frame = useMemo(() => pose?.blade ?? { attachment: { x: 0, y: anatomy.offsetY }, rotation: 0, scale: { x: 1, y: anatomy.height } },
    [pose, anatomy.offsetY, anatomy.height])
  const transform = useMemo(() => monsteraBladeTransform(frame), [frame])
  const viewBox = pose ? Object.values(fittedViewBox ?? MONSTERA_STUDY_STALK.viewBox).join(" ") : "-90 -135 180 180"
  const motion = useMemo(() => plantMotion(seed, "monstera-study", BLOOM_MOTION.cycles.monstera), [seed])
  const root = pose?.petiole.curve[0]
  const shadowStyle: CSSProperties & Record<"--monstera-shadow-opacity" | "--monstera-shadow-dark-opacity", number> = {
    "--monstera-shadow-opacity": MONSTERA_STUDY_SHADOW.opacity,
    "--monstera-shadow-dark-opacity": MONSTERA_STUDY_SHADOW.darkOpacity,
  }
  return (
    <svg aria-hidden="true" viewBox={viewBox} className={pose ? "bloom-illustration bloom-monstera-presentation" : undefined}
      style={pose ? BLOOM_SCENE_STYLE : undefined} data-animated={animated} data-botanical-piece="monstera" data-organic-study="true" data-splits={age} data-has-stalk={stalk}>
      <g className={pose ? "bloom-monstera-plant" : undefined}
        style={root ? { ...motion, transformOrigin: `${root.x}px ${root.y}px` } : undefined}>
        {shadow && (
          <>
            <defs>
              <path id={`study-silhouette-${id}`} d={silhouette} fillRule="evenodd" />
              <filter id={`study-shadow-${id}`} filterUnits="userSpaceOnUse" x={-85} y={-150} width={170} height={185} colorInterpolationFilters="sRGB">
                <feGaussianBlur in="SourceGraphic" stdDeviation={MONSTERA_STUDY_SHADOW.blur} />
              </filter>
            </defs>
            <g transform={`translate(${character.lightX === 0 ? MONSTERA_STUDY_SHADOW.x : -MONSTERA_STUDY_SHADOW.x} ${MONSTERA_STUDY_SHADOW.y})`}>
              <use href={`#study-silhouette-${id}`} className="bloom-monstera-shadow" style={shadowStyle} transform={transform}
                fill={colors.shadow} filter={`url(#study-shadow-${id})`} pointerEvents="none" data-monstera-shadow="true" />
            </g>
          </>
        )}
        <OrganicMonsteraDrawing artwork={artwork} inkSeed={inkSeed} frame={frame} petiole={pose?.petiole} follow={Boolean(pose)} />
      </g>
    </svg>
  )
}
