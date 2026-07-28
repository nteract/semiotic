import * as React from "react"
import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { BarChart } from "../ordinal/BarChart"
import { LineChart } from "../xy/LineChart"

/**
 * A bottom legend must be placed outside the bottom axis chrome — the tick
 * labels and, when present, the axis title.
 *
 * The gutter is resolved in two places that have to agree: the SVG overlay
 * measures the real chrome when *placing* the legend, while
 * `useChartLegendAndMargin` sizes the margin band that has to hold it. Most
 * chart HOCs never describe their axis to the hook, so when the reservation
 * was smaller than the placement the renderer's on-canvas clamp pulled the
 * legend back *up* onto the axis labels — reintroducing the exact overlap the
 * gutter exists to prevent. These render the real frame (no mocked
 * StreamOrdinalFrame/StreamXYFrame) so the two paths are exercised together.
 */

/** Absolute y of an element, accumulating ancestor `translate()`s. */
function absoluteY(el: Element): number {
  let y = Number(el.getAttribute("y") ?? 0)
  let parent: Element | null = el.parentElement
  while (parent) {
    const m = /translate\((-?[\d.]+),\s*(-?[\d.]+)\)/.exec(parent.getAttribute("transform") ?? "")
    if (m) y += Number(m[2])
    parent = parent.parentElement
  }
  return y
}

function partition(container: HTMLElement, prefix: string) {
  const texts = Array.from(container.querySelectorAll("text"))
  return {
    texts,
    ticks: texts.filter(
      (t) => t.classList.contains("semiotic-axis-tick") && t.textContent?.startsWith(prefix),
    ),
    legend: texts.filter(
      (t) => !t.classList.contains("semiotic-axis-tick") && t.textContent?.startsWith(prefix),
    ),
  }
}

describe("bottom legend clears the bottom axis chrome", () => {
  // Long labels force the legend onto several rows, which is the case the
  // 80px bottom-legend margin floor does not absorb on its own.
  const wrappedRows = Array.from({ length: 6 }, (_, i) => ({
    c: `Category number ${i}`,
    v: i + 1,
  }))

  it("ordinal: wrapped legend sits below the tick labels and the axis title", () => {
    const { container } = render(
      <BarChart
        data={wrappedRows}
        categoryAccessor="c"
        valueAccessor="v"
        colorBy="c"
        showLegend
        legendPosition="bottom"
        categoryLabel="Region name"
        width={300}
        height={260}
      />,
    )
    const { texts, ticks, legend } = partition(container, "Category number")
    const axisTitle = texts.find((t) => t.textContent === "Region name")
    expect(axisTitle).toBeTruthy()
    expect(ticks.length).toBeGreaterThan(0)
    expect(legend.length).toBeGreaterThan(1)

    const lowestChrome = Math.max(absoluteY(axisTitle!), ...ticks.map(absoluteY))
    expect(Math.min(...legend.map(absoluteY))) .toBeGreaterThan(lowestChrome)
  })

  it("xy: wrapped legend sits below the tick labels and the axis title", () => {
    const series = wrappedRows.flatMap((row, i) => [
      { x: 0, y: i + 1, s: row.c },
      { x: 1, y: i + 2, s: row.c },
    ])
    const { container } = render(
      <LineChart
        data={series}
        xAccessor="x"
        yAccessor="y"
        lineBy="s"
        colorBy="s"
        showLegend
        legendPosition="bottom"
        xLabel="Week number"
        width={300}
        height={260}
      />,
    )
    const { texts, legend } = partition(container, "Category number")
    const axisTitle = texts.find((t) => t.textContent === "Week number")
    expect(axisTitle).toBeTruthy()
    expect(legend.length).toBeGreaterThan(1)
    expect(Math.min(...legend.map(absoluteY))).toBeGreaterThan(absoluteY(axisTitle!))
  })

  it("a single-row legend keeps its pre-gutter placement", () => {
    // The 80px floor already covered chrome + gap + one legend row, so the
    // conservative reservation must not shift the common case.
    const { container } = render(
      <BarChart
        data={[{ c: "A", v: 1 }, { c: "B", v: 2 }]}
        categoryAccessor="c"
        valueAccessor="v"
        colorBy="c"
        showLegend
        legendPosition="bottom"
        width={400}
        height={260}
      />,
    )
    const matches = Array.from(container.querySelectorAll("text")).filter((t) => t.textContent === "A")
    expect(matches.map(absoluteY)).toEqual([198, 220])
  })
})
