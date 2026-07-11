import assert from "node:assert/strict"
import { Worker } from "node:worker_threads"

const [kind, workerUrl] = process.argv.slice(2)

if ((kind !== "force" && kind !== "physics") || !workerUrl) {
  throw new Error("Usage: run-worker-module.mjs <force|physics> <worker-url>")
}

const request = kind === "force"
  ? {
      requestId: 1,
      request: {
        kind: "normalized",
        nodes: [{ id: "source" }, { id: "target" }],
        edges: [{ source: "source", target: "target" }],
        options: { iterations: 2, seed: 1 },
      },
    }
  : {
      requestId: 1,
      command: {
        type: "init",
        initialSpawns: [
          { id: "ball", x: 0, y: 0, shape: { type: "circle", radius: 2 } },
        ],
      },
    }

const shimUrl = new URL("./worker-shim.mjs", import.meta.url)
const worker = new Worker(shimUrl, {
  type: "module",
  workerData: { workerUrl },
})

const result = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error(`${kind} worker did not respond within 5 seconds`))
  }, 5_000)

  worker.once("error", (error) => {
    clearTimeout(timeout)
    reject(error)
  })
  worker.on("message", (envelope) => {
    if (envelope?.type === "error") {
      clearTimeout(timeout)
      reject(new Error(`${envelope.error?.name ?? "Error"}: ${envelope.error?.message ?? "worker failed"}`))
      return
    }
    if (envelope?.type === "ready") {
      worker.postMessage(request)
      return
    }
    if (envelope?.type === "response") {
      clearTimeout(timeout)
      resolve(envelope.message)
    }
  })
})

if (kind === "force") {
  assert.equal(result.requestId, 1)
  assert.deepEqual(Object.keys(result.positions).sort(), ["source", "target"])
  assert.ok(Number.isFinite(result.positions.source.x))
  assert.ok(Number.isFinite(result.positions.target.y))
} else {
  assert.equal(result.requestId, 1)
  assert.equal(result.ok, true)
  assert.equal(result.payload.type, "frame")
  assert.deepEqual(result.payload.frame.ids, ["ball"])
}

await worker.terminate()
console.log(`worker:${kind}:ok`)
