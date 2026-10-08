import leaf from "./bloom-leaf-cursor.svg?raw"
import { STICKER_CURSOR_INK, stickerContrast } from "./bloom-sticker-colors"

const cursors = new Map<string, string>()

export function stickerLeafCursor(color: string) {
  const cached = cursors.get(color)
  if (cached) return cached
  if (stickerContrast(color, STICKER_CURSOR_INK) < 3) throw new RangeError("Leaf cursor pigment must contrast with its ink")
  const svg = leaf.replace('fill="url(#leaf)"', `fill="${color}"`).replace(/#344B32/g, STICKER_CURSOR_INK)
  const cursor = `url("data:image/svg+xml,${encodeURIComponent(svg)}") 5 3, auto`
  const oldest = cursors.keys().next().value
  if (cursors.size >= 16 && oldest !== undefined) cursors.delete(oldest)
  cursors.set(color, cursor)
  return cursor
}
