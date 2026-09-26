import * as React from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PieChart, DonutChart, GaugeChart, BoxPlot, ViolinPlot, RidgelinePlot } from "semiotic/ordinal"
import { Scatterplot } from "semiotic/xy"
import { FlowMap } from "semiotic/geo"
import { TooltipProvider } from "../store/TooltipStore"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { AriaLiveTooltip } from "./AriaLiveTooltip"
import { extractAllRows } from "./accessibleDataRows"
import { renderChartWithEvidence } from "../server/renderToStaticSVG"

const slices = [{ category: "A", value: 30 }, { category: "B", value: 70 }]
const distribution = [
  { category: "A", value: 10 }, { category: "A", value: 20 },
  { category: "B", value: 30 }, { category: "B", value: 40 },
]

async function openTable() {
  const trigger = screen.getByRole("button", { name: /View data summary/ })
  const count = Number(trigger.textContent?.match(/\((\d+) elements\)/)?.[1])
  fireEvent.click(trigger)
  const table = await screen.findByRole("table")
  const more = screen.queryByRole("button", { name: /Show \d+ more/ })
  if (more) fireEvent.click(more)
  const rows = within(table).getAllByRole("row").slice(1)
  expect(rows).toHaveLength(count)
  expect(count).toBeGreaterThan(0)
  return { table, rows }
}

describe("public chart accessibility data", () => {
  it.each([PieChart, DonutChart])("announces and tabulates radial categories and original values", async (Chart) => {
    const { container } = render(<TooltipProvider><Chart data={slices} showLegend={false} /></TooltipProvider>)
    const frame = container.querySelector(".stream-ordinal-frame")!
    fireEvent.keyDown(frame, { key: "Home" })
    const live = container.querySelector('[aria-live="polite"]')!
    expect(live.textContent).toMatch(/category: [AB]/)
    expect(live.textContent).toMatch(/value: (30|70)/)
    expect(live.textContent).toContain("percent:")
    fireEvent.keyDown(frame, { key: "Escape" })
    expect(live.textContent).toBe("")
    const { table, rows } = await openTable()
    expect(within(table).getByRole("columnheader", { name: "category" })).toBeTruthy()
    expect(within(table).getByRole("columnheader", { name: "value" })).toBeTruthy()
    expect(rows.map((row) => row.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining("A30"), expect.stringContaining("B70"),
    ]))
  })

  it("tabulates and announces gauge segments", async () => {
    const { container } = render(<TooltipProvider><GaugeChart value={65} /></TooltipProvider>)
    fireEvent.keyDown(container.querySelector(".stream-ordinal-frame")!, { key: "Home" })
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toContain("value: 65")
    const { table, rows } = await openTable()
    expect(within(table).getByRole("columnheader", { name: "value" })).toBeTruthy()
    expect(rows.every((row) => within(row).getAllByRole("cell", { name: "65" }).length > 0)).toBe(true)
  })

  it.each([BoxPlot, ViolinPlot, RidgelinePlot])("tabulates distribution statistics and raw observations", async (Chart) => {
    render(<TooltipProvider><Chart data={distribution} /></TooltipProvider>)
    const { table, rows } = await openTable()
    expect(rows).toHaveLength(6)
    expect(within(table).getByRole("columnheader", { name: "median" })).toBeTruthy()
    expect(within(table).getAllByRole("cell", { name: "10" }).length).toBeGreaterThan(0)
    expect(within(table).getAllByRole("cell", { name: "40" }).length).toBeGreaterThan(0)
  })

  it("retains symbol scatterplot rows", async () => {
    render(<TooltipProvider><Scatterplot data={slices} xAccessor="value" yAccessor="value" symbolBy="category" /></TooltipProvider>)
    const { rows } = await openTable()
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain("A30")
  })

  it("retains both city points and flows in a FlowMap", async () => {
    render(<TooltipProvider><FlowMap
      nodes={[{ id: "London", lon: 0, lat: 51 }, { id: "Paris", lon: 2, lat: 49 }]}
      flows={[{ source: "London", target: "Paris", travelers: 27 }]}
      valueAccessor="travelers"
      areas={[]}
    /></TooltipProvider>)
    const { rows, table } = await openTable()
    expect(rows).toHaveLength(3)
    expect(table.textContent).toContain("London")
    expect(table.textContent).toContain("Paris")
    expect(table.textContent).toContain("27")
  })

  it.each(["pie", "donut"] as const)("preserves aggregated %s semantics through custom accessors and pushes", (chartType) => {
    const store = new OrdinalPipelineStore({
      chartType, projection: "radial", windowSize: 100, windowMode: "sliding", extentPadding: 0,
      oAccessor: (d) => d.name, rAccessor: (d) => d.amount * 2,
    })
    const first = { name: "A", amount: 5 }
    store.ingest({ inserts: [first, { name: "B", amount: 5 }], bounded: false })
    store.computeScene({ width: 300, height: 300 })
    expect(extractAllRows(store.scene).map(({ values }) => values)).toEqual([
      expect.objectContaining({ category: "A", value: 10, percent: 50, count: 1 }),
      expect.objectContaining({ category: "B", value: 10, percent: 50, count: 1 }),
    ])
    store.ingest({ inserts: [{ name: "A", amount: 10 }], bounded: false })
    store.computeScene({ width: 300, height: 300 })
    expect(extractAllRows(store.scene)[0].values).toEqual({ category: "A", value: 30, percent: 75, count: 2 })
    const { container } = render(<AriaLiveTooltip hoverPoint={{ data: first }} scene={store.scene} />)
    expect(container.textContent).toBe("Data point: category: A, value: 30, percent: 75, count: 2")
    expect(store.getData()[0]).toBe(first)
  })

  it.each(["PieChart", "DonutChart"])("preserves server %s data geometry alongside accessible scene metadata", (component) => {
    const result = renderChartWithEvidence(component, {
      data: slices, title: "Category values", showLegend: false,
    })
    expect(result.evidence.status).toBe("ok")
    expect(result.evidence.markCountByType.wedge).toBe(2)
    expect(result.evidence.categories).toEqual(expect.arrayContaining(["A", "B"]))
    const svg = new DOMParser().parseFromString(result.svg, "image/svg+xml")
    const titleId = svg.documentElement.getAttribute("aria-labelledby")!
    expect(svg.getElementById(titleId)?.textContent).toBe("Category values")
    expect(result.svg).not.toContain("NaN")
  })
})
