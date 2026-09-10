import React from "react"
import { LinkedCharts, useSelection } from "semiotic/ai"
import { LineChart } from "semiotic/xy"
import { BarChart } from "semiotic/ordinal"
import { TemporalHistogram } from "semiotic/realtime"

const colors = { North: "#2563eb", South: "#d97706" }
const data = [
  { time: 5, value: 4, category: "North" },
  { time: 15, value: 8, category: "North" },
  { time: 25, value: 6, category: "North" },
  { time: 5, value: 8, category: "South" },
  { time: 15, value: 5, category: "South" },
  { time: 25, value: 10, category: "South" },
]
const selection = { name: "detail", unselectedOpacity: 0.12, selectedStyle: { strokeWidth: 3 } }
const categoryHover = { name: "detail", mode: "field" as const, fields: ["category"] }
const timeExtent: [number, number] = [0, 30]
const valueExtent: [number, number] = [0, 12]
const timeFormat = (value: number) => String(value)

function SelectionSummary() {
  const selected = useSelection({ name: "detail" })
  const matching = data.filter(selected.predicate)
  return (
    <p data-testid="selection-summary" style={{ minHeight: 24, margin: "8px 0", fontSize: 14 }}>
      {selected.isActive
        ? `${matching.length} matching observations: ${[...new Set(matching.map((d) => d.category))].join(", ")}`
        : "Hover a category bar, a line, or a time bin to highlight matching observations."}
    </p>
  )
}

/** Shared domains and equal side margins align all three temporal plots. */
export default function TemporalHistogramLinkedExample() {
  return (
    <LinkedCharts>
      <div
        data-testid="temporal-linked-example"
        style={{ width: "100%", background: "var(--surface-1, white)" }}
      >
        <SelectionSummary />
        <div data-testid="category-source">
          <BarChart
            data={[
              { category: "North", value: 18 },
              { category: "South", value: 23 },
            ]}
            categoryAccessor="category"
            valueAccessor="value"
            colorBy="category"
            colorScheme={colors}
            height={130}
            responsiveWidth
            showLegend={false}
            animate={false}
            title="Category totals"
            linkedHover={categoryHover}
            selection={selection}
            margin={{ left: 48, right: 20, top: 28, bottom: 28 }}
          />
        </div>
        <div data-testid="linked-line">
          <LineChart
            data={data}
            xAccessor="time"
            yAccessor="value"
            lineBy="category"
            colorBy="category"
            colorScheme={colors}
            showLegend={false}
            height={210}
            responsiveWidth
            showPoints
            pointRadius={5}
            animate={false}
            title="Observations"
            xExtent={timeExtent}
            yExtent={valueExtent}
            xFormat={timeFormat}
            linkedHover={categoryHover}
            selection={selection}
            margin={{ left: 48, right: 20, top: 28, bottom: 28 }}
          />
        </div>
        <div
          data-testid="mirrored-histograms"
          aria-label="North and South histograms sharing a zero baseline"
        >
          <div data-testid="upper-histogram">
            <TemporalHistogram
              data={data.filter((d) => d.category === "North")}
              binSize={10}
              height={100}
              responsiveWidth
              fill={colors.North}
              showTimeAxis={false}
              showLegend={false}
              timeExtent={timeExtent}
              valueExtent={valueExtent}
              margin={{ left: 48, right: 20, top: 0 }}
              gap={2}
              description="North time bins, growing upward from the shared baseline."
              linkedHover={{ name: "detail", mode: "field", fields: ["time", "category"] }}
              selection={selection}
            />
          </div>
          <div data-testid="lower-histogram">
            <TemporalHistogram
              data={data.filter((d) => d.category === "South")}
              binSize={10}
              height={128}
              responsiveWidth
              fill={colors.South}
              direction="down"
              showLegend={false}
              timeExtent={timeExtent}
              valueExtent={valueExtent}
              margin={{ left: 48, right: 20, top: 0, bottom: 28 }}
              gap={2}
              tickFormatTime={timeFormat}
              description="South time bins, growing downward from the shared baseline."
              linkedHover={{ name: "detail", mode: "field", fields: ["time", "category"] }}
              selection={selection}
            />
          </div>
        </div>
      </div>
    </LinkedCharts>
  )
}
