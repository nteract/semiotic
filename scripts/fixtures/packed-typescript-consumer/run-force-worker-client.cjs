const assert = require("node:assert/strict")

class FakeWorker {
  static instances = []

  constructor(url, options) {
    this.url = url
    this.options = options
    this.onmessage = null
    this.onerror = null
    FakeWorker.instances.push(this)
  }

  postMessage({ requestId }) {
    queueMicrotask(() => {
      this.onmessage?.({
        data: {
          requestId,
          positions: {
            source: { x: 0.25, y: 0.5 },
            target: { x: 0.75, y: 0.5 },
          },
        },
      })
    })
  }

  terminate() {}
}

global.window = {}
global.Worker = FakeWorker

async function main() {
  const { forceLayoutAsync } = require("semiotic/recipes")
  const positions = await forceLayoutAsync(
    [{ id: "source" }, { id: "target" }],
    [{ source: "source", target: "target" }],
    { execution: "worker", iterations: 1 },
  )

  assert.deepEqual(positions, {
    source: { x: 0.25, y: 0.5 },
    target: { x: 0.75, y: 0.5 },
  })
  assert.equal(FakeWorker.instances.length, 1)
  const instance = FakeWorker.instances[0]
  assert.ok(instance.url instanceof URL)
  assert.match(instance.url.pathname, /\/dist\/forceLayoutWorker\.js$/)
  assert.deepEqual(instance.options, { type: "module", name: "semiotic-force-layout" })
  console.log("worker-client:cjs:ok")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
