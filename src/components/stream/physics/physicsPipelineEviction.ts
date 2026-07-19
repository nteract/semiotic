import type { PhysicsEngineAdapter } from "./PhysicsEngineAdapter"
import type { PhysicsSedimentAccumulator } from "./PhysicsSediment"
import type { PhysicsPipelineConfig } from "./PhysicsPipelineTypes"
import type { PhysicsPipelineEvictionResult } from "./physicsPipelineHelpers"
import type { PhysicsObservationContext } from "./physicsPipelineObservations"

export function selectEvictionCandidates(
  world: PhysicsEngineAdapter,
  eviction: PhysicsPipelineConfig["eviction"],
  liveBodyOrder: string[]
): string[] {
  if (eviction !== "sleeping-first") return liveBodyOrder.slice()
  const sleepState = new Map(
    world.readState().map((body) => [body.id, body.sleeping])
  )
  const sleeping: string[] = []
  const awake: string[] = []
  for (const id of liveBodyOrder) {
    if (sleepState.get(id)) sleeping.push(id)
    else awake.push(id)
  }
  return [...sleeping, ...awake]
}

export function absorbPhysicsSediment(
  world: PhysicsEngineAdapter,
  sediment: PhysicsSedimentAccumulator,
  ids: string[],
  context: PhysicsObservationContext
): string[] {
  const bodyById = new Map(world.readState().map((body) => [body.id, body]))
  const sedimented: string[] = []
  for (const id of ids) {
    const body = bodyById.get(id)
    if (!body) continue
    const bin = sediment.add(body)
    if (!bin) continue
    sedimented.push(id)
    context.emit({
      type: "physics-sediment",
      timestamp: context.elapsedSeconds,
      chartType: context.observation.chartType,
      chartId: context.observation.chartId,
      bodyId: id,
      datum: body.datum,
      x: body.x,
      y: body.y,
      binId: bin.id,
      count: bin.count,
      total: bin.total
    })
  }
  return sedimented
}

/**
 * Selects and removes overflow bodies past `bodyLimit`, absorbing them into
 * sediment where applicable. Returns the surviving `liveBodyOrder` alongside
 * the eviction result so the caller can commit both atomically.
 */
export function evictPhysicsOverflow(
  world: PhysicsEngineAdapter,
  sediment: PhysicsSedimentAccumulator,
  eviction: PhysicsPipelineConfig["eviction"],
  bodyLimit: number,
  liveBodyOrder: string[],
  context: PhysicsObservationContext
): PhysicsPipelineEvictionResult & { liveBodyOrder: string[] } {
  const noop = { evicted: [], sedimented: [], liveBodyOrder }
  if (eviction === false) return noop

  const limit = Math.max(0, Math.floor(bodyLimit))
  if (!Number.isFinite(limit)) return noop

  const overflow = liveBodyOrder.length - limit
  if (overflow <= 0) return noop

  const candidates = selectEvictionCandidates(world, eviction, liveBodyOrder)
  const evicted = candidates.slice(0, overflow)
  if (evicted.length === 0) return noop

  const sedimented = absorbPhysicsSediment(world, sediment, evicted, context)

  world.remove(evicted)
  const evictedSet = new Set(evicted)
  return {
    evicted,
    sedimented,
    liveBodyOrder: liveBodyOrder.filter((id) => !evictedSet.has(id))
  }
}
