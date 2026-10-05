import { useEffect, useRef, useState, type ReactNode } from "react"

export function DeferredBloomStudy({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (mounted || !ref.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setMounted(true)
      observer.disconnect()
    }, { rootMargin: "0px 0px 200px 0px" })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [mounted])

  // Reserve a spread so later studies don't all intersect before their content exists.
  // Once visited, retain the mounted controls and their generated specimen state.
  return (
    <div ref={ref} style={mounted ? undefined : { minHeight: "100svh" }}>
      {mounted ? children : <p role="status" className="sr-only">Scroll to explore {label.toLowerCase()}.</p>}
    </div>
  )
}
