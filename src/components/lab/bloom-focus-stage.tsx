import { useLayoutEffect, useRef } from "react"
import type { GardenSelection } from "./bloom-selection"
import { stickerLeafCursor } from "./bloom-sticker-cursor"
import { stickerSizeFactor } from "./bloom-sticker-size"

const SVG_NS = "http://www.w3.org/2000/svg"
const DURATION = 240
const EASING = "cubic-bezier(0.42, 0, 0.58, 1)"

type NestedMotion = { source: Animation; copy: Animation }
type FocusedArtwork = {
  key: string; source: SVGGElement; group: SVGGElement; layer: HTMLDivElement; animation?: Animation
  origin: string; destination: string; start: string
  cropX: number; cropY: number; stageX: number; stageY: number
  scale: number; stageWidth: number; stageHeight: number
  anchor: DOMPoint; baseAnchor: DOMPoint; baseInverse: DOMMatrix
  focusWeight: number; weightFrom: number; weightTo: number
  nestedMotion: NestedMotion[]
  rimMotion?: Animation[]
}

function pose(source: SVGGElement, garden: HTMLElement, previous?: FocusedArtwork) {
  const silhouette = source.querySelector<SVGGElement>('.bloom-halo[data-halo="selected"] .bloom-halo-paper')
  if (!silhouette) throw new Error("Selected artwork must provide its visible silhouette")
  // SVG group bounds include clipped markings outside the blade. Fit the actual
  // silhouette instead, so material/age edits cannot resize or offset the preview.
  const box = silhouette.getBBox()
  const sourceMatrix = source.getScreenCTM()
  const screen = sourceMatrix && new DOMMatrix([sourceMatrix.a, sourceMatrix.b, sourceMatrix.c, sourceMatrix.d, sourceMatrix.e, sourceMatrix.f])
  if (!screen || box.width <= 0 || box.height <= 0) {
    throw new Error("Selected artwork must have a visible stage pose")
  }
  const bounds = garden.getBoundingClientRect()
  const gardenPose = new DOMMatrix().translate(-bounds.left, -bounds.top).multiply(screen)
  const corners = [
    new DOMPoint(box.x, box.y), new DOMPoint(box.x + box.width, box.y),
    new DOMPoint(box.x, box.y + box.height), new DOMPoint(box.x + box.width, box.y + box.height),
  ].map((point) => point.matrixTransform(gardenPose))
  const left = Math.min(...corners.map((point) => point.x)), top = Math.min(...corners.map((point) => point.y))
  const width = Math.max(...corners.map((point) => point.x)) - left
  const height = Math.max(...corners.map((point) => point.y)) - top
  const fittedScale = Math.max(1.08, Math.min(bounds.width * 0.68 / width, bounds.height * 0.64 / height, 18))
  const sameStage = previous && Math.abs(previous.stageWidth - bounds.width) < 0.5
    && Math.abs(previous.stageHeight - bounds.height) < 0.5
  const scale = sameStage && width * previous.scale <= bounds.width * 0.9
    && height * previous.scale <= bounds.height * 0.85 ? previous.scale : fittedScale
  const sizeFactor = stickerSizeFactor(width * scale, height * scale) / scale
  const padding = 20 * sizeFactor + 8
  const canvasWidth = width + padding * 2, canvasHeight = height + padding * 2
  const origin = new DOMMatrix().translate(-left + padding, -top + padding).multiply(gardenPose)
  const start = new DOMMatrix().translate(left - padding, top - padding)
  const destination = new DOMMatrix()
    .translate((bounds.width - canvasWidth * scale) / 2, (bounds.height - canvasHeight * scale) / 2)
    .scale(scale)
  const anchor = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2)
  return { origin: origin.toString(), start: start.toString(), destination: destination.toString(),
    canvasWidth, canvasHeight, sizeFactor, cropX: left - padding, cropY: top - padding,
    stageX: bounds.left, stageY: bounds.top, stageWidth: bounds.width, stageHeight: bounds.height, scale, anchor,
    baseAnchor: anchor.matrixTransform(origin), baseInverse: origin.inverse() }
}

function copyArtwork(source: SVGGElement, key: string, sizeFactor: number) {
  const copy = source.cloneNode(true)
  if (!(copy instanceof SVGGElement)) throw new Error("Selected artwork must provide an SVG group")
  copy.removeAttribute("class")
  copy.removeAttribute("data-growing")
  copy.removeAttribute("style")
  copy.removeAttribute("transform")
  copy.style.color = getComputedStyle(source).color
  copy.style.setProperty("--bloom-rim-colour", getComputedStyle(source).getPropertyValue("--bloom-rim-colour"))
  for (const halo of copy.querySelectorAll<SVGGElement>(".bloom-halo")) {
    if (halo.dataset.halo === "selected") {
      halo.style.opacity = "1"
      halo.style.setProperty("--bloom-sticker-size", String(sizeFactor))
    } else {
      halo.dataset.halo = "idle"
      halo.style.opacity = "0"
    }
  }
  // Preserve shared garden definitions, but namespace definitions owned by the copy.
  const ids = new Map<string, string>()
  for (const element of copy.querySelectorAll("[id]")) ids.set(element.id, `focus-${key}-${element.id}`)
  for (const element of [copy, ...copy.querySelectorAll("*")]) {
    for (const attribute of [...element.attributes]) {
      let value = attribute.value
      if (attribute.name === "id") value = ids.get(value) ?? value
      else for (const [id, replacement] of ids) {
        value = value.split(`url(#${id})`).join(`url(#${replacement})`)
        if (value === `#${id}`) value = `#${replacement}`
      }
      if (value !== attribute.value) element.setAttribute(attribute.name, value)
    }
    if (element !== copy) {
      element.removeAttribute("tabindex")
      element.removeAttribute("role")
      element.removeAttribute("data-selectable")
      element.removeAttribute("data-selected")
    }
    element.removeAttribute("filter")
  }
  return copy
}

function mirrorNestedMotion(source: SVGGElement, copy: SVGGElement): NestedMotion[] {
  const originals = source.getAnimations({ subtree: true })
    .filter((animation) => animation instanceof CSSAnimation)
  if (!originals.length) return []
  const sourceNodes = [source, ...source.querySelectorAll("*")]
  const copyNodes = [copy, ...copy.querySelectorAll("*")]
  return originals.flatMap((animation) => {
    const effect = animation.effect
    if (!(effect instanceof KeyframeEffect) || !(effect.target instanceof Element)) return []
    const index = sourceNodes.indexOf(effect.target)
    if (index < 0) throw new Error("Nested garden motion must belong to the selected artwork")
    const target = copyNodes[index]
    for (const initial of target.getAnimations()) initial.cancel()
    const mirrored = target.animate(effect.getKeyframes(), effect.getTiming())
    mirrored.playbackRate = animation.playbackRate
    if (animation.startTime !== null) mirrored.startTime = animation.startTime
    if (animation.playState === "paused") {
      mirrored.pause()
      mirrored.currentTime = animation.currentTime
    }
    return [{ source: animation, copy: mirrored }]
  })
}

function cancelNestedMotion(artwork: FocusedArtwork) {
  for (const motion of artwork.nestedMotion) motion.copy.cancel()
  for (const animation of artwork.rimMotion ?? []) animation.cancel()
  artwork.rimMotion = undefined
}

function animate(artwork: FocusedArtwork, destination: string, reduced: boolean, done?: () => void, from?: string, focusWeight = 1) {
  const start = from ?? getComputedStyle(artwork.layer).transform
  artwork.animation?.cancel()
  artwork.animation = undefined
  artwork.weightFrom = artwork.focusWeight
  artwork.weightTo = focusWeight
  artwork.layer.style.transform = destination
  if (reduced) { artwork.focusWeight = focusWeight; done?.(); return }
  artwork.animation = artwork.layer.animate([{ transform: start }, { transform: destination }], {
    duration: DURATION, easing: EASING,
  })
  if (done) artwork.animation.onfinish = done
}

export function BloomFocusStage({ selection, revision, reducedMotion }: {
  selection?: GardenSelection; revision: unknown; reducedMotion: boolean
}) {
  const stage = useRef<SVGSVGElement>(null)
  const motion = useRef<HTMLDivElement>(null)
  const sway = useRef<HTMLDivElement>(null)
  const focused = useRef<FocusedArtwork | undefined>(undefined)
  const serial = useRef(0)

  useLayoutEffect(() => {
    const layer = stage.current
    const motionLayer = motion.current
    const garden = motionLayer?.parentElement
    if (!layer || !motionLayer || !garden) throw new Error("Selected artwork needs a garden stage")
    const bounds = garden.getBoundingClientRect()
    const current = focused.current
    if (!selection) {
      if (!current) return
      // A new garden can replace the source before a dismissal finishes.
      if (!garden.contains(current.source)) {
        current.animation?.cancel()
        cancelNestedMotion(current)
        delete current.source.dataset.focusReturn
        current.group.remove()
        focused.current = undefined
        return
      }
      current.source.dataset.focusReturn = "true"
      const rims = [...current.group.querySelectorAll<SVGGElement>('.bloom-halo[data-halo="selected"]')]
        .map((halo) => {
          const paper = halo.querySelector<SVGGElement>(".bloom-halo-paper")
          if (!paper) throw new Error("Returning sticker must provide a paper backing")
          const rim = { halo, paper, opacity: Number(getComputedStyle(halo).opacity),
            width: parseFloat(getComputedStyle(paper).strokeWidth) }
          halo.style.transition = "none"
          paper.style.transition = "none"
          return rim
        })
      const remove = () => {
        cancelNestedMotion(current)
        delete current.source.dataset.focusReturn
        current.group.remove()
        if (focused.current === current) focused.current = undefined
      }
      animate(current, current.start, reducedMotion, remove, undefined, 0)
      if (!reducedMotion) {
        current.rimMotion = rims.flatMap(({ halo, paper, opacity, width }) => [
          halo.animate([{ opacity }, { opacity: 0 }], { duration: DURATION, easing: EASING, fill: "forwards" }),
          paper.animate([{ strokeWidth: `${width}px` }, { strokeWidth: "0px" }],
            { duration: DURATION, easing: EASING, fill: "forwards" }),
        ])
        const startTime = document.timeline.currentTime
        if (startTime !== null && current.animation?.playState === "running") {
          current.animation.startTime = startTime
          for (const animation of current.rimMotion) animation.startTime = startTime
        }
      }
      return
    }
    const target = [...garden.querySelectorAll<HTMLElement | SVGGElement>("[data-selectable][data-selected]")]
      .find((element) => element.dataset.selectable === selection.kind)
    const source = target?.querySelector<SVGGElement>('.bloom-hover-grow:has(> .bloom-halo[data-halo="selected"])')
    if (!source) throw new Error("Selected garden element must provide its own artwork")
    const key = `${selection.kind}:${selection.id}`
    const position = pose(source, garden, current?.key === key ? current : undefined)
    const fitCanvas = (position: ReturnType<typeof pose>) => {
      motionLayer.style.width = `${position.canvasWidth}px`
      motionLayer.style.height = `${position.canvasHeight}px`
      layer.setAttribute("viewBox", `0 0 ${position.canvasWidth} ${position.canvasHeight}`)
      if (sway.current) sway.current.style.transform = "none"
    }
    fitCanvas(position)
    if (current && current.key === key) {
      delete current.source.dataset.focusReturn
      current.source = source
      cancelNestedMotion(current)
      const copy = copyArtwork(source, String(++serial.current), position.sizeFactor)
      current.group.replaceChildren(copy)
      current.nestedMotion = mirrorNestedMotion(source, copy)
      current.group.style.transform = position.origin
      Object.assign(current, position)
      current.focusWeight = 1
      animate(current, position.destination, true)
    } else {
      if (current) {
        current.animation?.cancel()
        cancelNestedMotion(current)
        delete current.source.dataset.focusReturn
        current.group.remove()
      }
      motionLayer.style.transform = position.start
      const group = document.createElementNS(SVG_NS, "g")
      group.dataset.focusArtwork = selection.kind
      group.style.transform = position.origin
      const copy = copyArtwork(source, String(++serial.current), position.sizeFactor)
      group.append(copy)
      layer.append(group)
      const next = { key, source, group, layer: motionLayer, ...position,
        focusWeight: 0, weightFrom: 0, weightTo: 1, nestedMotion: mirrorNestedMotion(source, copy) }
      focused.current = next
      animate(next, position.destination, reducedMotion, undefined, position.start)
    }
    let width = bounds.width, height = bounds.height
    const resize = new ResizeObserver(() => {
      const latest = focused.current
      if (!latest || latest.key !== key) return
      const resized = garden.getBoundingClientRect()
      // Hidden outgoing pages retain their last fitted pose until they unmount.
      if (resized.width === 0 || resized.height === 0) return
      if (Math.abs(resized.width - width) < 0.5 && Math.abs(resized.height - height) < 0.5) return
      width = resized.width
      height = resized.height
      const position = pose(latest.source, garden)
      fitCanvas(position)
      Object.assign(latest, position)
      latest.group.style.transform = position.origin
      for (const halo of latest.group.querySelectorAll<SVGGElement>('.bloom-halo[data-halo="selected"]')) {
        halo.style.setProperty("--bloom-sticker-size", String(position.sizeFactor))
      }
      latest.focusWeight = 1
      animate(latest, position.destination, true)
    })
    resize.observe(garden)
    return () => resize.disconnect()
  }, [selection, revision, reducedMotion])

  useLayoutEffect(() => {
    const carrier = sway.current
    if (!carrier || reducedMotion || !focused.current) return
    let frame = 0
    let lastTransform = ""
    const updatePosition = () => {
      const artwork = focused.current
      const garden = artwork?.layer.parentElement
      if (!artwork || !garden) return
      const bounds = garden.getBoundingClientRect()
      artwork.stageX = bounds.left
      artwork.stageY = bounds.top
    }
    const tick = () => {
      const artwork = focused.current
      if (!artwork || !artwork.source.isConnected) return
      if (!document.hidden) {
        for (const motion of artwork.nestedMotion) {
          if (motion.source.playState === "idle") {
            if (motion.copy.playState !== "idle") motion.copy.cancel()
          } else if (motion.source.playState === "paused") {
            if (motion.copy.playState !== "paused") motion.copy.pause()
            motion.copy.currentTime = motion.source.currentTime
          } else if (motion.source.startTime !== null && motion.copy.startTime !== motion.source.startTime) {
            motion.copy.startTime = motion.source.startTime
          }
        }
        const matrix = artwork.source.getScreenCTM()
        if (!matrix) throw new Error("Living selected artwork must have a screen transform")
        const live = new DOMMatrix().translate(-artwork.stageX - artwork.cropX, -artwork.stageY - artwork.cropY)
          .multiply(new DOMMatrix([matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]))
        const animation = artwork.animation
        const progress = !animation || animation.playState === "finished" ? 1
          : animation.effect?.getComputedTiming().progress ?? 0
        artwork.focusWeight = artwork.weightFrom + (artwork.weightTo - artwork.weightFrom) * progress
        const anchor = artwork.anchor.matrixTransform(live)
        // Keep the focused silhouette center steady, then release it into the live
        // garden pose during return. Rotation always follows the original phase.
        const delta = new DOMMatrix().translate(
          (artwork.baseAnchor.x - anchor.x) * artwork.focusWeight,
          (artwork.baseAnchor.y - anchor.y) * artwork.focusWeight,
        ).multiply(live).multiply(artwork.baseInverse)
        const transform = delta.toString()
        if (transform !== lastTransform) {
          carrier.style.transform = transform
          lastTransform = transform
        }
      }
      frame = requestAnimationFrame(tick)
    }
    tick()
    window.addEventListener("scroll", updatePosition, { capture: true, passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [selection, revision, reducedMotion])

  useLayoutEffect(() => () => {
    focused.current?.animation?.cancel()
    if (focused.current) {
      cancelNestedMotion(focused.current)
      delete focused.current.source.dataset.focusReturn
    }
  }, [])

  return <div ref={motion} className="bloom-focus-layer" aria-hidden="true"
    onClick={(event) => event.stopPropagation()}
    onPointerOver={() => {
      const source = focused.current?.source
      if (source) {
        const color = getComputedStyle(source).getPropertyValue("--bloom-rim-colour").trim()
        document.body.style.setProperty("--bloom-leaf-cursor", stickerLeafCursor(color))
      }
    }}>
    <div ref={sway} className="bloom-focus-sway">
      <svg ref={stage} pointerEvents="none" />
    </div>
  </div>
}
