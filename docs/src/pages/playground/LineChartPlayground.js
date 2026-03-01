import React from "react"
import { LineChart } from "semiotic"
import PlaygroundLayout from "../../components/PlaygroundLayout"

// ---------------------------------------------------------------------------
// Control schema
// ---------------------------------------------------------------------------

const controls = [
  { name: "curve", type: "select", label: "Curve", group: "Line",
    default: "linear", options: ["linear", "monotoneX", "step", "basis", "cardinal", "catmullRom"] },
  { name: "lineWidth", type: "number", label: "Line Width", group: "Line",
    default: 2, min: 1, max: 8, step: 0.5 },
  { name: "showPoints", type: "boolean", label: "Show Points", group: "Points",
    default: false },
  { name: "pointRadius", type: "number", label: "Point Radius", group: "Points",
    default: 3, min: 1, max: 10, step: 1 },
  { name: "fillArea", type: "boolean", label: "Fill Area", group: "Area",
    default: false },
  { name: "areaOpacity", type: "number", label: "Area Opacity", group: "Area",
    default: 0.3, min: 0, max: 1, step: 0.05 },
  { name: "enableHover", type: "boolean", label: "Enable Hover", group: "Interaction",
    default: true },
  { name: "showGrid", type: "boolean", label: "Show Grid", group: "Layout",
    default: false },
  { name: "showLegend", type: "boolean", label: "Show Legend", group: "Layout",
    default: true },
  { name: "xLabel", type: "string", label: "X Label", group: "Labels",
    default: "" },
  { name: "yLabel", type: "string", label: "Y Label", group: "Labels",
    default: "" },
  { name: "title", type: "string", label: "Title", group: "Labels",
    default: "" },
]

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

const monthlyRevenue = [
  { month: 1, revenue: 12000 },
  { month: 2, revenue: 18000 },
  { month: 3, revenue: 14000 },
  { month: 4, revenue: 22000 },
  { month: 5, revenue: 19000 },
  { month: 6, revenue: 27000 },
  { month: 7, revenue: 24000 },
  { month: 8, revenue: 31000 },
  { month: 9, revenue: 28000 },
  { month: 10, revenue: 35000 },
  { month: 11, revenue: 32000 },
  { month: 12, revenue: 41000 },
]

const multiProduct = [
  { month: 1, revenue: 12000, product: "Widget" },
  { month: 2, revenue: 18000, product: "Widget" },
  { month: 3, revenue: 14000, product: "Widget" },
  { month: 4, revenue: 22000, product: "Widget" },
  { month: 5, revenue: 19000, product: "Widget" },
  { month: 6, revenue: 27000, product: "Widget" },
  { month: 1, revenue: 8000, product: "Gadget" },
  { month: 2, revenue: 11000, product: "Gadget" },
  { month: 3, revenue: 15000, product: "Gadget" },
  { month: 4, revenue: 13000, product: "Gadget" },
  { month: 5, revenue: 17000, product: "Gadget" },
  { month: 6, revenue: 21000, product: "Gadget" },
  { month: 1, revenue: 5000, product: "Doohickey" },
  { month: 2, revenue: 7000, product: "Doohickey" },
  { month: 3, revenue: 9000, product: "Doohickey" },
  { month: 4, revenue: 8000, product: "Doohickey" },
  { month: 5, revenue: 12000, product: "Doohickey" },
  { month: 6, revenue: 14000, product: "Doohickey" },
]

const dailyTraffic = Array.from({ length: 90 }, (_, i) => ({
  day: i + 1,
  visitors: Math.round(2000 + 1500 * Math.sin(i / 7) + Math.random() * 500),
}))

const datasets = [
  {
    label: "Monthly Revenue (single line)",
    data: monthlyRevenue,
    xAccessor: "month",
    yAccessor: "revenue",
    codeString: `[
  { month: 1, revenue: 12000 },
  { month: 2, revenue: 18000 },
  { month: 3, revenue: 14000 },
  // ...12 months
]`,
  },
  {
    label: "Multi-Product (3 series)",
    data: multiProduct,
    xAccessor: "month",
    yAccessor: "revenue",
    lineBy: "product",
    colorBy: "product",
    codeString: `[
  { month: 1, revenue: 12000, product: "Widget" },
  { month: 1, revenue: 8000, product: "Gadget" },
  { month: 1, revenue: 5000, product: "Doohickey" },
  // ...3 products, 6 months each
]`,
  },
  {
    label: "Daily Traffic (90 days)",
    data: dailyTraffic,
    xAccessor: "day",
    yAccessor: "visitors",
    codeString: `[
  { day: 1, visitors: 2340 },
  { day: 2, visitors: 3120 },
  // ...90 days
]`,
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LineChartPlayground() {
  return (
    <PlaygroundLayout
      title="Line Chart Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Line Chart", path: "/playground/line-chart" },
      ]}
      prevPage={{ title: "Playground", path: "/playground" }}
      nextPage={{ title: "Bar Chart Playground", path: "/playground/bar-chart" }}
      chartComponent={LineChart}
      componentName="LineChart"
      controls={controls}
      datasets={datasets}
      dataProps={(ds) => {
        const props = {
          data: ds.data,
          xAccessor: ds.xAccessor,
          yAccessor: ds.yAccessor,
          height: 400,
        }
        if (ds.lineBy) props.lineBy = ds.lineBy
        if (ds.colorBy) props.colorBy = ds.colorBy
        return props
      }}
    >
      <p>
        Experiment with LineChart props in real time. Adjust the controls below
        the chart to see how each prop affects the visualization, then copy the
        generated code.
      </p>
    </PlaygroundLayout>
  )
}
