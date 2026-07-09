/**
 * Physics honesty contract suite — regression guards that every process /
 * statistical physics HOC must keep passing.
 *
 * Covers:
 *   - corridor integrity (bodies stay inside walls)
 *   - tooltip chrome (never transparent class-only tooltips)
 *   - settled projection present by default
 *   - capacity queue metrics
 *   - seed determinism for builders
 */
import * as React from "react"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FlippingTooltip, hasOwnChrome } from "../../Tooltip/FlippingTooltip"
import { defaultTooltipStyle } from "../../Tooltip/Tooltip"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { beforeEach, afterEach } from "vitest"
import { GauntletChart, clampGauntletPoint, GAUNTLET_WALL } from "../../charts/physics/GauntletChart"
import { ProcessFlowChart } from "../../charts/physics/ProcessFlowChart"
import { GaltonBoardChart } from "../../charts/physics/GaltonBoardChart"
import { PhysicsPileChart } from "../../charts/physics/PhysicsPileChart"
import { buildProcessFlowPhysics, buildGaltonBoardPhysics } from "../../charts/physics/physicsChartUtils"
import { createCapacityQueueController } from "./PhysicsControllers"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import type { StreamPhysicsBodyRegionState } from "./StreamPhysicsFrame"

describe("physics contracts — corridor integrity", () => {
  it("clampGauntletPoint never returns centers outside the wall box", () => {
    const layout = { width: 720, floorY: 340 }
    const leftMin = GAUNTLET_WALL.left + GAUNTLET_WALL.thickness / 2
    for (const [x, y, r] of [
      [0, 100, 10],
      [-50, 200, 8],
      [900, 100, 12],
      [40, -20, 6]
    ] as const) {
      const p = clampGauntletPoint(x, y, r, layout)
      expect(p.x).toBeGreaterThanOrEqual(leftMin + r)
      expect(p.x).toBeLessThanOrEqual(layout.width - GAUNTLET_WALL.rightInset - r)
      expect(p.y).toBeGreaterThanOrEqual(GAUNTLET_WALL.top + r)
      expect(p.y).toBeLessThanOrEqual(layout.floorY - r)
    }
  })
})

describe("physics contracts — tooltip chrome", () => {
  it("hasOwnChrome rejects class-only semiotic-tooltip roots", () => {
    const node = React.createElement("div", { className: "semiotic-tooltip" }, "x")
    expect(hasOwnChrome(node)).toBe(false)
  })

  it("hasOwnChrome accepts inline opaque background", () => {
    const node = React.createElement(
      "div",
      { className: "semiotic-tooltip", style: { background: "red" } },
      "x"
    )
    expect(hasOwnChrome(node)).toBe(true)
  })

  it("FlippingTooltip paints default chrome for class-only content", () => {
    const { container } = render(
      <FlippingTooltip
        x={10}
        y={10}
        containerWidth={200}
        containerHeight={100}
        margin={{ top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <div className="semiotic-tooltip">plain</div>
      </FlippingTooltip>
    )
    expect((container.firstChild as HTMLElement).style.background).toBe(
      String(defaultTooltipStyle.background)
    )
  })
})

describe("physics contracts — settled projection defaults", () => {
  let cleanup: () => void
  beforeEach(() => {
    cleanup = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => cleanup())

  it("GaltonBoardChart mounts a structure overlay (settled scaffold)", () => {
    const { getByTestId } = render(
      <GaltonBoardChart
        data={[{ id: "a", value: 1 }, { id: "b", value: 2 }]}
        valueAccessor="value"
        size={[240, 160]}
      />
    )
    expect(getByTestId("galton-board-structure-overlay")).not.toBeNull()
  })

  it("PhysicsPileChart mounts projection overlay by default", () => {
    const { getByTestId } = render(
      <PhysicsPileChart
        data={[{ category: "A", value: 3 }]}
        categoryAccessor="category"
        valueAccessor="value"
        size={[240, 160]}
      />
    )
    expect(getByTestId("physics-pile-projection-overlay")).not.toBeNull()
  })

  it("ProcessFlowChart mounts process chrome by default", () => {
    const { getByTestId } = render(
      <ProcessFlowChart
        data={[
          { id: "1", stage: "coding" },
          { id: "2", stage: "review" }
        ]}
        stages={[
          { id: "coding", label: "Coding", force: 10 },
          { id: "review", label: "Review", capacity: { unitsPerSecond: 4 } },
          { id: "merged", label: "Merged", absorb: true }
        ]}
        size={[480, 240]}
        settle
      />
    )
    expect(getByTestId("process-flow-chrome")).not.toBeNull()
  })

  it("GauntletChart mounts settled projection strip by default", () => {
    const { getByTestId } = render(
      <GauntletChart
        data={[{ id: "p1", positives: ["homes"], negatives: [] }]}
        positiveProperties={[{ id: "homes", label: "Homes", radius: 8 }]}
        negativeProperties={[]}
        size={[400, 240]}
      />
    )
    expect(getByTestId("gauntlet-projection-overlay")).not.toBeNull()
  })
})

describe("physics contracts — capacity metrics + seed determinism", () => {
  it("capacity queue exposes queueDepth and processedCount", () => {
    const store = new PhysicsPipelineStore({
      kernel: { seed: 1, gravity: { x: 0, y: 0 }, velocityDamping: 1 },
      fixedDt: 1 / 60
    })
    store.enqueue({
      id: "w1",
      x: 10,
      y: 10,
      mass: 1,
      shape: { type: "circle", radius: 4 },
      datum: { work: 1 }
    })
    store.tick(0)
    const controller = createCapacityQueueController({
      regionId: "review",
      unitsPerSecond: 20,
      unitAccessor: "work",
      queueLayout: "none"
    })
    const getRegionState = (): StreamPhysicsBodyRegionState => ({
      activeRegionIds: ["review"],
      regionIds: ["review"],
      charges: {},
      attributes: {},
      energy: 0
    })
    controller.tick({
      result: {
        budget: { action: "ok" } as never,
        elapsedSeconds: 0.1,
        evicted: [],
        events: [],
        observations: [],
        queueSize: 0,
        revision: 1,
        shouldContinue: true,
        sleeping: false,
        sedimented: [],
        spawned: [],
        steps: 6
      },
      controls: store.controls(),
      dt: 0.1,
      elapsed: 0.1,
      getRegionState
    })
    const snap = controller.getSnapshot?.() as {
      queueDepth: number
      processedCount: number
    }
    expect(snap.processedCount).toBeGreaterThanOrEqual(1)
    expect(snap.queueDepth).toBe(0)
  })

  it("builders are seed-deterministic", () => {
    const opts = {
      data: [
        { id: "a", value: 1 },
        { id: "b", value: 3 },
        { id: "c", value: 2 }
      ],
      valueAccessor: "value" as const,
      bins: 5,
      ballRadius: 4,
      seed: 99,
      size: [300, 180] as [number, number]
    }
    const a = buildGaltonBoardPhysics(opts)
    const b = buildGaltonBoardPhysics(opts)
    expect(a.initialSpawns.map((s) => [s.x, s.y])).toEqual(
      b.initialSpawns.map((s) => [s.x, s.y])
    )

    const flow = {
      data: [
        { id: "1", stage: "coding", featureId: "f" },
        { id: "2", stage: "review", featureId: "f" }
      ],
      stages: [
        { id: "coding", force: 10 },
        { id: "review", capacity: { unitsPerSecond: 3 } },
        { id: "merged", absorb: true }
      ],
      size: [600, 300] as [number, number],
      seed: 7,
      settle: true as const
    }
    const f1 = buildProcessFlowPhysics(flow)
    const f2 = buildProcessFlowPhysics(flow)
    expect(f1.projectionRows).toEqual(f2.projectionRows)
    expect(f1.initialSpawns.map((s) => s.id).sort()).toEqual(
      f2.initialSpawns.map((s) => s.id).sort()
    )
  })
})
