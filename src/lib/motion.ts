/**
 * Motion tokens — JavaScript constants for Framer Motion.
 *
 * These values mirror the CSS custom properties defined in src/index.css.
 * The two must stay in sync manually. If you change a value here,
 * update the corresponding --duration-* or --ease-* token in index.css.
 *
 * Usage with Framer Motion:
 *   import { duration, ease } from '@/lib/motion'
 *   transition={{ duration: duration.base, ease: ease.out }}
 */

/**
 * Duration values in seconds (Framer Motion uses seconds, not milliseconds).
 *
 * fast:       0.15s (150ms) — micro-interactions: icon rotation, hover states
 * base:       0.20s (200ms) — standard transitions: expand/collapse, fades
 * slow:       0.30s (300ms) — larger movements: drawers, panels, modals
 * deliberate: 0.50s (500ms) — prominent animations: typewriter, hero reveals
 */
export const duration = {
  fast:       0.15,
  base:       0.20,
  slow:       0.30,
  deliberate: 0.50,
} as const

/**
 * Easing curves as cubic-bezier arrays [x1, y1, x2, y2].
 * Framer Motion accepts arrays in this format.
 * Values match the CSS custom properties exactly for visual parity.
 *
 * out:    [0, 0, 0.2, 1]       — things arriving/decelerating — most common
 * in:     [0.4, 0, 1, 1]       — things leaving/accelerating away
 * inOut:  [0.4, 0, 0.2, 1]     — symmetric transitions (expand/collapse)
 * spring: [0.34, 1.56, 0.64, 1] — subtle overshoot — use sparingly
 */
export const ease = {
  out:    [0, 0, 0.2, 1]        as [number, number, number, number],
  in:     [0.4, 0, 1, 1]        as [number, number, number, number],
  inOut:  [0.4, 0, 0.2, 1]      as [number, number, number, number],
  spring: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
} as const

/**
 * Pre-composed transition presets for common patterns.
 * Use these directly in Framer Motion transition props when the pattern fits.
 *
 * Example:
 *   <motion.span transition={transitions.microInteraction}>
 */
export const transitions = {
  /** Icon rotations, selection indicators, small state changes */
  microInteraction: {
    duration: duration.fast,
    ease: ease.out,
  },
  /** Expand/collapse, accordion, height/opacity reveals */
  expand: {
    duration: duration.base,
    ease: ease.inOut,
  },
  /** Panels, drawers, modals entering */
  enter: {
    duration: duration.slow,
    ease: ease.out,
  },
  /** Panels, drawers, modals leaving */
  exit: {
    duration: duration.slow,
    ease: ease.in,
  },
  /** Prominent reveals — typewriter equivalent in JS */
  deliberate: {
    duration: duration.deliberate,
    ease: ease.out,
  },
} as const

/**
 * Content entrance animations are now handled entirely by CSS keyframes
 * defined in src/index.css (fade-in-up, fade-in, delay classes).
 *
 * Framer Motion is still used for:
 *   - AnimatePresence page lifetime (canvas.tsx); CSS owns the crossfade
 *   - Micro-interactions (folder-tree chevron, expand/collapse)
 *
 * See docs/motion/content-transition-prd.md for the full spec.
 */
