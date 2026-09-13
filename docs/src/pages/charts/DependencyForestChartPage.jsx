import React from "react"
import { DependencyForestChart } from "semiotic/atlas"
import PageLayout from "../../components/PageLayout"
import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import CodeBlock from "../../components/CodeBlock"
import { AtlasReaderDemo } from "../../components/AtlasReaderDemo"

const props = [
  {
    name: "forest",
    type: "DependencyForestProjection",
    description: "prepareDependencyForest(atlas) result. Required.",
  },
  {
    name: "reading",
    type: "string",
    description: "organize or required-paths.",
  },
  {
    name: "collapsedNodeIds",
    type: "array",
    description: "Collapse display branches while retaining original edge evidence.",
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

export default function DependencyForestChartPage() {
  return (
    <PageLayout title="Dependency Forest" tier="charts">
      <ComponentMeta
        componentName="DependencyForestChart"
        tier="charts"
        wraps="NetworkCustomChart"
        importStatement={'import { DependencyForestChart } from "semiotic/atlas"'}
      />
      <p>
        Display backbone, original residual edges and required paths. Prepare analysis once upstream
        with <code>semiotic/atlas/core</code>, then share the artifact across readers, JSON exports
        and static SVG.
      </p>
      <AtlasReaderDemo stories={["supplier"]}>
        {(chartProps) => <DependencyForestChart {...chartProps} />}
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
        code={`import { prepareDependencyForest } from "semiotic/atlas/core"
import { DependencyForestChart } from "semiotic/atlas"
import { renderChartWithEvidence } from "semiotic/server"

// atlas is an admitted PreparedNetworkAtlas with declared roots.
const forest = prepareDependencyForest(atlas)
const props = { forest, reading: "required-paths", title: "Required supply paths" }
const { svg, evidence } = renderChartWithEvidence("DependencyForestChart", props)
<DependencyForestChart {...props} />`}
      />
      <p>
        Declare roots in <code>spec.forest.requiredPaths</code> before preparing the atlas. Required
        paths are computed over all admitted directed edges. Changing the display backbone does not
        change those paths; a structural bypass does not establish usable capacity.
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
