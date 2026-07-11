import { parentPort, workerData } from "node:worker_threads"

function serialiseError(error) {
  if (error instanceof Error) {
    return { message: error.message, name: error.name, stack: error.stack }
  }
  return { message: String(error) }
}

if (!parentPort) throw new Error("The packed-worker shim needs a parent port")

// Semiotic's browser workers use Web Worker globals. Bridge the small surface
// they need to Node's worker_threads API so the packed module itself—not just
// its presence in the tarball—executes in the consumer check.
globalThis.self = globalThis
globalThis.postMessage = (message, transferList) => {
  parentPort.postMessage({ type: "response", message }, transferList)
}

parentPort.on("message", (message) => {
  try {
    if (typeof globalThis.onmessage !== "function") {
      throw new Error("Worker module did not register self.onmessage")
    }
    globalThis.onmessage({ data: message })
  } catch (error) {
    parentPort.postMessage({ type: "error", error: serialiseError(error) })
  }
})

try {
  await import(workerData.workerUrl)
  parentPort.postMessage({ type: "ready" })
} catch (error) {
  parentPort.postMessage({ type: "error", error: serialiseError(error) })
}
