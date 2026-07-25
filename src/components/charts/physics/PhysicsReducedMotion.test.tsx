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
import GauntletChart from "./GauntletChart"
import type { PhysicsFrameHandle } from "./physicsHocHandle"

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
      expect(ref.current?.getData().length).toBe(galtonRows.length)
    })
  })

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
    expect(ref.current?.getData().length).toBeLessThan(galtonRows.length)
  })
})
