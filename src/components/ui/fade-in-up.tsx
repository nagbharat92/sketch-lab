import { cn } from "@/lib/utils"

interface FadeInUpProps {
  /** Stagger index — controls animation delay via CSS calc(). */
  i: number
  /** Additional CSS classes merged onto the wrapper div. */
  className?: string
  children: React.ReactNode
}

/**
 * FadeInUp — short content-rise wrapper (name retained for existing callers).
 *
 * Applies a transform-only entrance with a computed stagger delay based on `i`.
 * Page-level CSS owns opacity, avoiding two fades on the same content.
 *
 * Delay formula (in CSS):
 *   delay(i) = i × --stagger-base + i×(i−1)/2 × --stagger-growth
 *
 * Tweak `--stagger-base` and `--stagger-growth` in :root (index.css)
 * to change the feel globally. No per-element configuration needed.
 *
 * Usage:
 *   <FadeInUp i={0}><h1>First</h1></FadeInUp>
 *   <FadeInUp i={1} className="mt-4"><p>Second</p></FadeInUp>
 */
export function FadeInUp({ i, className, children }: FadeInUpProps) {
  return (
    <div
      className={cn("animate-fade-in-up", className)}
      style={{ "--i": i } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
