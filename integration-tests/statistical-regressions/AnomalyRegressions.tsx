import React, { useState } from "react"
import { ANOMALY_FIELD, AreaChart, LineChart, RESOLVED_Y_FIELD } from "../../dist/xy.module.min.js"
import type { Datum } from "../../src/components/charts/shared/datumTypes"

const rows = [10, 10, 10, 10, null].map((y, x) => ({ x, y }))
const nested = [{ label: "Measurements", coordinates: rows }]
const areaRows = [{ label: "Measurements", coordinates: [10, 10, 10, 10, 0].map((y, x) => ({ x, y })) }]
const xValue = (d: Datum) => d.x
const yValue = (d: Datum) => d.y
const series = (d: Datum) => d.label

export function AnomalyRegressions() {
  const [width, setWidth] = useState(500)
  const query = new URLSearchParams(location.search)
  const callback = query.get("accessors") === "callback"
  const isNested = query.get("input") === "nested"
  const area = query.get("chart") === "area"
  const Chart = area ? AreaChart : LineChart
  return <main>
    <button onClick={() => setWidth(380)}>Resize charts</button>
    <section data-testid="anomaly">
      <Chart
        data={area ? areaRows : isNested ? nested : rows}
        xAccessor={callback ? xValue : "x"}
        yAccessor={callback ? yValue : "y"}
        {...(area ? { areaBy: "label" } : { lineBy: isNested ? series : undefined, gapStrategy: "zero" })}
        anomaly={{ threshold: 1.5 }}
        xExtent={[0, 5]} yExtent={[-5, 15]}
        width={width} height={260}
        margin={{ left: 20, right: 20, top: 40, bottom: 20 }}
        showLegend={false} showPoints pointRadius={6}
        title="Computed anomaly flags"
        description="The final zero-valued point is marked as an anomaly."
        tooltip={(d: Datum) => <div>
          {String(d.parentLine?.label ?? d.label ?? "Measurements")}: {String(d[RESOLVED_Y_FIELD] ?? d.y)}; anomaly: {String(d[ANOMALY_FIELD] === true)}
        </div>}
      />
    </section>
  </main>
}
