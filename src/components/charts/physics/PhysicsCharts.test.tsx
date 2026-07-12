import * as React from "react"
import { fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { PhysicsFrameHandle } from "./physicsHocHandle"
import { renderChartWithEvidence } from "../../server/renderToStaticSVG"
import { PhysicsPipelineStore } from "../../stream/physics/PhysicsPipelineStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { EventDropChart } from "./EventDropChart"
import {
  GauntletChart,
  applyGauntletEffect,
  clampGauntletPoint,
  GAUNTLET_WALL,
  type GauntletProjectState
} from "./GauntletChart"
import { GaltonBoardChart } from "./GaltonBoardChart"
import { CollisionSwarmChart } from "./CollisionSwarmChart"
import { PhysicalFlowChart } from "./PhysicalFlowChart"
import { ProcessFlowChart } from "./ProcessFlowChart"
import {
  PhysicsCustomChart,
  type PhysicsCustomLayout,
  type PhysicsCustomLayoutContext
} from "./PhysicsCustomChart"
import { PhysicsPileChart } from "./PhysicsPileChart"
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

describe("physics chart HOCs", () => {
  let cleanupCanvas: () => void

  beforeEach(() => {
    cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
  })

  afterEach(() => {
    cleanupCanvas()
  })

  it("renders GaltonBoardChart and exposes row push", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    const { container, getAllByTestId, getByTestId, getByText } = render(
      <GaltonBoardChart
        ref={ref}
        data={[{ id: "a", value: 1 }]}
        valueAccessor="value"
        valueExtent={[10, 0]}
        referenceLines={{ value: 5, label: "threshold" }}
        size={[240, 160]}
      />
    )

    expect(container.querySelector(".stream-physics-frame canvas")).not.toBeNull()
    expect(getByTestId("galton-board-structure-overlay")).not.toBeNull()
    expect(
      getByTestId("galton-board-reference-line").querySelector("line")?.getAttribute("x1")
    ).toBe("120")
    expect(getByText("threshold")).toBeTruthy()
    expect(getAllByTestId("galton-board-bin-wall").length).toBeGreaterThan(0)
    ref.current?.push({ id: "b", value: 2 })
    expect(ref.current?.getData().some((datum) => datum.id === "b")).toBe(true)
  })

  it("renders GaltonBoardChart mechanical mode without data", () => {
    const { container } = render(
      <GaltonBoardChart
        mode="mechanical"
        bins={9}
        pegRows={8}
        mechanicalCount={32}
        branchProbability={0.65}
        size={[240, 160]}
      />
    )

    expect(container.querySelector(".stream-physics-frame canvas")).not.toBeNull()
  })

  it("accepts ChartMode alongside simulationMode for Galton", () => {
    const { container } = render(
      <GaltonBoardChart
        mode="context"
        simulationMode="mechanical"
        bins={7}
        mechanicalCount={12}
        size={[200, 120]}
      />
    )
    const root = container.querySelector(".stream-physics-frame")!
    expect(root.getAttribute("data-semiotic-mode")).toBe("context")
    expect(root).toHaveClass("stream-physics-frame--mode-context")
    // compact ChartMode suppresses default title chrome
    expect(container.querySelector(".semiotic-chart-title")).toBeNull()
  })

  it("ProcessFlowChart sparkline mode is ChartContainer-exportable (svg+canvas)", () => {
    const { container } = render(
      <ProcessFlowChart
        mode="sparkline"
        data={[{ id: "a", stage: "coding" }]}
        stages={[
          { id: "coding", label: "Coding", force: 8 },
          { id: "done", label: "Done", absorb: true }
        ]}
      />
    )
    const root = container.querySelector(".stream-physics-frame")!
    expect(root.getAttribute("data-semiotic-mode")).toBe("sparkline")
    expect(container.querySelector("svg.stream-physics-frame__overlay")).not.toBeNull()
    expect(container.querySelector("canvas")).not.toBeNull()
  })

  it("renders ProcessFlowChart with stage chrome and push", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    const { container, getByTestId } = render(
      <ProcessFlowChart
        ref={ref}
        data={[
          { id: "a", stage: "coding", featureId: "f1" },
          { id: "b", stage: "review", featureId: "f1" }
        ]}
        stages={[
          { id: "coding", label: "Coding", force: 10 },
          { id: "review", label: "Review", capacity: { unitsPerSecond: 3 } },
          { id: "merged", label: "Merged", absorb: true }
        ]}
        idAccessor="id"
        stageAccessor="stage"
        groupBy="featureId"
        size={[480, 260]}
        settle
      />
    )

    expect(container.querySelector(".stream-physics-frame canvas")).not.toBeNull()
    expect(getByTestId("process-flow-chrome")).not.toBeNull()
    expect(getByTestId("process-flow-projection-overlay")).not.toBeNull()
    ref.current?.push({ id: "c", stage: "coding", featureId: "f2" })
    expect(ref.current?.getData().some((datum) => datum.id === "c")).toBe(true)
  })

  it("renders PhysicsPileChart mechanical mode without data", () => {
    const { container } = render(
      <PhysicsPileChart
        mode="mechanical"
        mechanicalCategories={["Backlog", "Active", "Done"]}
        mechanicalCount={36}
        size={[240, 160]}
      />
    )

    expect(container.querySelector(".stream-physics-frame canvas")).not.toBeNull()
  })

  it("renders CollisionSwarmChart with projection overlay and exposes row push", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    const { container, getByTestId, getByText } = render(
      <CollisionSwarmChart
        ref={ref}
        data={[
          { id: "a", x: 10, group: "A" },
          { id: "b", x: 20, group: "B" }
        ]}
        xAccessor="x"
        groupAccessor="group"
        colorBy="group"
        xExtent={[0, 30]}
        size={[260, 160]}
      />
    )

    expect(container.querySelector(".stream-physics-frame canvas")).not.toBeNull()
    expect(getByTestId("collision-swarm-projection-overlay")).not.toBeNull()
    expect(getByText("A")).toBeTruthy()
    expect(getByText("B")).toBeTruthy()
    ref.current?.push({ id: "c", x: 25, group: "B" })
    expect(ref.current?.getData().some((datum) => datum.id === "c")).toBe(true)
  })

  it("keeps gauntlet property satellites inside the wall corridor (no stuck-left spawns)", () => {
    // Regression: multi-project orbits (Homes on Main Street) spawned left of
    // the left wall and never recovered. Spawns must clamp inside the corridor.
    const layout = {
      width: 720,
      floorY: 344
    }
    const leftLimit = GAUNTLET_WALL.left + GAUNTLET_WALL.thickness / 2
    // A satellite that would orbit past the wall without clamping.
    const raw = clampGauntletPoint(12, 180, 10, layout)
    expect(raw.x).toBeGreaterThan(leftLimit + 10)
    expect(raw.x).toBeLessThan(layout.width - GAUNTLET_WALL.rightInset)

    const ref = React.createRef<PhysicsFrameHandle>()
    render(
      <GauntletChart
        ref={ref}
        data={[
          {
            id: "civic-housing",
            label: "Civic Housing",
            positives: ["homes", "shade", "transit"],
            negatives: ["cost"],
            metrics: { units: 42 },
            viability: 92
          },
          {
            id: "main-street",
            label: "Main Street",
            positives: ["homes", "plaza"],
            negatives: ["cost", "fatigue"],
            metrics: { units: 18 },
            viability: 74
          }
        ]}
        idAccessor="id"
        positiveAccessor="positives"
        negativeAccessor="negatives"
        metricsAccessor="metrics"
        initialViability="viability"
        positiveProperties={[
          { id: "homes", label: "Homes", buoyancy: 3, radius: 10 },
          { id: "shade", label: "Shade", buoyancy: 1.4, radius: 8 },
          { id: "transit", label: "Transit", buoyancy: 2, radius: 8 },
          { id: "plaza", label: "Plaza", buoyancy: 1.2, radius: 8 }
        ]}
        negativeProperties={[
          { id: "cost", label: "Cost", load: 1.1, radius: 7 },
          { id: "fatigue", label: "Fatigue", load: 0.9, radius: 7 }
        ]}
        size={[720, 380]}
      />
    )

    const snapshot = ref.current?.getCustomLayout?.() as {
      world?: { bodies?: Array<{ x: number; y: number; shape?: { radius?: number } }> }
    } | null
    const bodies = snapshot?.world?.bodies ?? []
    expect(bodies.length).toBeGreaterThan(4)
    for (const body of bodies) {
      const r = body.shape?.radius ?? 8
      expect(body.x).toBeGreaterThanOrEqual(leftLimit + r - 0.5)
      expect(body.x).toBeLessThanOrEqual(720 - GAUNTLET_WALL.rightInset - r + 0.5)
    }
  })

  it("renders GauntletChart from declarative properties and exposes project push", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    const { container, getByText } = render(
      <GauntletChart
        ref={ref}
        data={[
          {
            id: "plan-a",
            positives: ["homes", "plaza"],
            negatives: ["cost"],
            metrics: { units: 42 }
          }
        ]}
        idAccessor="id"
        positiveAccessor="positives"
        negativeAccessor="negatives"
        metricsAccessor="metrics"
        positiveProperties={[
          { id: "homes", label: "Homes", short: "H", value: 3 },
          { id: "plaza", label: "Plaza", short: "P", value: 1 }
        ]}
        negativeProperties={[
          { id: "cost", label: "Cost", short: "$", load: 1.2 }
        ]}
        gates={[
          {
            id: "review",
            label: "Review",
            regionEffect: { force: { x: 10, y: 0 }, semanticItem: false }
          }
        ]}
        size={[280, 170]}
      />
    )

    expect(container.querySelector(".stream-physics-frame canvas")).not.toBeNull()
    expect(getByText("Review")).toBeTruthy()
    ref.current?.push({
      id: "plan-b",
      positives: ["homes"],
      negatives: [],
      metrics: { units: 12 }
    })
    expect(ref.current?.getData().some((datum) => datum.id === "plan-b")).toBe(true)
  })

  it("does not re-seed GauntletChart when data array identity changes with the same ids", () => {
    const onStateChange = vi.fn()
    const baseProps = {
      idAccessor: "id" as const,
      positiveAccessor: "positives" as const,
      negativeAccessor: "negatives" as const,
      positiveProperties: [{ id: "homes", label: "Homes", value: 3 }],
      negativeProperties: [{ id: "cost", label: "Cost", load: 1 }],
      size: [280, 170] as [number, number],
      onStateChange
    }
    const { rerender } = render(
      <GauntletChart
        {...baseProps}
        data={[{ id: "plan-a", positives: ["homes"], negatives: ["cost"] }]}
      />
    )
    const callsAfterMount = onStateChange.mock.calls.length
    expect(callsAfterMount).toBeGreaterThan(0)

    for (let i = 0; i < 8; i += 1) {
      rerender(
        <GauntletChart
          {...baseProps}
          data={[{ id: "plan-a", positives: ["homes"], negatives: ["cost"] }]}
        />
      )
    }

    // Same project ids → dataKey stable → no re-seed storm / update-depth loop.
    expect(onStateChange.mock.calls.length).toBe(callsAfterMount)
  })

  it("applyGauntletEffect can pop negatives and add positives (reverse of the usual gate)", () => {
    const project: GauntletProjectState = {
      id: "trial-1",
      activePositiveIds: ["efficacy"],
      datum: { id: "trial-1" },
      delay: 0,
      eventsApplied: [],
      killed: false,
      metrics: {},
      missingPositiveIds: ["biomarker"],
      negativeIds: ["toxicity", "cost"],
      outcome: "in_process",
      poppedPositiveIds: [],
      poppedNegativeIds: [],
      stage: "phase-i",
      viability: 60
    }
    const next = applyGauntletEffect(
      project,
      {
        popNegative: { candidates: ["toxicity", "cost"], count: 1 },
        addPositive: ["biomarker"],
        stage: "phase-ii cleared",
        summary: "Toxicity flag cleared; biomarker evidence added."
      },
      {
        event: { id: "e1", time: 1 },
        negativeProperties: new Map([
          ["toxicity", { id: "toxicity", load: 1.4 }],
          ["cost", { id: "cost", load: 1 }]
        ]),
        positiveProperties: new Map([
          ["efficacy", { id: "efficacy", value: 3 }],
          ["biomarker", { id: "biomarker", value: 1.5 }]
        ]),
        project
      }
    )
    expect(next.negativeIds).toEqual(["cost"])
    expect(next.poppedNegativeIds).toEqual(["toxicity"])
    expect(next.activePositiveIds).toEqual(["efficacy", "biomarker"])
    expect(next.missingPositiveIds).toEqual([])
    expect(next.stage).toBe("phase-ii cleared")
  })


  it("renders PhysicalFlowChart with static pipes, sensors, and row push", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    const { container, getAllByTestId } = render(
      <PhysicalFlowChart
        ref={ref}
        nodes={[
          { id: "source", label: "Source", x: 0.08, y: 0.5 },
          { id: "sink", label: "Sink", x: 0.9, y: 0.5 }
        ]}
        links={[{ id: "a", source: "source", target: "sink", value: 32 }]}
        showSensors
        size={[280, 170]}
      />
    )

    expect(container.querySelector(".stream-physics-frame canvas")).not.toBeNull()
    expect(getAllByTestId("physical-flow-static-flow-overlay")).toHaveLength(1)
    expect(getAllByTestId("physical-flow-sensor-overlay").length).toBeGreaterThan(0)
    const frame = container.querySelector(".stream-physics-frame")!
    fireEvent.keyDown(frame, { key: "ArrowRight" })
    expect(container.textContent).toContain("Source to Sink")
    expect(container.textContent).toContain("throughput")
    ref.current?.push({ id: "b", source: "source", target: "sink", value: 10 })
    expect(ref.current?.getData().some((datum) => datum.id === "b")).toBe(true)
  })

  it("renders exact projection overlay for PhysicsPileChart by default", () => {
    const { getByTestId, getByText } = render(
      <PhysicsPileChart
        data={[
          { id: "a", category: "A", value: 2 },
          { id: "b", category: "B", value: 3 }
        ]}
        valueAccessor="value"
        size={[260, 160]}
      />
    )

    expect(getByTestId("physics-pile-projection-overlay")).not.toBeNull()
    expect(getByText("A")).toBeTruthy()
    expect(getByText("B")).toBeTruthy()
    expect(getByText("2")).toBeTruthy()
    expect(getByText("3")).toBeTruthy()
  })

  it("allows PhysicsPileChart projection overlay to be disabled", () => {
    const { queryByTestId } = render(
      <PhysicsPileChart
        data={[{ id: "a", category: "A", value: 2 }]}
        showProjection={false}
        valueAccessor="value"
        size={[260, 160]}
      />
    )

    expect(queryByTestId("physics-pile-projection-overlay")).toBeNull()
  })

  it("composes PhysicsPileChart projection overlay with caller foreground graphics", () => {
    const { getByTestId } = render(
      <PhysicsPileChart
        data={[{ id: "a", category: "A", value: 2 }]}
        valueAccessor="value"
        size={[260, 160]}
        frameProps={{
          foregroundGraphics: (
            <svg data-testid="user-pile-foreground" aria-hidden="true" />
          )
        }}
      />
    )

    expect(getByTestId("physics-pile-projection-overlay")).not.toBeNull()
    expect(getByTestId("user-pile-foreground")).not.toBeNull()
  })

  it("renders EventDropChart and PhysicsPileChart without the full Semiotic bundle", () => {
    const eventRef = React.createRef<PhysicsFrameHandle>()
    const pileRef = React.createRef<PhysicsFrameHandle>()
    const { container } = render(
      <>
        <EventDropChart
          ref={eventRef}
          data={[{ id: "a", time: 12, arrivalTime: 13 }]}
          windows={{ size: 10 }}
          size={[260, 160]}
        />
        <PhysicsPileChart
          ref={pileRef}
          data={[{ id: "x", category: "X", value: 2 }]}
          valueAccessor="value"
          size={[260, 160]}
        />
      </>
    )

    expect(container.querySelectorAll(".stream-physics-frame canvas")).toHaveLength(2)
    eventRef.current?.push({ id: "b", time: 14, arrivalTime: 15 })
    pileRef.current?.push({ id: "y", category: "Y", value: 1 })
    expect(eventRef.current?.getData().some((datum) => datum.id === "b")).toBe(true)
    expect(pileRef.current?.getData().some((datum) => datum.id === "y")).toBe(true)
  })

  it("renders shared loading placeholders before mounting physics frames", () => {
    const layout = () => ({
      bodies: [
        {
          id: "custom-a",
          x: 40,
          y: 24,
          mass: 1,
          shape: { type: "circle" as const, radius: 5 },
          datum: { id: "custom-a" }
        }
      ]
    })
    const { container, getByText } = render(
      <>
        <GaltonBoardChart
          data={[{ id: "a", value: 1 }]}
          loading
          loadingContent={<span>Loading Galton</span>}
          size={[240, 160]}
        />
        <EventDropChart
          data={[{ id: "b", time: 1, arrivalTime: 1 }]}
          loading
          loadingContent={<span>Loading events</span>}
          size={[240, 160]}
        />
        <PhysicsPileChart
          data={[{ id: "c", category: "C", value: 1 }]}
          loading
          loadingContent={<span>Loading pile</span>}
          size={[240, 160]}
        />
        <PhysicsCustomChart
          data={[{ id: "custom-a" }]}
          layout={layout}
          loading
          loadingContent={<span>Loading custom</span>}
          size={[240, 160]}
        />
      </>
    )

    expect(getByText("Loading Galton")).toBeTruthy()
    expect(getByText("Loading events")).toBeTruthy()
    expect(getByText("Loading pile")).toBeTruthy()
    expect(getByText("Loading custom")).toBeTruthy()
    expect(container.querySelector(".stream-physics-frame canvas")).toBeNull()
  })

  it("uses shared empty state for explicit empty physics data", () => {
    const { container, getByText } = render(
      <EventDropChart
        data={[]}
        emptyContent={<span>No events yet</span>}
        size={[240, 160]}
      />
    )

    expect(getByText("No events yet")).toBeTruthy()
    expect(container.querySelector(".stream-physics-frame canvas")).toBeNull()
  })

  it("does not run custom physics layout while loading fallback is active", () => {
    const layout = () => {
      throw new Error("layout should not run while loading")
    }
    const { getByText } = render(
      <PhysicsCustomChart
        data={[{ id: "a" }]}
        layout={layout}
        loading
        loadingContent={<span>Loading without layout</span>}
        size={[240, 160]}
      />
    )

    expect(getByText("Loading without layout")).toBeTruthy()
  })

  it("keeps undefined data mounted for push-driven physics charts", () => {
    const { container } = render(<EventDropChart size={[240, 160]} />)

    expect(container.querySelector(".stream-physics-frame canvas")).not.toBeNull()
  })

  it("ProcessFlowChart wires live capacity, annotations, observation, and chart mode", () => {
    const observations: Array<{ type: string; chartId?: string }> = []
    const capacityReports: number[] = []
    const { container } = render(
      <ProcessFlowChart
        chartId="capacity-flow"
        mode="primary"
        title="Live capacity"
        data={[
          { id: "a", stage: "review", work: 2 },
          { id: "b", stage: "review", work: 2 }
        ]}
        stages={[
          { id: "coding", label: "Coding", force: 8 },
          {
            id: "review",
            label: "Review",
            capacity: { unitsPerSecond: 6 },
            pressure: true
          },
          { id: "merged", label: "Merged", absorb: true }
        ]}
        liveCapacity
        workAccessor="work"
        stageAccessor="stage"
        idAccessor="id"
        size={[480, 220]}
        settle
        annotations={[
          {
            type: "label",
            x: 240,
            y: 40,
            label: "Review bay",
            dx: 0,
            dy: 0
          }
        ]}
        onObservation={(event) =>
          observations.push({ type: event.type, chartId: event.chartId })
        }
        onCapacityChange={(stats) => capacityReports.push(stats.length)}
      />
    )

    const root = container.querySelector(".stream-physics-frame")!
    expect(root.querySelector("canvas")).not.toBeNull()
    expect(container.querySelector('[data-testid="process-flow-chrome"]')).not.toBeNull()
    expect(container.querySelector(".semiotic-chart-title")?.textContent).toBe(
      "Live capacity"
    )
    expect(container.textContent).toMatch(/Review bay/)
    // Live capacity controllers are installed; chrome shows cap badges
    expect(container.textContent).toMatch(/cap/i)
  })

  it("remove/update work on static initial rows without a prior push", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    render(
      <CollisionSwarmChart
        ref={ref}
        data={[
          { id: "s1", x: 10, group: "A" },
          { id: "s2", x: 20, group: "B" }
        ]}
        xAccessor="x"
        groupAccessor="group"
        size={[240, 140]}
      />
    )

    expect(ref.current?.getData().map((d) => (d as { id?: string }).id).sort()).toEqual([
      "s1",
      "s2"
    ])
    const removed = ref.current?.remove("s1") ?? []
    expect(removed.some((d) => (d as { id?: string }).id === "s1")).toBe(true)
    expect(
      ref.current?.getData().some((d) => (d as { id?: string }).id === "s1")
    ).toBe(false)

    ref.current?.update("s2", (d) => ({ ...d, x: 99 }))
    const updated = ref.current?.getData().find((d) => (d as { id?: string }).id === "s2")
    expect(updated).toMatchObject({ id: "s2", x: 99 })
  })

  it("forwards HOC color primitives and description through shared frame props", () => {
    const { container } = render(
      <GaltonBoardChart
        data={[{ id: "a", value: 2 }]}
        valueAccessor="value"
        color="#112233"
        stroke="#445566"
        strokeWidth={2}
        opacity={0.7}
        description="Galton accessibility label"
        summary="Most samples land near the center"
        size={[220, 140]}
      />
    )
    const root = container.querySelector(".stream-physics-frame")!
    expect(root.getAttribute("aria-label")).toMatch(/Galton accessibility label/)
    expect(container.textContent).toMatch(/Most samples land near the center/)
  })

  it("context ChartMode suppresses default title and projection chrome by default", () => {
    const { container, queryByTestId } = render(
      <ProcessFlowChart
        mode="context"
        data={[{ id: "a", stage: "coding" }]}
        stages={[
          { id: "coding", label: "Coding", force: 6 },
          { id: "done", label: "Done", absorb: true }
        ]}
        size={[300, 160]}
      />
    )
    expect(container.querySelector(".stream-physics-frame--mode-context")).not.toBeNull()
    expect(container.querySelector(".semiotic-chart-title")).toBeNull()
    // showChrome/showProjection default off in compact modes unless forced
    expect(queryByTestId("process-flow-chrome")).toBeNull()
  })

  it("exposes the full PhysicsFrameHandle API (push + popBodies) on every physics HOC (push-only mount)", () => {
    const processStages = [
      { id: "coding", label: "Coding", force: 10 },
      { id: "done", label: "Done", absorb: true }
    ] as const
    const customLayout: PhysicsCustomLayout<{ id: string; lane: string }> = (
      ctx
    ) => ({
      bodies: ctx.data.map((datum, index) => ({
        id: String(datum.id),
        x: 30 + index * 12,
        y: 30,
        mass: 1,
        shape: { type: "circle" as const, radius: 4 },
        datum
      })),
      colliders: [
        {
          id: "floor",
          shape: {
            type: "aabb" as const,
            x: 100,
            y: 120,
            width: 180,
            height: 10
          }
        }
      ]
    })

    const cases: Array<{
      name: string
      render: (ref: React.RefObject<PhysicsFrameHandle | null>) => React.ReactElement
      row: Record<string, unknown>
      more: Record<string, unknown>[]
    }> = [
      {
        name: "GaltonBoardChart",
        render: (ref) => (
          <GaltonBoardChart
            ref={ref}
            valueAccessor="value"
            valueExtent={[0, 10]}
            size={[200, 120]}
          />
        ),
        row: { id: "g1", value: 3 },
        more: [{ id: "g2", value: 4 }]
      },
      {
        name: "PhysicsPileChart",
        render: (ref) => (
          <PhysicsPileChart
            ref={ref}
            categoryAccessor="category"
            valueAccessor="value"
            size={[200, 120]}
          />
        ),
        row: { id: "p1", category: "A", value: 2 },
        more: [{ id: "p2", category: "B", value: 1 }]
      },
      {
        name: "EventDropChart",
        render: (ref) => (
          <EventDropChart
            ref={ref}
            timeAccessor="time"
            arrivalAccessor="arrivalTime"
            windows={{ size: 10 }}
            size={[200, 120]}
          />
        ),
        row: { id: "e1", time: 5, arrivalTime: 5 },
        more: [{ id: "e2", time: 8, arrivalTime: 9 }]
      },
      {
        name: "CollisionSwarmChart",
        render: (ref) => (
          <CollisionSwarmChart ref={ref} xAccessor="x" size={[200, 120]} />
        ),
        row: { id: "c1", x: 10 },
        more: [{ id: "c2", x: 20 }]
      },
      {
        name: "ProcessFlowChart",
        render: (ref) => (
          <ProcessFlowChart
            ref={ref}
            stages={[...processStages]}
            stageAccessor="stage"
            size={[240, 140]}
          />
        ),
        row: { id: "f1", stage: "coding" },
        more: [{ id: "f2", stage: "coding" }]
      },
      {
        name: "PhysicalFlowChart",
        render: (ref) => (
          <PhysicalFlowChart
            ref={ref}
            nodes={[
              { id: "source", x: 0.1, y: 0.5 },
              { id: "sink", x: 0.9, y: 0.5 }
            ]}
            size={[220, 140]}
          />
        ),
        row: { id: "l1", source: "source", target: "sink", value: 4 },
        more: [{ id: "l2", source: "source", target: "sink", value: 2 }]
      },
      {
        name: "PhysicsCustomChart",
        render: (ref) => (
          <PhysicsCustomChart
            ref={ref}
            layout={customLayout}
            size={[200, 120]}
          />
        ),
        row: { id: "x1", lane: "A" },
        more: [{ id: "x2", lane: "B" }]
      },
      {
        name: "GauntletChart",
        render: (ref) => (
          <GauntletChart
            ref={ref}
            positiveProperties={[{ id: "focus", label: "Focus" }]}
            negativeProperties={[{ id: "debt", label: "Debt" }]}
            size={[280, 180]}
          />
        ),
        row: {
          id: "proj-1",
          label: "Alpha",
          positive: ["focus"],
          negative: ["debt"]
        },
        more: [
          {
            id: "proj-2",
            label: "Beta",
            positive: ["focus"],
            negative: []
          }
        ]
      }
    ]

    for (const entry of cases) {
      const ref = React.createRef<PhysicsFrameHandle>()
      const { unmount, container } = render(entry.render(ref))
      expect(
        container.querySelector(".stream-physics-frame canvas"),
        `${entry.name} mounts canvas for push-only`
      ).not.toBeNull()

      const handle = ref.current
      expect(handle, `${entry.name} exposes ref handle`).toBeTruthy()
      expect(typeof handle!.push).toBe("function")
      expect(typeof handle!.pushMany).toBe("function")
      expect(typeof handle!.remove).toBe("function")
      expect(typeof handle!.update).toBe("function")
      expect(typeof handle!.clear).toBe("function")
      expect(typeof handle!.getData).toBe("function")
      expect(handle!.getScales?.()).toBeNull()
      // Physics-only exit-emphasis burst — present on every physics HOC handle,
      // delegates to the frame, and returns the removed-body ids (empty here).
      expect(typeof handle!.popBodies).toBe("function")
      expect(Array.isArray(handle!.popBodies(["__no_such_body__"]))).toBe(true)

      handle!.push(entry.row)
      expect(
        handle!.getData().some((d) => d && (d as { id?: string }).id === entry.row.id),
        `${entry.name} push lands`
      ).toBe(true)

      handle!.pushMany(entry.more)
      expect(
        handle!.getData().some((d) => d && (d as { id?: string }).id === entry.more[0].id),
        `${entry.name} pushMany lands`
      ).toBe(true)

      const beforeUpdate = handle!.getData().length
      handle!.update(String(entry.row.id), (d) => ({ ...d, __touched: true }))
      expect(handle!.getData().length).toBeGreaterThanOrEqual(1)
      // update replaces bodies; row count should stay positive
      expect(beforeUpdate).toBeGreaterThan(0)

      const removed = handle!.remove(String(entry.more[0].id))
      expect(removed.length).toBeGreaterThanOrEqual(0)

      handle!.clear()
      expect(handle!.getData().length).toBe(0)

      unmount()
    }
  })

  it("renders EventDropChart with window and watermark scaffold", () => {
    const { container, getByTestId } = render(
      <EventDropChart
        data={[
          { id: "on", time: 12, arrivalTime: 12 },
          { id: "late", time: 3, arrivalTime: 28 }
        ]}
        timeAccessor="time"
        arrivalAccessor="arrivalTime"
        windows={{ size: 10 }}
        watermark={{ delay: 5 }}
        timeScale={0.05}
        size={[260, 160]}
      />
    )

    expect(container.querySelector(".stream-physics-frame canvas")).not.toBeNull()
    expect(getByTestId("event-drop-window-overlay")).not.toBeNull()
    expect(getByTestId("event-drop-watermark")).not.toBeNull()
  })

  it("renders PhysicsCustomChart with world context, overlays, and row push", () => {
    type LaneDatum = { id: string; lane: string }
    let captured: PhysicsCustomLayoutContext<LaneDatum> | null = null
    const ref = React.createRef<PhysicsFrameHandle>()
    const layout: PhysicsCustomLayout<LaneDatum> = (ctx) => {
      captured = ctx
      return {
        bodies: ctx.data.map((datum, index) => ({
          id: String(datum.id),
          x: 40 + index * 16,
          y: 24,
          mass: 1,
          shape: { type: "circle" as const, radius: 5 },
          datum
        })),
        colliders: [
          {
            id: "floor",
            shape: { type: "aabb" as const, x: 120, y: 130, width: 220, height: 12 }
          }
        ],
        overlays: <svg data-testid="custom-physics-overlay" />,
        config: {
          kernel: {
            gravity: { x: 0, y: 300 }
          }
        }
      }
    }

    const { container, getByTestId } = render(
      <PhysicsCustomChart
        ref={ref}
        data={[{ id: "a", lane: "A" }]}
        layout={layout}
        colorBy="lane"
        size={[240, 150]}
      />
    )

    expect(container.querySelector(".stream-physics-frame canvas")).not.toBeNull()
    expect(getByTestId("custom-physics-overlay")).not.toBeNull()
    expect(captured!.world).toBeInstanceOf(PhysicsPipelineStore)
    ref.current?.push({ id: "b", lane: "B" })
    expect(ref.current?.getData().some((datum) => datum.id === "b")).toBe(true)
  })
})

describe("physics chart server rendering", () => {
  it("renders settled physics SVG with evidence", () => {
    const { svg, evidence } = renderChartWithEvidence("GaltonBoardChart", {
      data: [
        { id: "a", value: 1 },
        { id: "b", value: 2 },
        { id: "c", value: 3 }
      ],
      valueAccessor: "value",
      bins: 3,
      width: 260,
      height: 160,
      title: "Galton"
    })

    expect(svg).toContain("<svg")
    expect(evidence.component).toBe("GaltonBoardChart")
    expect(evidence.frameType).toBe("physics")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(0)
  })

  it("server-renders mechanical GaltonBoardChart without input data", () => {
    const { svg, evidence } = renderChartWithEvidence("GaltonBoardChart", {
      mode: "mechanical",
      bins: 9,
      pegRows: 8,
      mechanicalCount: 32,
      branchProbability: 0.35,
      width: 260,
      height: 160,
      title: "Mechanical Galton"
    })

    expect(svg).toContain("<svg")
    expect(evidence.component).toBe("GaltonBoardChart")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(0)
  })

  it("server-renders mechanical PhysicsPileChart without input data", () => {
    const { svg, evidence } = renderChartWithEvidence("PhysicsPileChart", {
      mode: "mechanical",
      mechanicalCategories: ["Backlog", "Active", "Done"],
      mechanicalCount: 36,
      width: 260,
      height: 160,
      title: "Mechanical pile"
    })

    expect(svg).toContain("<svg")
    expect(evidence.component).toBe("PhysicsPileChart")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(3)
  })

  it("server-renders CollisionSwarmChart as settled physics SVG", () => {
    const { svg, evidence } = renderChartWithEvidence("CollisionSwarmChart", {
      data: [
        { id: "a", x: 12, group: "A" },
        { id: "b", x: 14, group: "A" },
        { id: "c", x: 26, group: "B" }
      ],
      xAccessor: "x",
      groupAccessor: "group",
      xExtent: [0, 40],
      width: 260,
      height: 160,
      title: "Collision swarm"
    })

    expect(svg).toContain("<svg")
    expect(evidence.component).toBe("CollisionSwarmChart")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(0)
  })


  it("server-renders PhysicalFlowChart as settled packet SVG", () => {
    const { svg, evidence } = renderChartWithEvidence("PhysicalFlowChart", {
      nodes: [
        { id: "A", x: 0.1, y: 0.5 },
        { id: "B", x: 0.9, y: 0.5 }
      ],
      links: [{ id: "flow", source: "A", target: "B", value: 50 }],
      width: 280,
      height: 170,
      title: "Physical flow"
    })

    expect(svg).toContain("<svg")
    expect(evidence.component).toBe("PhysicalFlowChart")
    expect(evidence.frameType).toBe("physics")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(0)
  })

  it("server-renders PhysicsCustomChart by running the user layout once", () => {
    const layout = (ctx: PhysicsCustomLayoutContext) => ({
      bodies: ctx.data.map((datum, index) => ({
        id: String(datum.id),
        x: 40 + index * 30,
        y: 20,
        mass: 1,
        shape: { type: "circle" as const, radius: 6 },
        datum
      })),
      colliders: [
        {
          id: "floor",
          shape: { type: "aabb" as const, x: 100, y: 150, width: 200, height: 12 }
        }
      ]
    })

    const { svg, evidence } = renderChartWithEvidence("PhysicsCustomChart", {
      data: [{ id: "a" }, { id: "b" }, { id: "c" }],
      layout,
      width: 240,
      height: 160,
      title: "Custom physics"
    })

    expect(svg).toContain("<svg")
    expect(evidence.component).toBe("PhysicsCustomChart")
    expect(evidence.frameType).toBe("physics")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBe(3)
  })
})
