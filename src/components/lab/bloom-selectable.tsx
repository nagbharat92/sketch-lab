import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react"
import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, PointerEvent } from "react"
import { sameSelection, type GardenSelection, type SelectionKind } from "./bloom-selection"
import type { HaloState } from "./bloom-halo"
import { gardenStickerPaint, type StickerFamily } from "./bloom-sticker-colors"
import type { createBloomHoverStore } from "./bloom-hover-store"

type GardenSelectionApi = {
  sceneSeed: number
  selectionStore: ReturnType<typeof createBloomHoverStore>
  hoverStore: ReturnType<typeof createBloomHoverStore>
  select: (selection: GardenSelection) => void
  hover: (selection: GardenSelection | undefined) => void
  paint: (color: string) => void
}

const GardenSelectionContext = createContext<GardenSelectionApi | undefined>(undefined)
export const GardenSelectionProvider = GardenSelectionContext.Provider
const noSubscribe = () => () => {}
const idleSnapshot = () => 0

export type SelectableProps<E extends Element> = {
  role?: "button"
  tabIndex?: number
  "aria-label"?: string
  "aria-pressed"?: boolean
  "aria-disabled"?: boolean
  className?: string
  "data-selectable"?: SelectionKind
  "data-selected"?: "true"
  "data-sticker-color"?: string
  "data-sticker-family"?: StickerFamily
  style?: CSSProperties & { "--bloom-rim-colour": string }
  onPointerOver?: (event: PointerEvent<E>) => void
  onPointerOut?: (event: PointerEvent<E>) => void
  onFocus?: (event: FocusEvent<E>) => void
  onBlur?: (event: FocusEvent<E>) => void
  onClick?: (event: MouseEvent<E>) => void
  onKeyDown?: (event: KeyboardEvent<E>) => void
}

/**
 * Turns one drawn element into a target the reader can point at, tab to and open.
 * Pointer events use over/out so the innermost element wins: a leaf growing on a
 * stem claims the pointer ahead of the flower it belongs to. Outside the garden
 * — in the panel's preview thumbnails — this is inert, so previews never become buttons.
 */
export function useSelectable<E extends Element = SVGGElement>(kind: SelectionKind, id: string, label: string, pigment?: string): {
  selected: boolean
  halo: HaloState | undefined
  props: SelectableProps<E>
} {
  const api = useContext(GardenSelectionContext)
  const selection = useMemo(() => ({ kind, id }), [kind, id])
  const selectedSnapshot = useCallback(() => {
    const target = api?.selectionStore.get()
    return target ? sameSelection(target, selection) ? 2 : 1 : 0
  }, [api, selection])
  const selectionStatus = useSyncExternalStore(api?.selectionStore.subscribe ?? noSubscribe, selectedSnapshot, idleSnapshot)
  const selected = selectionStatus === 2
  const disabled = selectionStatus !== 0
  const snapshot = useCallback(() => {
    const target = api?.hoverStore.get()
    return (sameSelection(target, selection) ? 1 : 0) | (selected && target ? 2 : 0)
  }, [api, selection, selected])
  const hoverStatus = useSyncExternalStore(api?.hoverStore.subscribe ?? noSubscribe, snapshot, idleSnapshot)
  const hovered = (hoverStatus & 1) !== 0
  const anotherHovered = (hoverStatus & 2) !== 0
  const paint = useMemo(() => gardenStickerPaint(api?.sceneSeed ?? 0, selection, pigment), [api?.sceneSeed, selection, pigment])

  useEffect(() => {
    if (api && (hovered || (selected && !anotherHovered))) api.paint(paint.color)
  }, [api, hovered, selected, anotherHovered, paint.color])

  const props = useMemo<SelectableProps<E>>(() => {
    if (!api) return {}
    return {
      role: "button",
      tabIndex: disabled ? -1 : 0,
      "aria-label": label,
      "aria-pressed": selected,
      "aria-disabled": disabled || undefined,
      className: "bloom-selectable",
      "data-selectable": kind,
      "data-selected": selected ? "true" : undefined,
      "data-sticker-color": paint.color,
      "data-sticker-family": paint.family,
      style: { "--bloom-rim-colour": paint.color },
      onPointerOver: (event: PointerEvent<E>) => {
        event.stopPropagation()
        api.hover(selection)
      },
      onPointerOut: (event: PointerEvent<E>) => {
        // Moving between this element's own petals or veins must not flicker the halo.
        const next = event.relatedTarget
        if (next instanceof Node && event.currentTarget.contains(next)) return
        api.hover(undefined)
      },
      onFocus: (event: FocusEvent<E>) => {
        event.stopPropagation()
        api.hover(selection)
      },
      onBlur: (event: FocusEvent<E>) => {
        if (!event.currentTarget.matches(":hover")) api.hover(undefined)
      },
      onClick: (event: MouseEvent<E>) => {
        event.stopPropagation()
        api.select(selection)
      },
      onKeyDown: (event: KeyboardEvent<E>) => {
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        event.stopPropagation()
        api.select(selection)
      },
    }
  }, [api, kind, label, selected, disabled, selection, paint])

  return { selected, halo: selected ? "selected" : hovered && api ? "hover" : undefined, props }
}
