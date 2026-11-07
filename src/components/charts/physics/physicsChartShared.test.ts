import { describe, expect, it, vi } from "vitest"
import {
  composePhysicsBodyStyle,
  finiteNumber,
  physicsChartArea,
  styleFromColorAccessor
} from "./physicsChartShared"

import { PhysicsPipelineStore } from "../../stream/physics/PhysicsPipelineStore"

describe("finiteNumber", () => {
  it("preserves numeric strings and dates while rejecting missing, non-finite and coercible objects", () => {
    expect([0, " 12.5 ", "0x10", new Date(1234)].map(finiteNumber)).toEqual([0, 12.5, 16, 1234])
    const valueOf = vi.fn(() => 7)
    for (const value of [null, undefined, "", " ", "invalid", Infinity, NaN, new Date(NaN), Symbol("n"), 1n, { valueOf }]) {
      expect(finiteNumber(value)).toBeNull()
    }
    expect(valueOf).not.toHaveBeenCalled()
  })
})

describe("physicsChartArea", () => {
  it("preserves the full chart plot geometry", () => {
    expect(physicsChartArea([300, 180]).plot).toEqual({
      x: 32,
      y: 24,
      width: 236,
      height: 122
    })
  })

  it("keeps a sparkline plot inside its requested bounds", () => {
    const area = physicsChartArea([118, 36])

    expect(area.plot.x).toBeGreaterThanOrEqual(0)
    expect(area.plot.y).toBeGreaterThanOrEqual(0)
    expect(area.plot.x + area.plot.width).toBeLessThanOrEqual(area.width)
    expect(area.plot.y + area.plot.height).toBeLessThanOrEqual(area.height)
    expect(area.plot.width).toBeGreaterThan(90)
    expect(area.plot.height).toBeGreaterThan(24)
  })
})

describe("styleFromColorAccessor", () => {
  it("layers declarative rules over the colorBy-derived particle style", () => {
    const bodyStyle = styleFromColorAccessor("outcome", "#2563eb", {
      styleRules: [
        {
          when: { field: "outcome", eq: "accepted" },
          style: { fill: "#57c7b7", stroke: "#f0e7cf" }
        },
        {
          when: { field: "value", gte: 10 },
          style: { strokeWidth: 2 }
        }
      ],
      valueAccessor: "value"
    })

    expect(
      bodyStyle({
        datum: { id: "accepted-route", outcome: "accepted", value: 12 }
      })
    ).toMatchObject({
      fill: "#57c7b7",
      stroke: "#f0e7cf",
      strokeWidth: 2
    })
  })

  it("preserves generated defaults while authored frame style wins", () => {
    const generated = styleFromColorAccessor(undefined, "#generated")
    const composed = composePhysicsBodyStyle(generated, {
      fill: "#authored",
      cursor: "pointer"
    })
    const store = new PhysicsPipelineStore()
    store.spawnNow({ id: "body", x: 0, y: 0, shape: { type: "circle", radius: 4 }, datum: { id: "body" } })
    const style = typeof composed === "function"
      ? composed(
          store.readBodies()[0],
          { selected: false, simulationState: store.snapshot().simulationState }
        )
      : composed

    expect(style).toMatchObject({
      fill: "#authored",
      cursor: "pointer",
      stroke: "#111827",
      strokeWidth: 1,
      opacity: 0.9
    })
  })
})
