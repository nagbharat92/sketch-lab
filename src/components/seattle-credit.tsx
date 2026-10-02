import { useMemo } from "react"
import { useBoilSeed } from "@/hooks/use-boil-seed"
import { roughPathInfos, ROUGH_OPTIONS } from "@/components/lab/rough"
import { cn } from "@/lib/utils"
import { XIcon, GitHubIcon } from "@/components/ui/social-icons"

export function SeattleCredit({ animated = true, compact = false, align = "center", small = false, minimal = false }: { animated?: boolean; compact?: boolean; align?: "left" | "center"; small?: boolean; minimal?: boolean }) {
  const seed = useBoilSeed(171, animated)
  const paths = useMemo(() => roughPathInfos(
    "M16 28 C12 24 3 18 3 11 C3 4 11 3 16 9 C21 3 29 4 29 11 C29 18 20 24 16 28 Z",
    {
      ...ROUGH_OPTIONS,
      roughness: 0.9,
      bowing: 0.5,
      seed,
      stroke: "currentColor",
      fill: "#D65359",
      fillStyle: "solid",
      strokeWidth: 1,
    },
  ), [seed])

  return (
    <div>
      <p className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", align === "left" ? "justify-start" : "justify-center", small && "gap-1 text-xs")}>
        <span>Made with</span>
        <span className="inline-flex items-center">
          <span className="sr-only">love</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 32 32"
            className={cn("seattle-love-heart size-6 overflow-visible text-foreground", small && "size-5")}
            data-animated={animated}
          >
            <g strokeLinecap="round" strokeLinejoin="round">
              {paths.map((path, i) => (
                <path key={i} d={path.d} stroke={path.stroke} fill={path.fill ?? "none"} strokeWidth={path.strokeWidth} />
              ))}
            </g>
          </svg>
        </span>
        <span>in Seattle.</span>
      </p>
      {!minimal && <nav aria-label="Find me online" className={cn(
        "mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground",
        compact && "flex-col",
        align === "left" && (compact ? "items-start justify-start" : "justify-start"),
        small && "mt-1.5 text-xs",
      )}>
        <a
          href="https://x.com/bharatnag92"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Say hello to @bharatnag92 on X (opens in a new tab)"
          className="ink-boil-parent inline-flex items-center gap-1 rounded underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>Say hello</span>
          <XIcon className="ink-boil size-3 shrink-0 text-foreground" />
          <span>@bharatnag92</span>
        </a>
        {!compact && <span aria-hidden="true" className="text-muted-foreground/50">·</span>}
        <a
          href="https://github.com/nagbharat92"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Explore my projects on GitHub (opens in a new tab)"
          className="ink-boil-parent inline-flex items-center gap-1 rounded underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>Explore</span>
          <GitHubIcon className="ink-boil size-3.5 shrink-0 text-foreground" />
          <span>my projects</span>
        </a>
      </nav>}
    </div>
  )
}
