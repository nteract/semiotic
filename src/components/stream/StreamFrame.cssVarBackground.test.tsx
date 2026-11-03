import "../../test-utils/registerBuiltInXYPlugins"
/**
 * Regression coverage for the `background="var(--token, fallback)"`
 * flashing-background bug.
 *
 * Network and geo frames paint their backgrounds in the canvas loop.
 * XY and ordinal frames delegate the background to an SVG surface
 * below the grid and data canvas. Canvas's
 * `fillStyle` setter accepts only resolved CSS colors —
 * `var(--token, fallback)` strings are silently rejected, leaving
 * `fillStyle` at whatever color was last set (a node fill, edge
 * color, or particle color from the prior draw). The next
 * `fillRect` paints with that stale value, producing a background
 * that flashes through the palette on every animation frame.
 *
 * Reported on `/features/streaming-system-model` where the demo
 * passes `background="var(--surface-1, #fafafa)"` to a streaming
 * Sankey. The fix routes the prop through `resolveCSSColor` (which
 * reads the canvas's computed style for the custom property) before
 * assignment. Each frame must either resolve the token before canvas
 * assignment or retain it in SVG where the browser resolves it.
 */
import * as React from "react"
import { render, act } from "@testing-library/react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"

import StreamXYFrame from "./StreamXYFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import StreamNetworkFrame from "./StreamNetworkFrame"
import StreamGeoFrame from "./StreamGeoFrame"
import { createFrameScheduler } from "./test-utils/frameScheduler"

const VAR_BG = "var(--surface-1, #fafafa)"
const RESOLVED_BG = "#fafafa"

beforeEach(() => {
  // Set the CSS custom property on document root so resolveCSSColor's
  // getComputedStyle call has a concrete value to read.
  document.documentElement.style.setProperty("--surface-1", RESOLVED_BG)
})

afterEach(() => {
  document.documentElement.style.removeProperty("--surface-1")
})

describe("Stream Frame: background prop with var() syntax", () => {
  let cleanupCanvas: () => void
  let setFillStyle: ReturnType<typeof vi.fn<(value: string | CanvasGradient | CanvasPattern) => void>>
  let scheduler: ReturnType<typeof createFrameScheduler>

  beforeEach(() => {
    // Drive the first populated paint explicitly. Leave global rAF inert
    // so unrelated continuous animation cannot interfere with this check.
    cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
    scheduler = createFrameScheduler()
    const context = document.createElement("canvas").getContext("2d")!
    let fillStyle = context.fillStyle
    setFillStyle = vi.fn((value) => { fillStyle = value })
    Object.defineProperty(context, "fillStyle", {
      configurable: true,
      get: () => fillStyle,
      set: setFillStyle,
    })
  })

  afterEach(() => {
    cleanupCanvas()
  })

  it("StreamNetworkFrame resolves a var() background before assigning to fillStyle", async () => {
    await act(async () => {
      render(
        <StreamNetworkFrame
          chartType="sankey"
          edges={[{ source: "A", target: "B", value: 10 }]}
          size={[400, 300]}
          background={VAR_BG}
          animate={false}
          frameScheduler={scheduler.scheduler}
        />,
      )
    })
    act(() => scheduler.flush())
    // The raw `var(...)` token must never reach fillStyle — that's the
    // exact assignment canvas silently rejects, which produces the
    // flashing-palette regression. The resolved value should appear at
    // least once (the background fillRect uses it).
    expect(setFillStyle).not.toHaveBeenCalledWith(VAR_BG)
    expect(setFillStyle).toHaveBeenCalledWith(RESOLVED_BG)
  })

  it("StreamXYFrame keeps a var() background below the transparent mark canvas", async () => {
    let container: HTMLElement
    await act(async () => {
      ;({ container } = render(
        <StreamXYFrame
          chartType="line"
          data={[{ x: 0, y: 1 }, { x: 1, y: 2 }]}
          xAccessor="x"
          yAccessor="y"
          size={[400, 300]}
          background={VAR_BG}
          animate={false}
          frameScheduler={scheduler.scheduler}
        />,
      ))
    })
    act(() => scheduler.flush())
    expect(setFillStyle).not.toHaveBeenCalledWith(VAR_BG)
    expect(container!.querySelector(".stream-frame-background__backdrop")).toHaveAttribute("fill", VAR_BG)
  })

  it("StreamOrdinalFrame keeps a var() background in its SVG underlay instead of assigning it to canvas", async () => {
    let container: HTMLElement
    await act(async () => {
      ;({ container } = render(
        <StreamOrdinalFrame
          chartType="bar"
          data={[{ cat: "A", v: 10 }, { cat: "B", v: 20 }]}
          oAccessor="cat"
          rAccessor="v"
          size={[400, 300]}
          background={VAR_BG}
          animate={false}
          frameScheduler={scheduler.scheduler}
        />,
      ))
    })
    act(() => scheduler.flush())
    expect(setFillStyle).not.toHaveBeenCalledWith(VAR_BG)
    expect(
      container!.querySelector('[data-semiotic-layer="canvas-background"]'),
    ).toHaveAttribute("fill", VAR_BG)
  })

  it("StreamGeoFrame resolves a var() background before assigning to fillStyle", async () => {
    await act(async () => {
      render(
        <StreamGeoFrame
          areas={[]}
          points={[{ lon: 0, lat: 0 }]}
          projection="equalEarth"
          size={[400, 300]}
          background={VAR_BG}
          animate={false}
          frameScheduler={scheduler.scheduler}
        />,
      )
    })
    act(() => scheduler.flush())
    expect(setFillStyle).not.toHaveBeenCalledWith(VAR_BG)
    expect(setFillStyle).toHaveBeenCalledWith(RESOLVED_BG)
  })
})
