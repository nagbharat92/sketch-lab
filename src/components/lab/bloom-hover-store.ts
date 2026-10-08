import { sameSelection, type GardenSelection } from "./bloom-selection.ts"

export function createBloomHoverStore() {
  let hovered: GardenSelection | undefined
  const listeners = new Set<() => void>()
  return {
    get: () => hovered,
    set: (next: GardenSelection | undefined) => {
      if (sameSelection(hovered, next)) return
      hovered = next
      for (const listener of listeners) listener()
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}
