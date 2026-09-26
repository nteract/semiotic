import * as React from "react"
import { act } from "react"
import { fireEvent, within } from "@testing-library/react"
import { hydrateRoot, type Root } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { Scatterplot } from "../charts/xy/Scatterplot"
import { BarChart } from "../charts/ordinal/BarChart"
import { ProportionalSymbolMap } from "../charts/geo/ProportionalSymbolMap"
import { NetworkCustomChart } from "../charts/custom/NetworkCustomChart"
import type { AccessibleTableProp } from "./accessibleTableTypes"
import StreamPhysicsFrame from "./physics/StreamPhysicsFrame"

const rows = [
  { id: "Ada", x: 1, y: 2, value: 3 },
  { id: "Bert", x: 4, y: 5, value: 6 }
]
const charts = [
  {
    name: "Physics",
    count: "2 semantic items",
    render: (accessibleTable: AccessibleTableProp) => (
      <StreamPhysicsFrame
        size={[240, 160]}
        config={{ kernel: { gravity: { x: 0, y: 0 } } }}
        semanticItems={rows.map((row) => ({ ...row, label: row.id }))}
        accessibleTable={accessibleTable}
      />
    )
  },
  {
    name: "XY",
    count: "2 elements",
    render: (accessibleTable: AccessibleTableProp) => (
      <Scatterplot
        data={rows}
        xAccessor="x"
        yAccessor="y"
        accessibleTable={accessibleTable}
      />
    )
  },
  {
    name: "Ordinal",
    count: "2 elements",
    render: (accessibleTable: AccessibleTableProp) => (
      <BarChart
        data={rows}
        categoryAccessor="id"
        valueAccessor="value"
        accessibleTable={accessibleTable}
      />
    )
  },
  {
    name: "Geo",
    count: "2 elements",
    render: (accessibleTable: AccessibleTableProp) => (
      <ProportionalSymbolMap
        points={rows}
        xAccessor="x"
        yAccessor="y"
        sizeBy="value"
        accessibleTable={accessibleTable}
      />
    )
  },
  {
    name: "Network",
    count: "2 nodes, 0 edges",
    render: (accessibleTable: AccessibleTableProp) => (
      <NetworkCustomChart
        nodes={rows}
        edges={[]}
        accessibleTable={accessibleTable}
        layout={({ nodes }) => ({
          sceneNodes: nodes.map((datum, i) => ({
            type: "circle",
            cx: 40 + i * 40,
            cy: 40,
            r: 10,
            style: { fill: "blue" },
            datum
          }))
        })}
      />
    )
  }
]

let container: HTMLDivElement
let destination: HTMLDivElement
let root: Root | undefined
let restoreCanvas: () => void

beforeEach(() => {
  container = document.createElement("div")
  destination = document.createElement("div")
  destination.id = "external-data-summary"
  document.body.append(container, destination)
  restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
})

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  container.remove()
  destination.remove()
  restoreCanvas()
  vi.restoreAllMocks()
})

for (const chart of charts) {
  it(`${chart.name}: preserves the inline SSR target and usable summary through hydration`, async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const element = chart.render(true)
    container.innerHTML = renderToString(element)
    const query = within(container)
    const triggerName = `View data summary (${chart.count})`
    const ssrRegion = query.getByRole("region")
    expect(
      query.getByRole("button", { name: triggerName }).closest('[role="img"]')
    ).toBeNull()
    expect(
      query.getByRole("link", { name: "Skip to data table" })
    ).toHaveAttribute("href", `#${ssrRegion.id}`)
    const tableId = ssrRegion.id
    act(() => {
      root = hydrateRoot(container, element)
    })
    // Synchronous assertion: the shell must not depend on the expanded chunk.
    expect(query.getByRole("region")).toHaveAttribute("id", tableId)
    fireEvent.click(query.getByRole("button", { name: triggerName }))
    expect(
      await query.findByRole("row", { name: /\bAda\b/ })
    ).toHaveTextContent("Ada")
    expect(query.getByRole("row", { name: /\bBert\b/ })).toHaveTextContent(
      "Bert"
    )
    fireEvent.click(query.getByRole("button", { name: "Close data summary" }))
    expect(query.getByRole("button", { name: triggerName })).toHaveFocus()
    expect(error.mock.calls).toEqual([])
  })

  it(`${chart.name}: defers an external portal until hydration without losing its summary`, async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const element = chart.render({ portalTarget: destination.id })
    container.innerHTML = renderToString(element)
    expect(container.textContent).not.toContain("View data summary")
    expect(destination.textContent).toBe("")
    act(() => {
      root = hydrateRoot(container, element)
    })
    const query = within(destination)
    fireEvent.click(
      await query.findByRole("button", {
        name: `View data summary (${chart.count})`
      })
    )
    expect(
      await query.findByRole("row", { name: /\bAda\b/ })
    ).toHaveTextContent("Ada")
    expect(query.getByRole("row", { name: /\bBert\b/ })).toHaveTextContent(
      "Bert"
    )
    expect(container.textContent).not.toContain("Close data summary")
    expect(error.mock.calls).toEqual([])
  })

  it(`${chart.name}: keeps accessibleTable=false disabled on both paths`, () => {
    const element = chart.render(false)
    container.innerHTML = renderToString(element)
    expect(container.textContent).not.toContain("View data summary")
    act(() => {
      root = hydrateRoot(container, element)
    })
    expect(container.textContent).not.toContain("View data summary")
    expect(
      within(container).queryByRole("link", { name: "Skip to data table" })
    ).toBeNull()
  })
}
