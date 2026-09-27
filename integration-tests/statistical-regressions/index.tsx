import React, { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { LineChart } from "../../dist/xy.module.min.js"
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
createRoot(document.getElementById("root")!).render(<App />)
