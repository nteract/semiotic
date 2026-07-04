import React from "react"
import { MinimapChart } from "semiotic"

function generateTimeSeries(label, color, baseValue, volatility, points) {
  const coordinates = []
  let value = baseValue
  const startDate = new Date(2024, 0, 1)
  for (let i = 0; i < points; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    value += (Math.random() - 0.48) * volatility
    value = Math.max(0, value)
    coordinates.push({ date: date.getTime(), value: Math.round(value * 100) / 100, series: label, color })
  }
  return coordinates
}

const sampleData = [
  ...generateTimeSeries("Series A", "#6366f1", 100, 5, 180),
  ...generateTimeSeries("Series B", "#22c55e", 80, 4, 180),
  ...generateTimeSeries("Series C", "#f59e0b", 60, 6, 180),
]

function formatDate(d) {
  const date = new Date(d)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${months[date.getMonth()]} ${date.getDate()}`
}

export default function TimeSeriesBrush({ data = sampleData, width = 700, height = 350 }) {
  return (
    <MinimapChart
      data={data}
      width={width}
      height={height}
      xAccessor="date"
      yAccessor="value"
      lineBy="series"
      colorBy="series"
      colorScheme={["#6366f1", "#22c55e", "#f59e0b"]}
      curve="monotoneX"
      lineWidth={2}
      enableHover={true}
      xFormat={formatDate}
      margin={{ left: 60, top: 10, bottom: 40, right: 20 }}
      minimap={{
        height: 60,
        margin: { left: 60, top: 0, bottom: 20, right: 20 },
        lineStyle: (d) => ({ stroke: d.color, strokeWidth: 1 }),
      }}
      tooltip={{
        title: "series",
        fields: [
          { field: "date", label: "Date", format: formatDate },
          { field: "value", label: "Value" }
        ]
      }}
    />
  )
}
