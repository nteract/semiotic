import { bench, describe } from "vitest"
import { PhysicsPipelineStore } from "../../src/components/stream/physics/PhysicsPipelineStore"

// Include observations: this used to copy the entire growing world per spawn.
// Keep timing assertions out of unit tests; admission tests separately bound reads.
for (const count of [1000, 4000, 8000]) {
  const spawns = Array.from({ length: count }, (_, index) => ({
    id: String(index), x: index * 4, y: 0,
    shape: { type: "circle" as const, radius: 1 }
  }))
  describe(`physics admission ${count} bodies`, () => {
    bench("queued batch with observations", () => {
      const store = new PhysicsPipelineStore()
      store.enqueue(spawns)
      store.materializeDueSpawns()
    }, { iterations: 10, time: 100, warmupIterations: 2, warmupTime: 0 })
    bench("individual queued arrivals with observations", () => {
      const store = new PhysicsPipelineStore()
      for (const spawn of spawns) store.enqueue(spawn)
      store.materializeDueSpawns()
    }, { iterations: 10, time: 100, warmupIterations: 2, warmupTime: 0 })
  })
}
