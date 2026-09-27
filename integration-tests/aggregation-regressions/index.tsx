import React, { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { LineChart } from "../../dist/xy.module.min.js"
import { Histogram, StackedBarChart } from "../../dist/ordinal.module.min.js"
import { fromVegaLite } from "../../dist/semiotic-data.module.min.js"
import { unstable_fromFlintChart as fromFlintChart } from "../../dist/semiotic-experimental.module.min.js"
import type { Datum } from "../../src/components/charts/shared/datumTypes"
import type { StreamXYFrameHandle } from "../../src/components/stream/types"
import type { StreamOrdinalFrameHandle } from "../../src/components/stream/ordinalTypes"

const margin = { left: 40, right: 20, top: 40, bottom: 20 }
const rows = [
  { c: "A", x: 2, series: "First", n: 2 },
  { c: "A", x: 2, series: "First", n: 4 },
  { c: "A", x: 2, series: "First", n: null },
  { c: "A", x: 2, series: "Second", n: 6 }
]
const histogramRows = [1, 1, 1, 1, 2, 9].map((n) => ({ n }))
const params = new URLSearchParams(location.search)
const push = params.get("input") === "push"
const flint = params.get("adapter") === "flint"

function config(mark: "bar" | "line", data: Datum[]) {
  const encodings = {
    x: {
      field: mark === "bar" ? "c" : "x",
      type: mark === "bar" ? ("nominal" as const) : ("quantitative" as const)
    },
    y: {
      field: "n",
      aggregate: "mean" as const,
      type: "quantitative" as const
    },
    color: { field: "series", type: "nominal" as const }
  }
  return flint
    ? fromFlintChart({
        data: { values: data },
        chart_spec: {
          chartType: mark === "bar" ? "stackedBar" : "line",
          encodings
        }
      })
    : fromVegaLite({ mark, data: { values: data }, encoding: encodings })
}

function App() {
  const [width, setWidth] = useState(500)
  const [extra, setExtra] = useState(0)
  const bars = config(
    "bar",
    rows.map((d) => ({ ...d, n: d.n == null ? null : d.n + extra }))
  )
  const lines = config(
    "line",
    [2, 10].flatMap((x) =>
      rows.map((d) => ({ ...d, x, n: d.n == null ? null : d.n + extra }))
    )
  )
  const histogram = fromVegaLite({
    mark: "bar",
    data: { values: histogramRows },
    encoding: {
      x: { field: "n", type: "quantitative", bin: { maxbins: 2 } },
      y: { aggregate: "count", type: "quantitative" }
    }
  })
  const barRef = useRef<StreamOrdinalFrameHandle>(null)
  const lineRef = useRef<StreamXYFrameHandle>(null)
  useEffect(() => {
    if (!push) return
    barRef.current?.clear()
    barRef.current?.pushMany(bars.props.data)
    lineRef.current?.clear()
    lineRef.current?.pushMany(lines.props.data)
  }, [extra])
  const shared = {
    width,
    height: 260,
    margin,
    showLegend: false,
    colorScheme: { First: "#12ab34", Second: "#bc3456" }
  }
  const tooltip = (d: Datum) => (
    <div>
      {String(d.series)}: {String(d.value)}
    </div>
  )
  return (
    <main>
      <button onClick={() => setWidth(380)}>Resize charts</button>
      <button onClick={() => setExtra(1)}>Replace data</button>
      <section data-testid="bars">
        <StackedBarChart
          {...bars.props}
          {...shared}
          ref={barRef}
          data={push ? undefined : bars.props.data}
          valueExtent={[0, 12]}
          title="Aggregated series"
          description="Separate series means excluding missing values."
          tooltip={tooltip}
        />
      </section>
      <section data-testid="lines">
        <LineChart
          {...lines.props}
          {...shared}
          ref={lineRef}
          data={push ? undefined : lines.props.data}
          xExtent={[0, 12]}
          yExtent={[0, 12]}
          showPoints
          pointRadius={6}
          title="Numeric positions"
          description="Series means at numeric x positions."
          tooltip={tooltip}
        />
      </section>
      <section data-testid="histogram">
        <Histogram
          {...histogram.props}
          {...shared}
          valueExtent={[0, 10]}
          title="Repeated observations"
          description="Five observations in the first bin and one in the second."
        />
      </section>
    </main>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
