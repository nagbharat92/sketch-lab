export function stickerSizeFactor(width: number, height: number) {
  if (![width, height].every((value) => Number.isFinite(value) && value > 0)) {
    throw new RangeError("Sticker dimensions must be finite and positive")
  }
  const size = Math.sqrt(width * height)
  return Math.round(Math.max(0.4, Math.min(1.1, Math.sqrt(size / 260))) * 1000) / 1000
}
