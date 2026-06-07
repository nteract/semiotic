/**
 * Coverage for axis customization affordances added for wrapper libraries:
 *
 *   1. `tickAnchor: "edges"` flips first/last tick label anchors to start/end
 *      so labels at the plot boundaries can't overflow the chart area.
 *   2. `data-orient` attributes on per-axis `<g>` groups let consumers
 *      target individual axes via CSS without `!important`.
 *   3. Inline `font-size` references `var(--semiotic-tick-font-size, …)` /
 *      `var(--semiotic-axis-label-font-size, …)` instead of hardcoded
 *      numbers, so a parent setting the CSS variable wins via cascade.
 */
import * as React from "react"
import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { SVGOverlay } from "./SVGOverlay"
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
        scales={{ x: makeStubScales().x, y: forwardYScale } as any}
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
        scales={{ x: reverseX, y: makeStubScales().y } as any}
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
      { orient: "left", tickAnchor: "middle", gridStyle: "dashed", includeMax: true },
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
        scales={{ ...makeStubScales(), yRight: yScaleRight } as any}
        showAxes={true}
        axes={[{ orient: "bottom" }, { orient: "right" }]}
      />,
    )
    const right = container.querySelector("g[data-orient='right']")
    expect(right).toBeTruthy()
    expect(right?.classList.contains("semiotic-axis-right")).toBe(true)
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

  it("does not emit a hardcoded font-size presentation attribute on tick text", () => {
    // The whole point of the refactor: presentation-attribute-style or
    // numeric font-size would beat external CSS in the cascade. Tick
    // <text> should rely on inline style → CSS var → cascade override.
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
    expect(tickText!.getAttribute("font-size")).toBeNull()
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
})
