import { fireEvent, render, screen, within } from "@testing-library/react"
import {
  AccessibleDataTable,
  extractAllRows
} from "./AccessibleDataTable"
import NetworkAccessibleDataTable from "./NetworkAccessibleDataTable"
import type { AccessibleSceneNode } from "./accessibleDataRows"

it.each(["line", "area", "boxplot", "violin"])(
  "keeps collapsed live %s scenes cheap and current, then materializes full statistics on demand",
  async (type) => {
    let fieldReads = 0
    const data = Array.from({ length: 10_000 }, (_, index) => ({
      index,
      get value() {
        fieldReads++
        return index
      }
    }))
    let observationReads = 0
    const observations = new Proxy(data, {
      get(target, key, receiver) {
        if (typeof key === "string" && /^\d+$/.test(key)) observationReads++
        return Reflect.get(target, key, receiver)
      }
    })
    const scene = [{ type, datum: observations }]
    const count = type === "boxplot" || type === "violin" ? 10_002 : 10_001
    const { rerender } = render(
      <AccessibleDataTable scene={scene} chartType="line" />
    )
    for (let index = 0; index < 3; index++) {
      rerender(
        <AccessibleDataTable
          scene={scene}
          chartType="line"
          chartTitle={`Hover ${index}`}
        />
      )
    }
    data.push({ index: 10_000, value: 10_000 })
    rerender(<AccessibleDataTable scene={scene} chartType="line" />)
    expect(fieldReads).toBe(0)
    expect(observationReads).toBe(0)
    const trigger = screen.getByRole("button", {
      name: `View data summary (${count} elements)`
    })
    fireEvent.click(trigger)
    await screen.findByRole("note")
    expect(fieldReads).toBeGreaterThanOrEqual(10_000)
    expect(screen.getByRole("note")).toHaveTextContent(`${count} data points.`)
    expect(screen.getByRole("note")).toHaveTextContent(
      "value: 0 to 10000, mean 5000."
    )
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      6
    )
    expect(
      screen.getByText(`First 5 of ${count} data points`)
    ).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole("button", {
        name: `Show 25 more rows (${count - 5} remaining)`
      })
    )
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      31
    )
    fireEvent.click(screen.getByRole("button", { name: "Close data summary" }))
    fieldReads = 0
    observationReads = 0
    rerender(<AccessibleDataTable scene={scene} chartType="line" />)
    expect(fieldReads).toBe(0)
    expect(observationReads).toBe(0)
    fireEvent.click(
      screen.getByRole("button", {
        name: `View data summary (${count} elements)`
      })
    )
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      6
    )
  }
)

const rowCases: Array<{
  name: string
  scene: AccessibleSceneNode[]
  count: number
}> = [
  ...[
    "point",
    "symbol",
    "glyph",
    "rect",
    "heatcell",
    "wedge",
    "circle",
    "arc",
    "candlestick",
    "connector",
    "trapezoid",
    "bezier",
    "ribbon",
    "curved",
    "geoarea"
  ].map((type) => ({
    name: type,
    scene: [{ type, datum: { value: 42 } }],
    count: 1
  })),
  {
    name: "line observations",
    scene: [{ type: "line", datum: [{ value: 1 }, { value: 2 }] }],
    count: 2
  },
  {
    name: "area projection",
    scene: [
      {
        type: "area",
        datum: [{ value: 99 }],
        accessibility: { tableFields: [{ value: 1 }, { value: 2 }] }
      }
    ],
    count: 2
  },
  {
    name: "geo line",
    scene: [{ type: "line", datum: { value: 42 } }],
    count: 1
  },
  {
    name: "boxplot summary and observations",
    scene: [
      {
        type: "boxplot",
        datum: [{ value: 1 }, { value: 2 }],
        stats: { median: 1.5 }
      }
    ],
    count: 3
  },
  {
    name: "violin projection",
    scene: [
      { type: "violin", datum: [{ value: 99 }], accessibleDatum: { value: 42 } }
    ],
    count: 1
  },
  {
    name: "empty distribution summary",
    scene: [{ type: "violin", datum: [] }],
    count: 1
  },
  {
    name: "decorations and unsupported nodes",
    scene: [
      { type: "point", datum: null },
      { type: "unknown", datum: { value: 42 } },
      { type: "line", datum: "invalid" }
    ],
    count: 0
  }
]

it.each(rowCases)(
  "keeps the collapsed $name count aligned with expanded and exported rows",
  async ({ scene, count }) => {
    render(<AccessibleDataTable scene={scene} chartType="test" />)
    fireEvent.click(
      screen.getByRole("button", {
        name: `View data summary (${count} elements)`
      })
    )
    expect(await screen.findByRole("note")).toHaveTextContent(`${count} data points.`)
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      count + 1
    )
    expect(extractAllRows(scene)).toHaveLength(count)
  }
)

it("counts series observations once when markers share their raw datum, retaining independent points", async () => {
  const first = { value: 1 }
  const second = { value: 2 }
  const outlier = { value: 20 }
  const scene = [
    { type: "line", datum: [first, second] },
    { type: "point", datum: first },
    { type: "symbol", datum: second },
    { type: "boxplot", datum: [outlier] },
    { type: "glyph", datum: outlier },
    { type: "point", datum: { value: 1 } }
  ]
  render(<AccessibleDataTable scene={scene} chartType="mixed" />)
  fireEvent.click(
    screen.getByRole("button", { name: "View data summary (5 elements)" })
  )
  expect(await screen.findByRole("note")).toHaveTextContent("5 data points.")
  expect(extractAllRows(scene).map((row) => row.values.value)).toEqual([
    1,
    2,
    undefined,
    20,
    1
  ])
})

it("counts all chord contributors without materializing their fields until expanded", async () => {
  let fieldReads = 0
  const contributors = Array.from({ length: 7 }, (_, index) => ({
    source: "A",
    target: "B",
    value: index + 1,
    data: {
      get amount() {
        fieldReads++
        return index + 1
      }
    }
  }))
  const nodes = [
    { datum: { id: "A" } },
    { datum: { id: "B" } },
    { datum: null }
  ]
  const edges = [{ type: "ribbon", datum: { __chordEdges: contributors } }]
  const { rerender } = render(
    <NetworkAccessibleDataTable nodes={nodes} edges={edges} chartType="chord" />
  )
  rerender(
    <NetworkAccessibleDataTable
      nodes={nodes}
      edges={edges}
      chartType="chord"
      chartTitle="Hovered chord"
    />
  )
  expect(fieldReads).toBe(0)
  fireEvent.click(
    screen.getByRole("button", { name: "View data summary (2 nodes, 7 edges)" })
  )
  expect(await screen.findByRole("note")).toHaveTextContent("2 nodes, 7 edges.")
  const table = screen.getByRole("table", { name: "Edge data for chord" })
  expect(within(table).getAllByRole("row")).toHaveLength(6)
  expect(fieldReads).toBeGreaterThanOrEqual(7)
  fireEvent.click(
    screen.getByRole("button", { name: "Show 2 more edges (2 remaining)" })
  )
  expect(within(table).getAllByRole("row")).toHaveLength(8)
  expect(within(table).getByRole("cell", { name: "7" })).toBeInTheDocument()
})
