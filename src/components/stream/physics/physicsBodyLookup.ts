import type { PhysicsEngineAdapter } from "./PhysicsEngineAdapter"
import type { PhysicsBodyState } from "./PhysicsKernel"

/** Capture the relevant boundary state before callbacks can mutate the world. */
export function physicsBodyLookup(
  world: PhysicsEngineAdapter,
  ids?: Iterable<string>
): (id: string) => PhysicsBodyState | undefined {
  if (world.readBody) {
    if (!ids) return (id) => world.readBody!(id)
    const bodies = new Map<string, PhysicsBodyState | undefined>()
    for (const id of ids) if (!bodies.has(id)) bodies.set(id, world.readBody(id))
    return (id) => bodies.get(id)
  }
  // Custom adapters without indexed reads still take only one snapshot per batch.
  const bodies = new Map(world.readState().map((body) => [body.id, body]))
  return (id) => bodies.get(id)
}
