import React, { useState } from "react"
import { LinearBrush } from "../../dist/controls.module.min.js"
import { StackedAreaChart } from "../../dist/xy.module.min.js"

const DAY = 24 * 60 * 60 * 1000
const START = Date.UTC(2024, 0, 1)
const END = START + 59 * DAY
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const data = Array.from({ length: 60 }, (_, index) => ["Ingest", "Query"].map((series, offset) => ({
  time: START + index * DAY,
  value: 20 + 10 * Math.sin(index / 6 + offset * 2) + offset * 5,
  series,
}))).flat()
const formatDay = (value) => {
  const date = new Date(value)
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}\n${date.getUTCFullYear()}`
}
const margin = { top: 10, right: 20, bottom: 30, left: 40 }

// Built-in look: mask, handles, a move handle, and extent plus domain labels.
function StandaloneBrush() {
  const [value, setValue] = useState([20, 60])
  const [ends, setEnds] = useState(0)
  return <div data-testid="linear-brush-standalone" data-value={value ? value.join(",") : ""} data-ends={ends}
    style={{ padding: "24px 40px 40px", width: 400, background: "white" }}>
    <LinearBrush domain={[0, 100]} width={400} height={40} value={value} label="Percent range"
      onChange={(next) => setValue(next)} onChangeEnd={() => setEnds((count) => count + 1)}
      step={5} minSpan={5} maskStyle showMoveHandle resetOnDoubleClick resetValue={[0, 100]}
      showExtentLabels showDomainLabels formatValue={(v) => `${Math.round(v)}%`} />
  </div>
}

// An overlay on a chart's plot area that commits on release, with custom
// handles and two-line date labels.
function OverlayBrush() {
  const [committed, setCommitted] = useState(null)
  return <div data-testid="linear-brush-overlay" data-committed={committed ? committed.join(",") : ""}
    style={{ padding: "8px 8px 32px", width: 500, background: "white" }}>
    <div style={{ position: "relative", width: 500, height: 140 }}>
      <StackedAreaChart data={data} xAccessor="time" yAccessor="value" areaBy="series" colorBy="series"
        colorScheme={["#6a8fd6", "#b8c7e8"]} width={500} height={140} margin={margin} showAxes={false}
        showLegend={false} enableHover={false} />
      <LinearBrush domain={[START, END]} inset={margin} value={committed} label="Time window"
        emptySelection="full-extent" allowCreate={false} showMoveHandle resetOnDoubleClick
        maskStyle={{ backgroundColor: "rgba(0, 0, 0, 0.08)", opacity: 1 }}
        selectionStyle={{ backgroundColor: "transparent", border: "1px solid #d9d8de" }}
        activeSelectionStyle={{ borderColor: "#6047ff" }}
        renderHandle={({ side, dragging }) => <div style={{
          position: "absolute", left: -10, top: side === "move" ? -10 : "50%", marginTop: side === "move" ? 0 : -10,
          width: 20, height: 20, borderRadius: 4, background: dragging ? "#6047ff" : "#d9d8de",
        }} />}
        showExtentLabels formatValue={formatDay} labelBounds={[-40, 460]}
        onChangeEnd={(next) => setCommitted(next)} />
    </div>
  </div>
}

export function LinearBrushExample() {
  return <div style={{ display: "grid", gap: 24, justifyItems: "start" }}>
    <StandaloneBrush />
    <OverlayBrush />
  </div>
}
