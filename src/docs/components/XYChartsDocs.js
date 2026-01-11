import * as React from "react"
import { useState } from "react"
import DocumentComponent from "../layout/DocumentComponent"
import { Scatterplot, LineChart, AreaChart, Heatmap, BubbleChart } from "../../components"
import { TooltipProvider } from "../../components/store/TooltipStore"

const components = []

components.push({
  name: "XY Charts"
})

const XYChartsDocs = () => {
  const [lineChartType, setLineChartType] = useState("monotoneX")
  const [areaMode, setAreaMode] = useState("stacked")

  const scatterData = [
    { x: 1, y: 5, category: "A", size: 10 },
    { x: 2, y: 8, category: "B", size: 15 },
    { x: 3, y: 3, category: "A", size: 8 },
    { x: 4, y: 12, category: "B", size: 20 },
    { x: 5, y: 7, category: "A", size: 12 },
    { x: 6, y: 15, category: "B", size: 18 },
    { x: 7, y: 9, category: "A", size: 14 },
    { x: 8, y: 11, category: "B", size: 16 }
  ]

  const lineData = [
    { x: 1, y: 5, series: "Product A" },
    { x: 2, y: 8, series: "Product A" },
    { x: 3, y: 6, series: "Product A" },
    { x: 4, y: 12, series: "Product A" },
    { x: 5, y: 10, series: "Product A" },
    { x: 1, y: 3, series: "Product B" },
    { x: 2, y: 6, series: "Product B" },
    { x: 3, y: 9, series: "Product B" },
    { x: 4, y: 7, series: "Product B" },
    { x: 5, y: 11, series: "Product B" },
    { x: 1, y: 2, series: "Product C" },
    { x: 2, y: 4, series: "Product C" },
    { x: 3, y: 5, series: "Product C" },
    { x: 4, y: 6, series: "Product C" },
    { x: 5, y: 8, series: "Product C" }
  ]

  const heatmapData = []
  for (let x = 0; x < 10; x++) {
    for (let y = 0; y < 10; y++) {
      heatmapData.push({
        x,
        y,
        value: Math.sin(x / 2) * Math.cos(y / 2) * 10 + 10
      })
    }
  }

  const examples = []

  // Scatterplot
  examples.push({
    name: "Scatterplot - Basic",
    demo: (
      <TooltipProvider>
        <Scatterplot
          data={scatterData}
          width={500}
          height={350}
          xLabel="Time (hours)"
          yLabel="Performance Score"
          colorBy="category"
          showGrid={true}
        />
      </TooltipProvider>
    ),
    source: `<Scatterplot
  data={data}
  width={500}
  height={350}
  xLabel="Time (hours)"
  yLabel="Performance Score"
  colorBy="category"
  showGrid={true}
/>`
  })

  examples.push({
    name: "Scatterplot - With Size Encoding",
    demo: (
      <TooltipProvider>
        <Scatterplot
          data={scatterData}
          width={500}
          height={350}
          xLabel="Time (hours)"
          yLabel="Performance Score"
          colorBy="category"
          sizeBy="size"
          sizeRange={[3, 15]}
          pointOpacity={0.7}
        />
      </TooltipProvider>
    ),
    source: `<Scatterplot
  data={data}
  width={500}
  height={350}
  xLabel="Time (hours)"
  yLabel="Performance Score"
  colorBy="category"
  sizeBy="size"
  sizeRange={[3, 15]}
  pointOpacity={0.7}
/>`
  })

  // LineChart
  const curveOptions = ["linear", "monotoneX", "step", "basis", "cardinal"].map(
    (d) => (
      <option key={d} value={d}>
        {d}
      </option>
    )
  )

  const buttons = [
    <form key="curve-select">
      <label htmlFor="curve-select">Curve Type: </label>
      <select
        value={lineChartType}
        onChange={(e) => setLineChartType(e.target.value)}
      >
        {curveOptions}
      </select>
    </form>
  ]

  examples.push({
    name: "LineChart - Multiple Series",
    demo: (
      <TooltipProvider>
        <LineChart
          data={lineData}
          width={500}
          height={350}
          lineBy="series"
          colorBy="series"
          curve={lineChartType}
          xLabel="Quarter"
          yLabel="Revenue ($M)"
          showPoints={true}
        />
      </TooltipProvider>
    ),
    source: `<LineChart
  data={data}
  width={500}
  height={350}
  lineBy="series"
  colorBy="series"
  curve="${lineChartType}"
  xLabel="Quarter"
  yLabel="Revenue ($M)"
  showPoints={true}
/>`
  })

  // AreaChart
  const areaModeOptions = ["stacked", "overlapping", "normalized"].map((d) => (
    <option key={d} value={d}>
      {d}
    </option>
  ))

  const areaButtons = [
    <form key="area-mode-select">
      <label htmlFor="area-mode-select">Area Mode: </label>
      <select value={areaMode} onChange={(e) => setAreaMode(e.target.value)}>
        {areaModeOptions}
      </select>
    </form>
  ]

  examples.push({
    name: "AreaChart",
    demo: (
      <TooltipProvider>
        <AreaChart
          data={lineData}
          width={500}
          height={350}
          areaBy="series"
          colorBy="series"
          stacked={areaMode !== "overlapping"}
          normalize={areaMode === "normalized"}
          xLabel="Quarter"
          yLabel={areaMode === "normalized" ? "Percentage" : "Revenue ($M)"}
          showLine={true}
        />
      </TooltipProvider>
    ),
    source: `<AreaChart
  data={data}
  width={500}
  height={350}
  areaBy="series"
  colorBy="series"
  stacked={${areaMode !== "overlapping"}}
  normalize={${areaMode === "normalized"}}
  xLabel="Quarter"
  yLabel="${areaMode === "normalized" ? "Percentage" : "Revenue ($M)"}"
  showLine={true}
/>`
  })

  // Heatmap
  examples.push({
    name: "Heatmap",
    demo: (
      <TooltipProvider>
        <Heatmap
          data={heatmapData}
          width={500}
          height={400}
          xAccessor="x"
          yAccessor="y"
          valueAccessor="value"
          colorScheme="viridis"
          showValues={false}
          xLabel="X Coordinate"
          yLabel="Y Coordinate"
        />
      </TooltipProvider>
    ),
    source: `<Heatmap
  data={data}
  width={500}
  height={400}
  xAccessor="x"
  yAccessor="y"
  valueAccessor="value"
  colorScheme="viridis"
  showValues={false}
  xLabel="X Coordinate"
  yLabel="Y Coordinate"
/>`
  })

  // BubbleChart
  const bubbleData = [
    { x: 1, y: 5, size: 100, category: "Tech", name: "Company A" },
    { x: 2, y: 8, size: 200, category: "Finance", name: "Company B" },
    { x: 3, y: 3, size: 150, category: "Tech", name: "Company C" },
    { x: 4, y: 12, size: 250, category: "Healthcare", name: "Company D" },
    { x: 5, y: 7, size: 120, category: "Tech", name: "Company E" },
    { x: 6, y: 15, size: 180, category: "Finance", name: "Company F" },
    { x: 7, y: 9, size: 140, category: "Healthcare", name: "Company G" }
  ]

  examples.push({
    name: "BubbleChart",
    demo: (
      <TooltipProvider>
        <BubbleChart
          data={bubbleData}
          width={500}
          height={350}
          sizeBy="size"
          colorBy="category"
          xLabel="Risk"
          yLabel="Return (%)"
          pointOpacity={0.6}
          showLegend={true}
        />
      </TooltipProvider>
    ),
    source: `<BubbleChart
  data={data}
  width={500}
  height={350}
  sizeBy="size"
  colorBy="category"
  xLabel="Risk"
  yLabel="Return (%)"
  pointOpacity={0.6}
  showLegend={true}
/>`
  })

  return (
    <DocumentComponent
      name="XY Charts"
      components={components}
      examples={examples}
      buttons={[...buttons, ...areaButtons]}
    >
      <p>
        XY chart components provide simplified APIs for creating common
        coordinate-based visualizations. All XY charts are built on top of
        XYFrame and inherit its powerful features.
      </p>

      <h2>Scatterplot</h2>
      <p>
        Display relationships between two continuous variables. Supports color
        and size encoding for additional dimensions.
      </p>
      <p>
        <strong>Key props:</strong> <code>colorBy</code>, <code>sizeBy</code>,{" "}
        <code>sizeRange</code>, <code>pointOpacity</code>
      </p>

      <h2>LineChart</h2>
      <p>
        Visualize trends over time or continuous data. Automatically groups
        lines using the <code>lineBy</code> prop.
      </p>
      <p>
        <strong>Key props:</strong> <code>lineBy</code>, <code>curve</code>,{" "}
        <code>showPoints</code>, <code>fillArea</code>
      </p>
      <p>
        <strong>Curve types:</strong> linear, monotoneX, monotoneY, step,
        stepAfter, stepBefore, basis, cardinal, catmullRom
      </p>

      <h2>AreaChart</h2>
      <p>
        Show part-to-whole relationships or magnitude over time. Supports
        stacked, overlapping, and normalized (100%) modes.
      </p>
      <p>
        <strong>Key props:</strong> <code>areaBy</code>, <code>stacked</code>,{" "}
        <code>normalize</code>, <code>showLine</code>
      </p>

      <h2>Heatmap</h2>
      <p>
        Display data density or values across two dimensions using color
        encoding.
      </p>
      <p>
        <strong>Key props:</strong> <code>colorScheme</code>,{" "}
        <code>showValues</code>, <code>cellPadding</code>
      </p>
      <p>
        <strong>Color schemes:</strong> blues, reds, greens, oranges, purples,
        viridis, plasma
      </p>

      <h2>BubbleChart</h2>
      <p>
        Scatterplot with size encoding to represent a third dimension. Perfect
        for showing relationships between three continuous variables.
      </p>
      <p>
        <strong>Key props:</strong> <code>sizeBy</code> (required),{" "}
        <code>colorBy</code>, <code>sizeRange</code>, <code>showLegend</code>
      </p>

      <h3>Advanced Usage</h3>
      <p>
        All XY chart components accept a <code>frameProps</code> prop that
        passes any XYFrame prop for advanced customization:
      </p>
      <pre>
        {`<LineChart
  data={data}
  lineBy="series"
  frameProps={{
    lineDataAccessor: "coordinates",
    customPointMark: ({ d }) => <circle r={3} fill="red" />,
    baseMarkProps: { forceUpdate: true }
  }}
/>`}
      </pre>
    </DocumentComponent>
  )
}

XYChartsDocs.title = "XY Charts"

export default XYChartsDocs
