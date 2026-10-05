import { createMonsteraArtwork, prepareGardenMonsteras, type MonsteraWorkerRequest, type MonsteraWorkerResponse } from "./bloom-monstera-artwork"
import { MONSTERA_MARKINGS } from "./bloom-tokens"

self.onmessage = (event: MessageEvent<MonsteraWorkerRequest>) => {
  const request = event.data
  const { id } = request
  let response: MonsteraWorkerResponse
  try {
    if (request.kind === "garden") {
      response = { id, artworks: prepareGardenMonsteras(request.seed, request.plants) }
    } else {
      const { seed, age, markings, coverage, previewSeed } = request
      response = { id, artwork: createMonsteraArtwork(seed, age, markings, coverage),
        ...(previewSeed === undefined ? {} : {
          previews: MONSTERA_MARKINGS.map((pattern) => createMonsteraArtwork(previewSeed, 0, pattern)),
        }) }
    }
  } catch (error) {
    response = { id, error: error instanceof Error ? error.message : String(error) }
  }
  self.postMessage(response)
}
