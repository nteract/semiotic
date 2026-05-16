/**
 * Regression coverage for explicit `tickValues` on XY axes.
 *
 * The axis config has long advertised `tickValues` in the docs (a
 * `/features/axes` LiveExample paired with a docs paragraph claiming
 * "tickValues still wins"), but the field was never actually consumed
 * by `SVGOverlay`'s tick computation — d3-scale's auto-generator ran
 * regardless. This test pins the now-implemented behavior: when an
 * axis carries `tickValues`, the rendered tick labels reflect those
 * values verbatim.
 */
import * as React from "react"
import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { SVGOverlay } from "./SVGOverlay"
import type { StreamScales } from "./types"

// Scale stubs sized so that arbitrary picked tick values land far enough
// apart pixel-wise to survive `filterTicksByPixelDistance` (22 px on Y,
// ~55 px on X). Picked values in the tests use a non-overlapping
// numeric vocabulary (10/40/70 for X, 3000/5000/7000 for Y) so we can
// substring-match cleanly without colliding with d3 auto-ticks like
// "25" appearing inside "2500".
function makeStubScales(): StreamScales {
  const x = Object.assign((v: number) => v * 3, {
    ticks: () => [0, 250, 500, 750, 1000],
    domain: () => [0, 100],
    range: () => [0, 300],
  })
  const y = Object.assign((v: number) => 200 - (v / 10000) * 200, {
    ticks: () => [0, 200000, 400000, 600000, 800000],
    domain: () => [0, 10000],
    range: () => [200, 0],
  })
  return { x, y } as unknown as StreamScales
}

const baseProps = {
  width: 300,
  height: 200,
  totalWidth: 360,
  totalHeight: 240,
  margin: { top: 10, right: 20, bottom: 30, left: 40 },
}

describe("tickValues on XY axes", () => {
  it("bottom-axis tickValues overrides d3 auto-ticks", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        axes={[
          // Use distinct tick numbers on the left axis (3000s) so we
          // can substring-test the bottom axis's 10/40/70 against the
          // whole container content without false positives.
          { orient: "left", tickValues: [3000, 5000, 7000] },
          { orient: "bottom", tickValues: [10, 40, 70] },
        ]}
      />,
    )
    const textContent = container.textContent ?? ""
    // User-supplied bottom-axis values present.
    expect(textContent).toContain("10")
    expect(textContent).toContain("40")
    expect(textContent).toContain("70")
    // x-scale's default ticks (250, 500, 750, 1000) shouldn't surface.
    expect(textContent).not.toContain("250")
    expect(textContent).not.toContain("750")
  })

  it("left-axis tickValues overrides d3 auto-ticks", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        axes={[
          { orient: "left", tickValues: [3000, 5000, 7000] },
          { orient: "bottom" },
        ]}
      />,
    )
    const textContent = container.textContent ?? ""
    expect(textContent).toContain("3000")
    expect(textContent).toContain("5000")
    expect(textContent).toContain("7000")
    // Auto-tick values 2500 and 7500 should not appear.
    expect(textContent).not.toContain("2500")
    expect(textContent).not.toContain("7500")
  })

  it("applies tickFormat to the explicit tickValues", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        axes={[
          {
            orient: "left",
            tickValues: [3000, 5000, 7000],
            tickFormat: (d: number) => `$${d / 1000}k`,
          },
          { orient: "bottom" },
        ]}
      />,
    )
    const textContent = container.textContent ?? ""
    expect(textContent).toContain("$3k")
    expect(textContent).toContain("$5k")
    expect(textContent).toContain("$7k")
  })

  it("explicit tickValues wins over axisExtent='exact'", () => {
    // The user-supplied tickValues take priority over the equidistant
    // generator that "exact" mode would otherwise run. Pinning this
    // because it's the contract the AxesPage docs claim.
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        axisExtent="exact"
        axes={[
          { orient: "left", tickValues: [3300, 5500, 7700] },
          { orient: "bottom", tickValues: [11, 44, 77] },
        ]}
      />,
    )
    const textContent = container.textContent ?? ""
    expect(textContent).toContain("3300")
    expect(textContent).toContain("5500")
    expect(textContent).toContain("7700")
    expect(textContent).toContain("11")
    expect(textContent).toContain("44")
    expect(textContent).toContain("77")
  })
})
