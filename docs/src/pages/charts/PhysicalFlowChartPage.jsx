import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChartContainer } from "semiotic"
import { PhysicalFlowChart } from "semiotic/physics"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import PageLayout from "../../components/PageLayout"
import ChartGrounding from "../../components/ChartGrounding"

const physicalFlowChartProps = [
  { name: "nodes", type: "array", required: false, default: "[]", description: "Route nodes with explicit x/y geometry." },
  { name: "links", type: "array", required: false, default: "[]", description: "Flow links with source, target, throughput, and optional path geometry." },
  { name: "edges", type: "array", required: false, default: null, description: "Alias for links." },
  { name: "nodeIdAccessor", type: "string | function", required: false, default: '"id"', description: "Node id field." },
  { name: "nodeXAccessor", type: "string | function", required: false, default: '"x"', description: "Node x-coordinate." },
  { name: "nodeYAccessor", type: "string | function", required: false, default: '"y"', description: "Node y-coordinate." },
  { name: "sourceAccessor", type: "string | function", required: false, default: '"source"', description: "Link source node id." },
  { name: "targetAccessor", type: "string | function", required: false, default: '"target"', description: "Link target node id." },
  { name: "throughputAccessor", type: "string | function", required: false, default: '"value"', description: "Numeric field used for pipe width and packet count." },
  { name: "pathAccessor", type: "string | function", required: false, default: '"path"', description: "Optional route path as [{x,y}, ...] or [[x,y], ...]." },
  { name: "coordinateMode", type: "string", required: false, default: '"auto"', description: "auto, normalized, or pixels." },
  { name: "particleRate", type: "number", required: false, default: "0.16", description: "Packets per throughput unit before downsampling." },
  { name: "maxParticles", type: "number", required: false, default: "180", description: "Maximum generated packet bodies." },
  { name: "particleRadius", type: "number", required: false, default: "4", description: "Packet radius in pixels." },
  { name: "flowSpeed", type: "number", required: false, default: "90", description: "Initial packet speed along each route." },
  { name: "pathConstraint", type: "string", required: false, default: '"path"', description: "path or none." },
  { name: "reducedMotion", type: "boolean", required: false, default: "false", description: "Start packets on routes and pause simulation." },
  { name: "showStaticFlow", type: "boolean", required: false, default: "true", description: "Draw route pipes and throughput labels." },
  { name: "showNodeLabels", type: "boolean", required: false, default: "true", description: "Draw node labels." },
  { name: "showSensors", type: "boolean", required: false, default: "false", description: "Draw proximity sensors around nodes." },
  { name: "paused", type: "boolean", required: false, default: "false", description: "Pause the simulation." },
  { name: "accessibleTable", type: "boolean", required: false, default: "true", description: "Expose route-level semantic items through the skip link and data-summary table." },
  { name: "description", type: "string", required: false, default: null, description: "Accessible label for the physics chart frame." },
  { name: "summary", type: "string", required: false, default: null, description: "Screen-reader-only summary text for the chart." },
  { name: "seed", type: "number", required: false, default: "1", description: "Deterministic seed." },
  { name: "hoverRadius", type: "number", required: false, default: "16", description: "Pixel hit radius for packet hover tooltips." },
  { name: "tooltip", type: "boolean | function | object", required: false, default: "true", description: "Enable the default packet tooltip, pass a custom tooltip renderer/config, or set false to disable hover tooltips." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Advanced StreamPhysicsFrame props." },
]

const scenarios = {
  service: {
    label: "Service mesh",
    nodes: [
      { id: "edge", label: "Edge", x: 0.08, y: 0.48 },
      { id: "auth", label: "Auth", x: 0.32, y: 0.28 },
      { id: "api", label: "API", x: 0.5, y: 0.5 },
      { id: "queue", label: "Queue", x: 0.68, y: 0.72 },
      { id: "db", label: "DB", x: 0.88, y: 0.36 },
    ],
    links: [
      { id: "edge-auth", source: "edge", target: "auth", value: 70 },
      { id: "edge-api", source: "edge", target: "api", value: 95 },
      { id: "auth-api", source: "auth", target: "api", value: 58 },
      {
        id: "api-queue",
        source: "api",
        target: "queue",
        value: 42,
        path: [
          { x: 0.5, y: 0.5 },
          { x: 0.6, y: 0.6 },
          { x: 0.68, y: 0.72 },
        ],
      },
      {
        id: "api-db",
        source: "api",
        target: "db",
        value: 82,
        path: [
          { x: 0.5, y: 0.5 },
          { x: 0.68, y: 0.3 },
          { x: 0.88, y: 0.36 },
        ],
      },
      { id: "queue-db", source: "queue", target: "db", value: 36 },
    ],
  },
  incidents: {
    label: "Incident routing",
    nodes: [
      { id: "detect", label: "Detect", x: 0.08, y: 0.5 },
      { id: "triage", label: "Triage", x: 0.3, y: 0.35 },
      { id: "mitigate", label: "Mitigate", x: 0.56, y: 0.28 },
      { id: "comms", label: "Comms", x: 0.58, y: 0.68 },
      { id: "resolve", label: "Resolve", x: 0.9, y: 0.48 },
    ],
    links: [
      { id: "detect-triage", source: "detect", target: "triage", value: 55 },
      { id: "triage-mitigate", source: "triage", target: "mitigate", value: 46 },
      { id: "triage-comms", source: "triage", target: "comms", value: 31 },
      {
        id: "mitigate-resolve",
        source: "mitigate",
        target: "resolve",
        value: 38,
        path: [
          { x: 0.56, y: 0.28 },
          { x: 0.72, y: 0.2 },
          { x: 0.9, y: 0.48 },
        ],
      },
      {
        id: "comms-resolve",
        source: "comms",
        target: "resolve",
        value: 25,
        path: [
          { x: 0.58, y: 0.68 },
          { x: 0.76, y: 0.78 },
          { x: 0.9, y: 0.48 },
        ],
      },
    ],
  },
}

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
  minWidth: 136,
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

const buttonStyle = {
  minHeight: 34,
  border: "1px solid var(--surface-3)",
  borderRadius: 6,
  background: "var(--surface-0)",
  color: "var(--text-primary)",
  padding: "0 12px",
  fontWeight: 800,
}

export default function PhysicalFlowChartPage() {
  const [scenarioKey, setScenarioKey] = useState("service")
  const [particleRate, setParticleRate] = useState(0.16)
  const [maxParticles, setMaxParticles] = useState(160)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [showStaticFlow, setShowStaticFlow] = useState(true)
  const [showSensors, setShowSensors] = useState(true)
  const [replay, setReplay] = useState(0)
  const [sensorCounts, setSensorCounts] = useState({})
  const [recentEvents, setRecentEvents] = useState([])
  const scenario = scenarios[scenarioKey]
  const chartKey = `${scenarioKey}-${particleRate}-${maxParticles}-${reducedMotion}-${replay}`
  const chartId = `physical-flow-docs-${chartKey}`
  const activeChartIdRef = useRef(chartId)
  const groundingProps = useMemo(
    () => ({
      nodes: scenario.nodes,
      links: scenario.links,
      throughputAccessor: "value",
      showStaticFlow: true,
      showSensors: true,
      title: "Physical flow sample",
    }),
    [scenario],
  )

  useEffect(() => {
    activeChartIdRef.current = chartId
  }, [chartId])

  const resetReplay = useCallback(() => {
    setRecentEvents([])
    setSensorCounts({})
    setReplay((value) => value + 1)
  }, [])

  const handleObservation = useCallback((event) => {
    if (event.chartId !== activeChartIdRef.current) return
    if (event.type !== "physics-proximity-enter") return
    const label = event.binId ?? event.sensorId ?? "sensor"
    setSensorCounts((current) => ({
      ...current,
      [label]: (current[label] ?? 0) + 1,
    }))
    setRecentEvents((current) => [
      {
        label,
        bodyId: event.bodyId ?? "packet",
        time: Math.round((event.timestamp ?? 0) * 10) / 10,
      },
      ...current,
    ].slice(0, 6))
  }, [])

  return (
    <PageLayout
      title="PhysicalFlowChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Physics", path: "/charts/physical-flow-chart" },
        { label: "PhysicalFlowChart", path: "/charts/physical-flow-chart" },
      ]}
      prevPage={{ title: "NetworkHOPsChart", path: "/charts/network-hops-chart" }}
      nextPage={{ title: "PhysicsCustomChart", path: "/charts/physics-custom-chart" }}
    >
      <ComponentMeta
        componentName="PhysicalFlowChart"
        importStatement='import { PhysicalFlowChart } from "semiotic/physics"'
        tier="charts"
        wraps="StreamPhysicsFrame"
        wrapsPath="/dev/physics-frame"
        related={[
          { name: "SankeyDiagram", path: "/charts/sankey-diagram" },
          { name: "FlowMap", path: "/charts/flow-map" },
          { name: "NetworkHOPsChart", path: "/charts/network-hops-chart" },
          { name: "PhysicsCustomChart", path: "/charts/physics-custom-chart" },
        ]}
      />

      <ChartGrounding component="PhysicalFlowChart" props={groundingProps} />

      <h2 id="example">Example</h2>
      <div style={controlPanelStyle} aria-label="Physical flow controls">
        <label style={controlLabelStyle}>
          Scenario
          <select
            style={inputStyle}
            value={scenarioKey}
            onChange={(event) => {
              setScenarioKey(event.target.value)
              resetReplay()
            }}
          >
            <option value="service">Service mesh</option>
            <option value="incidents">Incident routing</option>
          </select>
        </label>
        <label style={controlLabelStyle}>
          Packet density
          <select
            style={inputStyle}
            value={particleRate}
            onChange={(event) => setParticleRate(Number(event.target.value))}
          >
            <option value={0.08}>Light</option>
            <option value={0.16}>Medium</option>
            <option value={0.28}>Dense</option>
          </select>
        </label>
        <label style={controlLabelStyle}>
          Body budget
          <select
            style={inputStyle}
            value={maxParticles}
            onChange={(event) => setMaxParticles(Number(event.target.value))}
          >
            <option value={90}>90</option>
            <option value={160}>160</option>
            <option value={220}>220</option>
          </select>
        </label>
        <button type="button" style={buttonStyle} onClick={resetReplay}>
          Replay
        </button>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={paused}
            onChange={(event) => setPaused(event.target.checked)}
          />
          Pause
        </label>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={reducedMotion}
            onChange={(event) => setReducedMotion(event.target.checked)}
          />
          Reduced motion
        </label>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={showStaticFlow}
            onChange={(event) => setShowStaticFlow(event.target.checked)}
          />
          Static flow
        </label>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={showSensors}
            onChange={(event) => setShowSensors(event.target.checked)}
          />
          Sensors
        </label>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ overflowX: "auto", border: "1px solid var(--surface-3)", borderRadius: 8, padding: 12 }}>
          <ChartContainer
            title={`${scenario.label} physical flow`}
            actions={{ dataSummary: true }}
            height={440}
          >
            <PhysicalFlowChart
              key={chartKey}
              chartId={chartId}
              nodes={scenario.nodes}
              links={scenario.links}
              colorBy="source"
              particleRate={particleRate}
              maxParticles={maxParticles}
              particleRadius={4}
              flowSpeed={110}
              paused={paused}
              reducedMotion={reducedMotion}
              showStaticFlow={showStaticFlow}
              showSensors={showSensors}
              onObservation={handleObservation}
              size={[680, 420]}
              title={`${scenario.label} physical flow`}
            />
          </ChartContainer>
        </div>
        <div
          data-testid="physical-flow-observation-readout"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
            padding: 12,
            border: "1px solid var(--surface-3)",
            borderRadius: 8,
            background: "var(--surface-1)",
          }}
        >
          <div>
            <strong>Sensor counts</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {scenario.nodes.map((node) => (
                <span key={node.id} style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {node.label}: {sensorCounts[node.label] ?? 0}
                </span>
              ))}
            </div>
          </div>
          <div>
            <strong>Recent proximity enters</strong>
            <div style={{ display: "grid", gap: 4, marginTop: 8, fontSize: 12, color: "var(--text-secondary)" }}>
              {recentEvents.length
                ? recentEvents.map((event, index) => (
                    <span key={`${event.bodyId}-${event.label}-${event.time}-${index}`}>
                      {event.bodyId} entered {event.label} at {event.time}s
                    </span>
                  ))
                : <span>No sensor entries yet</span>}
            </div>
          </div>
        </div>
      </div>
      <p>
        Use PhysicalFlowChart when route geometry is already authored and throughput is easier to
        understand as movement through a system. Keep the static flow layer on for the measured
        quantities; packets add texture, congestion, and observation events as they travel each route.
      </p>
      <p>
        Keyboard focus moves across the route flows themselves rather than the individual packets,
        preserving the semantic level of the chart while the particle layer remains visual texture.
      </p>
      <p>
        Use SankeyDiagram for plain source-target-value tables. Use FlowMap when the routes are
        geographic. Use PhysicsCustomChart when the scene needs custom forces, collision barriers,
        or non-route interaction logic.
      </p>

      <h2 id="props">Props</h2>
      <PropTable componentName="PhysicalFlowChart" props={physicalFlowChartProps} />
    </PageLayout>
  )
}
