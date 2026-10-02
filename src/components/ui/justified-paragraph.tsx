import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import type { ComponentPropsWithoutRef, ReactNode } from "react"
import { lineText, prepare, solve } from "@kitlangton/justice"
import type { Options, Prepared } from "@kitlangton/justice"
import { cn } from "@/lib/utils"

type ParagraphProps = ComponentPropsWithoutRef<"p"> & {
  /** Labels and other non-prose text should retain native layout. */
  justify?: boolean
  dropCap?: boolean
  dropCapArtwork?: { glyph: ReactNode; aspectRatio: number }
  policy?: Partial<Options>
}

const DROP_CAP = { lines: 2, gapEm: 0.35, probeSize: 100 } as const

type DropCapLayout = {
  width: number
  height: number
  fontSize: number
  top: number
  left: number
  artworkWidth?: number
  artworkHeight?: number
}

type RenderLine = {
  text: string
  wordSpacing: number
  wordInteriorSpacing: number
  letterSpacing: number
  opening: number
  separator: string
  width: number
  indent: number
}

type ParagraphLayout = {
  source: string
  mode: string
  lines: RenderLine[]
  cap?: DropCapLayout
}

function plainText(children: ReactNode): string | null {
  if (typeof children === "string" || typeof children === "number") return String(children)
  if (children == null || typeof children === "boolean") return ""
  if (!Array.isArray(children)) return null
  const parts = children.map(plainText)
  return parts.some((part) => part === null) ? null : parts.join("")
}

const unsupportedScript = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u200e\u200f\u202a-\u202e\u2066-\u2069]/u

export function JustifiedParagraph({ children, className, justify = true, dropCap = false, dropCapArtwork, policy, ...props }: ParagraphProps) {
  const rawText = plainText(children)
  const text = rawText?.replace(/[ \t\r\n\f]+/g, " ").trim() ?? null
  const bodyText = dropCap && text ? text.slice(1).trimStart() : text
  const paragraphRef = useRef<HTMLParagraphElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const capRef = useRef<HTMLSpanElement>(null)
  const capMeasureRef = useRef<CanvasRenderingContext2D | null>(null)
  const preparedRef = useRef<{ key: string; paragraph: Prepared } | null>(null)
  const layoutKeyRef = useRef("")
  const fontVersionRef = useRef(0)
  const fontsFailedRef = useRef(Array.from(document.fonts).some((face) => face.status === "error"))
  const [layout, setLayout] = useState<ParagraphLayout | null>(null)
  const compatible = justify && Boolean(bodyText) && !unsupportedScript.test(text ?? "")

  const refresh = useCallback(() => {
    const paragraph = paragraphRef.current
    const probe = probeRef.current
    if (!compatible || !text || !bodyText || !paragraph || !probe) return

    const style = getComputedStyle(paragraph)
    const width = paragraph.getBoundingClientRect().width
      - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth)
    if (width <= 0) return

    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    const typography = [
      font, style.fontStretch, style.fontFeatureSettings, style.fontVariationSettings,
      style.fontOpticalSizing, style.fontKerning, style.fontVariantLigatures, style.fontVariantCaps,
      style.letterSpacing, style.wordSpacing, style.textTransform,
      style.direction, style.writingMode, style.textAlign, fontVersionRef.current,
    ].join("|")
    const capStyle = capRef.current ? getComputedStyle(capRef.current) : null
    const key = `${text}|${typography}|${width}|${dropCap}|${capStyle?.fontFamily}|${dropCapArtwork?.aspectRatio}|${JSON.stringify(policy)}`
    if (key === layoutKeyRef.current) return
    layoutKeyRef.current = key

    let cap: ParagraphLayout["cap"]
    const native = (mode: string) => setLayout({ source: text, mode, lines: [], cap })
    if (style.direction !== "ltr" || style.writingMode !== "horizontal-tb") {
      native("native-direction")
      return
    }
    if (["center", "right", "end"].includes(style.textAlign)) {
      native("native-alignment")
      return
    }
    if (!document.fonts.check(font, text) && (!fontsFailedRef.current || document.fonts.status === "loading")) {
      native("native-font-loading")
      return
    }
    if (dropCap && dropCapArtwork) {
      const lineHeight = parseFloat(style.lineHeight)
      const fontSize = parseFloat(style.fontSize)
      const inkHeight = lineHeight + fontSize
      const inkWidth = inkHeight * dropCapArtwork.aspectRatio
      cap = {
        width: Math.ceil(inkWidth + fontSize * DROP_CAP.gapEm),
        height: Math.floor(lineHeight * DROP_CAP.lines),
        fontSize,
        top: (lineHeight - fontSize) / 2,
        left: 0,
        artworkWidth: inkWidth,
        artworkHeight: inkHeight,
      }
    } else if (dropCap && capStyle) {
      const capFont = (size: number) => `${capStyle.fontStyle} ${capStyle.fontWeight} ${size}px ${capStyle.fontFamily}`
      if (!document.fonts.check(capFont(DROP_CAP.probeSize), text[0]) && (!fontsFailedRef.current || document.fonts.status === "loading")) {
        native("native-font-loading")
        return
      }
      capMeasureRef.current ??= document.createElement("canvas").getContext("2d")
      const context = capMeasureRef.current
      if (!context) throw new Error("Drop-cap measurement requires a canvas text context")
      context.font = capFont(DROP_CAP.probeSize)
      const large = context.measureText(text[0])
      const lineHeight = parseFloat(style.lineHeight)
      const fontSize = parseFloat(style.fontSize)
      const inkHeight = lineHeight + fontSize
      const capSize = inkHeight / Math.max(1, large.actualBoundingBoxAscent + large.actualBoundingBoxDescent) * DROP_CAP.probeSize
      context.font = capFont(capSize)
      const glyph = context.measureText(text[0])
      const baseline = (capSize - glyph.fontBoundingBoxAscent - glyph.fontBoundingBoxDescent) / 2 + glyph.fontBoundingBoxAscent
      cap = {
        width: Math.ceil(glyph.actualBoundingBoxLeft + glyph.actualBoundingBoxRight + fontSize * DROP_CAP.gapEm),
        height: Math.floor(lineHeight * DROP_CAP.lines),
        fontSize: capSize,
        top: (lineHeight - fontSize) / 2 + glyph.actualBoundingBoxAscent - baseline,
        left: glyph.actualBoundingBoxLeft,
      }
    }

    const preparedKey = `${bodyText}|${typography}`
    if (preparedRef.current?.key !== preparedKey) {
      const measured = prepare(bodyText, (fragment) => {
        probe.textContent = fragment
        return probe.getBoundingClientRect().width
      })
      probe.textContent = ""
      preparedRef.current = { key: preparedKey, paragraph: measured }
    }

    const prepared = preparedRef.current.paragraph
    const measure = cap ? [...Array<number>(DROP_CAP.lines).fill(width - cap.width), width] : width
    const fitted = solve(prepared, measure, policy)
    // Very narrow columns can only fit with distracting gaps or overflow.
    if (!fitted.lines.length || fitted.lines.some(
      (line) => line.residual < -0.5 || line.wordSpacing > prepared.space * 1.5
    )) {
      native("native-unfit")
      return
    }

    const baseWordSpacing = parseFloat(style.wordSpacing) || 0
    const baseLetterSpacing = parseFloat(style.letterSpacing) || 0
    setLayout({
      source: text,
      mode: "justified",
      cap,
      lines: fitted.lines.map((line, index) => {
        const next = fitted.lines[index + 1]
        const continuesWord = next && line.endOffset !== undefined && next.start === line.end - 1
        return {
          text: lineText(prepared, line),
          wordSpacing: baseWordSpacing + line.wordSpacing,
          wordInteriorSpacing: baseWordSpacing,
          letterSpacing: baseLetterSpacing + line.tracking,
          opening: line.opening,
          separator: next && !continuesWord ? " " : "",
          width: line.width,
          indent: cap && index < DROP_CAP.lines ? cap.width : 0,
        }
      }),
    })
  }, [compatible, text, bodyText, dropCap, dropCapArtwork, policy, setLayout])

  // Also catches inherited Type-lab font/style changes on React commits.
  useLayoutEffect(() => { refresh() })

  useEffect(() => {
    const paragraph = paragraphRef.current
    if (!compatible || !paragraph) return
    let frame = 0
    let disposed = false
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(refresh)
    }
    const fontsChanged = () => {
      if (disposed) return
      fontVersionRef.current += 1
      schedule()
    }
    const fontsFailed = () => {
      fontsFailedRef.current = true
      fontsChanged()
    }
    const observer = new ResizeObserver(schedule)
    observer.observe(paragraph)
    window.addEventListener("resize", schedule)
    document.fonts.addEventListener("loadingdone", fontsChanged)
    document.fonts.addEventListener("loadingerror", fontsFailed)
    document.fonts.ready.then(fontsChanged)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener("resize", schedule)
      document.fonts.removeEventListener("loadingdone", fontsChanged)
      document.fonts.removeEventListener("loadingerror", fontsFailed)
    }
  }, [compatible, refresh])

  const current = layout?.source === text ? layout : null
  const mode = !justify ? "native-label"
    : text === null ? "native-rich"
    : !text ? "native-empty"
    : !compatible ? "native-script"
    : current?.mode ?? "native-pending"

  return (
    <p
      {...props}
      ref={paragraphRef}
      className={cn("justice-paragraph", className)}
      data-justice={mode}
      data-drop-cap={dropCap && Boolean(text) ? true : undefined}
    >
      {dropCap && text && (
        <>
          <span
            ref={capRef}
            className="justice-drop-cap"
            style={current?.cap ? { width: current.cap.width, height: current.cap.height } : undefined}
          >
            {dropCapArtwork ? (
              <>
                <span className="sr-only" style={{ whiteSpace: "pre" }}>{text[0]}{text[1] === " " ? " " : ""}</span>
                <span aria-hidden="true" style={current?.cap ? { top: current.cap.top, left: current.cap.left, width: current.cap.artworkWidth, height: current.cap.artworkHeight } : undefined}>
                  {dropCapArtwork.glyph}
                </span>
              </>
            ) : (
              <span style={{ whiteSpace: "pre", ...(current?.cap ? { fontSize: current.cap.fontSize, top: current.cap.top, left: current.cap.left } : {}) }}>{text[0]}{text[1] === " " ? " " : ""}</span>
            )}
          </span>
        </>
      )}
      {compatible && current?.mode === "justified"
        ? current.lines.map((line, index) => (
          <Fragment key={index}>
            <span
              className="justice-line"
              style={{
                wordSpacing: `${line.wordSpacing}px`,
                letterSpacing: `${line.letterSpacing}px`,
                left: `${-line.opening}px`,
                ...(dropCap ? { width: line.width, marginLeft: line.indent } : {}),
              }}
            >
              {line.text.split(" ").map((word, wordIndex) => (
                <Fragment key={wordIndex}>
                  {wordIndex > 0 && " "}
                  <span style={{ wordSpacing: `${line.wordInteriorSpacing}px` }}>{word}</span>
                </Fragment>
              ))}
            </span>
            {line.separator}
          </Fragment>
        ))
        : dropCap && text ? bodyText : children}
      {compatible && (
        <span ref={probeRef} className="justice-probe" aria-hidden="true" />
      )}
    </p>
  )
}
