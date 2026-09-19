import * as React from "react"
import { createRoot } from "react-dom/client"
import { LineChart as RootLineChart } from "../../dist/semiotic.module.min.js"
import {
  LinkedCharts,
  CategoryColorProvider
} from "../../dist/semiotic-ai.module.min.js"
import { LineChart, Scatterplot } from "../../dist/xy.module.min.js"
import { BarChart } from "../../dist/ordinal.module.min.js"
import { RealtimeHistogram } from "../../dist/realtime.module.min.js"
import type { RealtimeFrameHandle } from "../../src/components/realtime/types"

const query = new URLSearchParams(location.search)
const push = query.get("mode") === "push"
const provider = query.get("provider") === "partial"
const palette = ["#FF0000", "#0000FF"]
const colors = { production: palette[1], consumption: palette[0] }
const colorScheme = query.get("scheme") === "map" ? colors : palette
const data = [
  { timestamp: 1, value: 1, series: "consumption" },
  { timestamp: 2, value: 2, series: "consumption" },
  { timestamp: 3, value: 1, series: "consumption" },
  { timestamp: 1, value: 4, series: "production" },
  { timestamp: 2, value: 5, series: "production" },
  { timestamp: 3, value: 4, series: "production" }
]

function Charts() {
  const rootRef = React.useRef<RealtimeFrameHandle>(null)
  const lineRef = React.useRef<RealtimeFrameHandle>(null)
  const scatterRef = React.useRef<RealtimeFrameHandle>(null)
  const barRef = React.useRef<RealtimeFrameHandle>(null)
  const histogramRef = React.useRef<RealtimeFrameHandle>(null)
  React.useEffect(() => {
    if (!push) return
    for (const ref of [rootRef, lineRef, scatterRef, barRef, histogramRef]) {
      ref.current?.pushMany(data)
    }
  }, [])

  const common = {
    data: push ? undefined : data,
    width: 360,
    height: 200,
    colorBy: "series",
    colorScheme
  }
  const line = {
    ...common,
    xAccessor: "timestamp",
    yAccessor: "value",
    lineBy: "series"
  }
  const children = (
    <LinkedCharts>
      <div data-chart="root-line">
        <RootLineChart {...line} ref={rootRef} />
      </div>
      <div data-chart="line">
        <LineChart {...line} ref={lineRef} />
      </div>
      <div data-chart="scatter">
        <Scatterplot
          {...common}
          xAccessor="timestamp"
          yAccessor="value"
          ref={scatterRef}
        />
      </div>
      <div data-chart="bar">
        <BarChart
          {...common}
          categoryAccessor="series"
          valueAccessor="value"
          ref={barRef}
        />
      </div>
      <div data-chart="histogram">
        <RealtimeHistogram
          data={push ? undefined : data}
          ref={histogramRef}
          timeAccessor="timestamp"
          valueAccessor="value"
          categoryAccessor="series"
          colors={colors}
          binSize={10}
          width={360}
          height={200}
        />
      </div>
    </LinkedCharts>
  )
  return provider ? (
    <CategoryColorProvider colors={{ consumption: "#00FF00" }}>
      {children}
    </CategoryColorProvider>
  ) : (
    children
  )
}

function VisualDashboard() {
  const mixed = query.get("scenario") === "mixed"
  const common = {
    data,
    width: mixed ? 250 : 390,
    height: 250,
    colorBy: "series",
    colorScheme,
    legendPosition: "bottom" as const,
    linkedHover: { name: "energy", fields: ["series"] },
    margin: { left: 40, top: 12, right: 15, bottom: 50 }
  }
  const charts = (
    <LinkedCharts legendField="series">
      <div className="chart-row">
        <section className="chart-panel" data-chart="visual-line">
          <h2>Energy over time</h2>
          <p>
            {mixed
              ? "Array palette · local blue"
              : `${query.get("scheme")} palette`}
          </p>
          <LineChart
            {...common}
            xAccessor="timestamp"
            yAccessor="value"
            lineBy="series"
          />
        </section>
        <section className="chart-panel" data-chart="visual-bar">
          <h2>Energy totals</h2>
          <p>
            {mixed
              ? "Category map · local magenta"
              : `${query.get("scheme")} palette`}
          </p>
          <BarChart
            {...common}
            data={data.filter((d) => d.timestamp === 2)}
            categoryAccessor="series"
            valueAccessor="value"
            colorScheme={
              mixed
                ? { consumption: "#FF0000", production: "#B000B5" }
                : colorScheme
            }
          />
        </section>
        {mixed && (
          <section className="chart-panel" data-chart="visual-scatter">
            <h2>Energy observations</h2>
            <p>Named palette · local orange</p>
            <Scatterplot
              {...common}
              xAccessor="timestamp"
              yAccessor="value"
              colorScheme="category10"
              pointRadius={6}
            />
          </section>
        )}
      </div>
    </LinkedCharts>
  )
  return (
    <main className="dashboard" data-testid="color-dashboard">
      <h1>
        {mixed
          ? "Linked charts, shared and local colors"
          : "Linked charts preserve a child palette"}
      </h1>
      <p>
        {mixed
          ? "Consumption is shared green. Production keeps each chart’s own color; individual legends stay visible."
          : "Consumption stays red and production stays blue. The linked legend matches both charts."}
      </p>
      {mixed ? (
        <CategoryColorProvider colors={{ consumption: "#008A5B" }}>
          {charts}
        </CategoryColorProvider>
      ) : (
        charts
      )}
    </main>
  )
}

createRoot(document.getElementById("root")!).render(
  query.has("scenario") ? <VisualDashboard /> : <Charts />
)
