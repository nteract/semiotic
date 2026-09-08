import * as React from "react"
import { act, render } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { renderChartWithEvidence } from "../../server/renderToStaticSVG"
import type { PhysicsPipelineSnapshot } from "../../stream/physics/PhysicsPipelineStore"
import { UnitPileChart } from "./UnitPileChart"
import type { PhysicsFrameHandle } from "./physicsHocHandle"
import { buildPhysicsPile } from "./physicsPilePhysics"

function quantity(datum: unknown): number {
  return (datum as { representedValue: number }).representedValue
}

function pile(values: number[], unitValue = 100) {
  return buildPhysicsPile({
    data: values.map((value, index) => ({
      id: `row-${index}`,
      category: "A",
      value
    })),
    categoryAccessor: "category",
    valueAccessor: "value",
    unitValue,
    ballRadius: 8,
    seed: 1,
    size: [400, 260]
  })
}

describe("UnitPile quantity accounting", () => {
  it.each([
    { values: [49, 49], total: 98 },
    { values: [98], total: 98 },
    { values: [51, 51], total: 102 },
    { values: [102], total: 102 },
    { values: [200, 25.5], total: 225.5 }
  ])(
    "preserves $total from $values in both labels and represented area",
    ({ values, total }) => {
      const layout = pile(values)
      expect(layout.projectionRows).toEqual([{ label: "A", value: total }])
      const represented = layout.initialSpawns.reduce(
        (sum, spawn) => sum + quantity(spawn.datum),
        0
      )
      const areaInFullCircles = layout.initialSpawns.reduce(
        (sum, spawn) =>
          sum +
          (spawn.shape.type === "circle" ? spawn.shape.radius ** 2 / 64 : 0),
        0
      )
      expect(represented).toBeCloseTo(total, 12)
      expect(areaInFullCircles * 100).toBeCloseTo(total, 12)
      for (const [index, value] of values.entries()) {
        const parts = layout.initialSpawns.filter(
          (spawn) => (spawn.datum as { id: string }).id === `row-${index}`
        )
        expect(
          parts.reduce((sum, spawn) => sum + quantity(spawn.datum), 0)
        ).toBeCloseTo(value, 12)
      }
    }
  )

  it("does not invent quantity for zero, negative, or nonfinite input", () => {
    const layout = pile([0, -1, NaN, Infinity])
    expect(layout.initialSpawns).toEqual([])
    expect(layout.projectionRows).toEqual([{ label: "A", value: 0 }])
  })

  it("avoids floating-point slivers without dropping small positive quantities", () => {
    expect(pile([0.07], 0.01).initialSpawns).toHaveLength(7)
    expect(pile([1e-12]).initialSpawns).toHaveLength(1)
    expect(pile([1e-12]).projectionRows[0].value).toBe(1e-12)
  })

  it("keeps exact totals and partial bodies in both server entry points", () => {
    const props = {
      data: [
        { id: "a", category: "A", value: 49 },
        { id: "b", category: "A", value: 49 }
      ],
      valueAccessor: "value" as const,
      unitValue: 100,
      width: 400,
      height: 260
    }
    const { svg, evidence } = renderChartWithEvidence("UnitPileChart", props)
    expect(evidence.markCount).toBe(2)
    expect(evidence.empty).toBe(false)
    for (const markup of [svg, renderToString(<UnitPileChart {...props} />)]) {
      expect(markup).toMatch(/>98<\/text>/)
      expect(markup).toContain("Full circle = 100")
    }
  })

  it("honors simulationMode in server rendering alongside a display mode", () => {
    const { evidence } = renderChartWithEvidence("UnitPileChart", {
      simulationMode: "mechanical",
      mode: "primary",
      mechanicalCount: 12,
      mechanicalCategories: ["A", "B"],
      width: 400,
      height: 260
    })
    expect(evidence.markCount).toBe(12)
  })
})

describe("UnitPile imperative quantities", () => {
  let cleanupCanvas: () => void
  beforeEach(() => {
    cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => {
    cleanupCanvas()
  })

  it("pushes and updates partial units without creating a fallback body for zero", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    render(<UnitPileChart ref={ref} valueAccessor="value" unitValue={100} />)
    act(() =>
      ref.current!.pushMany([
        { id: "a", category: "A", value: 49 },
        { id: "zero", category: "A", value: 0 }
      ])
    )
    const snapshot = () =>
      ref.current!.getCustomLayout!() as PhysicsPipelineSnapshot
    expect(snapshot().world.bodies).toHaveLength(1)
    expect(snapshot().world.bodies[0].datum).toMatchObject({
      id: "a",
      representedValue: 49
    })

    act(() => {
      ref.current!.update("a", (datum) => ({ ...datum, value: 102 }))
    })
    expect(snapshot().world.bodies).toHaveLength(2)
    expect(snapshot().world.bodies.map((body) => quantity(body.datum))).toEqual(
      [100, 2]
    )
    act(() => {
      ref.current!.remove("a")
    })
    expect(snapshot().world.bodies).toHaveLength(0)
  })

  it("keeps anonymous seed rows addressable when they expand into units", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    render(
      <UnitPileChart
        ref={ref}
        data={[{ category: "A", value: 102 }]}
        valueAccessor="value"
        unitValue={100}
      />
    )
    act(() => {
      ref.current!.remove("pile-0")
    })
    const snapshot = ref.current!.getCustomLayout!() as PhysicsPipelineSnapshot
    expect(snapshot.world.bodies).toHaveLength(0)
    expect(snapshot.queue).toHaveLength(0)
  })
})
