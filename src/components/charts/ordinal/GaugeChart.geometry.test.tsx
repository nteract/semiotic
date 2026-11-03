import * as React from "react"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMockCanvasContext } from "../../../test-utils/canvasMock"
import { GaugeChart } from "./GaugeChart"

const arc = vi.fn<CanvasRenderingContext2D["arc"]>()
const translate = vi.fn<CanvasRenderingContext2D["translate"]>()
const clipRect = vi.fn<CanvasRenderingContext2D["rect"]>()

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] })
  arc.mockClear()
  translate.mockClear()
  clipRect.mockClear()
  const context = { ...createMockCanvasContext(), arc, translate, rect: clipRect }
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function drawGauge(sweep: number, width = 300, height = 250) {
  render(<GaugeChart
    value={100}
    sweep={sweep}
    width={width}
    height={height}
    animate={false}
    showNeedle={false}
    showScaleLabels={false}
    centerContent={<g />}
    color="#4169e1"
  />)
  act(() => vi.advanceTimersToNextFrame())
  expect(arc).toHaveBeenCalled()
  // The real canvas renderer traces the outer edge clockwise, then the
  // inner edge anticlockwise. Observe those calls without recreating layout.
  const outer = arc.mock.calls.find((call) => !call[5])!
  const inner = arc.mock.calls.find((call) => call[5])!
  expect(outer).toBeDefined()
  expect(inner).toBeDefined()
  expect(inner[2]).toBeLessThan(outer[2])
  return { outer, inner, center: translate.mock.calls.at(-1)! }
}

describe("GaugeChart rendered geometry", () => {
  it.each([
    [180, Math.PI, 2 * Math.PI],
    [240, 5 * Math.PI / 6, 13 * Math.PI / 6],
    [270, 3 * Math.PI / 4, 9 * Math.PI / 4],
    [300, 2 * Math.PI / 3, 7 * Math.PI / 3],
  ])("centers the %i° gauge's gap below the hub", (sweep, start, end) => {
    const { outer, inner } = drawGauge(sweep)
    expect(outer[3]).toBeCloseTo(start)
    expect(outer[4]).toBeCloseTo(end)
    expect(inner[3]).toBeCloseTo(end)
    expect(inner[4]).toBeCloseTo(start)
  })

  it("closes both edges of the full-circle gauge", () => {
    const { outer, inner } = drawGauge(360, 300, 300)
    expect(outer[4] - outer[3]).toBeCloseTo(2 * Math.PI)
    expect(inner[3] - inner[4]).toBeCloseTo(2 * Math.PI)
  })

  it.each([
    [180, 300, 200, 130],
    [240, 300, 250, 130],
    [360, 300, 300, 130],
    [180, 850, 158, 125],
  ])("fills a %i° gauge's %ix%i viewport without clipping", (sweep, width, height, minimumRadius) => {
    const { outer, inner, center: [cx, cy] } = drawGauge(sweep, width, height)
    const [clipX, clipY, clipWidth, clipHeight] = clipRect.mock.calls.at(-1)!
    expect(outer[2]).toBeGreaterThan(minimumRadius)
    // Check actual painted coordinates against both the viewport and its
    // canvas clip, including the inner edge and sweep endpoints. Sampling
    // these emitted arcs is independent of GaugeChart's fitting algorithm.
    for (const radius of [outer[2], inner[2]]) {
      for (let step = 0; step <= 360; step++) {
        const angle = outer[3] + (outer[4] - outer[3]) * step / 360
        const x = cx + outer[0] + Math.cos(angle) * radius
        const y = cy + outer[1] + Math.sin(angle) * radius
        expect(x).toBeGreaterThanOrEqual(Math.max(0, clipX) - 0.001)
        expect(y).toBeGreaterThanOrEqual(Math.max(0, clipY) - 0.001)
        expect(x).toBeLessThanOrEqual(Math.min(width, clipX + clipWidth) + 0.001)
        expect(y).toBeLessThanOrEqual(Math.min(height, clipY + clipHeight) + 0.001)
      }
    }
  })
})
