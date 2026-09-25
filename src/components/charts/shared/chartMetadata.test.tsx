import React from "react"
import { fireEvent, render, within } from "@testing-library/react"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { AreaChart } from "../xy/AreaChart"
import { BubbleChart } from "../xy/BubbleChart"
import { ConnectedScatterplot } from "../xy/ConnectedScatterplot"
import { DifferenceChart } from "../xy/DifferenceChart"
import { Heatmap } from "../xy/Heatmap"
import { LineChart } from "../xy/LineChart"
import { MultiAxisLineChart } from "../xy/MultiAxisLineChart"
import { QuadrantChart } from "../xy/QuadrantChart"
import { Scatterplot } from "../xy/Scatterplot"
import { StackedAreaChart } from "../xy/StackedAreaChart"
import { WaterfallChart } from "../xy/WaterfallChart"
import { BarChart } from "../ordinal/BarChart"
import { RadarChart } from "../ordinal/RadarChart"
import type { BaseChartProps } from "./types"

const data = [
  {
    x: 1,
    y: 10,
    a: 3,
    b: 2,
    value: 10,
    size: 5,
    category: "A",
    attribute: "A",
    series: "First"
  },
  {
    x: 2,
    y: 20,
    a: 2,
    b: 4,
    value: 20,
    size: 10,
    category: "B",
    attribute: "B",
    series: "First"
  },
  {
    x: 3,
    y: 15,
    a: 5,
    b: 1,
    value: 15,
    size: 7,
    category: "C",
    attribute: "C",
    series: "First"
  }
]
const cases: Array<[string, React.ReactElement<BaseChartProps>]> = [
  ["AreaChart", <AreaChart key="AreaChart" data={data} />],
  ["BubbleChart", <BubbleChart key="BubbleChart" data={data} sizeBy="size" />],
  [
    "ConnectedScatterplot",
    <ConnectedScatterplot key="ConnectedScatterplot" data={data} />
  ],
  ["DifferenceChart", <DifferenceChart key="DifferenceChart" data={data} />],
  ["Heatmap", <Heatmap key="Heatmap" data={data} />],
  ["LineChart", <LineChart key="LineChart" data={data} />],
  [
    "MultiAxisLineChart",
    <MultiAxisLineChart
      key="MultiAxisLineChart"
      data={data}
      series={[{ yAccessor: "a" }, { yAccessor: "b" }]}
    />
  ],
  ["QuadrantChart", <QuadrantChart key="QuadrantChart" data={data} />],
  ["Scatterplot", <Scatterplot key="Scatterplot" data={data} />],
  [
    "StackedAreaChart",
    <StackedAreaChart key="StackedAreaChart" data={data} areaBy="series" />
  ],
  ["WaterfallChart", <WaterfallChart key="WaterfallChart" data={data} />],
  ["BarChart", <BarChart key="BarChart" data={data} />],
  ["RadarChart", <RadarChart key="RadarChart" data={data} />]
]

describe("chart wrapper accessibility metadata", () => {
  let restoreCanvas: () => void
  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: false })
  })
  afterEach(() => restoreCanvas())

  it.each(cases)(
    "%s exposes author text and honors the data-table destination",
    async (_name, chart) => {
      const metadata = {
        width: 600,
        height: 400,
        description: "Authored description of the measurements",
        summary: "Authored conclusion about these measurements"
      }
      const portal = document.createElement("div")
      document.body.appendChild(portal)
      const { container, rerender, getByText, unmount } = render(
        React.cloneElement(chart, { ...metadata, accessibleTable: false })
      )
      try {
        expect(
          container.querySelector(".stream-xy-frame, .stream-ordinal-frame")
        ).toHaveAttribute("aria-label", metadata.description)
        expect(getByText(metadata.summary)).toBeInTheDocument()
        expect(
          within(container).queryByRole("button", { name: /View data summary/ })
        ).toBeNull()

        rerender(
          React.cloneElement(chart, {
            ...metadata,
            accessibleTable: { portalTarget: portal }
          })
        )
        const open = await within(portal).findByRole("button", {
          name: /View data summary/
        })
        fireEvent.click(open)
        expect(await within(portal).findByRole("table")).toBeInTheDocument()
        expect(within(portal).getAllByRole("row").length).toBeGreaterThan(1)
        expect(within(container).queryByRole("table")).toBeNull()
      } finally {
        unmount()
        portal.remove()
      }
    }
  )
})
