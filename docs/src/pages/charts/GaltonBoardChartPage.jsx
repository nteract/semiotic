import React, { useMemo, useState } from "react"
import { GaltonBoardChart } from "semiotic/physics"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import PageLayout from "../../components/PageLayout"
import ChartGrounding from "../../components/ChartGrounding"

// Deterministic bell-shaped sample (central-limit sum of uniforms) so the
// board settles into an actual distribution rather than a flat row.
const galtonData = (() => {
  let seed = 1337
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  return Array.from({ length: 160 }, (_, index) => {
    let sum = 0
    for (let k = 0; k < 6; k += 1) sum += rnd()
    return {
      id: `sample-${index}`,
      value: Math.round((sum / 6) * 100),
      cohort: index % 3 === 0 ? "forecast" : index % 3 === 1 ? "observed" : "baseline",
    }
  })
})()

const galtonBoardChartProps = [
  { name: "data", type: "array", required: false, default: null, description: "Rows to drop through the board. Optional when mode is mechanical." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Numeric field used to assign rows to bins." },
  { name: "valueExtent", type: "array", required: false, default: null, description: "Stable numeric [min, max] domain for binning and reference-line placement." },
  { name: "bins", type: "number", required: false, default: "21", description: "Number of landing bins." },
  { name: "mode", type: '"sample" | "mechanical"', required: false, default: '"sample"', description: "Use data values or a deterministic no-data demonstration." },
  { name: "pegRows", type: "number", required: false, default: "bins - 1", description: "Number of branch rows used by mechanical mode." },
  { name: "mechanicalCount", type: "number", required: false, default: "max(64, bins * 4)", description: "Number of generated bodies in mechanical mode." },
  { name: "branchProbability", type: "number", required: false, default: "0.5", description: "Probability that a generated body branches right at each peg." },
  { name: "ballRadius", type: "number", required: false, default: "4", description: "Radius for each simulated body." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Categorical field used to color bodies." },
  { name: "referenceLines", type: "object | array", required: false, default: null, description: "One or more value markers drawn over the board: { value, label, color, strokeWidth, strokeDasharray, labelPosition }." },
  { name: "seed", type: "number", required: false, default: "1", description: "Deterministic simulation seed." },
  { name: "showProjection", type: "boolean", required: false, default: "true", description: "Draw the bin, floor, and settled-count scaffold over the moving bodies." },
  { name: "size", type: "array", required: false, default: "[700, 420]", description: "[width, height] in pixels." },
  { name: "width", type: "number", required: false, default: "700", description: "Width alias used when size is omitted." },
  { name: "height", type: "number", required: false, default: "420", description: "Height alias used when size is omitted." },
  { name: "hoverRadius", type: "number", required: false, default: "16", description: "Pixel hit radius for body hover tooltips." },
  { name: "paused", type: "boolean", required: false, default: "false", description: "Pause the simulation." },
  { name: "tooltip", type: "boolean | function | object", required: false, default: "true", description: "Enable the default body tooltip, pass a custom tooltip renderer/config, or set false to disable hover tooltips." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Advanced StreamPhysicsFrame props." },
]

const controlPanelStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "end",
  margin: "0 0 12px",
  padding: 12,
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  background: "var(--surface-1)",
}

const controlLabelStyle = {
  display: "grid",
  gap: 6,
  color: "var(--text-secondary)",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
}

const segmentStyle = {
  display: "inline-flex",
  overflow: "hidden",
  border: "1px solid var(--surface-3)",
  borderRadius: 7,
}

const buttonStyle = {
  minHeight: 34,
  padding: "0 12px",
  border: 0,
  borderRight: "1px solid var(--surface-3)",
  background: "var(--surface-0)",
  color: "var(--text-primary)",
  fontWeight: 800,
  cursor: "pointer",
}

const activeButtonStyle = {
  ...buttonStyle,
  background: "#244f72",
  color: "#fff",
}

const inputStyle = {
  minHeight: 34,
  minWidth: 160,
  border: "1px solid var(--surface-3)",
  borderRadius: 6,
  background: "var(--surface-0)",
  color: "var(--text-primary)",
  padding: "0 8px",
}

export default function GaltonBoardChartPage() {
  const [mode, setMode] = useState("sample")
  const [branchProbability, setBranchProbability] = useState(0.5)
  const [mechanicalCount, setMechanicalCount] = useState(96)
  const [pegRows, setPegRows] = useState(10)
  const chartKey = `${mode}-${branchProbability}-${mechanicalCount}-${pegRows}`
  const demoProps = useMemo(
    () =>
      mode === "mechanical"
        ? {
            mode,
            bins: pegRows + 1,
            pegRows,
            mechanicalCount,
            branchProbability,
            colorBy: "side",
            title: "Mechanical branch demo",
          }
        : {
            data: galtonData,
            valueAccessor: "value",
            colorBy: "cohort",
            bins: 12,
            title: "Distribution drop",
          },
    [branchProbability, mechanicalCount, mode, pegRows],
  )

  return (
    <PageLayout
      title="GaltonBoardChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Physics", path: "/charts/galton-board-chart" },
        { label: "GaltonBoardChart", path: "/charts/galton-board-chart" },
      ]}
      nextPage={{ title: "EventDropChart", path: "/charts/event-drop-chart" }}
    >
      <ComponentMeta
        componentName="GaltonBoardChart"
        importStatement='import { GaltonBoardChart } from "semiotic/physics"'
        tier="charts"
        wraps="StreamPhysicsFrame"
        wrapsPath="/dev/physics-frame"
        related={[
          { name: "EventDropChart", path: "/charts/event-drop-chart" },
          { name: "PhysicsPileChart", path: "/charts/physics-pile-chart" },
          { name: "Histogram", path: "/charts/histogram" },
        ]}
      />

      <ChartGrounding
        component="GaltonBoardChart"
        props={{
          data: galtonData,
          valueAccessor: "value",
          colorBy: "cohort",
          bins: 12,
          title: "Distribution drop",
        }}
      />

      <h2 id="example">Example</h2>
      <div style={controlPanelStyle} aria-label="Galton board controls">
        <div style={controlLabelStyle}>
          <span>Mode</span>
          <div style={segmentStyle}>
            <button
              type="button"
              style={mode === "sample" ? activeButtonStyle : buttonStyle}
              onClick={() => setMode("sample")}
            >
              Sample
            </button>
            <button
              type="button"
              style={{
                ...(mode === "mechanical" ? activeButtonStyle : buttonStyle),
                borderRight: 0,
              }}
              onClick={() => setMode("mechanical")}
            >
              Mechanical
            </button>
          </div>
        </div>
        {mode === "mechanical" && (
          <>
            <label style={controlLabelStyle}>
              Branch probability {branchProbability.toFixed(2)}
              <input
                style={inputStyle}
                type="range"
                min="0.15"
                max="0.85"
                step="0.05"
                value={branchProbability}
                onChange={(event) => setBranchProbability(Number(event.target.value))}
              />
            </label>
            <label style={controlLabelStyle}>
              Bodies
              <select
                style={inputStyle}
                value={mechanicalCount}
                onChange={(event) => setMechanicalCount(Number(event.target.value))}
              >
                <option value={48}>48</option>
                <option value={96}>96</option>
                <option value={144}>144</option>
              </select>
            </label>
            <label style={controlLabelStyle}>
              Peg rows
              <select
                style={inputStyle}
                value={pegRows}
                onChange={(event) => setPegRows(Number(event.target.value))}
              >
                <option value={6}>6</option>
                <option value={10}>10</option>
                <option value={14}>14</option>
              </select>
            </label>
          </>
        )}
      </div>
      <div style={{ overflowX: "auto", border: "1px solid var(--surface-3)", borderRadius: 8, padding: 12 }}>
        <GaltonBoardChart
          key={chartKey}
          {...demoProps}
          size={[640, 320]}
        />
      </div>
      <p>
        Mechanical mode generates seeded Bernoulli paths without requiring data. Use it for a
        didactic Galton board, design sketch, or empty-state explanation; switch back to sample mode
        when real observations should determine the settled bins.
      </p>

      <h2 id="props">Props</h2>
      <PropTable componentName="GaltonBoardChart" props={galtonBoardChartProps} />
    </PageLayout>
  )
}
