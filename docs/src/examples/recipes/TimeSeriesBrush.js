import React, { useState } from "react"
import { MinimapXYFrame } from "semiotic"
import { curveMonotoneX } from "d3-shape"

function generateTimeSeries(label, color, baseValue, volatility, points) {
  const coordinates = []
  let value = baseValue
  const startDate = new Date(2024, 0, 1)
  for (let i = 0; i < points; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    value += (Math.random() - 0.48) * volatility
    value = Math.max(0, value)
    coordinates.push({ date: date.getTime(), value: Math.round(value * 100) / 100 })
  }
  return { label, color, coordinates }
}

const sampleData = [
  generateTimeSeries("Series A", "#6366f1", 100, 5, 180),
  generateTimeSeries("Series B", "#22c55e", 80, 4, 180),
  generateTimeSeries("Series C", "#f59e0b", 60, 6, 180),
]

function formatDate(d) {
  const date = new Date(d)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${months[date.getMonth()]} ${date.getDate()}`
}

export default function TimeSeriesBrush({ data = sampleData, width = 700, height = 350 }) {
  const [selectedExtent, setSelectedExtent] = useState(undefined)

  const handleBrushEnd = (e) => {
    if (e) {
      setSelectedExtent(e)
    }
  }

  return (
    <MinimapXYFrame
      size={[width, height]}
      lines={data}
      lineType={{ type: "line", interpolator: curveMonotoneX }}
      xAccessor="date"
      yAccessor="value"
      lineStyle={(d) => ({ stroke: d.color, strokeWidth: 2, fill: "none" })}
      xExtent={selectedExtent}
      matte={true}
      axes={[
        { orient: "left", ticks: 5 },
        { orient: "bottom", ticks: 6, tickFormat: formatDate },
      ]}
      margin={{ left: 60, top: 10, bottom: 40, right: 20 }}
      minimap={{
        brushEnd: handleBrushEnd,
        yBrushable: false,
        xBrushExtent: selectedExtent,
        margin: { left: 60, top: 0, bottom: 20, right: 20 },
        axes: [{ orient: "left", ticks: 2 }],
        size: [width, 60],
        lineStyle: (d) => ({ stroke: d.color, strokeWidth: 1, fill: "none" }),
      }}
      hoverAnnotation={true}
      tooltipContent={(d) => (
        <div style={{
          background: "var(--surface-1, #1a1a25)",
          border: "1px solid var(--surface-3, #252530)",
          borderRadius: "6px",
          padding: "8px 12px",
          fontSize: "13px",
          color: "var(--text-primary, #f0f0f5)",
        }}>
          <div style={{ fontWeight: 600 }}>{d.parentLine.label}</div>
          <div>{formatDate(d.date)}: {d.value}</div>
        </div>
      )}
    />
  )
}
