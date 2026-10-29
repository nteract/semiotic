import * as React from "react"
import { act, render } from "@testing-library/react"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { Scatterplot } from "../xy/Scatterplot"
import { LineChart } from "../xy/LineChart"
import { RealtimeSwarmChart } from "../realtime/RealtimeSwarmChart"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { createFrameScheduler } from "../../stream/test-utils/frameScheduler"

/**
 * A legend in a compact dashboard card must stay inside the chart: too many
 * categories wrap into columns (side legends) or stop at a row cap (top and
 * bottom legends) and end in "+N more" instead of running past the chart
 * edge, and long labels truncate instead of squeezing the plot. These render
 * the real HOC and frame so the margin reservation and the overlay placement
 * are exercised together.
 */

function translate(el: Element | null): [number, number] {
  const m = /translate\((-?[\d.]+),\s*(-?[\d.]+)\)/.exec(el?.getAttribute("transform") ?? "")
  return m ? [Number(m[1]), Number(m[2])] : [0, 0]
}

/** Absolute offset of an element, accumulating ancestor `translate()`s. */
function absolute(el: Element): [number, number] {
  let x = 0
  let y = 0
  let node: Element | null = el
  while (node) {
    const [dx, dy] = translate(node)
    x += dx
    y += dy
    node = node.parentElement
  }
  return [x, y]
}

function legendSlots(container: HTMLElement) {
  const root = container.querySelector('[aria-label="Chart legend"]')
  expect(root).toBeTruthy()
  return {
    origin: absolute(root!.parentElement!),
    slots: Array.from(root!.querySelectorAll(".legend-item > g, .semiotic-legend-more")),
  }
}

describe("right legends in compact cards", () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  it("Scatterplot: twelve categories wrap into columns inside a 240px card", () => {
    const brands = [
      "Soylent", "Cyberdyne", "Vandelay", "Tyrell", "Acme", "Wayne",
      "Globex", "Hooli", "Stark", "Umbrella", "Wonka", "Initech",
    ]
    const data = brands.map((brand, i) => ({ revenue: 3500 + i * 180, units: 60 + i * 4, brand }))
    const scheduler = createFrameScheduler()
    const { container } = render(
      <Scatterplot
        data={data}
        xAccessor="revenue"
        yAccessor="units"
        colorBy="brand"
        showLegend
        xLabel="Revenue"
        width={830}
        height={240}
        frameProps={{ frameScheduler: scheduler.scheduler }}
      />
    )
    act(() => scheduler.flush())

    const { slots } = legendSlots(container)
    expect(slots).toHaveLength(12)
    const positions = slots.map(absolute)
    expect(new Set(positions.map(([x]) => x)).size).toBeGreaterThan(1)
    for (const [x, y] of positions) {
      expect(y + 22).toBeLessThanOrEqual(240)
      expect(x).toBeLessThan(830)
    }
  })

  it("RealtimeSwarmChart: 42 categories stay inside the card and leave the plot most of the width", () => {
    const categories = [
      ...Array.from({ length: 40 }, (_, i) => i % 7 === 0
        ? `region-${String(i).padStart(2, "0")}-with-a-rather-long-descriptive-name`
        : `r${String(i).padStart(2, "0")}`),
      null,
      "",
    ]
    const data = categories.map((region, i) => ({ time: i, value: i % 9, region }))
    const { container } = render(
      <TooltipProvider>
        <RealtimeSwarmChart
          data={data}
          timeAccessor="time"
          valueAccessor="value"
          categoryAccessor="region"
          showLegend
          width={830}
          height={250}
        />
      </TooltipProvider>
    )

    const { origin, slots } = legendSlots(container)
    // The legend may claim at most 30% of the width plus its 13px of gutters.
    expect(origin[0]).toBeGreaterThanOrEqual(830 - 249 - 13)
    const more = container.querySelector(".semiotic-legend-more")
    expect(more?.lastChild?.textContent).toMatch(/^\+\d+ more$/)
    const hidden = Number(/\+(\d+)/.exec(more!.lastChild!.textContent!)![1])
    expect(slots.length - 1 + hidden).toBe(42)
    for (const slot of slots) {
      const [x, y] = absolute(slot)
      expect(y + 22).toBeLessThanOrEqual(250)
      expect(x).toBeLessThan(830)
    }
    // Long names are truncated on screen but keep their full accessible name.
    const longItem = container.querySelector(
      '[aria-label="region-00-with-a-rather-long-descriptive-name"]'
    )
    expect(longItem?.querySelector(":scope > text")?.textContent?.endsWith("…")).toBe(true)
  })
})

describe("bottom legends in compact cards", () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  it("LineChart: thirty series cap their rows inside a 260px card and truncate an over-wide name", () => {
    const longName = "A series name that is much wider than the whole plot area of this compact card"
    const series = [longName, ...Array.from({ length: 29 }, (_, i) => `Series ${i}`)]
    const data = series.flatMap((name, s) =>
      [0, 1, 2].map((x) => ({ x, y: s + x, name }))
    )
    const scheduler = createFrameScheduler()
    const { container } = render(
      <LineChart
        data={data}
        xAccessor="x"
        yAccessor="y"
        lineBy="name"
        colorBy="name"
        showLegend
        legendPosition="bottom"
        xLabel="Step"
        width={420}
        height={260}
        frameProps={{ frameScheduler: scheduler.scheduler }}
      />
    )
    act(() => scheduler.flush())

    const { slots } = legendSlots(container)
    const more = container.querySelector(".semiotic-legend-more")
    expect(more?.lastChild?.textContent).toMatch(/^\+\d+ more$/)
    const hidden = Number(/\+(\d+)/.exec(more!.lastChild!.textContent!)![1])
    expect(slots.length - 1 + hidden).toBe(30)
    for (const slot of slots) {
      const [x, y] = absolute(slot)
      expect(y + 22).toBeLessThanOrEqual(260)
      expect(x).toBeLessThan(420)
    }
    const longItem = container.querySelector(`[aria-label="${longName}"]`)
    expect(longItem?.querySelector("title")?.textContent).toBe(longName)
    expect(longItem?.querySelector(":scope > text")?.textContent?.endsWith("…")).toBe(true)
  })
})
