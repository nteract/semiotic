import React, { useState, useEffect } from "react"
import { GaugeChart } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Props definition
// ---------------------------------------------------------------------------

const gaugeProps = [
  { name: "value", type: "number", required: true, default: null, description: "Current gauge value." },
  { name: "min", type: "number", required: false, default: "0", description: "Minimum scale value." },
  { name: "max", type: "number", required: false, default: "100", description: "Maximum scale value." },
  { name: "thresholds", type: "Array<{value, color, label?}>", required: false, default: null, description: "Threshold zones. Each zone's value is the upper bound. Last value should equal max." },
  { name: "color", type: "string", required: false, default: "theme primary", description: "Fill color when no thresholds defined." },
  { name: "backgroundColor", type: "string", required: false, default: "#e0e0e0", description: "Background arc color." },
  { name: "arcWidth", type: "number", required: false, default: "0.3", description: "Arc thickness as fraction of radius (0–1)." },
  { name: "sweep", type: "number", required: false, default: "240", description: "Arc sweep angle in degrees." },
  { name: "showNeedle", type: "boolean", required: false, default: "true", description: "Show a needle indicator at the current value." },
  { name: "needleColor", type: "string", required: false, default: "theme text", description: "Needle stroke color." },
  { name: "centerContent", type: "ReactNode | (value, min, max) => ReactNode", required: false, default: "value label", description: "Custom content rendered at the gauge center." },
  { name: "valueFormat", type: "(value) => string", required: false, default: "Math.round", description: "Format function for the default center value label." },
  { name: "showScaleLabels", type: "boolean", required: false, default: "true", description: "Show scale labels at threshold boundaries." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover interaction on arc segments." },
  { name: "tooltip", type: "TooltipProp", required: false, default: "default", description: "Tooltip on arc hover." },
  { name: "annotations", type: "Array<object>", required: false, default: null, description: "Annotation objects — supports gauge-label, gauge-needle, and standard types." },
]

function StreamingGaugeDemo() {
  // NYT-style election needle: value drifts around 50 with occasional swings
  const [value, setValue] = useState(50)
  useEffect(() => {
    const id = setInterval(() => {
      setValue(v => {
        const drift = (Math.random() - 0.48) * 3
        const revert = (52 - v) * 0.02
        return Math.max(40, Math.min(60, v + drift + revert))
      })
    }, 400)
    return () => clearInterval(id)
  }, [])

  const lead = value - 50
  const absLead = Math.abs(lead)
  const leaderLabel = absLead < 2 ? "Toss-up" : lead > 0 ? "Candidate B" : "Candidate A"
  const leaderColor = absLead < 2 ? "#888" : lead > 0 ? "#4575b4" : "#d73027"

  return (
    <div style={{ textAlign: "center", marginBottom: 16, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "var(--semiotic-text-secondary, #888)", marginBottom: 4 }}>
        Estimated chance of winning
      </div>
      <GaugeChart
        value={value}
        min={40}
        max={60}
        sweep={180}
        arcWidth={0.15}
        fillZones={false}
        showNeedle={true}
        needleColor="#222"
        showScaleLabels={false}
        thresholds={[
          { value: 45, color: "#d73027" },
          { value: 48, color: "#fc8d59" },
          { value: 52, color: "#ccc" },
          { value: 55, color: "#91bfdb" },
          { value: 60, color: "#4575b4" },
        ]}
        centerContent={
          <div style={{ textAlign: "center", lineHeight: 1.1 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: leaderColor }}>
              {absLead < 2 ? "Even" : `+${absLead.toFixed(1)}`}
            </div>
            <div style={{ fontSize: 11, color: leaderColor, fontWeight: 600 }}>{leaderLabel}</div>
          </div>
        }
        width={360}
        height={200}
      />
      <div style={{ display: "flex", justifyContent: "space-between", width: 360, fontSize: 11, color: "var(--semiotic-text-secondary, #888)", padding: "4px 40px 0" }}>
        <span style={{ color: "#d73027", fontWeight: 600 }}>← Candidate A</span>
        <span style={{ color: "#4575b4", fontWeight: 600 }}>Candidate B →</span>
      </div>
    </div>
  )
}

export default function GaugeChartPage() {
  return (
    <PageLayout>
      <ComponentMeta
        componentName="GaugeChart"
        importStatement='import { GaugeChart } from "semiotic"'
        tier="charts"
        wraps="StreamOrdinalFrame"
        wrapsPath="/frames/ordinal-frame"
        related={[
          { name: "DonutChart", path: "/charts/donut-chart" },
          { name: "PieChart", path: "/charts/pie-chart" },
        ]}
      />

      <h2 id="quick-start">Quick Start</h2>
      <p>
        A gauge displays a single numeric value against a scale with optional
        threshold zones. Built on top of the ordinal frame's radial projection — the
        same rendering pipeline as pie and donut charts.
      </p>

      <StreamingToggle
        staticContent={
          <LiveExample
            frameProps={{
              value: 72,
              max: 100,
              thresholds: [
                { value: 50, color: "#4caf50", label: "Good" },
                { value: 80, color: "#ff9800", label: "Warning" },
                { value: 100, color: "#f44336", label: "Critical" },
              ],
            }}
            type={GaugeChart}
            overrideProps={{
              thresholds: `[
  { value: 50, color: "#4caf50", label: "Good" },
  { value: 80, color: "#ff9800", label: "Warning" },
  { value: 100, color: "#f44336", label: "Critical" },
]`,
            }}
            hiddenProps={{}}
          />
        }
        streamingContent={
          <StreamingDemo
            renderChart={() => <StreamingGaugeDemo />}
            code={`function LiveGauge() {
  const [value, setValue] = useState(50)
  useEffect(() => {
    const id = setInterval(() => {
      setValue(v => Math.max(0, Math.min(100,
        v + (Math.random() - 0.45) * 8)))
    }, 500)
    return () => clearInterval(id)
  }, [])
  return (
    <GaugeChart
      value={value}
      thresholds={[
        { value: 50, color: "#4caf50", label: "Normal" },
        { value: 80, color: "#ff9800", label: "Warning" },
        { value: 100, color: "#f44336", label: "Critical" },
      ]}
    />
  )
}`}
          />
        }
      />

      <h2 id="examples">Examples</h2>

      <h3 id="simple-gauge">Simple Gauge</h3>
      <p>
        A minimal gauge with no threshold zones — just a value against a scale.
      </p>

      <LiveExample
        frameProps={{
          value: 65,
          max: 100,
          width: 250,
          height: 200,
        }}
        type={GaugeChart}
        overrideProps={{}}
        hiddenProps={{}}
      />

      <h3 id="threshold-zones">Threshold Zones</h3>
      <p>
        Define color-coded zones with the <code>thresholds</code> prop. Each
        threshold specifies the upper bound of a zone. The gauge fills through
        zones as the value increases.
      </p>

      <LiveExample
        frameProps={{
          value: 35,
          min: 0,
          max: 100,
          thresholds: [
            { value: 25, color: "#f44336" },
            { value: 50, color: "#ff9800" },
            { value: 75, color: "#ffeb3b" },
            { value: 100, color: "#4caf50" },
          ],
          width: 250,
          height: 200,
        }}
        type={GaugeChart}
        overrideProps={{
          thresholds: `[
  { value: 25, color: "#f44336" },
  { value: 50, color: "#ff9800" },
  { value: 75, color: "#ffeb3b" },
  { value: 100, color: "#4caf50" },
]`,
        }}
        hiddenProps={{}}
      />

      <h3 id="custom-range">Custom Range</h3>
      <p>
        Gauges don't have to be 0–100. Set <code>min</code> and <code>max</code>{" "}
        to any range, and use <code>valueFormat</code> for custom labels.
      </p>

      <LiveExample
        frameProps={{
          value: 4.2,
          min: 0,
          max: 5,
          valueFormat: (v) => `${v.toFixed(1)} / 5`,
          thresholds: [
            { value: 2, color: "#f44336" },
            { value: 3.5, color: "#ff9800" },
            { value: 5, color: "#4caf50" },
          ],
          width: 250,
          height: 200,
        }}
        type={GaugeChart}
        overrideProps={{
          min: "0",
          max: "5",
          valueFormat: `v => \`\${v.toFixed(1)} / 5\``,
        }}
        hiddenProps={{}}
      />

      <h3 id="half-circle">Half Circle</h3>
      <p>
        Set <code>sweep={180}</code> for a traditional half-circle gauge.
      </p>

      <LiveExample
        frameProps={{
          value: 80,
          sweep: 180,
          thresholds: [
            { value: 60, color: "#4caf50" },
            { value: 80, color: "#ff9800" },
            { value: 100, color: "#f44336" },
          ],
          width: 300,
          height: 180,
        }}
        type={GaugeChart}
        overrideProps={{
          sweep: "180",
        }}
        hiddenProps={{}}
      />

      <h3 id="thick-arc">Thick Arc</h3>
      <p>
        Increase <code>arcWidth</code> for a chunkier ring. Decrease for a thin
        progress ring.
      </p>

      <LiveExample
        frameProps={{
          value: 55,
          arcWidth: 0.5,
          showNeedle: false,
          width: 200,
          height: 200,
        }}
        type={GaugeChart}
        overrideProps={{
          arcWidth: "0.5",
          showNeedle: "false",
        }}
        hiddenProps={{}}
      />

      <h3 id="custom-center">Custom Center Content</h3>
      <p>
        Replace the default value label with any React content via{" "}
        <code>centerContent</code>.
      </p>

      <CodeBlock
        code={`<GaugeChart
  value={92}
  thresholds={[
    { value: 90, color: "#f44336" },
    { value: 95, color: "#ff9800" },
    { value: 100, color: "#4caf50" },
  ]}
  centerContent={(value, min, max) => (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}%</div>
      <div style={{ fontSize: 11, color: "#888" }}>Uptime SLA</div>
    </div>
  )}
/>`}
        language="jsx"
      />

      <h3 id="streaming">Streaming — Election Needle</h3>
      <p>
        The gauge below simulates a live election forecast in the style of the
        NYT needle. The value drifts around 50% with a slight lean,
        updating every 400ms. The diverging color scheme runs from red
        (Candidate A) through a grey toss-up zone to blue (Candidate B).
        Only the needle moves — the threshold zones stay fixed.
      </p>

      <StreamingGaugeDemo />

      <CodeBlock
        code={`function ElectionNeedle() {
  const [value, setValue] = useState(50)
  useEffect(() => {
    const id = setInterval(() => {
      setValue(v => {
        const drift = (Math.random() - 0.48) * 3
        const revert = (52 - v) * 0.02
        return Math.max(40, Math.min(60, v + drift + revert))
      })
    }, 400)
    return () => clearInterval(id)
  }, [])

  return (
    <GaugeChart
      value={value} min={40} max={60} sweep={180}
      arcWidth={0.15} needleColor="#222"
      fillZones={false}  // zones stay fixed, only needle moves
      thresholds={[
        { value: 45, color: "#d73027" },   // strong A (dark red)
        { value: 48, color: "#fc8d59" },   // lean A (light red)
        { value: 52, color: "#ccc" },      // toss-up (grey)
        { value: 55, color: "#91bfdb" },   // lean B (light blue)
        { value: 60, color: "#4575b4" },   // strong B (dark blue)
      ]}
      centerContent={...}  // +{abs(value-50)} colored by leader
    />
  )
}`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="GaugeChart" props={gaugeProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/donut-chart">DonutChart</Link> — multi-category
          ring chart (GaugeChart is built on the same rendering pipeline)
        </li>
        <li>
          <Link to="/charts/pie-chart">PieChart</Link> — part-to-whole
          without the inner radius
        </li>
        <li>
          <Link to="/features/annotations">Annotations</Link> — adding callouts,
          highlights, and notes to any visualization
        </li>
      </ul>
    </PageLayout>
  )
}
