import React from "react"
import { MotifBraidChart } from "semiotic/atlas"
import PageLayout from "../../components/PageLayout"
import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import CodeBlock from "../../components/CodeBlock"
import { AtlasReaderDemo } from "../../components/AtlasReaderDemo"

const props = [
  {
    name: "atlas",
    type: "PreparedNetworkAtlas",
    description: "Complete admitted atlas prepared outside React. Required.",
  },
  {
    name: "colorScheme",
    type: "string | array | object",
    description: "Palette for supported journey strands.",
  },
  {
    name: "onClick",
    type: "function",
    description: "React callback for the selected step or strand.",
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
]

export default function MotifBraidChartPage() {
  return (
    <PageLayout title="Motif Braid" tier="charts">
      <ComponentMeta
        componentName="MotifBraidChart"
        tier="charts"
        wraps="NetworkCustomChart"
        importStatement={'import { MotifBraidChart } from "semiotic/atlas"'}
      />
      <p>
        Shared prefixes, labeled journey steps and measured traffic. Prepare analysis once upstream
        with <code>semiotic/atlas/core</code>, then share the artifact across readers, JSON exports
        and static SVG.
      </p>
      <AtlasReaderDemo stories={["checkout", "search"]}>
        {(chartProps) => <MotifBraidChart {...chartProps} />}
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
        code={`import { prepareNetworkAtlas } from "semiotic/atlas/core"
import { MotifBraidChart } from "semiotic/atlas"
import { renderChartWithEvidence } from "semiotic/server"

// spec declares motifs and denominators; source supplies supported journeys.
const result = prepareNetworkAtlas(spec, source)
if (!result.ok) throw new Error(JSON.stringify(result.issues))
const props = { atlas: result.atlas, title: "Supported journeys" }
const { svg, evidence } = renderChartWithEvidence("MotifBraidChart", props)
<MotifBraidChart {...props} />`}
      />
      <p>
        Supply <code>stepEntityCounts</code> alongside each occurrence's <code>nodePath</code> when
        traffic changes at each step. Omitting it keeps <code>entityCount</code> constant. Display
        ordering, theme and particle controls never change measurements or infer unobserved paths.
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
