import { useEffect, useEffectEvent, useRef, useState } from "react"
import type { GardenScene } from "@/components/lab/bloom-garden"
import type { GardenMonsteraArtwork } from "@/components/lab/bloom-monstera-artwork"
import { createMonsteraClient } from "@/components/lab/bloom-monstera-client"

export function useMonsteraGarden<T extends { sceneSeed: number; garden: GardenScene }>(scene: T) {
  const [prepared, setPrepared] = useState<{ scene: T; artworks: GardenMonsteraArtwork[] }>()
  const [error, setError] = useState<Error>()
  const client = useRef<ReturnType<typeof createMonsteraClient>>(undefined)
  const pending = useRef<{ id: number; scene: T }>(undefined)
  const currentScene = useEffectEvent(() => scene)
  useEffect(() => {
    const worker = createMonsteraClient((response) => {
      const request = pending.current
      if (!request || request.id !== response.id || !("artworks" in response)) {
        setError(new Error("Garden received mismatched monstera artwork"))
        return
      }
      setPrepared({ scene: request.scene, artworks: response.artworks })
    }, setError)
    client.current = worker
    return () => { worker.terminate(); client.current = undefined }
  }, [])
  useEffect(() => {
    const worker = client.current
    if (!worker) throw new Error("Monstera generation worker is not initialized")
    const next = currentScene()
    const plants = next.garden.monsteras.map(({ id, role, maturity, splitCount, anatomySeed }) =>
      ({ id, role, maturity, splitCount, anatomySeed }))
    const id = worker.submit({ kind: "garden", seed: next.sceneSeed, plants })
    pending.current = { id, scene: next }
  }, [scene.sceneSeed, scene.garden])
  if (error) throw error
  return prepared
}
