import React, { useState } from "react"
import { LineChart } from "semiotic/xy"
import LiveExample from "../components/LiveExample"
import CodeBlock from "../components/CodeBlock"

const products = ["Atlas", "Beacon", "Cedar", "Delta", "Ember", "Fern"]

export default function DirectLabelsDemo() {
  const [enabled, setEnabled] = useState(true)
  const [position, setPosition] = useState<"start" | "end">("end")
  const [fontSize, setFontSize] = useState(12)
  const [height, setHeight] = useState(320)
  const [sideMargin, setSideMargin] = useState(110)
  const [count, setCount] = useState(6)
  const [units, setUnits] = useState(1)
  const [showLegend, setShowLegend] = useState(false)

  const data = Array.from({ length: count }, (_, series) =>
    Array.from({ length: 6 }, (_, month) => ({
      month: month + 1,
      value:
        Number(
          (
            50 +
            series * 0.35 +
            Math.sin((month * Math.PI) / 5) * (series % 2 ? 1 : -1) * (15 + series)
          ).toFixed(2),
        ) * units,
      product: products[series] || `Product ${series + 1}`,
    })),
  ).flat()

  return (
    <section aria-label="Direct label explorer">
      <h3 id="try-direct-labels">Try direct labels</h3>
      <p>
        These products finish close together. Turn labels off to compare the legend, then turn them
        back on to follow each name to its line. Change the controls and copy the resulting chart
        code below.
      </p>
      <fieldset
        style={{
          border: "1px solid var(--surface-3)",
          borderRadius: 8,
          padding: 16,
          margin: "16px 0",
        }}
      >
        <legend>Label and layout controls</legend>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          <label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />{" "}
            Direct labels
          </label>
          <label>
            <input
              type="checkbox"
              checked={showLegend}
              onChange={(event) => setShowLegend(event.target.checked)}
            />{" "}
            Keep a legend too
          </label>
          <label>
            Label position{" "}
            <select
              value={position}
              onChange={(event) => setPosition(event.target.value as "start" | "end")}
            >
              <option value="end">End (right)</option>
              <option value="start">Start (left)</option>
            </select>
          </label>
          <label>
            Series count{" "}
            <select value={count} onChange={(event) => setCount(Number(event.target.value))}>
              <option value={6}>6 products</option>
              <option value={24}>24 products (crowded)</option>
            </select>
          </label>
          <label>
            Numeric units{" "}
            <select value={units} onChange={(event) => setUnits(Number(event.target.value))}>
              <option value={1}>Original values</option>
              <option value={0.000001}>Multiply by 0.000001</option>
              <option value={1000000000}>Multiply by 1 billion</option>
            </select>
          </label>
          <label>
            Font size: {fontSize}px
            <input
              aria-label="Label font size"
              type="range"
              min={10}
              max={20}
              value={fontSize}
              onChange={(event) => setFontSize(Number(event.target.value))}
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label>
            Chart height: {height}px
            <input
              aria-label="Chart height"
              type="range"
              min={180}
              max={600}
              step={20}
              value={height}
              onChange={(event) => setHeight(Number(event.target.value))}
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label>
            Label-side margin: {sideMargin}px
            <input
              aria-label="Label-side margin"
              type="range"
              min={40}
              max={180}
              step={10}
              value={sideMargin}
              onChange={(event) => setSideMargin(Number(event.target.value))}
              style={{ display: "block", width: "100%" }}
            />
          </label>
        </div>
      </fieldset>

      <LiveExample
        type={LineChart}
        importStatement={'import { LineChart } from "semiotic/xy"'}
        startHidden={false}
        frameProps={{
          data,
          xAccessor: "month",
          yAccessor: "value",
          lineBy: "product",
          colorBy: "product",
          directLabel: enabled ? { position, fontSize } : false,
          ...(showLegend ? { showLegend: true } : {}),
          height,
          margin: {
            top: 40,
            bottom: 50,
            left: position === "start" ? sideMargin : 70,
            right: position === "end" ? sideMargin : 30,
          },
          yExtent: [0, 100 * units],
          yFormat: (value: number) => Number(value).toPrecision(2),
          xLabel: "Month",
          yLabel: "Value",
          title: "Product trends",
          description:
            "Product values converge at the endpoints. Direct labels identify each series.",
          showPoints: true,
          accessibleTable: true,
        }}
        overrideProps={{ data: "data /* Copy includes every row used in this example */" }}
      />

      <h3 id="how-direct-labels-work">How placement works</h3>
      <ol>
        <li>
          <code>lineBy</code> groups the rows into lines; <code>colorBy</code>
          supplies the category names and matching colors. Each name starts at its series’ first or
          last x value, depending on <code>position</code>.
        </li>
        <li>
          Labels share a column in the side margin. When endpoints are close, labels move vertically
          to make room. Connector lines keep moved labels attached to their endpoints.
        </li>
        <li>
          Spacing uses pixels after the data is scaled. Try changing numeric units: the axis values
          change, but the label spacing stays the same. Resizing and font changes trigger a new
          placement.
        </li>
      </ol>

      <h3 id="direct-label-space">When labels don’t fit</h3>
      <p>
        Select <strong>24 products</strong> and reduce the chart height to 180px. Labels that cannot
        fit are omitted. Increase the height to restore vertical space; increase the label-side
        margin if a name is too wide. Larger fonts need more room in both directions.
      </p>
      <p>
        All series remain in the chart’s accessible description even when their visible labels are
        omitted. This example also enables
        <code> accessibleTable</code> for the full data. For a dense chart, turn on{" "}
        <strong>Keep a legend too</strong> or use fewer series per chart.
      </p>

      <h3 id="use-direct-labels">Use it in your chart</h3>
      <p>
        Add <code>directLabel</code> to a grouped LineChart for end labels at the default 11px size.
        Pass an object to choose the side and font size. The default margin reserves space for
        names; an explicit
        <code> margin</code> overrides it, so allow enough room on the label side.
      </p>
      <CodeBlock
        code={`import { LineChart } from "semiotic/xy"

const data = [
  { month: 1, value: 20, product: "Atlas" },
  { month: 2, value: 32, product: "Atlas" },
  { month: 1, value: 40, product: "Beacon" },
  { month: 2, value: 33, product: "Beacon" }
]

<LineChart
  data={data}
  xAccessor="month"
  yAccessor="value"
  lineBy="product"
  colorBy="product"
  directLabel={{ position: "end", fontSize: 12 }}
  height={320}
  title="Product trends"
  description="Atlas and Beacon finish at similar values."
  accessibleTable
/>`}
      />
      <p>
        <code>directLabel={"{true}"}</code> uses the defaults.
        <code> directLabel={'{{ position: "start" }}'}</code> labels the first endpoint. The legend
        is hidden automatically while direct labels are enabled; <code>showLegend={"{true}"}</code>{" "}
        keeps it visible.
      </p>
    </section>
  )
}
