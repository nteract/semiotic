/**
 * Coverage for axis customization affordances added for wrapper libraries:
 *
 *   1. `tickAnchor: "edges"` flips first/last tick label anchors to start/end
 *      so labels at the plot boundaries can't overflow the chart area.
 *   2. `data-orient` attributes on per-axis `<g>` groups let consumers
 *      target individual axes via CSS without `!important`.
 *   3. Inline `font-size` references `var(--semiotic-tick-font-size, …)` /
 *      `var(--semiotic-axis-label-font-size, …)` instead of hardcoded
 *      numbers, so a parent setting the CSS variable wins via cascade. Each
 *      `<text>` also carries a plain `font-size` presentation attribute
 *      mirroring the var's own fallback number — strictly lower cascade
 *      priority than the inline style, so it never overrides the CSS-var
 *      path in a browser, but it keeps a sane size for consumers that don't
 *      run a CSS engine over the SVG at all.
 */
import * as React from "react"
import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { SVGOverlay, SVGUnderlay } from "./SVGOverlay"
import type { StreamScales } from "./types"

function makeStubScales(): StreamScales {
  const x = Object.assign((v: number) => v * 3, {
    ticks: () => [0, 25, 50, 75, 100],
    domain: () => [0, 100],
    range: () => [0, 300],
  })
  const y = Object.assign((v: number) => 200 - (v / 100) * 200, {
    ticks: () => [0, 25, 50, 75, 100],
    domain: () => [0, 100],
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

describe("per-axis grid visibility", () => {
  it("keeps only horizontal grid lines when the bottom axis opts out", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        showGrid={true}
        axes={[{ orient: "bottom", grid: false }, { orient: "left" }]}
      />,
    )

    const gridLines = Array.from(container.querySelectorAll("g.stream-grid line"))
    expect(gridLines.length).toBeGreaterThan(0)
    // Horizontal (y-axis) grid lines begin at x=0. No bottom-axis ticks
    // should contribute their vertical x-grid lines.
    for (const line of gridLines) expect(line.getAttribute("x1")).toBe("0")
  })

  it("applies the same grid visibility in the canvas underlay", () => {
    const { container } = render(
      <SVGUnderlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        showGrid={true}
        axes={[{ orient: "bottom", grid: false }, { orient: "left" }]}
      />,
    )

    const gridLines = Array.from(container.querySelectorAll("g.stream-grid line"))
    expect(gridLines.length).toBeGreaterThan(0)
    for (const line of gridLines) expect(line.getAttribute("x1")).toBe("0")
  })

  it("uses top/right-only axes for underlay grid visibility", () => {
    const { container } = render(
      <SVGUnderlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        showGrid={true}
        axes={[{ orient: "top", grid: false }, { orient: "right", grid: false }]}
      />,
    )

    expect(container.querySelectorAll("g.stream-grid line")).toHaveLength(0)
  })

  it("applies per-axis grid and baseline stroke attributes", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        showGrid={true}
        axes={[
          {
            orient: "bottom",
            gridStyle: { stroke: "#0ea5e9", strokeWidth: 2, strokeOpacity: 0.4, strokeDasharray: "3,2" },
            axisStyle: { stroke: "#be123c", strokeWidth: 3, strokeDasharray: "5,1" },
          },
          { orient: "left" },
        ]}
      />,
    )

    const gridLine = container.querySelector("g.stream-grid line[x1]:not([x1='0'])")
    expect(gridLine).toHaveAttribute("stroke", "#0ea5e9")
    expect(gridLine).toHaveAttribute("stroke-width", "2")
    expect(gridLine).toHaveAttribute("stroke-opacity", "0.4")
    expect(gridLine).toHaveAttribute("stroke-dasharray", "3,2")
    const baseline = container.querySelector("[data-orient='bottom'] > line")
    expect(baseline).toHaveAttribute("stroke", "#be123c")
    expect(baseline).toHaveAttribute("stroke-width", "3")
    expect(baseline).toHaveAttribute("stroke-dasharray", "5,1")
  })

  it("places and styles top/right-only axes in both SVG layers", () => {
    const axes = [
      { orient: "top" as const, grid: false, axisStyle: { stroke: "#dc2626", strokeWidth: 2 } },
      { orient: "right" as const, grid: false, axisStyle: { stroke: "#2563eb", strokeWidth: 3 } },
    ]
    const overlay = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        showGrid={true}
        axes={axes}
      />,
    ).container
    const underlay = render(
      <SVGUnderlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        showGrid={true}
        axes={axes}
      />,
    ).container

    const topBaseline = overlay.querySelector("[data-orient='top'] > line")
    expect(topBaseline).toHaveAttribute("y1", "0")
    expect(topBaseline).toHaveAttribute("y2", "0")
    expect(topBaseline).toHaveAttribute("stroke", "#dc2626")
    expect(overlay.querySelector("[data-orient='top'] > g > line")).toHaveAttribute("y2", "-5")
    expect(overlay.querySelector("[data-orient='bottom']")).toBeNull()

    const rightBaseline = overlay.querySelector("[data-orient='right'] > line")
    expect(rightBaseline).toHaveAttribute("x1", "300")
    expect(rightBaseline).toHaveAttribute("x2", "300")
    expect(rightBaseline).toHaveAttribute("stroke", "#2563eb")
    expect(overlay.querySelector("[data-orient='left']")).toBeNull()

    expect(underlay.querySelector('line[stroke="#dc2626"]')).toHaveAttribute("y1", "0")
    expect(underlay.querySelector('line[stroke="#2563eb"]')).toHaveAttribute("x1", "300")
  })
})

// ── tickAnchor ─────────────────────────────────────────────────────────

describe("tickAnchor: edges", () => {
  it("default tickAnchor centers all bottom-axis labels", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        axes={[{ orient: "bottom" }]}
      />,
    )
    const tickTexts = container.querySelectorAll(
      "[data-orient='bottom'] text.semiotic-axis-tick"
    )
    expect(tickTexts.length).toBeGreaterThan(0)
    for (const t of Array.from(tickTexts)) {
      expect(t.getAttribute("text-anchor")).toBe("middle")
    }
  })

  it("'edges' mode pins first label to start and last to end on bottom axis", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        axes={[{ orient: "bottom", tickAnchor: "edges" }]}
      />,
    )
    const tickTexts = Array.from(
      container.querySelectorAll("[data-orient='bottom'] text.semiotic-axis-tick"),
    )
    expect(tickTexts.length).toBeGreaterThanOrEqual(3)
    expect(tickTexts[0].getAttribute("text-anchor")).toBe("start")
    expect(tickTexts[tickTexts.length - 1].getAttribute("text-anchor")).toBe("end")
    for (const t of tickTexts.slice(1, -1)) {
      expect(t.getAttribute("text-anchor")).toBe("middle")
    }
  })

  it("'edges' mode pins topmost label to hanging and bottommost to auto on left axis", () => {
    // y scale stub: range = [200, 0], so the LOWEST value tick (i=0)
    // sits at the BOTTOM of the plot and should get `auto`, while the
    // HIGHEST value tick (i=last) sits at the TOP and should get
    // `hanging`. Pinning the pixel-based logic — index-based logic
    // would point the labels the wrong way.
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        axes={[{ orient: "left", tickAnchor: "edges" }, { orient: "bottom" }]}
      />,
    )
    const tickTexts = Array.from(
      container.querySelectorAll("[data-orient='left'] text.semiotic-axis-tick"),
    )
    expect(tickTexts.length).toBeGreaterThanOrEqual(3)
    // Bottommost (first by ascending value, last by descending pixel)
    expect(tickTexts[0].getAttribute("dominant-baseline")).toBe("auto")
    // Topmost (last by ascending value, first by descending pixel)
    expect(tickTexts[tickTexts.length - 1].getAttribute("dominant-baseline")).toBe("hanging")
    for (const t of tickTexts.slice(1, -1)) {
      expect(t.getAttribute("dominant-baseline")).toBe("middle")
    }
  })

  it("'edges' mode on left axis honors an inverted y scale (regression)", () => {
    // Forward y scale: range = [0, 200] — first tick is now AT THE TOP.
    // Confirms the helper uses pixel position, not array index.
    const identity = (v: number) => v
    const forwardYScale = Object.assign(identity, {
      ticks: () => [0, 25, 50, 75, 100],
      domain: () => [0, 100],
      range: () => [0, 200],
    })
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={{ x: makeStubScales().x, y: forwardYScale } as StreamScales}
        showAxes={true}
        axes={[{ orient: "left", tickAnchor: "edges" }, { orient: "bottom" }]}
      />,
    )
    const tickTexts = Array.from(
      container.querySelectorAll("[data-orient='left'] text.semiotic-axis-tick"),
    )
    // First tick (value=0, pixel=0) is now topmost — should hang.
    expect(tickTexts[0].getAttribute("dominant-baseline")).toBe("hanging")
    expect(tickTexts[tickTexts.length - 1].getAttribute("dominant-baseline")).toBe("auto")
  })

  it("'edges' mode on bottom axis honors a reversed x scale (regression)", () => {
    // Reversed x scale: range = [300, 0] mimics a streaming chart with
    // `arrowOfTime: "left"` — first tick by value is at the RIGHT edge
    // of the plot, so it should anchor `end`, not `start`.
    const reverseX = Object.assign((v: number) => 300 - v * 3, {
      ticks: () => [0, 25, 50, 75, 100],
      domain: () => [0, 100],
      range: () => [300, 0],
    })
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={{ x: reverseX, y: makeStubScales().y } as StreamScales}
        showAxes={true}
        axes={[{ orient: "bottom", tickAnchor: "edges" }]}
      />,
    )
    const tickTexts = Array.from(
      container.querySelectorAll("[data-orient='bottom'] text.semiotic-axis-tick"),
    )
    // tick[0] (value=0, pixel=300) is rightmost → `end`
    // tick[last] (value=100, pixel=0) is leftmost → `start`
    expect(tickTexts[0].getAttribute("text-anchor")).toBe("end")
    expect(tickTexts[tickTexts.length - 1].getAttribute("text-anchor")).toBe("start")
  })

  it("StreamXYFrameProps.axes accepts tickAnchor at the type level (compile-time regression)", () => {
    // Pinning compile-time accessibility: this test would fail typecheck
    // if `tickAnchor` (or `landmarkTicks`, `autoRotate`, etc.) were missing
    // from the public `frameProps.axes` shape. The runtime expectation is
    // already covered by the per-axis tests above.
    const axes: import("./types").StreamXYFrameProps["axes"] = [
      { orient: "bottom", tickAnchor: "edges", landmarkTicks: true, autoRotate: true },
      { orient: "left", tickAnchor: "middle", gridStyle: { stroke: "#64748b", strokeWidth: 1 }, axisStyle: { stroke: "#334155" }, includeMax: true },
    ]
    expect(axes).toHaveLength(2)
  })

  it("tickAnchor is independent per axis", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        axes={[
          { orient: "left", tickAnchor: "middle" }, // explicit middle
          { orient: "bottom", tickAnchor: "edges" }, // edges
        ]}
      />,
    )
    const left = Array.from(container.querySelectorAll("[data-orient='left'] text.semiotic-axis-tick"))
    const bottom = Array.from(container.querySelectorAll("[data-orient='bottom'] text.semiotic-axis-tick"))
    // Left axis: all middle
    for (const t of left) {
      expect(t.getAttribute("dominant-baseline")).toBe("middle")
    }
    // Bottom axis: first start, last end
    expect(bottom[0].getAttribute("text-anchor")).toBe("start")
    expect(bottom[bottom.length - 1].getAttribute("text-anchor")).toBe("end")
  })
})

// ── data-orient attributes ─────────────────────────────────────────────

describe("data-orient axis groups", () => {
  it("emits a per-axis <g> with data-orient='bottom' for the x axis", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        axes={[{ orient: "bottom" }]}
      />,
    )
    const bottom = container.querySelector("g[data-orient='bottom']")
    expect(bottom).toBeTruthy()
    expect(bottom?.classList.contains("semiotic-axis-bottom")).toBe(true)
  })

  it("emits a per-axis <g> with data-orient='left' for the y axis", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        axes={[{ orient: "left" }, { orient: "bottom" }]}
      />,
    )
    const left = container.querySelector("g[data-orient='left']")
    expect(left).toBeTruthy()
    expect(left?.classList.contains("semiotic-axis-left")).toBe(true)
  })

  it("emits data-orient='right' only when a right axis is configured", () => {
    const ticksRight = [0, 50, 100]
    const yScaleRight = Object.assign((v: number) => 200 - v * 2, {
      ticks: () => ticksRight,
      domain: () => [0, 100],
      range: () => [200, 0],
    })
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={{ ...makeStubScales(), yRight: yScaleRight } as StreamScales}
        showAxes={true}
        axes={[{ orient: "bottom" }, { orient: "right" }]}
      />,
    )
    const right = container.querySelector("g[data-orient='right']")
    expect(right).toBeTruthy()
    expect(right?.classList.contains("semiotic-axis-right")).toBe(true)
  })
})

describe("side legends with axis labels", () => {
  const legend = {
    legendGroups: [{
      label: "",
      styleFn: () => ({ fill: "#555" }),
      items: [{ label: "Series" }],
    }],
  }

  it("keeps a right axis title inside the legend gutter", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        totalWidth={550}
        margin={{ ...baseProps.margin, right: 180 }}
        scales={makeStubScales()}
        showAxes={true}
        axes={[
          { orient: "bottom" },
          { orient: "right", label: "Right value" },
        ]}
        legend={legend}
        legendPosition="right"
        legendLayout={{ sideGutter: 70 }}
      />,
    )

    const label = container.querySelector(
      "[data-orient='right'] text.semiotic-axis-label"
    )
    expect(label?.getAttribute("x")).toBe("355")
  })

  it("keeps a left axis title inside the legend gutter", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        totalWidth={550}
        margin={{ ...baseProps.margin, left: 180 }}
        scales={makeStubScales()}
        showAxes={true}
        axes={[
          { orient: "bottom" },
          { orient: "left", label: "Left value" },
        ]}
        legend={legend}
        legendPosition="left"
        legendLayout={{ sideGutter: 70 }}
      />,
    )

    const label = container.querySelector(
      "[data-orient='left'] text.semiotic-axis-label"
    )
    expect(label?.getAttribute("x")).toBe("-55")
  })
})

// ── CSS-var-driven font sizes ──────────────────────────────────────────

describe("font-size CSS variables", () => {
  it("tick text references --semiotic-tick-font-size via inline style", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        axes={[{ orient: "bottom" }]}
      />,
    )
    const tickText = container.querySelector("text.semiotic-axis-tick") as SVGTextElement | null
    expect(tickText).toBeTruthy()
    const style = tickText!.getAttribute("style") || ""
    expect(style).toContain("var(--semiotic-tick-font-size, 12px)")
  })

  it("axis label text references --semiotic-axis-label-font-size", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        axes={[{ orient: "bottom" }]}
        xLabel="Hour"
      />,
    )
    const label = container.querySelector("text.semiotic-axis-label") as SVGTextElement | null
    expect(label).toBeTruthy()
    const style = label!.getAttribute("style") || ""
    expect(style).toContain("var(--semiotic-axis-label-font-size, 12px)")
  })

  it("also emits a plain font-size attribute as a non-CSS-engine fallback", () => {
    // A presentation attribute is strictly lower-priority than the inline
    // `style` attribute in the CSS cascade (SVG2: presentation attributes
    // act as author-level rules with zero specificity, beaten by any style
    // sheet mechanism including inline style) — so it can never override the
    // CSS-var cascade override in a real browser. But a consumer with no CSS
    // engine over the SVG (a `style`-stripping sanitizer, the Figma plugin's
    // SVG importer, static rasterizers like resvg) can't resolve
    // `var(--semiotic-tick-font-size, ...)` and would otherwise silently
    // inherit the host document's font-size. The plain attribute is that
    // consumer's fallback.
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        axes={[{ orient: "bottom" }]}
      />,
    )
    const tickText = container.querySelector("text.semiotic-axis-tick") as SVGTextElement | null
    expect(tickText).toBeTruthy()
    expect(tickText!.getAttribute("font-size")).toBe("12")
  })

  it("landmark ticks use a calc() that adds 1px to the base CSS var", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={{
          ...makeStubScales(),
          x: Object.assign((v: number) => v * 3, {
            ticks: () => [new Date(2024, 0, 1), new Date(2024, 1, 1)],
            domain: () => [new Date(2024, 0, 1), new Date(2024, 1, 1)],
            range: () => [0, 300],
          }),
        } as unknown as StreamScales}
        showAxes={true}
        axes={[{ orient: "bottom", landmarkTicks: true }]}
      />,
    )
    const tickTexts = Array.from(container.querySelectorAll("text.semiotic-axis-tick"))
    const landmark = tickTexts.find(t => (t.getAttribute("style") || "").includes("calc("))
    expect(landmark).toBeTruthy()
    expect(landmark!.getAttribute("style")).toContain("calc(var(--semiotic-tick-font-size, 12px) + 1px)")
  })

  it("moves the x-axis label below rotated tick labels", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        scales={makeStubScales()}
        showAxes={true}
        axes={[
          {
            orient: "bottom",
            autoRotate: true,
            tickFormat: (d: number) => `Long stage ${d}`,
          },
        ]}
        xLabel="Event step"
      />,
    )
    const label = container.querySelector("text.semiotic-axis-label") as SVGTextElement | null
    expect(label).toBeTruthy()
    expect(label!.getAttribute("y")).toBe(String(baseProps.height + 58))
  })

  // Rotation moves the axis title from +40 to +58, so the legend's axis-chrome
  // gutter has to widen with it. When the overlay did not forward
  // `rotatedTicks`, the gutter capped at the un-rotated title band and a bottom
  // legend was placed on top of the rotated chrome.
  it("widens the bottom-legend gutter when bottom ticks rotate", () => {
    const legend = {
      legendGroups: [{
        label: "",
        type: "fill" as const,
        items: [{ label: "Series A" }],
        styleFn: () => ({ fill: "#f00" }),
      }],
    }
    // A deep bottom margin so the placement clamp (which keeps the legend on
    // canvas when the reservation is too small) never masks the gutter.
    const roomy = {
      width: 300,
      height: 200,
      totalWidth: 360,
      totalHeight: 340,
      margin: { top: 10, right: 20, bottom: 120, left: 40 },
    }
    const legendY = (autoRotate: boolean) => {
      const { container } = render(
        <SVGOverlay
          {...roomy}
          scales={makeStubScales()}
          showAxes={true}
          axes={[{
            orient: "bottom",
            autoRotate,
            tickFormat: (d: number) => `Long stage ${d}`,
          }]}
          xLabel="Event step"
          legend={legend}
          legendPosition="bottom"
        />,
      )
      // The legend group is the one translated to the left margin and placed
      // below the plot area.
      const group = Array.from(container.querySelectorAll("g[transform]")).find((g) => {
        const m = /translate\((-?[\d.]+),\s*(-?[\d.]+)\)/.exec(g.getAttribute("transform") ?? "")
        return !!m && Number(m[1]) === roomy.margin.left && Number(m[2]) > roomy.height
      })
      expect(group).toBeTruthy()
      const m = /translate\((-?[\d.]+),\s*(-?[\d.]+)\)/.exec(group!.getAttribute("transform") ?? "")
      return Number(m![2])
    }
    // 64px rotated title band vs the 46px un-rotated one.
    expect(legendY(true) - legendY(false)).toBe(18)
  })
})
