import { useEffect, useEffectEvent, useRef, useState } from "react"
import type { MonsteraArtwork } from "@/components/lab/bloom-monstera-artwork"
import { createMonsteraClient } from "@/components/lab/bloom-monstera-client"

type Specimen = { seed: number; anatomySeed: number; age: number; markings: MonsteraArtwork["markings"]; coverage?: number }

export function useMonsteraStudy<T extends Specimen>(specimen: T, previewSeed: number) {
  const [prepared, setPrepared] = useState<{ specimen: T; artwork: MonsteraArtwork; previews: MonsteraArtwork[] }>()
  const [error, setError] = useState<Error>()
  const client = useRef<ReturnType<typeof createMonsteraClient>>(undefined)
  const pending = useRef<{ id: number; specimen: T; previewSeed: number }>(undefined)
  const previews = useRef<{ seed: number; artworks: MonsteraArtwork[] }>(undefined)
  const currentSpecimen = useEffectEvent(() => specimen)
  useEffect(() => {
    const worker = createMonsteraClient((response) => {
      const request = pending.current
      if (!request || request.id !== response.id || !("artwork" in response)) {
        setError(new Error("Study received mismatched monstera artwork"))
        return
      }
      if (response.previews) previews.current = { seed: request.previewSeed, artworks: response.previews }
      const choices = previews.current
      if (!choices || choices.seed !== request.previewSeed) {
        setError(new Error("Study received no matching monstera previews"))
        return
      }
      setPrepared({ specimen: request.specimen, artwork: response.artwork, previews: choices.artworks })
    }, setError)
    client.current = worker
    return () => { worker.terminate(); client.current = undefined; previews.current = undefined }
  }, [])
  useEffect(() => {
    const worker = client.current
    if (!worker) throw new Error("Monstera generation worker is not initialized")
    const next = currentSpecimen()
    const id = worker.submit({ kind: "study", seed: next.anatomySeed, age: next.age, markings: next.markings,
      coverage: next.coverage === undefined ? undefined : next.coverage / 100,
      previewSeed: previews.current?.seed === previewSeed ? undefined : previewSeed })
    pending.current = { id, specimen: next, previewSeed }
  }, [specimen.anatomySeed, specimen.age, specimen.markings, specimen.coverage, previewSeed])
  if (error) throw error
  return prepared
}
