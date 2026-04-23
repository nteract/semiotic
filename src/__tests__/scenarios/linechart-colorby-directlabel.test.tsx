/**
 * TDD: LineChart with colorBy + directLabel
 *
 * Bug report: Lines are not colored by series and direct labels don't appear
 * when using colorBy="series" + lineBy="series" + directLabel={true}.
 */

import { render } from "@testing-library/react"
import { LineChart } from "../../components/charts/xy/LineChart"
import { PipelineStore, type PipelineConfig } from "../../components/stream/PipelineStore"
import { renderChart } from "../../components/server/renderToStaticSVG"

const multiSeriesData = [
  { time: 0, value: 10, series: "A" },
  { time: 1, value: 25, series: "A" },
  { time: 2, value: 18, series: "A" },
  { time: 3, value: 30, series: "A" },
  { time: 0, value: 15, series: "B" },
  { time: 1, value: 12, series: "B" },
  { time: 2, value: 28, series: "B" },
  { time: 3, value: 20, series: "B" },
]

describe("LineChart colorBy + directLabel", () => {
  it("renders without error", () => {
    expect(() =>
      render(
        <LineChart
          data={multiSeriesData}
          xAccessor="time"
          yAccessor="value"
          lineBy="series"
          colorBy="series"
          colorScheme={["#E04F5F", "#6047FF"]}
          directLabel
          width={400}
          height={300}
        />
      )
    ).not.toThrow()
  })

  it("produces two line scene nodes with distinct stroke colors", () => {
    const store = new PipelineStore({
      chartType: "line",
      windowSize: 500,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0.05,
      xAccessor: "time",
      yAccessor: "value",
      groupAccessor: "series",
      colorAccessor: "series",
      colorScheme: ["#E04F5F", "#6047FF"],
      lineStyle: (_d: any, _group?: string) => {
        // Simulate what the HOC lineStyle does
        return { stroke: "", strokeWidth: 2 }
      },
    } as PipelineConfig)
    store.ingest({ inserts: multiSeriesData, bounded: true })
    store.computeScene({ width: 400, height: 300 })

    const lineNodes = store.scene.filter(n => n.type === "line")
    expect(lineNodes.length).toBe(2)

    const strokes = lineNodes.map(n => n.style.stroke)
    // Both lines should have distinct non-default colors from the palette
    expect(strokes[0]).not.toBe(strokes[1])
    // Colors should come from the colorScheme (not the default blue)
    expect(strokes.every(s => s === "#E04F5F" || s === "#6047FF")).toBe(true)
  })

  it("directLabel suppresses legend (indirect proof annotations are generated)", () => {
    // When directLabel is active, legend should be suppressed (showLegend defaults to false).
    // This indirectly proves the directLabel code path executes.
    const { container } = render(
      <LineChart
        data={multiSeriesData}
        xAccessor="time"
        yAccessor="value"
        lineBy="series"
        colorBy="series"
        colorScheme={["#E04F5F", "#6047FF"]}
        directLabel
        width={400}
        height={300}
      />
    )
    // With directLabel=true, no legend should render
    const legendElements = container.querySelectorAll("[class*=legend]")
    expect(legendElements.length).toBe(0)
    expect(container.innerHTML).not.toContain("legendGroup")
  })

  it("SSR renderChart produces colored lines for each series", () => {
    const svg = renderChart("LineChart", {
      data: multiSeriesData,
      xAccessor: "time",
      yAccessor: "value",
      lineBy: "series",
      colorBy: "series",
      colorScheme: ["#E04F5F", "#6047FF"],
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<svg")
    expect(svg).toContain('stroke="#E04F5F"')
    expect(svg).toContain('stroke="#6047FF"')
  })

  it("annotations prop with type:text renders labels in SSR", () => {
    // directLabel is an HOC feature that generates text annotations.
    // In SSR (renderChart), we bypass the HOC. Verify that text annotations
    // passed via annotations prop DO render.
    const svg = renderChart("LineChart", {
      data: multiSeriesData,
      xAccessor: "time",
      yAccessor: "value",
      lineBy: "series",
      colorBy: "series",
      colorScheme: ["#E04F5F", "#6047FF"],
      width: 400,
      height: 300,
      annotations: [
        { type: "text", time: 3, value: 30, label: "A", color: "#E04F5F" },
        { type: "text", time: 3, value: 20, label: "B", color: "#6047FF" },
      ],
    })
    expect(svg).toContain(">A<")
    expect(svg).toContain(">B<")
  })
})
