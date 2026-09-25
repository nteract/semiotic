import React, { useState } from "react"
import { BoxPlot, ViolinPlot, RidgelinePlot, FunnelChart } from "../../dist/ordinal.module.min.js"
import { CandlestickChart } from "../../dist/xy.module.min.js"
import { FlowMap } from "../../dist/geo.module.min.js"

const charts = { BoxPlot, ViolinPlot, RidgelinePlot, FunnelChart, CandlestickChart, FlowMap }
const data = [10, 20, 30, 40, 50].map(value => ({ category: "Alpha", value }))
const candle = [{ x: 1, open: 20, close: 30, high: 40, low: 10 }]
const steps = [{ step: "Awareness", value: 100 }, { step: "Purchase", value: 50 }]
const nodes = [{ id: "A", lon: -20, lat: 0 }, { id: "B", lon: 20, lat: 0 }]
const flows = [{ source: "A", target: "B", value: 75 }]

export function KeyboardMarkExample({ chart }) {
  const [width, setWidth] = useState(440)
  const Chart = charts[chart]
  const props = chart === "FlowMap" ? { nodes, flows, lineType: "line" }
    : chart === "CandlestickChart" ? { data: candle, openAccessor: "open", closeAccessor: "close" }
      : chart === "FunnelChart" ? { data: steps, stepAccessor: "step", valueAccessor: "value" }
        : { data }
  return <div>
    <button onClick={() => setWidth(320)}>Narrow marks</button>
    <Chart {...props} width={width} height={340} showLegend={false}
      margin={{ left: 60, right: 20, top: 30, bottom: 50 }} />
  </div>
}
