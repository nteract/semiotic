import React, { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { LineChart } from "../../dist/xy.module.min.js"
import { BarChart } from "../../dist/ordinal.module.min.js"
import type { RealtimeFrameHandle } from "../../src/components/realtime/types"
import type { StreamXYFrameHandle } from "../../src/components/stream/types"
import type { Datum } from "../../src/components/charts/shared/datumTypes"

const epoch = Date.UTC(2026, 0, 1),
  day = 86400000
const margin = { left: 20, right: 20, top: 40, bottom: 20 }
const rows = Array.from({ length: 5 }, (_, i) => ({
  when: new Date(epoch + i * day),
  amount: 10 + 5 * i,
  name: `Day ${i}`
}))
const grouped = rows.flatMap((d, i) => [
  { ...d, series: "Up" },
  { ...d, amount: 80 - 3 * i, series: "Down" }
])
const time = (d: Datum) => d.when as Date
const value = (d: Datum) => d.amount as number

function App() {
  const [width, setWidth] = useState(500)
  const [version, setVersion] = useState(0)
  const [data, setData] = useState(rows)
  const [forecastData, setForecastData] = useState(grouped)
  const ref = useRef<StreamXYFrameHandle>(null)
  const query = new URLSearchParams(location.search)
  const push = query.get("input") === "push"
  const callback = query.get("accessors") === "callback"
  useEffect(() => {
    if (push) {
      ref.current?.clear()
      ref.current?.pushMany(data)
    }
  }, [push, data])
  return (
    <main>
      <button onClick={() => setWidth(380)}>Resize charts</button>
      <button onClick={() => setVersion((v) => v + 1)}>Rerender parent</button>
      <button
        onClick={() => {
          setData(rows.map((d) => ({ ...d, amount: d.amount + 10 })))
          setForecastData(grouped.map((d) => ({ ...d, amount: d.amount + 10 })))
        }}
      >
        Replace data
      </button>
      <span>{version}</span>
      <section data-testid="trend">
        <LineChart
          ref={ref}
          data={push ? undefined : data}
          xAccessor={callback ? time : "when"}
          yAccessor={callback ? value : "amount"}
          xScaleType="time"
          xExtent={[epoch, epoch + 6 * day]}
          yExtent={[0, 100]}
          width={width}
          height={260}
          margin={margin}
          showPoints
          pointRadius={6}
          annotations={[{ type: "trend", color: "#d000a0" }]}
          title="Daily growth"
          description="Measurements with a fitted trend."
          tooltip={(d: Datum) => (
            <div>
              {String(d.name)}: {String(d.amount)}
            </div>
          )}
        />
      </section>
      <section data-testid="forecast">
        <LineChart
          data={forecastData}
          xAccessor={callback ? time : "when"}
          yAccessor={callback ? value : "amount"}
          lineBy="series"
          showLegend={false}
          forecast={{ trainEnd: epoch + 3 * day, steps: 2, label: "Forecast" }}
          xScaleType="time"
          xExtent={[epoch, epoch + 6 * day]}
          yExtent={[0, 100]}
          width={width}
          height={260}
          margin={margin}
          showPoints
          pointRadius={6}
          title="Separate series forecasts"
          description="Rising and falling series with independent forecasts."
          tooltip={(d: Datum) => (
            <div>
              {String(d.series)}: {String(d.__semiotic_resolvedY ?? d.amount)}
            </div>
          )}
        />
      </section>
    </main>
  )
}
function OrdinalTrends() {
  const query = new URLSearchParams(location.search)
  const push = query.get("input") === "push"
  const callback = query.get("accessors") === "callback"
  const horizontal = query.get("orientation") === "horizontal"
  const [width, setWidth] = useState(500)
  const [offset, setOffset] = useState(0)
  const ref = useRef<RealtimeFrameHandle>(null)
  const data = React.useMemo(
    () => [
      { region: "A", amount: 20 + offset },
      { region: "B", amount: 10 + offset },
      { region: "C", amount: 30 + offset }
    ],
    [offset]
  )
  useEffect(() => {
    if (push) {
      ref.current?.clear()
      ref.current?.pushMany(data)
    }
  }, [push, data])
  return (
    <main>
      <button onClick={() => setWidth(380)}>Resize charts</button>
      <button onClick={() => setOffset(10)}>Replace data</button>
      <section data-testid="ordinal-trend">
        <BarChart
          ref={ref}
          data={push ? undefined : data}
          categoryAccessor={callback ? (d: Datum) => d.region : "region"}
          valueAccessor={callback ? value : "amount"}
          orientation={horizontal ? "horizontal" : "vertical"}
          sort="desc"
          valueExtent={[0, 100]}
          regression={{ color: "#d000a0" }}
          width={width}
          height={260}
          margin={margin}
          barPadding={0}
          title="Ordinal trend"
          description="A trend through ordered category centers."
          tooltip={(d: Datum) => (
            <div>
              {String(d.region)}: {String(d.amount)}
            </div>
          )}
        />
      </section>
    </main>
  )
}
createRoot(document.getElementById("root")!).render(
  new URLSearchParams(location.search).get("family") === "ordinal" ? (
    <OrdinalTrends />
  ) : (
    <App />
  )
)
