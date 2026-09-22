import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  MATTER_PHYSICS_CAPABILITIES,
  MATTER_PHYSICS_INSTALL,
  loadMatterPhysicsPeer,
  matterBodyToPhysicsBodySpec,
  matterBodyToPhysicsColliderSpec
} from "./MatterPhysicsEngineAdapter"
import {
  PhysicsOptionalEngineDependencyError,
  optionalEngineDependencyError
} from "./PhysicsOptionalEngineAdapters"
import {
  RAPIER_PHYSICS_CAPABILITIES,
  RAPIER_PHYSICS_ENGINE_DECISION,
  RAPIER_PHYSICS_INSTALL,
  loadRapierPhysicsPeer
} from "./RapierPhysicsEngineAdapter"

describe("optional physics peer loaders", () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => {
    vi.doUnmock("matter-js")
    vi.doUnmock("@dimforge/rapier2d-compat")
  })

  it.each([true, false])(
    "loads Matter with default export = %s",
    async (hasDefault) => {
      const matter = { Engine: { create: vi.fn() } }
      vi.doMock("matter-js", () =>
        hasDefault ? { default: matter } : { default: undefined, ...matter }
      )

      const loaded = await loadMatterPhysicsPeer()
      expect((loaded as typeof matter).Engine).toBe(matter.Engine)
    }
  )

  it.each([true, false])(
    "awaits Rapier initialization with default export = %s",
    async (hasDefault) => {
      let initialized = false
      const rapier = {
        init: vi.fn(async () => {
          await Promise.resolve()
          initialized = true
        })
      }
      vi.doMock("@dimforge/rapier2d-compat", () =>
        hasDefault ? { default: rapier } : { default: undefined, ...rapier }
      )

      const loaded = await loadRapierPhysicsPeer()
      expect((loaded as typeof rapier).init).toBe(rapier.init)
      expect(rapier.init).toHaveBeenCalledOnce()
      expect(initialized).toBe(true)
    }
  )

  it.each([
    ["Matter", loadMatterPhysicsPeer, MATTER_PHYSICS_INSTALL],
    ["Rapier", loadRapierPhysicsPeer, RAPIER_PHYSICS_INSTALL]
  ] as const)(
    "preserves the %s import failure and installation guidance",
    async (_name, load, details) => {
      const cause = new Error("Module not found")
      vi.doMock(details.packageName, () => {
        throw cause
      })

      await expect(load()).rejects.toMatchObject({
        name: "PhysicsOptionalEngineDependencyError",
        details,
        // Vitest wraps a rejected mock factory; preserve that entire chain.
        cause: { cause },
        message: expect.stringContaining(details.installCommand)
      })
    }
  )

  it("propagates a Rapier initialization failure", async () => {
    const cause = new Error("WASM initialization failed")
    vi.doMock("@dimforge/rapier2d-compat", () => ({
      default: undefined,
      init: vi.fn().mockRejectedValue(cause)
    }))

    await expect(loadRapierPhysicsPeer()).rejects.toBe(cause)
  })
})

describe("optional physics engine adapter guards", () => {
  it("records the Rapier package decision without importing the peer", () => {
    expect(RAPIER_PHYSICS_ENGINE_DECISION.selectedPackage).toBe(
      "@dimforge/rapier2d-compat"
    )
    expect(RAPIER_PHYSICS_ENGINE_DECISION.rejectedPackage).toBe(
      "@dimforge/rapier2d-deterministic"
    )
    expect(RAPIER_PHYSICS_CAPABILITIES.determinism).toBe("tolerance")
    expect(RAPIER_PHYSICS_INSTALL.installCommand).toBe(
      "npm install @dimforge/rapier2d-compat"
    )
  })

  it("exposes an actionable optional dependency error", () => {
    const cause = new Error("missing")
    const error = optionalEngineDependencyError(MATTER_PHYSICS_INSTALL, cause)
    expect(error).toBeInstanceOf(PhysicsOptionalEngineDependencyError)
    expect(error.message).toContain("npm install matter-js")
    expect(error.details.importPath).toBe("semiotic/physics/matter")
    expect((error as Error & { cause?: unknown }).cause).toBe(cause)
  })

  it("converts Matter circle bodies into physics spawn specs", () => {
    const spec = matterBodyToPhysicsBodySpec(
      {
        id: 12,
        label: "event-ball",
        position: { x: 24, y: 36 },
        velocity: { x: 4, y: -2 },
        circleRadius: 6,
        mass: 3,
        plugin: {
          datum: { id: "datum-1", state: "late" }
        }
      },
      0,
      { datumFromPlugin: "datum" }
    )

    expect(spec).toEqual({
      id: "event-ball",
      x: 24,
      y: 36,
      vx: 4,
      vy: -2,
      angle: undefined,
      mass: 3,
      shape: { type: "circle", radius: 6 },
      datum: { id: "datum-1", state: "late" }
    })
  })

  it("converts Matter sensor rectangles into physics collider specs", () => {
    const collider = matterBodyToPhysicsColliderSpec({
      label: "watermark-window",
      isSensor: true,
      bounds: {
        min: { x: 10, y: 20 },
        max: { x: 70, y: 80 }
      }
    })

    expect(collider).toEqual({
      id: "watermark-window",
      sensor: true,
      shape: {
        type: "aabb",
        x: 40,
        y: 50,
        width: 60,
        height: 60
      }
    })
    expect(MATTER_PHYSICS_CAPABILITIES.sensors).toBe(true)
  })
})
