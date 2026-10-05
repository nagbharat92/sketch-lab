import { useEffect, useRef, useState } from "react"
import { useBloomStudyMotion } from "./use-bloom-study-motion"

export function useBloomVisibility() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const allowed = useBloomStudyMotion()
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return { ref, active: visible && allowed }
}
