import React from "react"
import { XYFrame } from "semiotic"

const sampleData = [
  {
    label: "Revenue",
    value: 128400,
    previousValue: 112300,
    unit: "$",
    trend: [
      { day: 1, value: 112 }, { day: 2, value: 115 }, { day: 3, value: 113 },
      { day: 4, value: 118 }, { day: 5, value: 121 }, { day: 6, value: 119 },
      { day: 7, value: 124 }, { day: 8, value: 126 }, { day: 9, value: 128 },
      { day: 10, value: 125 }, { day: 11, value: 127 }, { day: 12, value: 128 },
    ],
  },
  {
    label: "Active Users",
    value: 8420,
    previousValue: 7850,
    unit: "",
    trend: [
      { day: 1, value: 78 }, { day: 2, value: 79 }, { day: 3, value: 77 },
      { day: 4, value: 80 }, { day: 5, value: 81 }, { day: 6, value: 82 },
      { day: 7, value: 80 }, { day: 8, value: 83 }, { day: 9, value: 82 },
      { day: 10, value: 84 }, { day: 11, value: 83 }, { day: 12, value: 84 },
    ],
  },
  {
    label: "Conversion Rate",
    value: 3.42,
    previousValue: 3.71,
    unit: "%",
    trend: [
      { day: 1, value: 3.7 }, { day: 2, value: 3.6 }, { day: 3, value: 3.5 },
      { day: 4, value: 3.6 }, { day: 5, value: 3.4 }, { day: 6, value: 3.5 },
      { day: 7, value: 3.3 }, { day: 8, value: 3.4 }, { day: 9, value: 3.3 },
      { day: 10, value: 3.4 }, { day: 11, value: 3.5 }, { day: 12, value: 3.4 },
    ],
  },
]

function formatValue(value, unit) {
  if (unit === "$") return `$${value.toLocaleString()}`
  if (unit === "%") return `${value}%`
  return value.toLocaleString()
}

function KpiCard({ label, value, previousValue, unit, trend }) {
  const change = ((value - previousValue) / previousValue) * 100
  const isPositive = change >= 0
  const sparkColor = isPositive ? "#22c55e" : "#ef4444"

  return (
    <div className="recipe-kpi-card">
      <div className="recipe-kpi-label">{label}</div>
      <div className="recipe-kpi-value">{formatValue(value, unit)}</div>
      <div className="recipe-kpi-row">
        <span className={`recipe-kpi-change ${isPositive ? "positive" : "negative"}`}>
          {isPositive ? "+" : ""}{change.toFixed(1)}%
        </span>
        <XYFrame
          size={[120, 40]}
          lines={[{ coordinates: trend }]}
          xAccessor="day"
          yAccessor="value"
          lineStyle={{ stroke: sparkColor, strokeWidth: 2, fill: "none" }}
          margin={{ top: 4, bottom: 4, left: 0, right: 0 }}
        />
      </div>
    </div>
  )
}

export default function KpiCardSparkline({ data = sampleData }) {
  return (
    <div className="recipe-kpi-grid">
      {data.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  )
}
