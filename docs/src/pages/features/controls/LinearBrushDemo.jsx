import React, { useMemo, useState } from "react"
import { LinearBrush } from "semiotic/controls"
import { LineChart, StackedAreaChart } from "semiotic/xy"
import useResponsiveWidth from "../../../hooks/useResponsiveWidth"

const DAY = 24 * 60 * 60 * 1000
const START = Date.UTC(2025, 0, 1)
const DAYS = 120
const END = START + (DAYS - 1) * DAY
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const data = ["Ingest", "Query"].flatMap((series, offset) =>
  Array.from({ length: DAYS }, (_, index) => ({
    time: START + index * DAY,
    value: Math.round(40 + 18 * Math.sin(index / 9 + offset * 1.7) + 8 * Math.sin(index / 3.1 + offset) + offset * 12),
    series,
  }))
)

const formatDay = (value) => {
  const date = new Date(value)
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`
}
const formatLabel = (value) => `${formatDay(value)}\n${new Date(value).getUTCFullYear()}`
const overviewMargin = { top: 14, right: 16, bottom: 36, left: 16 }

/**
 * A date window drawn over an overview chart: the brush overlays the
 * overview's plot through `inset`, and the detail chart follows it live.
 */
export default function LinearBrushDemo() {
  const [width, hostRef] = useResponsiveWidth(320, 820)
  const chartWidth = Math.max(320, Math.floor(width))
  const [range, setRange] = useState([START + 30 * DAY, START + 75 * DAY])
  const detail = useMemo(
    () => (range ? data.filter((row) => row.time >= range[0] - DAY && row.time <= range[1] + DAY) : data),
    [range]
  )
  return (
    <div ref={hostRef} style={styles.shell}>
      <LineChart
        data={detail}
        xAccessor="time"
        yAccessor="value"
        lineBy="series"
        colorBy="series"
        width={chartWidth}
        height={220}
        xExtent={range ?? [START, END]}
        xFormat={formatDay}
        showLegend
        legendPosition="top"
        description="Daily ingest and query volume for the selected date window."
      />
      <div style={{ position: "relative", width: chartWidth, height: 110 }}>
        <StackedAreaChart
          data={data}
          xAccessor="time"
          yAccessor="value"
          areaBy="series"
          colorBy="series"
          width={chartWidth}
          height={110}
          margin={overviewMargin}
          showAxes={false}
          showLegend={false}
          enableHover={false}
          description="Overview of all 120 days."
        />
        <LinearBrush
          domain={[START, END]}
          inset={overviewMargin}
          value={range}
          onChange={(next) => setRange(next)}
          label="Date window"
          step={DAY}
          largeStep={7 * DAY}
          minSpan={7 * DAY}
          snap
          maskStyle
          showMoveHandle
          resetOnDoubleClick
          resetValue={[START, END]}
          showExtentLabels
          formatValue={formatLabel}
          labelBounds={[-overviewMargin.left, chartWidth - overviewMargin.left]}
        />
      </div>
      <p style={styles.readout}>
        {range
          ? <>Showing <strong>{formatDay(range[0])}</strong> to <strong>{formatDay(range[1])}</strong>.</>
          : "No window selected; showing all days."}{" "}
        Drag an end or the window, draw a new one on the overview, double-click to reset, or focus
        a handle and use the arrow keys (Shift for a week).
      </p>
    </div>
  )
}

const styles = {
  shell: { display: "grid", gap: 8, margin: "16px 0", overflowX: "auto" },
  readout: { margin: 0, color: "var(--text-secondary)", fontSize: 14 },
}
