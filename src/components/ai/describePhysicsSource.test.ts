import { describe, expect, it } from "vitest"
import { describeChart } from "./describeChart"
import { describePhysicsSource } from "./describePhysicsSource"
import { buildPhysicsPile } from "../charts/physics/physicsPilePhysics"
import { buildGaltonBoardPhysics } from "../charts/physics/galtonBoardPhysics"
import { buildCollisionSwarmPhysics } from "../charts/physics/collisionSwarmPhysics"
import { buildEventDropPhysics } from "../charts/physics/eventDropPhysics"
import { generateGaltonMechanicalSamples } from "../charts/physics/physicsGaltonData"
import type { Datum } from "../charts/shared/datumTypes"

const size: [number, number] = [400, 260]

describe("physics descriptions derived from source records", () => {
  it("describes exact pile quantities without calling them body counts", () => {
    for (const values of [[49, 49], [98]]) {
      const props = {
        data: values.map((value) => ({ category: "A", value })),
        valueAccessor: "value" as const,
        unitValue: 100
      }
      const source = describePhysicsSource("UnitPileChart", props)
      expect(source?.rows).toEqual([{ label: "A", value: 98 }])
      expect(source?.rows).toEqual(
        buildPhysicsPile({
          ...props,
          categoryAccessor: "category",
          ballRadius: 5,
          seed: 1,
          size
        }).projectionRows
      )
      const description = describeChart("UnitPileChart", props)
      expect(description.levels.l2).toContain("98 units")
      expect(description.levels.l2).not.toContain("bodies")
      expect(description.levels.l2).not.toContain("settled")
      expect(description.levels.l3).toContain("A, which holds all 98 units")
    }
  })

  it("counts rows by default and applies corrected source IDs before indexed accessors", () => {
    const data = [
      { id: "a", category: "A", value: 999 },
      { id: "a", category: "A", value: 0 }
    ]
    expect(describePhysicsSource("UnitPileChart", { data })?.rows).toEqual([
      { label: "A", value: 1 }
    ])
    const props = {
      data: [...data, { id: "b", category: "B", value: 0 }],
      valueAccessor: (_datum: Datum, index: number) => index + 3
    }
    expect(describePhysicsSource("UnitPileChart", props)?.rows).toEqual([
      { label: "A", value: 3 },
      { label: "B", value: 4 }
    ])
  })

  it("uses the same finite values and explicit extent as Galton's layout", () => {
    const props = {
      data: [-10, 0, 1, 2, 3, 10, NaN].map((value) => ({ value })),
      bins: 4,
      valueExtent: [4, 0] as [number, number]
    }
    expect(describePhysicsSource("GaltonBoardChart", props)?.rows).toEqual([
      { label: "1", value: 2 },
      { label: "2", value: 1 },
      { label: "3", value: 1 },
      { label: "4", value: 2 }
    ])
    expect(describePhysicsSource("GaltonBoardChart", props)?.rows).toEqual(
      buildGaltonBoardPhysics({
        ...props,
        valueAccessor: "value",
        ballRadius: 6,
        seed: 1,
        size
      }).projectionRows
    )
    expect(
      describePhysicsSource("GaltonBoardChart", { data: [{ value: 1 }] })?.rows
    ).toHaveLength(21)
  })

  it("identifies generated samples and preserves the full mechanical Galton domain", () => {
    const props = {
      simulationMode: "mechanical",
      mode: "primary",
      bins: 5,
      pegRows: 4,
      branchProbability: 0,
      mechanicalCount: 7
    }
    const source = describePhysicsSource("GaltonBoardChart", props)
    const data = generateGaltonMechanicalSamples({
      bins: 5,
      pegRows: 4,
      branchProbability: 0,
      count: 7
    })
    expect(source?.rows).toEqual(
      buildGaltonBoardPhysics({
        data,
        bins: 5,
        valueExtent: [0, 4],
        valueAccessor: "value",
        ballRadius: 6,
        seed: 1,
        size
      }).projectionRows
    )
    expect(describeChart("GaltonBoardChart", props).levels.l2).toContain(
      "The generated sample projection contains 7 samples"
    )
    expect(
      describeChart("UnitPileChart", {
        simulationMode: "mechanical",
        mechanicalCount: 12,
        unitValue: 100
      }).levels.l2
    ).toContain("1,200 units")
  })

  it("counts valid swarm points in their source lanes", () => {
    const props = {
      data: [
        { x: 1, group: "A" },
        { x: 1, group: "A" },
        { x: "bad", group: "B" }
      ],
      groupAccessor: "group" as const
    }
    expect(describePhysicsSource("CollisionSwarmChart", props)?.rows).toEqual([
      { label: "A", value: 2 }
    ])
    expect(describePhysicsSource("CollisionSwarmChart", props)?.rows).toEqual(
      buildCollisionSwarmPhysics({
        ...props,
        xAccessor: "x",
        pointRadius: 5,
        seed: 1,
        size
      }).projectionRows
    )
    expect(describeChart("CollisionSwarmChart", props).levels.l2).toContain(
      "2 points"
    )
  })

  it("describes EventDrop admission counts without relabeling accepted history", () => {
    const props = {
      data: [
        { time: 0, arrivalTime: 0 },
        { time: 20, arrivalTime: 20 },
        { time: 0, arrivalTime: 30 }
      ],
      watermark: { delay: 5 }
    }
    const source = describePhysicsSource("EventDropChart", props)
    expect(
      source?.rows.map(({ secondaryLabel: _label, ...row }) => row)
    ).toEqual(
      buildEventDropPhysics({
        ...props,
        windows: { size: 10 },
        timeAccessor: "time",
        arrivalAccessor: "arrivalTime",
        ballRadius: 7,
        seed: 1,
        size
      }).projectionRows
    )
    expect(describeChart("EventDropChart", props).levels.l2).toBe(
      "The source projection classifies 3 events across 3 time windows: 2 accepted and 1 late."
    )
    expect(
      describeChart("EventDropChart", {
        data: [{ time: 0 }],
        watermark: { value: 100 }
      }).levels.l2
    ).toContain("0 accepted and 1 late")
  })

  it("keeps explicit process projections authoritative and does not infer process completion", () => {
    expect(
      describeChart("UnitPileChart", {
        data: [{ value: 999 }],
        projectionRows: [{ label: "Observed", value: 3 }]
      }).levels.l2
    ).toContain("The settled projection contains 3 units")
    expect(
      describePhysicsSource("ProcessFlowChart", { data: [{ stage: "start" }] })
    ).toBeNull()
    expect(describePhysicsSource("UnitPileChart", {})).toBeNull()
  })
})
