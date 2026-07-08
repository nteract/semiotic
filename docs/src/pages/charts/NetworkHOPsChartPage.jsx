import React, { useMemo, useState } from "react"
import { NetworkHOPsChart } from "semiotic/physics"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import PageLayout from "../../components/PageLayout"
import ChartGrounding from "../../components/ChartGrounding"

const networkHOPsChartProps = [
  { name: "nodes", type: "array", required: false, default: "inferred", description: "Node records used for the stable aggregate layout." },
  { name: "edges", type: "array", required: false, default: null, description: "Probabilistic edge records with source, target, and probability fields." },
  { name: "samples", type: "array", required: false, default: null, description: "Explicit sampled graph realizations: [{ id, label, nodes?, edges }]." },
  { name: "nodeIdAccessor", type: "string | function", required: false, default: '"id"', description: "Unique node id field." },
  { name: "sourceAccessor", type: "string | function", required: false, default: '"source"', description: "Edge source node id field." },
  { name: "targetAccessor", type: "string | function", required: false, default: '"target"', description: "Edge target node id field." },
  { name: "edgeProbabilityAccessor", type: "string | function", required: false, default: '"p"', description: "Probability field for probabilistic edges." },
  { name: "sampleIndex", type: "number", required: false, default: "uncontrolled", description: "Controlled realization index." },
  { name: "sampleRate", type: "number", required: false, default: "1", description: "Realizations per second when uncontrolled." },
  { name: "paused", type: "boolean", required: false, default: "false", description: "Pause animated sample cycling." },
  { name: "seed", type: "number", required: false, default: "1", description: "Deterministic seed for probabilistic sampling." },
  { name: "anchoringStrength", type: "number", required: false, default: "0.14", description: "Link strength for the aggregate force layout." },
  { name: "showAggregate", type: "boolean", required: false, default: "true", description: "Draw inactive aggregate edges faintly behind the active sample." },
  { name: "showSampleReadout", type: "boolean", required: false, default: "true", description: "Show sample and active-edge summary overlay." },
  { name: "edgeWidth", type: "number | string | function", required: false, default: "2", description: "Width for active sampled edges." },
  { name: "size", type: "array", required: false, default: "[700, 460]", description: "[width, height] in pixels." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Advanced StreamNetworkFrame props." },
]

const nodes = [
  { id: "ingest", label: "Ingest", group: "system" },
  { id: "parser", label: "Parser", group: "system" },
  { id: "queue", label: "Queue", group: "state" },
  { id: "review", label: "Review", group: "people" },
  { id: "ship", label: "Ship", group: "state" },
  { id: "audit", label: "Audit", group: "people" },
]

const probabilisticEdges = [
  { source: "ingest", target: "parser", p: 0.92, weight: 2.5 },
  { source: "parser", target: "queue", p: 0.78, weight: 2 },
  { source: "queue", target: "review", p: 0.54, weight: 1.6 },
  { source: "queue", target: "ship", p: 0.62, weight: 1.8 },
  { source: "review", target: "ship", p: 0.44, weight: 1.4 },
  { source: "review", target: "audit", p: 0.28, weight: 1.2 },
  { source: "audit", target: "parser", p: 0.18, weight: 1 },
  { source: "ship", target: "ingest", p: 0.22, weight: 1 },
]

const sampledGraphs = [
  {
    id: "nominal",
    label: "nominal path",
    nodes,
    edges: [
      { source: "ingest", target: "parser", weight: 2.5 },
      { source: "parser", target: "queue", weight: 2 },
      { source: "queue", target: "ship", weight: 1.8 },
    ],
  },
  {
    id: "human-review",
    label: "review path",
    nodes,
    edges: [
      { source: "ingest", target: "parser", weight: 2.5 },
      { source: "parser", target: "queue", weight: 2 },
      { source: "queue", target: "review", weight: 1.6 },
      { source: "review", target: "ship", weight: 1.4 },
    ],
  },
  {
    id: "audit-loop",
    label: "audit loop",
    nodes,
    edges: [
      { source: "ingest", target: "parser", weight: 2.5 },
      { source: "parser", target: "queue", weight: 2 },
      { source: "queue", target: "review", weight: 1.6 },
      { source: "review", target: "audit", weight: 1.2 },
      { source: "audit", target: "parser", weight: 1 },
    ],
  },
  {
    id: "retry",
    label: "retry path",
    nodes,
    edges: [
      { source: "ingest", target: "parser", weight: 2.5 },
      { source: "parser", target: "queue", weight: 2 },
      { source: "queue", target: "ship", weight: 1.8 },
      { source: "ship", target: "ingest", weight: 1 },
    ],
  },
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

export default function NetworkHOPsChartPage() {
  const [inputMode, setInputMode] = useState("probability")
  const [sampleRate, setSampleRate] = useState(1)
  const [paused, setPaused] = useState(false)
  const [showAggregate, setShowAggregate] = useState(true)
  const [seed, setSeed] = useState(7)
  const usesSamples = inputMode === "samples"
  const chartKey = `${inputMode}-${seed}`
  const groundingProps = useMemo(
    () => ({
      nodes,
      edges: usesSamples ? undefined : probabilisticEdges,
      samples: usesSamples ? sampledGraphs : undefined,
      edgeProbabilityAccessor: "p",
      title: "Network HOPs sample",
    }),
    [usesSamples],
  )

  return (
    <PageLayout
      title="NetworkHOPsChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Physics", path: "/charts/network-hops-chart" },
        { label: "NetworkHOPsChart", path: "/charts/network-hops-chart" },
      ]}
      prevPage={{ title: "CollisionSwarmChart", path: "/charts/collision-swarm-chart" }}
      nextPage={{ title: "PhysicalFlowChart", path: "/charts/physical-flow-chart" }}
    >
      <ComponentMeta
        componentName="NetworkHOPsChart"
        importStatement='import { NetworkHOPsChart } from "semiotic/physics"'
        tier="charts"
        wraps="StreamNetworkFrame"
        wrapsPath="/charts/force-directed-graph"
        related={[
          { name: "ForceDirectedGraph", path: "/charts/force-directed-graph" },
          { name: "ProcessSankey", path: "/charts/process-sankey" },
          { name: "CollisionSwarmChart", path: "/charts/collision-swarm-chart" },
          { name: "PhysicalFlowChart", path: "/charts/physical-flow-chart" },
          { name: "PhysicsCustomChart", path: "/charts/physics-custom-chart" },
        ]}
      />

      <ChartGrounding component="NetworkHOPsChart" props={groundingProps} />

      <h2 id="example">Example</h2>
      <div style={controlPanelStyle} aria-label="Network HOPs controls">
        <label style={controlLabelStyle}>
          Input
          <select
            style={inputStyle}
            value={inputMode}
            onChange={(event) => setInputMode(event.target.value)}
          >
            <option value="probability">Probabilistic edges</option>
            <option value="samples">Explicit samples</option>
          </select>
        </label>
        <label style={controlLabelStyle}>
          Samples / sec
          <select
            style={inputStyle}
            value={sampleRate}
            onChange={(event) => setSampleRate(Number(event.target.value))}
          >
            <option value={0.5}>0.5</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={4}>4</option>
          </select>
        </label>
        <label style={controlLabelStyle}>
          Seed
          <select
            style={inputStyle}
            value={seed}
            onChange={(event) => setSeed(Number(event.target.value))}
            disabled={usesSamples}
          >
            <option value={3}>3</option>
            <option value={7}>7</option>
            <option value={19}>19</option>
          </select>
        </label>
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
            checked={showAggregate}
            onChange={(event) => setShowAggregate(event.target.checked)}
          />
          Aggregate
        </label>
      </div>
      <div style={{ overflowX: "auto", border: "1px solid var(--surface-3)", borderRadius: 8, padding: 12 }}>
        <NetworkHOPsChart
          key={chartKey}
          nodes={nodes}
          edges={usesSamples ? undefined : probabilisticEdges}
          samples={usesSamples ? sampledGraphs : undefined}
          nodeLabel="label"
          colorBy="group"
          edgeProbabilityAccessor="p"
          edgeWidth="weight"
          sampleRate={sampleRate}
          paused={paused}
          seed={seed}
          showAggregate={showAggregate}
          showLabels
          size={[640, 420]}
          title="Sampled process topology"
        />
      </div>
      <p>
        Use NetworkHOPsChart when a graph has multiple plausible realizations: uncertain
        links, Monte Carlo samples, or scenario-specific edges. The force layout runs on
        the aggregate topology so the reader sees edge-state changes without the nodes
        jumping to new positions every sample.
      </p>
      <p>
        Use ForceDirectedGraph for a single fixed topology. Use PhysicsCustomChart when
        the graph state needs physical sensors, barriers, or custom body interactions.
      </p>

      <h2 id="props">Props</h2>
      <PropTable componentName="NetworkHOPsChart" props={networkHOPsChartProps} />
    </PageLayout>
  )
}
