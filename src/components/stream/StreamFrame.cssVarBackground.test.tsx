/**
 * Regression coverage for the `background="var(--token, fallback)"`
 * flashing-background bug.
 *
 * The four Stream Frames (`StreamXYFrame`, `StreamOrdinalFrame`,
 * `StreamNetworkFrame`, `StreamGeoFrame`) each paint the chart
 * background in their canvas render loop by assigning the
 * user-supplied `background` prop to `ctx.fillStyle`. Canvas's
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
 * assignment. This test pins that contract per frame: when the user
 * passes a `var(...)` background, the value reaching `ctx.fillStyle`
 * at the moment of `fillRect` is the resolved color, never the raw
 * `var(...)` string and never the fillStyle value left behind by a
 * previous draw operation.
 */
import * as React from "react"
import { render, act } from "@testing-library/react"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"

import StreamXYFrame from "./StreamXYFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import StreamNetworkFrame from "./StreamNetworkFrame"
import StreamGeoFrame from "./StreamGeoFrame"

// Capture every value that flows through `ctx.fillStyle` setter for
// any canvas created during the render. The canvas mock returns the
// same `ctx` instance for every `getContext("2d")` call across the
// test, so we instrument it once. The frame's render loop calls
// `fillRect` for the chart background; the assignment immediately
// before that fillRect is the value under test.
function captureFillStyleAssignments(): {
  log: string[]
  install: () => void
  uninstall: () => void
} {
  const log: string[] = []
  const proto = HTMLCanvasElement.prototype
  let originalGetContext: typeof proto.getContext
  let installed = false
  return {
    log,
    install() {
      if (installed) return
      installed = true
      originalGetContext = proto.getContext
      proto.getContext = function patchedGetContext(this: HTMLCanvasElement, contextId: string, ...rest: unknown[]) {
        // @ts-expect-error - rest spread to original signature
        const ctx = originalGetContext.call(this, contextId, ...rest)
        if (!ctx || (ctx as { __fillStyleSpyInstalled?: boolean }).__fillStyleSpyInstalled) return ctx
        let stored: unknown = ""
        Object.defineProperty(ctx, "fillStyle", {
          configurable: true,
          get() { return stored },
          set(v) {
            stored = v
            log.push(String(v))
          },
        })
        ;(ctx as { __fillStyleSpyInstalled?: boolean }).__fillStyleSpyInstalled = true
        return ctx
      } as typeof proto.getContext
    },
    uninstall() {
      if (!installed) return
      installed = false
      proto.getContext = originalGetContext
    },
  }
}

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
  let spy: ReturnType<typeof captureFillStyleAssignments>

  beforeEach(() => {
    // `noop` rAF: schedule the first render on mount but never re-fire.
    // The bug under test reproduces on the very first paint — the
    // background fillStyle assignment lives at the top of every render
    // pass — so a single mount-time render is enough. `true` (sync fire)
    // would recurse indefinitely under sankey's continuous topology-diff
    // animation chain; `false` (jsdom's setTimeout cadence) is too slow
    // to settle inside a unit test.
    cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
    spy = captureFillStyleAssignments()
    spy.install()
  })

  afterEach(() => {
    spy.uninstall()
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
        />,
      )
    })
    // The raw `var(...)` token must never reach fillStyle — that's the
    // exact assignment canvas silently rejects, which produces the
    // flashing-palette regression. The resolved value should appear at
    // least once (the background fillRect uses it).
    expect(spy.log).not.toContain(VAR_BG)
    expect(spy.log).toContain(RESOLVED_BG)
  })

  it("StreamXYFrame resolves a var() background before assigning to fillStyle", async () => {
    await act(async () => {
      render(
        <StreamXYFrame
          chartType="line"
          data={[{ x: 0, y: 1 }, { x: 1, y: 2 }]}
          xAccessor="x"
          yAccessor="y"
          size={[400, 300]}
          background={VAR_BG}
        />,
      )
    })
    expect(spy.log).not.toContain(VAR_BG)
    expect(spy.log).toContain(RESOLVED_BG)
  })

  it("StreamOrdinalFrame resolves a var() background before assigning to fillStyle", async () => {
    await act(async () => {
      render(
        <StreamOrdinalFrame
          chartType="bar"
          data={[{ cat: "A", v: 10 }, { cat: "B", v: 20 }]}
          oAccessor="cat"
          rAccessor="v"
          size={[400, 300]}
          background={VAR_BG}
        />,
      )
    })
    expect(spy.log).not.toContain(VAR_BG)
    expect(spy.log).toContain(RESOLVED_BG)
  })

  it("StreamGeoFrame resolves a var() background before assigning to fillStyle", async () => {
    await act(async () => {
      render(
        <StreamGeoFrame
          areas={[]}
          points={[{ lon: 0, lat: 0 }]}
          size={[400, 300]}
          background={VAR_BG}
        />,
      )
    })
    expect(spy.log).not.toContain(VAR_BG)
    expect(spy.log).toContain(RESOLVED_BG)
  })
})
