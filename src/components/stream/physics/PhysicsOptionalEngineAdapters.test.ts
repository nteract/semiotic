import { describe, expect, it } from "vitest"
import {
  MATTER_PHYSICS_CAPABILITIES,
  MATTER_PHYSICS_INSTALL,
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
  RAPIER_PHYSICS_INSTALL
} from "./RapierPhysicsEngineAdapter"

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
    const collider = matterBodyToPhysicsColliderSpec(
      {
        label: "watermark-window",
        isSensor: true,
        bounds: {
          min: { x: 10, y: 20 },
          max: { x: 70, y: 80 }
        }
      }
    )

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
