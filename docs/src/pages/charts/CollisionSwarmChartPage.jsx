import React, { useMemo, useState } from "react"
import { CollisionSwarmChart } from "semiotic/physics"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import PageLayout from "../../components/PageLayout"
import ChartGrounding from "../../components/ChartGrounding"

const collisionSwarmChartProps = [
  { name: "data", type: "array", required: true, default: null, description: "Rows to render as one collision body each." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Quantitative field that anchors each body along the x-axis." },
  { name: "groupAccessor", type: "string | function", required: false, default: null, description: "Optional categorical field that creates separate swarm lanes." },
  { name: "radiusAccessor", type: "string | function", required: false, default: null, description: "Optional numeric field used as per-body radius in pixels." },
  { name: "pointRadius", type: "number", required: false, default: "5", description: "Fallback body radius." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Categorical field used to color bodies." },
  { name: "xExtent", type: "array", required: false, default: "inferred from data", description: "[min, max] domain for the quantitative axis." },
  { name: "collisionIterations", type: "number", required: false, default: "6", description: "Solver iterations per fixed physics step." },
  { name: "settle", type: "boolean", required: false, default: "false", description: "Start bodies near their targets for a calmer first paint or reduced-motion demo." },
  { name: "showProjection", type: "boolean", required: false, default: "true", description: "Draw the x-axis and lane guides behind moving bodies." },
  { name: "seed", type: "number", required: false, default: "1", description: "Deterministic simulation seed." },
  { name: "size", type: "array", required: false, default: "[700, 360]", description: "[width, height] in pixels." },
  { name: "hoverRadius", type: "number", required: false, default: "16", description: "Pixel hit radius for body hover tooltips." },
  { name: "paused", type: "boolean", required: false, default: "false", description: "Pause the simulation." },
  { name: "tooltip", type: "boolean | function | object", required: false, default: "true", description: "Enable the default body tooltip, pass a custom tooltip renderer/config, or set false to disable hover tooltips." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Advanced StreamPhysicsFrame props." },
]

const groupLabels = ["Control", "Variant", "Holdout", "Pilot"]

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

const inputStyle = {
  minHeight: 34,
  minWidth: 140,
  border: "1px solid var(--surface-3)",
  borderRadius: 6,
  background: "var(--surface-0)",
  color: "var(--text-primary)",
  padding: "0 8px",
}

const checkboxLabelStyle = {
  ...controlLabelStyle,
  gridTemplateColumns: "auto 1fr",
  gap: 8,
  alignItems: "center",
  textTransform: "none",
  fontSize: 13,
}

function seededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussian(random) {
  const u = Math.max(0.000001, random())
  const v = Math.max(0.000001, random())
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function makeSwarmData({ count, distribution, laneCount, variableRadius }) {
  const random = seededRandom(count * 13 + laneCount * 97 + distribution.length)
  return Array.from({ length: count }, (_, index) => {
    const laneIndex = index % laneCount
    const group = groupLabels[laneIndex]
    let x
    if (distribution === "bimodal") {
      x = (index % 2 === 0 ? 36 : 66) + gaussian(random) * 7
    } else if (distribution === "skewed") {
      x = 22 + -Math.log(Math.max(0.000001, 1 - random())) * 16
    } else {
      x = 52 + gaussian(random) * 14
    }
    x += laneCount > 1 ? (laneIndex - (laneCount - 1) / 2) * 4 : 0
    return {
      id: `${distribution}-${laneCount}-${index}`,
      x: Math.round(clamp(x, 4, 96) * 10) / 10,
      group,
      radius: variableRadius ? Math.round((3 + random() * 5) * 10) / 10 : 5,
    }
  })
}

export default function CollisionSwarmChartPage() {
  const [distribution, setDistribution] = useState("normal")
  const [count, setCount] = useState(120)
  const [laneCount, setLaneCount] = useState(2)
  const [variableRadius, setVariableRadius] = useState(false)
  const [settle, setSettle] = useState(false)
  const [showProjection, setShowProjection] = useState(true)
  const data = useMemo(
    () => makeSwarmData({ count, distribution, laneCount, variableRadius }),
    [count, distribution, laneCount, variableRadius],
  )
  const chartKey = `${distribution}-${count}-${laneCount}-${variableRadius}-${settle}`
  const usesGroups = laneCount > 1

  return (
    <PageLayout
      title="CollisionSwarmChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Physics", path: "/charts/collision-swarm-chart" },
        { label: "CollisionSwarmChart", path: "/charts/collision-swarm-chart" },
      ]}
      prevPage={{ title: "PhysicsPileChart", path: "/charts/physics-pile-chart" }}
      nextPage={{ title: "PhysicalFlowChart", path: "/charts/physical-flow-chart" }}
    >
      <ComponentMeta
        componentName="CollisionSwarmChart"
        importStatement='import { CollisionSwarmChart } from "semiotic/physics"'
        tier="charts"
        wraps="StreamPhysicsFrame"
        wrapsPath="/dev/physics-frame"
        related={[
          { name: "SwarmPlot", path: "/charts/swarm-plot" },
          { name: "DotPlot", path: "/charts/dot-plot" },
          { name: "PhysicsPileChart", path: "/charts/physics-pile-chart" },
          { name: "ProcessFlowChart", path: "/charts/process-flow-chart" },
          { name: "PhysicsCustomChart", path: "/charts/physics-custom-chart" },
        ]}
      />

      <ChartGrounding
        component="CollisionSwarmChart"
        props={{
          data: data.slice(0, 12),
          xAccessor: "x",
          groupAccessor: usesGroups ? "group" : undefined,
          radiusAccessor: variableRadius ? "radius" : undefined,
          xExtent: [0, 100],
          title: "Collision swarm sample",
        }}
      />

      <h2 id="example">Example</h2>
      <div style={controlPanelStyle} aria-label="Collision swarm controls">
        <label style={controlLabelStyle}>
          Distribution
          <select
            style={inputStyle}
            value={distribution}
            onChange={(event) => setDistribution(event.target.value)}
          >
            <option value="normal">Normal</option>
            <option value="bimodal">Bimodal</option>
            <option value="skewed">Skewed</option>
          </select>
        </label>
        <label style={controlLabelStyle}>
          Points
          <select
            style={inputStyle}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          >
            <option value={60}>60</option>
            <option value={120}>120</option>
            <option value={220}>220</option>
          </select>
        </label>
        <label style={controlLabelStyle}>
          Lanes
          <select
            style={inputStyle}
            value={laneCount}
            onChange={(event) => setLaneCount(Number(event.target.value))}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={4}>4</option>
          </select>
        </label>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={variableRadius}
            onChange={(event) => setVariableRadius(event.target.checked)}
          />
          Variable radius
        </label>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={settle}
            onChange={(event) => setSettle(event.target.checked)}
          />
          Start settled
        </label>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={showProjection}
            onChange={(event) => setShowProjection(event.target.checked)}
          />
          Projection
        </label>
      </div>
      <div style={{ overflowX: "auto", border: "1px solid var(--surface-3)", borderRadius: 8, padding: 12 }}>
        <CollisionSwarmChart
          key={chartKey}
          data={data}
          xAccessor="x"
          groupAccessor={usesGroups ? "group" : undefined}
          radiusAccessor={variableRadius ? "radius" : undefined}
          colorBy={usesGroups ? "group" : undefined}
          xExtent={[0, 100]}
          collisionIterations={8}
          pointRadius={5}
          settle={settle}
          showProjection={showProjection}
          size={[640, 340]}
          title="Collision-relaxed distribution"
        />
      </div>
      <p>
        Use CollisionSwarmChart when the base chart is a dot strip or swarm plot, but overlap is
        part of the story: bodies push each other apart while springs keep every point tethered to
        its quantitative position. The chart still reads from the x-axis and optional lanes at rest.
      </p>
      <p>
        Use SwarmPlot when you only need a static distribution. Use PhysicsCustomChart when the
        scene needs custom barriers, sensors, or non-axis forces.
      </p>

      <h2 id="props">Props</h2>
      <PropTable componentName="CollisionSwarmChart" props={collisionSwarmChartProps} />
    </PageLayout>
  )
}
