import { expect, it, vi } from "vitest"
import { createDefaultPhysicsEngineAdapter } from "./PhysicsEngineAdapter"
import { PhysicsSedimentAccumulator } from "./PhysicsSediment"
import { absorbPhysicsSediment } from "./physicsPipelineEviction"
import { normalizeObservationConfig } from "./physicsPipelineHelpers"

it.each([true, false])("retains all selected sediment across observer mutations (indexed: %s)", indexed => {
  const world = createDefaultPhysicsEngineAdapter()
  for (const id of ["a", "b", "unused"]) world.spawn({ id, x: 1, y: 2, shape: { type: "circle", radius: 1 }, datum: { id } })
  const readBody = vi.spyOn(world, "readBody")
  if (!indexed) world.readBody = undefined
  const readState = vi.spyOn(world, "readState")
  const sediment = new PhysicsSedimentAccumulator({})
  const events: unknown[] = []
  const absorbed = absorbPhysicsSediment(world, sediment, ["a", "b"], {
    elapsedSeconds: 1, observation: normalizeObservationConfig({}),
    emit(event) { events.push(event); if (event.bodyId === "a") world.remove(["b"]) }
  })
  expect(absorbed).toEqual(["a", "b"])
  expect(sediment.totals().count).toBe(2)
  expect(events[1]).toMatchObject({ bodyId: "b", datum: { id: "b" }, x: 1, y: 2, count: 2 })
  expect(readState.mock.calls.length).toBe(indexed ? 0 : 1)
  expect(readBody.mock.calls.length).toBe(indexed ? 2 : 0)
})
