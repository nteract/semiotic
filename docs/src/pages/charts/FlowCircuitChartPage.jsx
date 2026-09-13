import React from "react"
import { FlowCircuitChart } from "semiotic/atlas"
import PageLayout from "../../components/PageLayout"
import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import CodeBlock from "../../components/CodeBlock"
import { AtlasReaderDemo } from "../../components/AtlasReaderDemo"

const props = [
  {
    name: "circuit",
    type: "FlowCircuitProjection",
    description: "prepareFlowCircuit(atlas, semantics) result. Required.",
  },
  {
    name: "edition",
    type: "CircuitEdition",
    description: "admitCircuitEdition(circuit, edition) result. Required.",
  },
  {
    name: "reading",
    type: "CircuitReading",
    description: "readCircuitEdition(edition, mode, time) result. Required.",
  },
  {
    name: "particleBudget",
    type: "number",
    description: "Visual sampling budget, independent of all measurements.",
  },
  {
    name: "reducedMotion",
    type: "boolean",
    description: "Suppress decorative transfer cues.",
  },
  {
    name: "selection",
    type: "object",
    description: "nodeId, analysisRevision and relationScopeId.",
  },
  {
    name: "width",
    type: "number",
    description: "Chart width in pixels.",
  },
  {
    name: "height",
    type: "number",
    description: "Chart height in pixels.",
  },
  {
    name: "title",
    type: "string",
    description: "Visible and accessible name.",
  },
  {
    name: "description",
    type: "string",
    description: "Accessible description.",
  },
  {
    name: "summary",
    type: "string",
    description: "Accessible task summary.",
  },
  {
    name: "accessibleTable",
    type: "boolean | object",
    description: "Data table, enabled by default.",
  },
  {
    name: "chartId",
    type: "string",
    description: "Stable ID for observations.",
  },
  {
    name: "linkedHover",
    type: "boolean | string | object",
    description: "Linked canonical node hover.",
  },
  {
    name: "onObservation",
    type: "function",
    description: "React observation callback.",
  },
  {
    name: "colors",
    type: "object",
    description: "Semantic role color overrides; unspecified roles use ThemeProvider.",
  },
  {
    name: "linkedSelection",
    type: "object",
    description: "Named linked-view selection.",
  },
  {
    name: "onSelectNode",
    type: "function",
    description: "Pointer and keyboard activation return the canonical vertex ID.",
  },
]

export default function FlowCircuitChartPage() {
  return (
    <PageLayout title="Flow Circuit" tier="charts">
      <ComponentMeta
        componentName="FlowCircuitChart"
        tier="charts"
        wraps="PhysicsCustomChart"
        importStatement={'import { FlowCircuitChart } from "semiotic/atlas"'}
      />
      <p>
        Observed tapes and explicitly modeled editions over fixed apparatus. Prepare analysis once
        upstream with <code>semiotic/atlas/core</code>, then share the artifact across readers, JSON
        exports and static SVG.
      </p>
      <AtlasReaderDemo stories={["etl", "retry"]}>
        {(chartProps) => <FlowCircuitChart {...chartProps} />}
      </AtlasReaderDemo>
      {/* AtlasReaderDemo renders ChartGrounding with the active serialized props. */}
      <h2>Prepare, render and share</h2>
      <p>
        Use <code>prepareNetworkAtlas(spec, source)</code> in a worker or upstream service. Inspect{" "}
        <code>result.ok</code> and its admission issues before passing <code>result.atlas</code> to
        a reader. <code>prepareNetworkAtlasAsync</code> loads preparation lazily; it does not create
        a worker.
      </p>
      <CodeBlock
        code={`import { prepareFlowCircuit, admitCircuitEdition, readCircuitEdition } from "semiotic/atlas/core"
import { FlowCircuitChart } from "semiotic/atlas"
import { renderChartWithEvidence } from "semiotic/server"

// atlas, explicit module semantics, and an observed tape are prepared upstream.
const circuit = prepareFlowCircuit(atlas, semantics)
const edition = admitCircuitEdition(circuit, observedTape)
const reading = readCircuitEdition(edition, "observed-replay", 60)
const props = { circuit, edition, reading, title: "Observed process" }
const { svg, evidence } = renderChartWithEvidence("FlowCircuitChart", props)
<FlowCircuitChart {...props} />`}
      />
      <p>
        Supply node and original-edge readings with explicit units, timestamps and provenance. Use
        <code>null</code> for unmeasured quantities and a separate edition for modeled outcomes.
        Display ordering and particle controls do not change throughput or infer missing timings.
      </p>
      <p>
        On phones the playground keeps the task table and inspector controls available. On desktop,
        focus marks and use the arrow keys; press Space to activate a vertex. Flow Circuit also
        supports Enter activation. The full supplier and circuit studies add linked inspectors,
        matrices and modeled comparisons at <a href="/examples/dependency-xray">Dependency X-Ray</a>{" "}
        and <a href="/examples/flow-circuit">Flow Circuit</a>.
      </p>
      <h2>Props</h2>
      <PropTable props={props} />
    </PageLayout>
  )
}
