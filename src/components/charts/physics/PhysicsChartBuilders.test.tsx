import { describe, expect, it } from "vitest"
import {
  buildCollisionSwarmPhysics,
  buildEventDropPhysics,
  buildGaltonBoardPhysics,
  buildPhysicalFlowPhysics,
  buildPhysicsPile,
  buildProcessFlowPhysics,
  type EventDropProjectionMetadata,
  generateGaltonMechanicalSamples,
  generatePhysicsPileMechanicalSamples
} from "./physicsChartUtils"

describe("physics chart builders", () => {
  it("maps Galton samples into bins and body spawns", () => {
    const layout = buildGaltonBoardPhysics({
      data: [
        { id: "a", value: 1 },
        { id: "b", value: 2 },
        { id: "c", value: 3 }
      ],
      valueAccessor: "value",
      bins: 3,
      ballRadius: 4,
      seed: 1,
      size: [300, 180]
    })

    expect(layout.initialSpawns.map((spawn) => spawn.id)).toEqual([
      "a",
      "b",
      "c"
    ])
    expect(
      layout.projectionRows.reduce((sum, row) => sum + row.value, 0)
    ).toBe(3)
    expect(layout.metadata).toMatchObject({
      kind: "galton-board",
      valueExtent: [1, 3]
    })
  })

  it("normalizes Galton valueExtent before binning", () => {
    const reversed = buildGaltonBoardPhysics({
      data: [{ id: "mid", value: 5 }],
      valueAccessor: "value",
      bins: 10,
      ballRadius: 4,
      seed: 1,
      size: [300, 180],
      valueExtent: [10, 0]
    })
    const invalid = buildGaltonBoardPhysics({
      data: [{ id: "mid", value: 5 }],
      valueAccessor: "value",
      bins: 10,
      ballRadius: 4,
      seed: 1,
      size: [300, 180],
      valueExtent: [Number.POSITIVE_INFINITY, 0]
    })

    expect(reversed.initialSpawns[0].datum).toMatchObject({ bin: 5 })
    expect(reversed.metadata).toMatchObject({ valueExtent: [0, 10] })
    expect(invalid.metadata).toMatchObject({ valueExtent: [5, 5] })
  })

  it("generates deterministic mechanical Galton samples from branch probability", () => {
    const balanced = generateGaltonMechanicalSamples({
      bins: 9,
      count: 24,
      pegRows: 8,
      branchProbability: 0.5,
      seed: 17
    })
    const repeat = generateGaltonMechanicalSamples({
      bins: 9,
      count: 24,
      pegRows: 8,
      branchProbability: 0.5,
      seed: 17
    })
    const biased = generateGaltonMechanicalSamples({
      bins: 9,
      count: 24,
      pegRows: 8,
      branchProbability: 0.8,
      seed: 17
    })

    expect(repeat).toEqual(balanced)
    expect(balanced).toHaveLength(24)
    expect(new Set(balanced.map((datum) => datum.side))).toContain("left")
    expect(
      biased.reduce((sum, datum) => sum + Number(datum.pathRights), 0)
    ).toBeGreaterThan(
      balanced.reduce((sum, datum) => sum + Number(datum.pathRights), 0)
    )
  })

  it("maps event drops into on-time and late settled projection rows", () => {
    const layout = buildEventDropPhysics({
      data: [
        { id: "on", time: 25, arrivalTime: 26 },
        { id: "late", time: 2, arrivalTime: 30 }
      ],
      timeAccessor: "time",
      arrivalAccessor: "arrivalTime",
      windows: { size: 10 },
      watermark: { delay: 5 },
      ballRadius: 4,
      seed: 1,
      size: [360, 200]
    })

    expect(layout.initialSpawnPacing?.pacing).toBe("arrival")
    expect(layout.projectionRows.some((row) => row.secondary === 1)).toBe(true)
    expect(
      layout.initialSpawns.find((spawn) => spawn.id === "late")?.datum
    ).toMatchObject({ late: true })
  })

  it("drops EventDrop bodies over event time and uses left-gutter lid geometry", () => {
    const layout = buildEventDropPhysics({
      data: [
        { id: "old", time: 4, arrivalTime: 40 },
        { id: "frontier", time: 24, arrivalTime: 12 }
      ],
      timeAccessor: "time",
      arrivalAccessor: "arrivalTime",
      windows: { size: 10 },
      watermark: { value: 20 },
      ballRadius: 5,
      seed: 1,
      size: [360, 200],
      timeExtent: [0, 30]
    })
    const metadata = layout.metadata as unknown as EventDropProjectionMetadata
    const old = layout.initialSpawns.find((spawn) => spawn.id === "old")
    const colliders = layout.config.colliders ?? []

    expect(metadata.gutter.x).toBeLessThan(metadata.windowPlot.x)
    expect(metadata.closedWindowCount).toBe(2)
    expect(metadata.lidSegments.some((segment) => segment.windowIndex === 0)).toBe(true)
    expect(
      Math.min(...metadata.lidSegments.flatMap((segment) => [segment.x1, segment.x2]))
    ).toBeCloseTo(metadata.windowPlot.x)
    expect(
      metadata.lidSegments.some((segment) => segment.windowIndex == null)
    ).toBe(false)
    expect(old?.x).toBeGreaterThan(metadata.windowPlot.x)
    expect(old?.x).toBeLessThan(metadata.windowPlot.x + metadata.windowPlot.width)
    expect(old).toMatchObject({
      datum: { late: true, windowIndex: 0 },
      friction: 0.02
    })
    for (let index = 0; index <= metadata.closedWindowCount; index += 1) {
      const wall = colliders.find(
        (collider) => collider.id === `eventdrop-window-wall-${index}`
      )
      const shape = wall?.shape.type === "aabb" ? wall.shape : null
      const lidY =
        index === 0
          ? metadata.lidSegments[0]?.y1
          : metadata.lidSegments[index - 1]?.y2 ?? metadata.lidSegments[index]?.y1
      expect(shape).toBeTruthy()
      expect(lidY).toBeDefined()
      expect(shape!.y - shape!.height / 2).toBeGreaterThan(lidY!)
    }
    expect(
      colliders
        .filter((collider) => collider.id.startsWith("eventdrop-lid-"))
        .every((collider) => collider.friction === 0.02)
    ).toBe(true)
  })

  it("uses EventDrop timeScale for arrival pacing without slowing gravity", () => {
    const layout = buildEventDropPhysics({
      data: [
        { id: "first", time: 10, arrivalTime: 10 },
        { id: "later", time: 20, arrivalTime: 30 }
      ],
      timeAccessor: "time",
      arrivalAccessor: "arrivalTime",
      windows: { size: 10 },
      watermark: { delay: 10 },
      ballRadius: 4,
      seed: 1,
      size: [360, 200],
      timeScale: 0.05
    })

    expect(layout.initialSpawnPacing).toMatchObject({
      pacing: "arrival",
      timeScale: 0.05
    })
    expect(layout.config.timeScale).toBeUndefined()
  })

  it("unitizes pile rows into category body spawns", () => {
    const layout = buildPhysicsPile({
      data: [
        { id: "a", category: "A", value: 2 },
        { id: "b", category: "B", value: 3 }
      ],
      categoryAccessor: "category",
      valueAccessor: "value",
      unitValue: 1,
      ballRadius: 4,
      seed: 1,
      size: [320, 180]
    })

    expect(layout.initialSpawns).toHaveLength(5)
    expect(layout.projectionRows).toEqual([
      { label: "A", value: 2 },
      { label: "B", value: 3 }
    ])
  })

  it("builds process-flow stages, groups, and absorb completion", () => {
    const layout = buildProcessFlowPhysics({
      data: [
        { id: "p1", stage: "coding", featureId: "auth", featureLabel: "Auth" },
        { id: "p2", stage: "review", featureId: "auth", featureLabel: "Auth" },
        { id: "p3", stage: "merged", featureId: "billing", featureLabel: "Billing" },
        { id: "p4", stage: "merged", featureId: "billing", featureLabel: "Billing" }
      ],
      stages: [
        { id: "coding", label: "Coding", force: 12 },
        {
          id: "review",
          label: "Review",
          capacity: { unitsPerSecond: 4 },
          pressure: { pressure: 1.2 }
        },
        { id: "revision", label: "Revision", portal: { targetStageId: "coding" } },
        { id: "merged", label: "Merged", absorb: true }
      ],
      size: [720, 360],
      idAccessor: "id",
      stageAccessor: "stage",
      groupBy: "featureId",
      groupLabelAccessor: "featureLabel",
      groupCompletion: "allAbsorbed",
      seed: 3,
      settle: true
    })

    expect(layout.initialSpawns).toHaveLength(4)
    expect(layout.projectionRows).toEqual([
      { label: "Coding", value: 1 },
      { label: "Review", value: 1 },
      { label: "Revision", value: 0 },
      { label: "Merged", value: 2 }
    ])
    const metadata = layout.metadata as {
      kind: string
      groups: Array<{ id: string; bodyIds?: readonly string[] }>
      groupCompletion: Array<{ id: string; complete: boolean; absorbed: number; total: number }>
      regionEffects: Array<{ id: string }>
    }
    expect(metadata.kind).toBe("process-flow")
    expect(metadata.groups.map((group) => group.id).sort()).toEqual([
      "auth",
      "billing"
    ])
    expect(
      metadata.groupCompletion.find((row) => row.id === "billing")
    ).toMatchObject({ complete: true, absorbed: 2, total: 2 })
    expect(
      metadata.groupCompletion.find((row) => row.id === "auth")
    ).toMatchObject({ complete: false, absorbed: 0, total: 2 })
    expect(metadata.regionEffects.some((region) => region.id === "process-stage-review")).toBe(
      true
    )
    expect(layout.config.colliders?.length).toBeGreaterThan(0)
  })

  it("falls back safely when PhysicsPile unitValue is not positive", () => {
    const layout = buildPhysicsPile({
      data: [{ id: "a", category: "A", value: 2 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      unitValue: 0,
      ballRadius: 4,
      seed: 1,
      size: [320, 180]
    })

    expect(layout.initialSpawns).toHaveLength(2)
    expect(layout.projectionRows).toEqual([{ label: "A", value: 2 }])
  })

  it("generates deterministic mechanical pile samples from categories", () => {
    const generated = generatePhysicsPileMechanicalSamples({
      categories: ["Backlog", "Active", "Done"],
      count: 30,
      seed: 11,
      unitValue: 2
    })
    const repeat = generatePhysicsPileMechanicalSamples({
      categories: ["Backlog", "Active", "Done"],
      count: 30,
      seed: 11,
      unitValue: 2
    })

    expect(repeat).toEqual(generated)
    expect(generated.map((datum) => datum.category)).toEqual([
      "Backlog",
      "Active",
      "Done"
    ])
    expect(
      generated.reduce((sum, datum) => sum + Number(datum.unitCount), 0)
    ).toBe(30)
    expect(
      generated.reduce((sum, datum) => sum + Number(datum.value), 0)
    ).toBe(60)
  })

  it("unitizes generated mechanical pile samples through their values", () => {
    const generated = generatePhysicsPileMechanicalSamples({
      categories: ["A", "B", "C"],
      count: 30,
      seed: 7
    })
    const layout = buildPhysicsPile({
      data: generated,
      categoryAccessor: "category",
      valueAccessor: "value",
      unitValue: 1,
      ballRadius: 4,
      seed: 1,
      size: [320, 180]
    })

    expect(layout.initialSpawns).toHaveLength(30)
    expect(
      layout.projectionRows.reduce((sum, row) => sum + row.value, 0)
    ).toBe(30)
  })

  it("maps collision swarm points into spring-tethered grouped lanes", () => {
    const layout = buildCollisionSwarmPhysics({
      data: [
        { id: "a", x: 10, group: "A", radius: 4 },
        { id: "b", x: 20, group: "B", radius: 7 },
        { id: "c", x: 30, group: "A", radius: 5 }
      ],
      xAccessor: "x",
      groupAccessor: "group",
      radiusAccessor: "radius",
      pointRadius: 5,
      seed: 3,
      size: [320, 180],
      xExtent: [0, 40]
    })

    expect(layout.initialSpawns).toHaveLength(3)
    expect(layout.initialSpawns.every((spawn) => spawn.springs?.length === 1)).toBe(true)
    expect(layout.config.kernel?.gravity).toEqual({ x: 0, y: 0 })
    expect(layout.projectionRows).toEqual([
      { label: "A", value: 2 },
      { label: "B", value: 1 }
    ])
    expect(layout.metadata).toMatchObject({
      kind: "collision-swarm",
      xExtent: [0, 40]
    })
  })



  it("builds PhysicalFlow packets from authored route geometry and sensors", () => {
    const layout = buildPhysicalFlowPhysics({
      nodes: [
        { id: "source", label: "Source", x: 0.1, y: 0.5 },
        { id: "queue", label: "Queue", x: 0.52, y: 0.35 },
        { id: "sink", label: "Sink", x: 0.9, y: 0.55 }
      ],
      links: [
        { id: "a", source: "source", target: "queue", value: 40 },
        {
          id: "b",
          source: "queue",
          target: "sink",
          value: 30,
          path: [
            { x: 0.52, y: 0.35 },
            { x: 0.68, y: 0.22 },
            { x: 0.9, y: 0.55 }
          ]
        }
      ],
      nodeIdAccessor: "id",
      nodeXAccessor: "x",
      nodeYAccessor: "y",
      sourceAccessor: "source",
      targetAccessor: "target",
      throughputAccessor: "value",
      pathAccessor: "path",
      particleRate: 0.25,
      maxParticles: 20,
      particleRadius: 4,
      flowSpeed: 80,
      seed: 3,
      size: [360, 220]
    })

    expect(layout.initialSpawns.length).toBeGreaterThan(0)
    expect(layout.initialSpawns.length).toBeLessThanOrEqual(20)
    expect(
      layout.initialSpawns.every(
        (spawn) =>
          Array.isArray((spawn.datum as { flowPath?: unknown }).flowPath) &&
          ((spawn.datum as { flowPath?: unknown[] }).flowPath?.length ?? 0) >= 2
      )
    ).toBe(true)
    expect(layout.initialSpawns.every((spawn) => spawn.springs == null)).toBe(true)
    expect(layout.config.kernel?.gravity).toEqual({ x: 0, y: 0 })
    expect(layout.config.observation?.sensors).toBeTruthy()
    expect(layout.metadata).toMatchObject({
      kind: "physical-flow",
      coordinateMode: "normalized",
      totalThroughput: 70
    })
    expect(layout.projectionRows).toContainEqual({
      label: "Queue",
      value: 40,
      secondary: 30
    })
  })
})
