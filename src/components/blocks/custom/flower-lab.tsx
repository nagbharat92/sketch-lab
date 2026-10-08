import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BloomIllustration } from "@/components/lab/bloom-illustration"
import { BloomInspector } from "@/components/lab/bloom-inspector"
import { BloomSurpriseButton } from "@/components/lab/bloom-surprise-button"
import { BloomIntroParagraph } from "@/components/lab/bloom-intro-paragraph"
import { GardenSelectionProvider } from "@/components/lab/bloom-selectable"
import { Bloom } from "@/components/lab/color-swatch"
import { DEFAULT_BLOOM } from "@/lib/bloom"
import { growBloom, initialBloomState } from "@/components/lab/bloom-state"
import { sceneRandom } from "@/components/lab/bloom-math"
import { NO_OVERRIDES, overriddenCount, randomizedOverride, withOverride, type GardenOverrides, type GardenSelection } from "@/components/lab/bloom-selection"
import { BLOOM_PROSE_POLICY, BLOOM_SCENE_STYLE, BLOOM_SWATCHES } from "@/components/lab/bloom-tokens"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"
import { gardenStickerPalette } from "@/components/lab/bloom-sticker-colors"
import { stickerLeafCursor } from "@/components/lab/bloom-sticker-cursor"
import { createBloomHoverStore } from "@/components/lab/bloom-hover-store"
import { BloomPlayPanel } from "@/components/lab/bloom-play-panel"

interface FlowerLabProps {
  index: number
  props?: Record<string, unknown>
}

/** The generated cast and the reader's own edits advance together, so a new garden starts clean. */
type GardenDraft = { scene: ReturnType<typeof initialBloomState>; overrides: GardenOverrides; nonce: number }

export function FlowerLab(_props: FlowerLabProps) {
  const [preparing, setPreparing] = useState(false)
  const [firstReady, setFirstReady] = useState(false)
  const [secondReady, setSecondReady] = useState(false)
  const [artReady, setArtReady] = useState(false)
  const firstDone = useCallback(() => setFirstReady(true), [])
  const secondDone = useCallback(() => setSecondReady(true), [])
  const artDone = useCallback(() => setArtReady(true), [])
  const ready = firstReady && secondReady && artReady

  useEffect(() => {
    let secondFrame = 0
    // Give the introduction a paint before mounting the garden behind it.
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setPreparing(true))
    })
    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
  }, [])

  return (
    <div className="bloom-entry" data-ready={ready} aria-busy={!ready}>
      {!ready && (
        <div className="bloom-intro" role="status" aria-label="Loading Bloom">
          <Bloom size={52} radius={21} shape={DEFAULT_BLOOM} fill={BLOOM_SWATCHES[0].color} seed={7} centerHole spin />
          <h1>Bloom</h1>
        </div>
      )}
      {/* Keep preparation measurable without letting child visibility rules reveal it. */}
      <div className="bloom-entry-content" style={{ opacity: ready ? 1 : 0 }} inert={!ready} aria-hidden={!ready}>
        {preparing && <Garden firstDone={firstDone} secondDone={secondDone} artDone={artDone} />}
      </div>
    </div>
  )
}

function Garden({ firstDone, secondDone, artDone }: {
  firstDone: () => void; secondDone: () => void; artDone: () => void
}) {
  const [draft, setDraft] = useState<GardenDraft>(() => ({ scene: initialBloomState(), overrides: NO_OVERRIDES, nonce: 1 }))
  const [selection, setSelection] = useState<GardenSelection>()
  const [hoverStore] = useState(createBloomHoverStore)
  const [selectionStore] = useState(createBloomHoverStore)
  const panelRef = useRef<HTMLDivElement>(null)
  const { scene, overrides } = draft
  const { sceneSeed, garden, colorIndex } = scene
  const paintCursor = useCallback((color: string) => {
    const cursor = stickerLeafCursor(color)
    if (document.body.style.getPropertyValue("--bloom-leaf-cursor") !== cursor) {
      document.body.style.setProperty("--bloom-leaf-cursor", cursor)
    }
  }, [])
  const color = BLOOM_SWATCHES[colorIndex]
  const tended = overriddenCount(overrides)
  // While a plant is open, pointing and focusing are only noted, so closing it restores what is still under them.
  const latentHover = useRef<GardenSelection | undefined>(undefined)
  const choose = useCallback((next: GardenSelection | undefined) => {
    if (next && selectionStore.get()) return
    if (!next && panelRef.current?.contains(document.activeElement)) {
      panelRef.current.focus({ preventScroll: true })
    }
    hoverStore.set(next ? undefined : latentHover.current)
    selectionStore.set(next)
    setSelection(next)
  }, [selectionStore, hoverStore])

  const grow = () => {
    setDraft((current) => ({ scene: growBloom(current.scene), overrides: NO_OVERRIDES, nonce: current.nonce + 1 }))
    latentHover.current = undefined
    choose(undefined)
    hoverStore.set(undefined)
  }

  const api = useMemo(() => ({
    selectionStore, hoverStore, sceneSeed,
    select: choose,
    hover: (next: GardenSelection | undefined) => {
      latentHover.current = next
      if (!selectionStore.get()) hoverStore.set(next)
    },
    paint: paintCursor,
  }), [selectionStore, hoverStore, sceneSeed, paintCursor, choose])

  useEffect(() => {
    const previous = document.body.style.getPropertyValue("--bloom-leaf-cursor")
    paintCursor(gardenStickerPalette(sceneSeed).butter)
    return () => {
      if (previous) document.body.style.setProperty("--bloom-leaf-cursor", previous)
      else document.body.style.removeProperty("--bloom-leaf-cursor")
    }
  }, [sceneSeed, paintCursor])

  // Escape always returns the whole screen to the garden.
  useEffect(() => {
    if (!selection) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      choose(undefined)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selection, choose])

  useEffect(() => {
    if (!selection) return
    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element) || panelRef.current?.contains(target)
        || target.closest("[data-focus-artwork]")) return
      event.preventDefault()
      event.stopPropagation()
      choose(undefined)
    }
    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [selection, choose])

  // Opening a plant moves keyboard focus into its play panel.
  useEffect(() => {
    if (selection) panelRef.current?.focus({ preventScroll: true })
  }, [selection])

  const change = useCallback((edit: Record<string, unknown>) => {
    if (!selection) return
    setDraft((draft) => ({ ...draft, overrides: withOverride(draft.overrides, selection, edit) }))
  }, [selection])

  const regenerate = useCallback(() => {
    if (!selection) return
    setDraft((draft) => {
      const nonce = draft.nonce + 1
      const random = sceneRandom(nonce, `surprise:${selection.kind}:${selection.id}`)
      return { ...draft, nonce, overrides: withOverride(draft.overrides, selection, randomizedOverride(selection, random, nonce)) }
    })
  }, [selection])

  return (
    <article aria-label="Bloom: a generative garden you can tend" className="bloom-page bloom-stage" style={BLOOM_SCENE_STYLE}>
      <div className="bloom-editorial" ref={panelRef} tabIndex={-1}>
        <BloomPlayPanel selection={selection} intro={
          <div className="bloom-intro-copy">
            <BloomIntroParagraph deferred onReady={firstDone}>
             I started with a single flower and kept experimenting with its shape, colour and movement. Now it is a whole garden, drawn in code.
            </BloomIntroParagraph>
            <JustifiedParagraph deferred onReady={secondDone} policy={BLOOM_PROSE_POLICY} className="bloom-story">
             Every plant here is generated — its silhouette, veins, markings and the soil it stands in. Pick any one of them and it becomes yours to change.
            </JustifiedParagraph>
            <BloomSurpriseButton onClick={grow} style={{ backgroundColor: color.color, color: color.ink }}>
             Grow me a garden
            </BloomSurpriseButton>
          </div>
        }>
          {selection && <BloomInspector
            selection={selection}
            scene={scene}
            overrides={overrides}
            onChange={change}
            onRegenerate={regenerate}
          />}
        </BloomPlayPanel>
      </div>

      <div className="bloom-art-column">
        <figure aria-label="Your garden" className="bloom-artwork">
          <GardenSelectionProvider value={api}>
            <BloomIllustration {...scene} overrides={overrides} selection={selection}
              fill={color.color} animated onReady={artDone} />
          </GardenSelectionProvider>
          <span role="status" className="sr-only">
            Garden {sceneSeed + 1}: {garden.flowers.length + 1} flowers and {garden.monsteras.length} monsteras, with a {color.name.toLowerCase()} tallest bloom.
            {tended > 0 && ` ${tended} ${tended === 1 ? "plant has" : "plants have"} been changed by hand.`}
          </span>
        </figure>
      </div>
    </article>
  )
}
