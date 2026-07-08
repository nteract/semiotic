import * as React from "react"
import { fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { renderChartWithEvidence } from "../../server/renderToStaticSVG"
import { PhysicsPipelineStore } from "../../stream/physics/PhysicsPipelineStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { EventDropChart } from "./EventDropChart"
import { GaltonBoardChart } from "./GaltonBoardChart"
import { CollisionSwarmChart } from "./CollisionSwarmChart"
import { NetworkHOPsChart } from "./NetworkHOPsChart"
import { PhysicalFlowChart } from "./PhysicalFlowChart"
import { buildNetworkHOPsModel } from "./networkHopsUtils"
import {
  PhysicsCustomChart,
  type PhysicsCustomLayoutContext
} from "./PhysicsCustomChart"
import { PhysicsPileChart } from "./PhysicsPileChart"
import {
  buildCollisionSwarmPhysics,
  buildEventDropPhysics,
  buildGaltonBoardPhysics,
  buildPhysicalFlowPhysics,
  buildPhysicsPile,
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

  it("builds NetworkHOPs sampled aggregate topology with active edge state", () => {
    const model = buildNetworkHOPsModel({
      samples: [
        {
          id: "a",
          edges: [
            { source: "A", target: "B" },
            { source: "B", target: "C" }
          ]
        },
        {
          id: "b",
          edges: [
            { source: "A", target: "B" },
            { source: "C", target: "A" }
          ]
        }
      ],
      sampleIndex: 1
    })

    expect(model.nodes.map((node) => node.id).sort()).toEqual(["A", "B", "C"])
    expect(model.aggregateEdges).toHaveLength(3)
    expect(model.activeEdgeIds).toEqual(new Set(["A->B", "C->A"]))
    expect(model.sampleLabel).toBe("b")
    expect(
      model.aggregateEdges.find((edge) => edge.__networkHopsEdgeId === "A->B")
    ).toMatchObject({ __networkHopsProbability: 1 })
  })

  it("builds deterministic NetworkHOPs probabilistic samples", () => {
    const options = {
      nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
      edges: [
        { source: "A", target: "B", p: 1 },
        { source: "B", target: "C", p: 0 },
        { source: "C", target: "A", p: 0.5 }
      ],
      seed: 5,
      sampleIndex: 2
    }

    const first = buildNetworkHOPsModel(options)
    const second = buildNetworkHOPsModel(options)
    expect(first.activeEdgeIds).toEqual(second.activeEdgeIds)
    expect(first.activeEdgeIds.has("A->B")).toBe(true)
    expect(first.activeEdgeIds.has("B->C")).toBe(false)
    expect(first.projectionRows[0]).toMatchObject({ label: "active edges" })
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
          (spawn.datum as { flowPath?: unknown[] }).flowPath?.length >= 2
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
    const ref = React.createRef<RealtimeFrameHandle>()
    const { container, getAllByTestId, getByTestId } = render(
      <GaltonBoardChart
        ref={ref}
        data={[{ id: "a", value: 1 }]}
        valueAccessor="value"
        size={[240, 160]}
      />
    )

    expect(container.querySelector(".stream-physics-frame canvas")).not.toBeNull()
    expect(getByTestId("galton-board-structure-overlay")).not.toBeNull()
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
    const ref = React.createRef<RealtimeFrameHandle>()
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

  it("renders NetworkHOPsChart with a sample readout overlay", () => {
    const { container, getByTestId } = render(
      <NetworkHOPsChart
        nodes={[{ id: "A", group: "core" }, { id: "B", group: "leaf" }]}
        edges={[{ source: "A", target: "B", p: 1, weight: 2 }]}
        colorBy="group"
        edgeWidth="weight"
        paused
        size={[260, 180]}
      />
    )

    expect(container.querySelector(".stream-network-frame")).not.toBeNull()
    expect(getByTestId("network-hops-sample-readout")).not.toBeNull()
  })

  it("renders PhysicalFlowChart with static pipes, sensors, and row push", () => {
    const ref = React.createRef<RealtimeFrameHandle>()
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
    const eventRef = React.createRef<RealtimeFrameHandle>()
    const pileRef = React.createRef<RealtimeFrameHandle>()
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
    let captured: PhysicsCustomLayoutContext | null = null
    const ref = React.createRef<RealtimeFrameHandle>()
    const layout = (ctx: PhysicsCustomLayoutContext) => {
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
    expect(captured?.world).toBeInstanceOf(PhysicsPipelineStore)
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

  it("server-renders NetworkHOPsChart as a sampled network SVG", () => {
    const { svg, evidence } = renderChartWithEvidence("NetworkHOPsChart", {
      nodes: [{ id: "A", group: "core" }, { id: "B", group: "leaf" }],
      edges: [{ source: "A", target: "B", p: 1, weight: 2 }],
      colorBy: "group",
      edgeWidth: "weight",
      width: 260,
      height: 180,
      title: "Network HOPs"
    })

    expect(svg).toContain("<svg")
    expect(evidence.component).toBe("NetworkHOPsChart")
    expect(evidence.frameType).toBe("network")
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
})
