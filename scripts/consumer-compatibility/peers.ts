import { loadMatterPhysicsPeer } from "semiotic/physics/matter"
import { loadRapierPhysicsPeer } from "semiotic/physics/rapier"

// Exercise installed npm peers through Semiotic's public loaders, including
// CJS/default interop and Rapier's WASM initialization. URL-only probes cannot
// detect a bare specifier mistakenly left to the browser's native resolver.
export const peerChecks = {
  async matter() {
    const matter = (await loadMatterPhysicsPeer()) as {
      version: string
      Engine: {
        create(): { world: unknown }
        update(engine: unknown, delta: number): void
        clear(engine: unknown): void
      }
      Bodies: {
        circle(
          x: number,
          y: number,
          radius: number
        ): { position: { y: number } }
      }
      Composite: { add(world: unknown, body: unknown): void }
    }
    const engine = matter.Engine.create()
    try {
      const body = matter.Bodies.circle(0, 0, 1)
      matter.Composite.add(engine.world, body)
      matter.Engine.update(engine, 1000 / 60)
      if (!Number.isFinite(body.position.y) || body.position.y <= 0)
        throw new Error("Matter peer did not simulate gravity")
      return matter.version
    } finally {
      matter.Engine.clear(engine)
    }
  },
  async rapier() {
    const rapier = (await loadRapierPhysicsPeer()) as {
      version(): string
      World: new (gravity: { x: number; y: number }) => {
        createRigidBody(description: unknown): { translation(): { y: number } }
        createCollider(description: unknown, body: unknown): void
        step(): void
        free(): void
      }
      RigidBodyDesc: { dynamic(): unknown }
      ColliderDesc: { ball(radius: number): unknown }
    }
    const world = new rapier.World({ x: 0, y: -9.81 })
    try {
      const body = world.createRigidBody(rapier.RigidBodyDesc.dynamic())
      world.createCollider(rapier.ColliderDesc.ball(1), body)
      world.step()
      const { y } = body.translation()
      if (!Number.isFinite(y) || y >= 0)
        throw new Error(
          "Rapier peer did not initialize WASM and simulate gravity"
        )
      return rapier.version()
    } finally {
      world.free()
    }
  }
}
