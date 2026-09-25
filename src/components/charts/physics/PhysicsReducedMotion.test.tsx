/**
 * Reduced-motion end-state contract at the HOC level.
 *
 * The family's whole claim is "the settled projection is the chart; motion is
 * explanatory context". A reader with `prefers-reduced-motion` gets *only* the
 * settled projection, so that path has to reach the true end state: every paced
 * body admitted, and every authored gate event applied.
 */
import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import GaltonBoardChart from "./GaltonBoardChart"
import UnitPileChart from "./UnitPileChart"
import GauntletChart from "./GauntletChart"
import EventDropChart from "./EventDropChart"
import CollisionSwarmChart from "./CollisionSwarmChart"
import type { PhysicsFrameHandle } from "./physicsHocHandle"
import type { PhysicsPipelineSnapshot } from "../../stream/physics/PhysicsPipelineStore"

function mockReducedMotion(matches: boolean): () => void {
  const original = window.matchMedia
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: matches && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false
    }))
  })
  return () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: original
    })
  }
}

const galtonRows = Array.from({ length: 40 }, (_, index) => ({
  id: `row-${index}`,
  value: index % 21
}))

describe("physics charts under prefers-reduced-motion", () => {
  let cleanupCanvas: () => void
  let restoreMedia: () => void

  beforeEach(() => {
    cleanupCanvas = setupCanvasMock()
    restoreMedia = mockReducedMotion(true)
  })

  afterEach(() => {
    restoreMedia()
    cleanupCanvas()
  })

  it.each([true, false])(
    "EventDrop observers can update React state with inline options (explicit windows: %s)",
    async (explicitWindows) => {
      const ref = React.createRef<PhysicsFrameHandle>()
      const data = [{ id: "early", time: 6, arrivalTime: 7 }]
      function Observed({ watermark }: { watermark: number }) {
        const [reading, setReading] = React.useState({ elapsed: 0 })
        return (
          <>
            <output>{reading.elapsed}</output>
            <EventDropChart
              ref={ref}
              data={data}
              windows={explicitWindows ? { size: 12 } : undefined}
              watermark={{ value: watermark }}
              timeExtent={[0, 24]}
              frameProps={{
                onTick: (result) =>
                  setReading({ elapsed: result.elapsedSeconds })
              }}
            />
          </>
        )
      }
      const { rerender } = render(<Observed watermark={-1} />)
      const body = () =>
        (ref.current?.getCustomLayout?.() as PhysicsPipelineSnapshot).world
          .bodies[0]
      await waitFor(() => expect(body()?.datum).toMatchObject({ late: false }))
      rerender(<Observed watermark={25} />)
      await waitFor(() => expect(body()?.datum).toMatchObject({ late: true }))
    }
  )

  it.each(["galton", "swarm", "pile"] as const)(
    "%s keeps inline extent/category options stable during observation",
    async (family) => {
      const ref = React.createRef<PhysicsFrameHandle>()
      const data = [{ id: "a", value: 6, x: 6, category: "A" }]
      function Observed({ end }: { end: number }) {
        const [reading, setReading] = React.useState({ elapsed: 0 })
        const frameProps = {
          onTick: (result: { elapsedSeconds: number }) =>
            setReading({ elapsed: result.elapsedSeconds })
        }
        return (
          <>
            <output>{reading.elapsed}</output>
            {family === "galton" ? (
              <GaltonBoardChart ref={ref} data={data}
                valueExtent={[0, end]} frameProps={frameProps} />
            ) : family === "swarm" ? (
              <CollisionSwarmChart ref={ref} data={data}
                xExtent={[0, end]} frameProps={frameProps} />
            ) : (
              <UnitPileChart ref={ref} simulationMode="mechanical"
                mechanicalCount={3} mechanicalCategories={[`A-${end}`]}
                frameProps={frameProps} />
            )}
          </>
        )
      }
      const { rerender } = render(<Observed end={12} />)
      const snapshot = () =>
        ref.current?.getCustomLayout?.() as PhysicsPipelineSnapshot
      await waitFor(() => expect(snapshot().world.bodies.length).toBeGreaterThan(0))
      const before = snapshot().world.bodies
      rerender(<Observed end={24} />)
      await waitFor(() => expect(snapshot().world.bodies).not.toEqual(before))
    }
  )

  it("GaltonBoardChart admits every paced ball, not just the first", async () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    render(
      <GaltonBoardChart
        ref={ref}
        data={galtonRows}
        valueAccessor="value"
        bins={21}
        size={[700, 420]}
        seed={1}
      />
    )

    await waitFor(() => {
      const snapshot = ref.current?.getCustomLayout?.() as PhysicsPipelineSnapshot
      expect(snapshot.world.bodies).toHaveLength(galtonRows.length)
      expect(snapshot.queue).toHaveLength(0)
    })
  })

  it.each([
    { chart: "GaltonBoardChart", count: 1000 },
    { chart: "UnitPileChart", count: 250 }
  ] as const)(
    "$chart admits all $count rows after more than ten seconds of paced arrivals",
    async ({ chart, count }) => {
      const ref = React.createRef<PhysicsFrameHandle>()
      const data = Array.from({ length: count }, (_, index) => ({
        id: `row-${index}`,
        value: index % 21,
        category: `category-${index % 10}`
      }))
      render(chart === "GaltonBoardChart" ? (
        <GaltonBoardChart ref={ref} data={data} valueAccessor="value"
          bins={21} ballRadius={1} size={[1000, 420]} seed={1} />
      ) : (
        <UnitPileChart ref={ref} data={data} categoryAccessor="category"
          ballRadius={1} size={[1000, 420]} seed={1} />
      ))

      await waitFor(() => {
        const snapshot = ref.current?.getCustomLayout?.() as PhysicsPipelineSnapshot
        expect(snapshot.world.bodies).toHaveLength(data.length)
        expect(snapshot.queue).toHaveLength(0)
      })
    },
    30000
  )

  it("GauntletChart applies its authored gate effects instead of freezing at the start", async () => {
    const states: Array<{
      eventsApplied: string[]
      activePositiveIds: string[]
      negativeIds: string[]
    }> = []

    render(
      <GauntletChart
        data={[{ id: "plan", positives: ["lift-a", "lift-b"], negatives: [] }]}
        idAccessor="id"
        positiveAccessor="positives"
        negativeAccessor="negatives"
        positiveProperties={[
          { id: "lift-a", label: "Lift A" },
          { id: "lift-b", label: "Lift B" }
        ]}
        negativeProperties={[{ id: "drag-a", label: "Drag A" }]}
        gates={[{ id: "review", label: "Review", time: 0.25 }]}
        events={[
          {
            id: "review-hit",
            label: "Review",
            time: 0.25,
            gateId: "review",
            final: true,
            effects: [{ popPositive: ["lift-a"], addNegative: ["drag-a"] }]
          }
        ]}
        size={[700, 420]}
        // GauntletChart is the one physics HOC with no top-level `seed`; its
        // determinism comes from the kernel seed.
        frameProps={{ config: { kernel: { seed: 7 } } }}
        onStateChange={(next) => {
          const project = next[0]
          if (!project) return
          states.push({
            eventsApplied: [...project.eventsApplied],
            activePositiveIds: [...project.activePositiveIds],
            negativeIds: [...project.negativeIds]
          })
        }}
      />
    )

    await waitFor(() => {
      expect(states.at(-1)?.eventsApplied).toContain("review-hit")
    })

    // The settled inventory reads the post-gauntlet state, not the authored
    // start: the popped lift is gone and the gate's drag has been attached.
    const settled = states.at(-1)
    expect(settled?.activePositiveIds).not.toContain("lift-a")
    expect(settled?.activePositiveIds).toContain("lift-b")
    expect(settled?.negativeIds).toContain("drag-a")
  })
})

describe("physics charts with motion allowed", () => {
  let cleanupCanvas: () => void
  let restoreMedia: () => void

  beforeEach(() => {
    // "noop" rAF: one mount-time render, so this asserts the *first* frame
    // rather than racing a real animation loop.
    cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
    restoreMedia = mockReducedMotion(false)
  })

  afterEach(() => {
    restoreMedia()
    cleanupCanvas()
  })

  it("GaltonBoardChart still staggers arrivals rather than dumping them at once", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    render(
      <GaltonBoardChart
        ref={ref}
        data={galtonRows}
        valueAccessor="value"
        bins={21}
        size={[700, 420]}
        seed={1}
      />
    )

    // Pacing is the point of the animated path: on the first frame only the
    // spawns already due exist. The reduced-motion case above is the one that
    // must reach the full count in a single pass.
    const snapshot = ref.current?.getCustomLayout?.() as PhysicsPipelineSnapshot
    expect(snapshot.world.bodies.length).toBeLessThan(galtonRows.length)
    expect(snapshot.queue.length).toBeGreaterThan(0)
    expect(snapshot.world.bodies.length + snapshot.queue.length).toBe(galtonRows.length)
  })
})
