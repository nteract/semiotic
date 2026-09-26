import React, { useState } from "react"
import { LineChart } from "../../dist/xy.module.min.js"

const data = [
  { date: "2024-01-01", value: 20 },
  { date: "2024-03-01", value: 50 },
  { date: "2024-06-01", value: 80 }
]

export function TemporalAccessorExample() {
  const [revision, setRevision] = useState(0)
  const [width, setWidth] = useState(600)
  const [height, setHeight] = useState(300)
  return <div>
    <button onClick={() => setRevision(value => value + 1)}>Rerender dates</button>
    <button onClick={() => setWidth(360)}>Narrow dates</button>
    <button onClick={() => { setWidth(30); setHeight(20) }}>Collapse dates</button>
    <button onClick={() => { setWidth(600); setHeight(300) }}>Restore dates</button>
    <div data-testid="temporal-chart" data-revision={revision}>
      <LineChart data={data} xAccessor={row => row.date} yAccessor="value"
        width={width} height={height} margin={{ left: 40, right: 40, top: 40, bottom: 40 }}
        yExtent={[0, 100]} showPoints
        tooltip={row => `${row.date}: ${row.value}`} />
    </div>
  </div>
}
