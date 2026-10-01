import { useMemo } from "react"
import { useBoilSeed } from "@/hooks/use-boil-seed"
import { roughPathInfos, ROUGH_OPTIONS } from "@/components/lab/rough"
import { cn } from "@/lib/utils"

export function SeattleCredit({ animated = true, compact = false }: { animated?: boolean; compact?: boolean }) {
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
      <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
        <span>Made with</span>
        <span className="inline-flex items-center">
          <span className="sr-only">love</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 32 32"
            className="seattle-love-heart size-6 overflow-visible text-foreground"
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
      <nav aria-label="Find me online" className={cn(
        "mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground",
        compact && "flex-col",
      )}>
        <a
          href="https://x.com/bharatnag92"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Say hello to @bharatnag92 on X (opens in a new tab)"
          className="ink-boil-parent inline-flex items-center gap-1 rounded underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>Say hello</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="ink-boil size-3 shrink-0 fill-current text-foreground">
            <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
          </svg>
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
          <svg aria-hidden="true" viewBox="0 0 24 24" className="ink-boil size-3.5 shrink-0 fill-current text-foreground">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
          <span>my projects</span>
        </a>
      </nav>
    </div>
  )
}
