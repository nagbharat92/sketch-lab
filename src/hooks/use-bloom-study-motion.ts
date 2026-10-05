import { useSyncExternalStore } from "react"
import { BLOOM_MOTION } from "@/components/lab/bloom-tokens"

function subscribe(update: () => void) {
  const query = window.matchMedia(BLOOM_MOTION.reducedQuery)
  query.addEventListener("change", update)
  document.addEventListener("visibilitychange", update)
  return () => {
    query.removeEventListener("change", update)
    document.removeEventListener("visibilitychange", update)
  }
}

const allowed = () => !window.matchMedia(BLOOM_MOTION.reducedQuery).matches && !document.hidden

export function useBloomStudyMotion() {
  return useSyncExternalStore(subscribe, allowed, () => false)
}
