import React from "react"
import { WaterfallChart } from "semiotic/xy"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import PageLayout from "../../components/PageLayout"
import ChartGrounding from "../../components/ChartGrounding"

const sampleData = [
  { step: "Opening", value: 120 },
  { step: "New sales", value: 45 },
  { step: "Returns", value: -18 },
  { step: "Discounts", value: -12 },
  { step: "Other", value: 8 },
]

const props = [
  { name: "data", type: "array", required: true, default: null, description: "Step/delta rows. Each y value is a signed change, not a running total." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Step identity or time." },
  { name: "yAccessor", type: "string | function", required: false, default: '"y"', description: "Signed delta for this step." },
  { name: "positiveColor", type: "string", required: false, default: "theme success", description: "Fill for positive deltas." },
  { name: "negativeColor", type: "string", required: false, default: "theme danger", description: "Fill for negative deltas." },
  { name: "gap", type: "number", required: false, default: "1", description: "Pixel gap between adjacent bars." },
]

export default function WaterfallChartPage() {
  return (
    <PageLayout
      title="WaterfallChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "XY Charts", path: "/charts" },
        { label: "WaterfallChart", path: "/charts/waterfall-chart" },
      ]}
      prevPage={{ title: "Heatmap", path: "/charts/heatmap" }}
      nextPage={{ title: "Candlestick Chart", path: "/charts/candlestick-chart" }}
    >
      <ComponentMeta
        componentName="WaterfallChart"
        importStatement='import { WaterfallChart } from "semiotic/xy"'
        tier="charts"
        wraps="StreamXYFrame"
        wrapsPath="/frames/xy-frame"
        related={[
          { name: "RealtimeWaterfallChart", path: "/charts/realtime-waterfall-chart" },
          { name: "BarChart", path: "/charts/bar-chart" },
        ]}
      />

      <p>
        WaterfallChart draws cumulative signed steps as floating bars. Each row
        is a delta. For a live window of the same geometry, use
        RealtimeWaterfallChart.
      </p>

      <ChartGrounding component="WaterfallChart" />

      <h2 id="quick-start">Quick Start</h2>
      <LiveExample
        frameProps={{
          data: sampleData,
          xAccessor: "step",
          yAccessor: "value",
          xLabel: "Step",
          yLabel: "Change",
        }}
        type={WaterfallChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { step: "Opening", value: 120 },
  { step: "New sales", value: 45 },
  { step: "Returns", value: -18 },
]`,
        }}
        hiddenProps={{}}
      />

      <h2 id="props">Props</h2>
      <PropTable props={props} />
    </PageLayout>
  )
}
