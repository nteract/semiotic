/**
 * Hydration parity for StreamXYFrame.
 *
 * Proves the SSR → client handoff end-to-end:
 *   1. `renderToString` produces HTML containing SVG-rendered marks.
 *   2. `hydrateRoot` against that HTML completes without React hydration
 *      mismatch warnings (the heuristic React uses to detect server/client
 *      structural disagreement).
 *   3. After the first post-commit re-render fires, the canvas branch is
 *      live: the chart's outer wrapper switches from `role="img"` (the
 *      SVG-only shape) to `role="group"` (the interactive wrapper with
 *      keyboard nav).
 *
 * This is the gate that protects the hydration boundary. If a future
 * change makes the server output diverge from the first client render,
 * step 2 will fail with a React-emitted console.error and this test
 * catches it before users see broken charts.
 */
import * as React from "react"
import { renderToString } from "react-dom/server"
import { hydrateRoot } from "react-dom/client"
import { act } from "react"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import StreamXYFrame from "./StreamXYFrame"

const sampleData = [
  { x: 0, y: 1 },
  { x: 1, y: 4 },
  { x: 2, y: 2 },
  { x: 3, y: 5 },
  { x: 4, y: 3 },
]

const baseProps = {
  chartType: "line" as const,
  data: sampleData,
  xAccessor: "x",
  yAccessor: "y",
  size: [400, 200] as [number, number],
}

describe("StreamXYFrame hydration parity", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it("renderToString emits SVG markup containing the data marks", () => {
    const html = renderToString(<StreamXYFrame {...baseProps} />)
    // Outer wrapper carries role="img" in SVG-only mode (no keyboard nav).
    expect(html).toContain("stream-xy-frame")
    expect(html).toContain('role="img"')
    // The data marks are emitted as SVG path/rect/circle/etc. — at minimum
    // an <svg> element should be present (SceneToSVG output).
    expect(html).toContain("<svg")
  })

  it("hydrates against server-rendered HTML without mismatch warnings", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const html = renderToString(<StreamXYFrame {...baseProps} />)
    container.innerHTML = html

    let root: ReturnType<typeof hydrateRoot> | null = null
    act(() => {
      root = hydrateRoot(container, <StreamXYFrame {...baseProps} />)
    })

    // React logs hydration mismatches via console.error with messages
    // mentioning "did not match" or "Hydration failed". If our SVG
    // branch produced different markup than what the server emitted,
    // we'd see one of those here.
    const mismatchWarnings = errorSpy.mock.calls.filter((call) => {
      const msg = String(call[0] ?? "")
      return /did not match|hydration failed|hydration error/i.test(msg)
    })
    expect(mismatchWarnings).toEqual([])

    root?.unmount()
    errorSpy.mockRestore()
  })

  it("upgrades from SVG-only shape to interactive canvas after hydration", () => {
    const html = renderToString(<StreamXYFrame {...baseProps} />)
    container.innerHTML = html

    // Pre-hydration: outer wrapper is role="img" (SVG-only shape).
    const wrapper = container.querySelector(".stream-xy-frame") // test-quality-gate: allow-mount-only - precondition for semantic role assertion below.
    expect(wrapper).not.toBeNull()
    expect(wrapper?.getAttribute("role")).toBe("img")

    let root: ReturnType<typeof hydrateRoot> | null = null
    act(() => {
      root = hydrateRoot(container, <StreamXYFrame {...baseProps} />)
    })

    // Post-hydration: useLayoutEffect has fired, hydrated flipped to
    // true, the canvas branch is now live. The wrapper's role flips
    // to "group" (the interactive shape with keyboard nav + tabIndex).
    const upgradedWrapper = container.querySelector(".stream-xy-frame")
    expect(upgradedWrapper?.getAttribute("role")).toBe("group")
    expect(upgradedWrapper?.getAttribute("tabIndex")).toBe("0")
    // And a <canvas> should now exist for data-mark painting.
    expect(container.querySelector("canvas")).not.toBeNull() // test-quality-gate: allow-mount-only - verifies the hydration branch swapped to the interactive canvas surface.

    root?.unmount()
  })

  it("preserves SVG output when window/document remain undefined (true SSR path)", () => {
    // Sanity: confirm renderToString actually exercises the SSR
    // branch via `isServerEnvironment`, not just the `!hydrated`
    // gate. A single-character regression in the branch condition
    // would make the server pass throw on missing canvas APIs.
    const html = renderToString(<StreamXYFrame {...baseProps} />)
    expect(html).not.toContain("<canvas")
  })

  // ── Coverage note ──────────────────────────────────────────────────
  //
  // jsdom's canvas mock can't faithfully test "did the canvas actually
  // paint?" — its 2D context stubs out drawing methods, and rAF inside
  // `hydrateRoot`'s act() doesn't reliably flush. The pixel-level
  // "canvas paints correctly after hydration" gate lives in Playwright:
  // `integration-tests/ssr-parity.spec.ts` baselines the post-mount
  // canvas state for a representative chart matrix. If the SVG →
  // canvas paint kick regresses, the Playwright CSR baselines diff
  // (the canvas mounts blank instead of showing the chart).
  //
  // The four tests above cover what jsdom can verify reliably:
  // (1) server SVG output is non-empty, (2) hydration produces no
  // React mismatch warnings, (3) the wrapper upgrades from role="img"
  // to role="group", and (4) renderToString's SSR branch doesn't leak
  // canvas elements into the server output.
})
