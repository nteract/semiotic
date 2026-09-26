import { describe, expect, it, vi } from "vitest"
import {
  absorbRegion,
  capacitatedRegion,
  chargeGateRegion,
  forceFieldRegion,
  membraneRegion,
  portalRegion,
  pressureFieldRegion,
  routeSurfaceRegion
} from "semiotic/recipes"
import type {
  StreamPhysicsRegionEffect,
  StreamPhysicsRegionEffectContext
} from "../stream/physics/StreamPhysicsTypes"

const base = { id: "region", x: 50, y: 50, width: 80, height: 80 }
const factories = [
  [
    "membrane",
    (attributes) => membraneRegion({ ...base, cost: 1, attributes }),
    { membraneCost: 1 }
  ],
  ["chargeGate", (attributes) => chargeGateRegion({ ...base, attributes }), {}],
  [
    "routeSurface",
    (attributes) => routeSurfaceRegion({ ...base, attributes }),
    {}
  ],
  [
    "pressureField",
    (attributes) => pressureFieldRegion({ ...base, pressure: 2, attributes }),
    { pressure: 2 }
  ],
  [
    "capacitatedSensor",
    (attributes) => capacitatedRegion({ ...base, capacity: 3, attributes }),
    { capacity: 3, unitsPerSecond: 3 }
  ],
  [
    "portal",
    (attributes) => portalRegion({ ...base, targetStage: "next", attributes }),
    { targetStage: "next" }
  ],
  ["absorb", (attributes) => absorbRegion({ ...base, attributes }), {}],
  ["forceField", (attributes) => forceFieldRegion({ ...base, attributes }), {}]
] satisfies Array<
  [
    string,
    (
      attributes?: StreamPhysicsRegionEffect["attributes"]
    ) => StreamPhysicsRegionEffect,
    Record<string, unknown>
  ]
>

describe.each(factories)(
  "%s region attributes",
  (primitive, factory, defaults) => {
    it("keeps factory defaults and protects identity from object attributes", () => {
      const authored = Object.freeze({ primitive: "spoofed", custom: 7 })
      expect(factory(undefined).attributes).toEqual({ ...defaults, primitive })
      expect(factory(authored).attributes).toEqual({
        ...defaults,
        custom: 7,
        primitive
      })
      expect(authored).toEqual({ primitive: "spoofed", custom: 7 })
    })

    it("evaluates body-specific attributes lazily with the complete context", () => {
      const attributes = vi.fn((context: StreamPhysicsRegionEffectContext) => ({
        primitive: "spoofed",
        bodyId: context.body.id,
        regionId: context.region.id,
        energy: context.regionState.energy
      }))
      const region = factory(attributes)
      expect(attributes).not.toHaveBeenCalled()
      expect(region.attributes).toBeTypeOf("function")
      if (typeof region.attributes !== "function")
        throw new Error("Expected callback")
      for (const id of ["body-a", "body-b"]) {
        const context: StreamPhysicsRegionEffectContext = {
          body: {
            id,
            x: 50,
            y: 50,
            prevX: 50,
            prevY: 50,
            vx: 0,
            vy: 0,
            angle: 0,
            mass: 1,
            shape: { type: "circle", radius: 5 },
            sleeping: false
          },
          region,
          regionState: {
            activeRegionIds: [region.id],
            regionIds: [region.id],
            charges: {},
            attributes: {},
            energy: 4
          }
        }
        expect(region.attributes(context)).toEqual({
          ...defaults,
          primitive,
          bodyId: id,
          regionId: region.id,
          energy: 4
        })
        expect(attributes).toHaveBeenLastCalledWith(context)
      }
    })
  }
)

it("allows authored overrides of ordinary defaults in both forms", () => {
  for (const attributes of [{ membraneCost: 9 }, () => ({ membraneCost: 9 })]) {
    const region = membraneRegion({ ...base, cost: 1, attributes })
    // This callback deliberately does not use its context.
    const value =
      typeof region.attributes === "function"
        ? region.attributes({} as StreamPhysicsRegionEffectContext)
        : region.attributes
    expect(value).toEqual({ primitive: "membrane", membraneCost: 9 })
  }
})
