/**
 * Regression coverage for `jaggedBase` axis rendering.
 *
 * The "jagged base" feature draws a torn-edge baseline indicating an
 * axis has been truncated to a non-zero minimum. It's a classic data-
 * viz convention and is used in the docs at `/features/axes` under
 * the "Jagged Base for Non-Zero Baselines" example. The feature has
 * regressed at least once when SVGUnderlay's gating logic shifted
 * around `showAxes`/`hasBaselines` — a recurring class of regression
 * because the JSX gate combines four flags (`showAxes`,
 * `axes[i].baseline`, `axes[i].jaggedBase`, scales-present). This
 * test pins the contract for both the SVG-only path (`SVGUnderlay`,
 * which lives behind the canvas) and the full-axis path
 * (`SVGOverlay`, which lives on top and renders ticks/labels on the
 * same baseline).
 */
import * as React from "react"
import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { SVGUnderlay, SVGOverlay } from "./SVGOverlay"

// Minimal scale stub — `SVGUnderlay`'s tick computation calls
// `scales.x.ticks(n)` / `scales.y.ticks(n)` so we just need those to
// exist; the jagged baseline path itself is computed from `width` /
// `height` and doesn't read tick values.
function makeStubScales(): { x: ((v: number) => number) & { ticks: (n: number) => number[] }, y: ((v: number) => number) & { ticks: (n: number) => number[] } } {
  const x = Object.assign((v: number) => v, { ticks: () => [0, 50, 100], domain: () => [0, 100] })
  const y = Object.assign((v: number) => v, { ticks: () => [4000, 5000], domain: () => [4000, 5000] })
  return { x: x as any, y: y as any }
}

const baseProps = {
  width: 300,
  height: 200,
  totalWidth: 360,
  totalHeight: 240,
  margin: { top: 10, right: 20, bottom: 30, left: 40 },
}

describe("jaggedBase rendering", () => {
  it("SVGUnderlay emits a torn-edge path when a left axis sets jaggedBase: true with baseline: false", () => {
    // Mirrors the docs/AxesPage.js "Jagged Base for Non-Zero
    // Baselines" example exactly — same axes config shape that broke
    // the rendering when the SVGUnderlay/SVGOverlay split shipped.
    const { container } = render(
      <SVGUnderlay
        {...baseProps}
        scales={makeStubScales() as any}
        showAxes={true}
        axes={[
          { orient: "left", baseline: false, jaggedBase: true },
          { orient: "bottom" },
        ]}
      />,
    )
    // The jagged baseline is emitted as a `<path>` with a multi-segment
    // `d` attribute. Plain straight baselines use `<line>` elements, so
    // the presence of any `<path>` element here is a strong signal the
    // jagged renderer fired (no other code path inside SVGUnderlay
    // emits a path).
    const paths = container.querySelectorAll("path")
    expect(paths.length).toBeGreaterThan(0)
    // Sanity: the path d-attr should contain at least a few zigzag
    // segments — the helper emits ceil(width/8) teeth, so for
    // width=300 we expect ~37 teeth ≈ 75 line commands. A regression
    // that emitted a single straight path would have only one or two L
    // commands.
    const lCommandCount = (paths[0].getAttribute("d") ?? "").split("L").length - 1
    expect(lCommandCount).toBeGreaterThan(20)
  })

  it("SVGUnderlay omits the jagged path when jaggedBase is unset (regression guard)", () => {
    // Without `jaggedBase: true`, the underlay should fall back to
    // straight `<line>` baselines. A bug that emits jagged paths
    // unconditionally is just as broken as the inverse and would slip
    // past the positive test alone.
    const { container } = render(
      <SVGUnderlay
        {...baseProps}
        scales={makeStubScales() as any}
        showAxes={true}
        axes={[
          { orient: "left" },
          { orient: "bottom" },
        ]}
      />,
    )
    expect(container.querySelectorAll("path").length).toBe(0)
    // Both standard baselines should be present as straight lines.
    const lines = container.querySelectorAll("line")
    expect(lines.length).toBeGreaterThanOrEqual(2)
  })

  it("SVGUnderlay emits the jagged path even when the matching baseline:false suppresses the straight baseline", () => {
    // The docs config sets BOTH `baseline: false` (suppress the normal
    // straight baseline) AND `jaggedBase: true`. The two flags
    // historically interacted: an earlier regression class skipped the
    // jagged path because the `showLeftBaseline` gate was AND-ed with
    // the jagged branch. Pin the contract so a future refactor that
    // re-couples them fails loudly.
    const { container } = render(
      <SVGUnderlay
        {...baseProps}
        scales={makeStubScales() as any}
        showAxes={true}
        axes={[
          { orient: "left", baseline: false, jaggedBase: true },
          { orient: "bottom" },
        ]}
      />,
    )
    expect(container.querySelectorAll("path").length).toBeGreaterThan(0)
  })

  it("SVGOverlay emits the jagged path when underlayRendered is false (frame variants without an SVGUnderlay)", () => {
    // Most frames pair `SVGUnderlay` + `SVGOverlay` (with `underlayRendered`),
    // but the overlay's own jagged branch is the legacy path and ships
    // standalone in some test/SSR scenarios. Pin both renderers.
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales() as any}
        showAxes={true}
        axes={[
          { orient: "left", baseline: false, jaggedBase: true },
          { orient: "bottom" },
        ]}
      />,
    )
    expect(container.querySelectorAll("path").length).toBeGreaterThan(0)
  })

  it("SVGOverlay still emits the jagged path when underlayRendered is true (the StreamXYFrame production case)", () => {
    // This is the actual regression that broke /features/axes "Jagged
    // Base for Non-Zero Baselines". `StreamXYFrame` mounts both
    // `SVGUnderlay` (behind the canvas) AND `SVGOverlay` (above the
    // canvas, with `underlayRendered={true}`). The canvas paints
    // `--semiotic-bg` opaquely across the full frame, hiding the
    // underlay's baseline. If `SVGOverlay`'s jagged branch is gated
    // off when `underlayRendered` is true, the jagged baseline is
    // visible *nowhere* — exactly what the user reported. Pinning
    // this case stops the gate from being "fixed" back into existence.
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales() as any}
        showAxes={true}
        underlayRendered={true}
        axes={[
          { orient: "left", baseline: false, jaggedBase: true },
          { orient: "bottom" },
        ]}
      />,
    )
    expect(container.querySelectorAll("path").length).toBeGreaterThan(0)
  })

  it("SVGOverlay renders straight baselines + grid even with underlayRendered:true", () => {
    // Same regression class without the jagged flag — straight
    // baselines and grid lines were also affected by the
    // `!underlayRendered` gate. Confirm the frame's "above the
    // canvas" layer paints them when the canvas is opaque (the
    // default `canvasObscuresUnderlay`).
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales() as any}
        showAxes={true}
        showGrid={true}
        underlayRendered={true}
        axes={[
          { orient: "left" },
          { orient: "bottom" },
        ]}
      />,
    )
    // Grid + baseline + ticks all use `<line>`. We need at minimum
    // the two baseline lines (X + Y) plus the grid lines and tick
    // marks. A bug that suppressed grid/baselines under the gate
    // would still render tick marks, so the threshold is set above
    // tick-only counts.
    const lines = container.querySelectorAll("line")
    expect(lines.length).toBeGreaterThan(6)
  })

  it("SVGOverlay skips the jagged path when underlayRendered:true AND the canvas is transparent (no double-render)", () => {
    // When the frame opts out of canvas background painting (via
    // `background="transparent"` or a `backgroundGraphics` SVG
    // sibling), `SVGUnderlay` is visible behind the canvas. The
    // overlay must NOT also emit the jagged baseline — two SVG
    // paths overlaid pixel-for-pixel produce a doubled / slightly
    // darker stroke that's a Copilot-flagged regression.
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales() as any}
        showAxes={true}
        underlayRendered={true}
        canvasObscuresUnderlay={false}
        axes={[
          { orient: "left", baseline: false, jaggedBase: true },
          { orient: "bottom" },
        ]}
      />,
    )
    // The overlay must emit zero `<path>` elements in this state —
    // the underlay still renders the jagged baseline.
    expect(container.querySelectorAll("path").length).toBe(0)
  })

  it("SVGOverlay skips straight baselines + grid lines when underlayRendered:true AND the canvas is transparent", () => {
    // Same gate, non-jagged variant.
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales() as any}
        showAxes={true}
        showGrid={true}
        underlayRendered={true}
        canvasObscuresUnderlay={false}
        axes={[
          { orient: "left" },
          { orient: "bottom" },
        ]}
      />,
    )
    // Tick marks (5px notch lines from each tick) should still
    // render — they're painted at the tick position regardless of
    // the gate. But the baselines + grid lines must not. With
    // `xTicks ≈ 3` + `yTicks ≈ 2` that's at most ~5 tick-mark
    // `<line>` elements; an unsuppressed grid + baseline pair would
    // push the count above 7. Use a strict upper bound to catch a
    // regression that re-enables either branch under transparent
    // canvas.
    const lines = container.querySelectorAll("line")
    expect(lines.length).toBeLessThan(7)
  })
})
