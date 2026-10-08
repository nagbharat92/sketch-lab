import { useLayoutEffect, type RefObject } from "react"

const SWAYING = ["bloom-plant", "bloom-flower", "bloom-small-plant", "bloom-monstera-plant", "bloom-leaf-follow", "bloom-ground-sprig"]

/**
 * Hands the garden's single breeze to every swaying group. The CSS gust
 * animation on the garden stays the clock; the value does not inherit, so each
 * change restyles these few groups instead of every path drawn inside them.
 */
export function useGardenGust(garden: RefObject<HTMLElement | null>, moving: boolean) {
  useLayoutEffect(() => {
    const root = garden.current
    if (!root || !moving) return
    const groups = SWAYING.map((name) => root.getElementsByClassName(name))
    const clock = getComputedStyle(root)
    let frame = 0
    const tick = () => {
      const gust = clock.getPropertyValue("--bloom-gust")
      for (const group of groups) {
        for (const element of group) {
          if (!(element instanceof HTMLElement || element instanceof SVGElement)) continue
          if (element.style.getPropertyValue("--bloom-gust") !== gust) element.style.setProperty("--bloom-gust", gust)
        }
      }
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [garden, moving])
}
