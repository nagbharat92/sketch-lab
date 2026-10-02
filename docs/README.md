# Sketch Lab documentation

- [Project summary](PROJECT-SUMMARY.md): purpose, architecture and local conversion status.
- `design-system/`: retained token, typography and component design references.
- `motion/`: content-transition rationale and specification.
- `archive/`: historical portfolio plans, the June project summary and content-authoring handoff. These describe earlier work, not the current roadmap.

## Source of truth

The retained design-system and motion documents explain the underlying approach, but some examples predate the current labs. Use `src/tokens.css` and `src/index.css` for current theme, spacing and typography values; `src/lib/ink.ts`, `src/lib/text-boil.ts` and `src/lib/motion.ts` for current drawing and animation settings.

Bloom's domain-specific tokens live in `src/components/lab/bloom-tokens.ts`, with scoped presentation variables in `bloom-illustration.css`. `bloom-garden.ts` generates the cast, `bloom-geometry.ts` generates anatomy, and `bloom-state.ts` coordinates a new scene and palette. These preserve the garden's flat 2D illustration style rather than introducing a separate UI theme.

Lab entries live directly under `src/data/content/`. Their `order` controls both the flat navigation list and the home previews. Interactive implementations live under `src/components/blocks/custom/`.

Archived PRDs remain useful historical context. Their portfolio-specific instructions, old file paths and next steps are not active requirements.
