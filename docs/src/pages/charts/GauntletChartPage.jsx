import React, { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { GauntletChart } from "semiotic/physics"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import PageLayout from "../../components/PageLayout"
import ChartGrounding from "../../components/ChartGrounding"

const sampleProjects = [
  {
    id: "civic-housing",
    label: "Civic Housing",
    positives: ["homes", "shade", "transit"],
    negatives: ["cost"],
    metrics: { units: 42 },
    viability: 92,
  },
  {
    id: "main-street",
    label: "Main Street",
    positives: ["homes", "plaza"],
    negatives: ["cost", "fatigue"],
    metrics: { units: 18 },
    viability: 74,
  },
  {
    id: "fragile-infill",
    label: "Fragile Infill",
    positives: ["homes"],
    negatives: ["cost", "ugly", "slowdown"],
    metrics: { units: 9 },
    viability: 48,
  },
]

const positiveProperties = [
  { id: "homes", label: "Homes", short: "H", color: "#22c55e", value: 3, buoyancy: 3, radius: 10 },
  { id: "shade", label: "Shade", short: "S", color: "#06b6d4", value: 1.4, buoyancy: 1.8, radius: 8 },
  { id: "transit", label: "Transit", short: "T", color: "#f59e0b", value: 1.8, buoyancy: 2, radius: 8 },
  { id: "plaza", label: "Plaza", short: "P", color: "#a855f7", value: 1.2, buoyancy: 1.5, radius: 8 },
]

const negativeProperties = [
  { id: "cost", label: "Cost", short: "$", color: "#ef4444", load: 1.1, radius: 7 },
  { id: "ugly", label: "Ugly", short: "U", color: "#f97316", load: 1.2, radius: 7 },
  { id: "fatigue", label: "Fatigue", short: "F", color: "#64748b", load: 0.9, radius: 7 },
  { id: "slowdown", label: "Slowdown", short: "D", color: "#991b1b", load: 1.4, radius: 7 },
]

const gauntletChartProps = [
  { name: "data", type: "array", required: false, default: "[]", description: "Project rows. Each row becomes a compound physics body: one core plus property particles." },
  { name: "idAccessor", type: "string | function", required: false, default: '"id"', description: "Stable id for each project." },
  { name: "positiveAccessor", type: "string | function", required: false, default: "all positive property ids", description: "Returns positive property ids initially attached to a project." },
  { name: "negativeAccessor", type: "string | function", required: false, default: "[]", description: "Returns negative property ids initially attached to a project." },
  { name: "positiveProperties", type: "array", required: true, default: null, description: "Definitions for lift, value, color, radius, spring, and optional custom target behavior." },
  { name: "negativeProperties", type: "array", required: true, default: null, description: "Definitions for load, pull, color, radius, spring, and optional custom target behavior." },
  { name: "gates", type: "array", required: false, default: "[]", description: "Named regions along the route. Each gate can contribute a StreamPhysicsFrame regionEffect." },
  { name: "events", type: "array | function", required: false, default: "[]", description: "Timed project events that add negatives, add positives, pop positives, pop negatives, change stage, mutate metrics, or set final outcome." },
  { name: "bodyGroups", type: "array | function", required: false, default: "[]", description: "Optional semantic groups for higher-level aggregates such as features or cohorts." },
  { name: "coreBody", type: "function", required: false, default: null, description: "Overrides generated core spawn fields for non-default glyphs, mass, radius, velocity, or spawn timing." },
  { name: "projectPlacement", type: "function", required: false, default: null, description: "Overrides start, route, socket, and graveyard coordinates per project." },
  { name: "coreForceMode", type: '"route" | "net"', required: false, default: '"route"', description: "Use the default authored route force or a net lift/drag vertical force for physical crash-line examples." },
  { name: "crashDetection", type: "boolean", required: false, default: "true", description: "When false, draw the crash line without turning contact with it into a live project crash." },
  { name: "terminalBehavior", type: '"outcome" | "hold-last"', required: false, default: '"outcome"', description: "Send terminal projects to socket/graveyard or hold them at their final authored stage." },
  { name: "initialSpawnPacing", type: "object", required: false, default: null, description: "Passed to StreamPhysicsFrame for staged project arrivals." },
  { name: "showChrome", type: "boolean", required: false, default: "true", description: "Draw the default route, gates, crash line, socket, and graveyard chrome." },
  { name: "showTethers", type: "boolean", required: false, default: "true", description: "Draw default canvas tethers between project cores and property particles." },
  { name: "viability", type: "function", required: false, default: "built-in score", description: "Computes project viability from project state and property definitions." },
  { name: "outcome", type: "function", required: false, default: "built if viability > 20", description: "Computes final outcome when a final event does not set one directly." },
  { name: "onStateChange", type: "function", required: false, default: null, description: "Receives live GauntletProjectState rows after effects, crashes, and outcomes change." },
  { name: "tooltip", type: "boolean | function | object", required: false, default: "true", description: "Enable the default project/property tooltip, pass a custom tooltip renderer/config, or set false to disable hover tooltips." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Advanced StreamPhysicsFrame props for custom rendering, region effects, config, accessibility, and hooks." },
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

const inputStyle = {
  minHeight: 34,
  minWidth: 148,
  border: "1px solid var(--surface-3)",
  borderRadius: 6,
  background: "var(--surface-0)",
  color: "var(--text-primary)",
  padding: "0 8px",
}

const readoutGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
  marginTop: 12,
}

const readoutCardStyle = {
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  background: "var(--surface-1)",
  padding: "10px 12px",
}

const codeBlockStyle = {
  background: "var(--surface-1)",
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  padding: 12,
  overflowX: "auto",
}

function buildGates(mode) {
  const strict = mode === "strict"
  return [
    {
      id: "design",
      label: "Design",
      color: "#06b6d4",
      regionEffect: { damping: strict ? 0.08 : 0.03, force: { x: strict ? 4 : 12, y: 0 } },
    },
    {
      id: "finance",
      label: "Finance",
      color: "#f59e0b",
      regionEffect: { damping: strict ? 0.12 : 0.05, force: { x: 8, y: strict ? 12 : 0 } },
    },
    {
      id: "permit",
      label: "Permit",
      color: "#22c55e",
      regionEffect: { damping: 0.04, force: { x: strict ? 10 : 20, y: 0 } },
    },
  ]
}

function buildEvents(project, mode) {
  const strict = mode === "strict"
  const fragile = project.id === "fragile-infill"
  const mixed = project.id === "main-street"
  return [
    {
      id: `${project.id}-design`,
      label: "Design review",
      time: 1.1,
      gateId: "design",
      effects: [
        {
          popPositive: strict && fragile ? { candidates: ["homes", "plaza", "shade"], count: 1 } : undefined,
          addNegative: strict && mixed ? ["fatigue"] : [],
          stage: strict && fragile ? "design stripped" : "design reviewed",
          summary: strict && fragile ? "A core benefit was removed during design review." : "Design review completed.",
        },
      ],
    },
    {
      id: `${project.id}-finance`,
      label: "Finance review",
      time: 2.2,
      gateId: "finance",
      effects: [
        {
          addNegative: project.negativeIds.includes("cost") ? ["slowdown"] : [],
          delayDelta: project.negativeIds.includes("cost") ? 0.6 : 0,
          metricsDelta: { reviewCost: strict ? 2 : 1 },
          stage: "finance reviewed",
          summary: "Cost pressure adds drag and delay.",
        },
      ],
    },
    {
      id: `${project.id}-permit`,
      label: "Permit outcome",
      time: 3.35,
      gateId: "permit",
      final: true,
      effects: [{ stage: "permit outcome" }],
    },
  ]
}

function viability(project, context) {
  const lift = project.activePositiveIds.reduce(
    (sum, id) => sum + (context.positiveProperties.get(id)?.value ?? 1),
    0,
  )
  const load = project.negativeIds.reduce(
    (sum, id) => sum + (context.negativeProperties.get(id)?.load ?? 1),
    0,
  )
  return Math.max(0, Math.min(100, project.datum.viability + lift * 4 - load * 9 - project.delay * 3))
}

function outcome(project) {
  if (project.viability >= 65) return "built"
  if (project.viability >= 30) return "approved_not_built"
  return "bad_design_crash"
}

function stateLabel(state) {
  if (!state) return "waiting"
  if (state.killed) return "crashed"
  if (state.outcome === "built") return "built"
  if (state.outcome === "approved_not_built") return "approved, not built"
  return state.stage
}

export default function GauntletChartPage() {
  const [mode, setMode] = useState("balanced")
  const [runKey, setRunKey] = useState(0)
  const [states, setStates] = useState([])
  const gates = useMemo(() => buildGates(mode), [mode])
  const events = useCallback((project) => buildEvents(project, mode), [mode])
  const chartKey = `${mode}-${runKey}`

  return (
    <PageLayout
      title="GauntletChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Physics", path: "/charts/gauntlet-chart" },
        { label: "GauntletChart", path: "/charts/gauntlet-chart" },
      ]}
      prevPage={{ title: "ProcessFlowChart", path: "/charts/process-flow-chart" }}
      nextPage={{ title: "PhysicsCustomChart", path: "/charts/physics-custom-chart" }}
    >
      <ComponentMeta
        componentName="GauntletChart"
        importStatement='import { GauntletChart } from "semiotic/physics"'
        tier="charts"
        wraps="StreamPhysicsFrame"
        wrapsPath="/frames/physics-frame"
        related={[
          { name: "StreamPhysicsFrame", path: "/frames/physics-frame" },
          { name: "PhysicalFlowChart", path: "/charts/physical-flow-chart" },
          { name: "PhysicsCustomChart", path: "/charts/physics-custom-chart" },
          { name: "ProcessFlowChart", path: "/charts/process-flow-chart" },
          { name: "Merge Pressure", path: "/examples/merge-pressure" },
          { name: "Not in MY Backyard", path: "/examples/not-in-my-backyard" },
        ]}
      />

      <ChartGrounding
        component="GauntletChart"
        props={{
          data: sampleProjects,
          idAccessor: "id",
          positiveAccessor: "positives",
          negativeAccessor: "negatives",
          positiveProperties,
          negativeProperties,
          gates,
          title: "Gauntlet process sample",
        }}
      />

      <section>
        <p>
          <code>GauntletChart</code> is the process-oriented physics HOC for compound
          bodies. A row enters as a project core, carries positive and negative property
          particles, crosses authored gates, receives event effects, and ends as a built,
          diminished, blocked, or crashed state. It is the HOC behind the richer{" "}
          <Link to="/examples/not-in-my-backyard">Not in MY Backyard</Link> and{" "}
          <Link to="/examples/merge-pressure">Merge Pressure</Link> examples.
        </p>
      </section>

      <h2 id="example">Example</h2>
      <div style={controlPanelStyle} aria-label="Gauntlet chart controls">
        <label style={controlLabelStyle}>
          Gate regime
          <select
            style={inputStyle}
            value={mode}
            onChange={(event) => {
              setMode(event.target.value)
              setRunKey((value) => value + 1)
            }}
          >
            <option value="balanced">Balanced</option>
            <option value="strict">Strict</option>
          </select>
        </label>
        <button
          type="button"
          style={inputStyle}
          onClick={() => setRunKey((value) => value + 1)}
        >
          Replay
        </button>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid var(--surface-3)", borderRadius: 8, padding: 12 }}>
        <GauntletChart
          key={chartKey}
          data={sampleProjects}
          idAccessor="id"
          positiveAccessor="positives"
          negativeAccessor="negatives"
          metricsAccessor="metrics"
          initialViability="viability"
          positiveProperties={positiveProperties}
          negativeProperties={negativeProperties}
          gates={gates}
          events={events}
          viability={viability}
          outcome={outcome}
          onStateChange={setStates}
          size={[720, 380]}
          title="Gauntlet process sample"
        />
      </div>

      <div style={readoutGridStyle} aria-label="Gauntlet project states">
        {sampleProjects.map((project) => {
          const state = states.find((candidate) => candidate.id === project.id)
          return (
            <div key={project.id} style={readoutCardStyle}>
              <strong>{project.label}</strong>
              <div>{stateLabel(state)}</div>
              <small>
                viability {Math.round(state?.viability ?? project.viability)}
                {" "} / negatives {(state?.negativeIds ?? project.negatives).length}
              </small>
            </div>
          )
        })}
      </div>

      <h2 id="pattern">Pattern</h2>
      <pre style={codeBlockStyle}>{`<GauntletChart
  data={projects}
  idAccessor="id"
  positiveAccessor="positives"
  negativeAccessor="negatives"
  positiveProperties={positiveProperties}
  negativeProperties={negativeProperties}
  gates={gates}
  events={(project, layout) => buildEvents(project, layout)}
  viability={(project, context) => scoreProject(project, context)}
  outcome={(project) => project.viability > 30 ? "built" : "blocked"}
  frameProps={{ regionEffects, renderBody, beforePaint }}
/>`}</pre>

      <p>
        Use <code>GauntletChart</code> when the important unit is a compound entity moving
        through a staged process. Use{" "}
        <Link to="/charts/process-flow-chart">ProcessFlowChart</Link> for many independent work
        items with capacitated stages and all-members feature completion. Use{" "}
        <Link to="/charts/physical-flow-chart">PhysicalFlowChart</Link>{" "}
        for repeated packets on fixed routes, and <Link to="/charts/physics-custom-chart">PhysicsCustomChart</Link>{" "}
        when the process needs a fully custom layout function.
      </p>

      <h2 id="props">Props</h2>
      <PropTable componentName="GauntletChart" props={gauntletChartProps} />
    </PageLayout>
  )
}
