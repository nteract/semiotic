import * as React from "react"
import { act, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { PhysicsFrameHandle } from "./physicsHocHandle"
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

  it.each([
    {
      name: "CollisionSwarmChart",
      chart: (ref: React.RefObject<PhysicsFrameHandle | null>) => (
        <CollisionSwarmChart
          ref={ref}
          data={[{ id: "a", x: 1 }, { id: "b", x: 2 }]}
          xAccessor="x"
          rerunMS={1000}
          size={[220, 140]}
        />
      )
    },
    {
      name: "GaltonBoardChart",
      chart: (ref: React.RefObject<PhysicsFrameHandle | null>) => (
        <GaltonBoardChart
          ref={ref}
          data={[{ id: "a", value: 1 }, { id: "b", value: 2 }]}
          valueAccessor="value"
          rerunMS={1000}
          size={[220, 140]}
        />
      )
    },
    {
      name: "GauntletChart",
      chart: (ref: React.RefObject<PhysicsFrameHandle | null>) => (
        <GauntletChart
          ref={ref}
          data={[{ id: "plan-a", positives: ["signal"], negatives: ["burden"] }]}
          positiveAccessor="positives"
          negativeAccessor="negatives"
          positiveProperties={[{ id: "signal", radius: 4 }]}
          negativeProperties={[{ id: "burden", radius: 4 }]}
          rerunMS={1000}
          size={[220, 140]}
        />
      )
    }
  ])("reruns $name only after its settle delay", ({ chart }) => {
    vi.useFakeTimers()
    try {
      const ref = React.createRef<PhysicsFrameHandle>()
      const { container } = render(chart(ref))
      const firstCanvas = container.querySelector("canvas")

      act(() => ref.current?.clear())
      act(() => vi.advanceTimersByTime(999))
      expect(container.querySelector("canvas")).toBe(firstCanvas)

      act(() => vi.advanceTimersByTime(1))
      expect(container.querySelector("canvas")).not.toBe(firstCanvas)
    } finally {
      vi.useRealTimers()
    }
  })

  it("does not rerun when rerunMS is omitted or null", () => {
    vi.useFakeTimers()
    try {
      const ref = React.createRef<PhysicsFrameHandle>()
      const { container } = render(
        <CollisionSwarmChart
          ref={ref}
          data={[{ id: "a", x: 1 }]}
          xAccessor="x"
          rerunMS={null}
          size={[220, 140]}
        />
      )
      const firstCanvas = container.querySelector("canvas")

      act(() => ref.current?.clear())
      act(() => vi.advanceTimersByTime(5000))
      expect(container.querySelector("canvas")).toBe(firstCanvas)
    } finally {
      vi.useRealTimers()
    }
  })

  it("accepts zero as an immediate post-settle rerun delay", () => {
    vi.useFakeTimers()
    try {
      const ref = React.createRef<PhysicsFrameHandle>()
      const { container } = render(
        <GaltonBoardChart
          ref={ref}
          data={[{ id: "a", value: 1 }]}
          valueAccessor="value"
          rerunMS={0}
          size={[220, 140]}
        />
      )
      const firstCanvas = container.querySelector("canvas")

      act(() => ref.current?.clear())
      act(() => vi.advanceTimersByTime(0))
      expect(container.querySelector("canvas")).not.toBe(firstCanvas)
    } finally {
      vi.useRealTimers()
    }
  })

  it("fully restores Galton seed bodies when a rerun remounts the frame", () => {
    vi.useFakeTimers()
    try {
      const ref = React.createRef<PhysicsFrameHandle>()
      render(
        <GaltonBoardChart
          ref={ref}
          data={[{ id: "a", value: 1 }, { id: "b", value: 2 }]}
          valueAccessor="value"
          rerunMS={1000}
          size={[220, 140]}
        />
      )

      act(() => ref.current?.clear())
      expect(ref.current?.getData()).toHaveLength(0)
      act(() => vi.advanceTimersByTime(1000))
      // Spawn pacing intentionally materializes only the first seed body on
      // the remount's initial frame. A mere wake-up of the cleared store would
      // still contain no bodies at all.
      expect(ref.current?.getData().map((datum) => datum.id)).toContain("a")
    } finally {
      vi.useRealTimers()
    }
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
