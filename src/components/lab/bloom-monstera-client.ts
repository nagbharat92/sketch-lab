import type { MonsteraWorkerInput, MonsteraWorkerRequest, MonsteraWorkerResponse } from "./bloom-monstera-artwork.ts"

type Result = Exclude<MonsteraWorkerResponse, { error: string }>
type Consumer = {
  latest: number | undefined
  closed: boolean
  onResult: (response: Result) => void
  onError: (error: Error) => void
}

export function createMonsteraPool(worker: Worker, onEmpty: () => void = () => {}) {
  const consumers = new Set<Consumer>()
  const queued = new Map<Consumer, MonsteraWorkerRequest>()
  let sequence = 0, active: { consumer: Consumer; request: MonsteraWorkerRequest } | undefined
  let failed: Error | undefined
  let closed = false
  const drain = () => {
    if (active || failed || closed) return
    const next = queued.entries().next()
    if (next.done) return
    const [consumer, request] = next.value
    queued.delete(consumer)
    active = { consumer, request }
    worker.postMessage(request)
  }
  const fail = (error: Error) => {
    failed = error
    queued.clear()
    for (const consumer of consumers) consumer.onError(error)
  }
  worker.onmessage = (event: MessageEvent<MonsteraWorkerResponse>) => {
    const response = event.data
    if (!active || response.id !== active.request.id) {
      fail(new Error("Unexpected monstera worker response"))
      return
    }
    const consumer = active.consumer
    active = undefined
    if (!consumer.closed && response.id === consumer.latest) {
      if ("error" in response) consumer.onError(new Error(response.error))
      else consumer.onResult(response)
    }
    drain()
  }
  worker.onerror = (event) => fail(new Error(event.message || "Monstera generation worker failed"))
  return {
    acquire(onResult: Consumer["onResult"], onError: Consumer["onError"]) {
      if (closed) throw new Error("Monstera worker pool is closed")
      if (failed) throw failed
      const consumer: Consumer = { latest: undefined, closed: false, onResult, onError }
      consumers.add(consumer)
      return {
        submit(input: MonsteraWorkerInput) {
          if (consumer.closed) throw new Error("Monstera generation client is closed")
          if (failed) throw failed
          const id = ++sequence
          consumer.latest = id
          queued.set(consumer, { ...input, id })
          drain()
          return id
        },
        terminate() {
          if (consumer.closed) return
          consumer.closed = true
          queued.delete(consumer)
          consumers.delete(consumer)
          if (!consumers.size) {
            closed = true
            worker.onmessage = null
            worker.onerror = null
            worker.terminate()
            onEmpty()
          }
        },
      }
    },
  }
}

let sharedPool: ReturnType<typeof createMonsteraPool> | undefined

export function createMonsteraClient(onResult: Consumer["onResult"], onError: Consumer["onError"]) {
  if (!sharedPool) {
    const worker = new Worker(new URL("./bloom-monstera.worker.ts", import.meta.url), { type: "module" })
    sharedPool = createMonsteraPool(worker, () => { sharedPool = undefined })
  }
  return sharedPool.acquire(onResult, onError)
}
