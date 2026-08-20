import React from "react"
import { RadarChart } from "semiotic/ordinal"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import PageLayout from "../../components/PageLayout"
import ChartGrounding from "../../components/ChartGrounding"

const sampleData = [
  { name: "Alpha", attribute: "speed", value: 80 },
  { name: "Alpha", attribute: "power", value: 55 },
  { name: "Alpha", attribute: "range", value: 40 },
  { name: "Alpha", attribute: "armor", value: 30 },
  { name: "Beta", attribute: "speed", value: 45 },
  { name: "Beta", attribute: "power", value: 75 },
  { name: "Beta", attribute: "range", value: 60 },
  { name: "Beta", attribute: "armor", value: 70 },
]

const props = [
  { name: "data", type: "array", required: true, default: null, description: "Long-form rows: one observation per series × attribute." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"attribute"', description: "Axis around the radar." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Magnitude along each axis." },
  { name: "seriesAccessor", type: "string | function", required: false, default: null, description: "Series identity used to connect a polygon. Defaults to colorBy." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Series color channel." },
  { name: "pointRadius", type: "number", required: false, default: "4", description: "Vertex radius." },
  { name: "valueExtent", type: "array", required: false, default: "[0, data-max]", description: "Fixed value-axis domain." },
]

export default function RadarChartPage() {
  return (
    <PageLayout
      title="RadarChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Ordinal Charts", path: "/charts" },
        { label: "RadarChart", path: "/charts/radar-chart" },
      ]}
      prevPage={{ title: "Funnel Chart", path: "/charts/funnel-chart" }}
      nextPage={{ title: "Swimlane Chart", path: "/charts/swimlane-chart" }}
    >
      <ComponentMeta
        componentName="RadarChart"
        importStatement='import { RadarChart } from "semiotic/ordinal"'
        tier="charts"
        wraps="StreamOrdinalFrame"
        wrapsPath="/frames/ordinal-frame"
        related={[
          { name: "DotPlot", path: "/charts/dot-plot" },
          { name: "PieChart", path: "/charts/pie-chart" },
        ]}
      />

      <p>
        RadarChart compares several quantitative attributes across series on a
        shared radial axis. Data is long-form: one row per series and attribute.
        Use it when the axes are comparable magnitudes, not a closed cycle of
        unrelated units.
      </p>

      <ChartGrounding component="RadarChart" />

      <h2 id="quick-start">Quick Start</h2>
      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "attribute",
          valueAccessor: "value",
          seriesAccessor: "name",
          colorBy: "name",
          showLegend: true,
        }}
        type={RadarChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { name: "Alpha", attribute: "speed", value: 80 },
  { name: "Alpha", attribute: "power", value: 55 },
]`,
        }}
        hiddenProps={{}}
      />

      <h2 id="props">Props</h2>
      <PropTable props={props} />
    </PageLayout>
  )
}
