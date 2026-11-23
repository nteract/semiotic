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
  {
    name: "tooltip",
    type: "boolean | function | object",
    description: "Custom tooltip renderer or config; receives the authored mark datum with standard chrome. false hides tooltips while hover observations continue.",
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
      <h2>Comparing partitions</h2>
      <p>
        Set <code>spec.comparison.outcomeMeasureIds</code> and <code>motifTemplates</code> to
        choose the readouts. Each partition is compared with <code>referencePartition</code>,
        which defaults to the first listed partition. For example, 1,600 of 20,000
        and 6,000 of 75,000 are both 8%, so their difference is zero basis points.
      </p>
      <p>
        <code>prepareMotifBraid(atlas).differences</code> includes the two counts and
        populations. Missing counts or nonpositive populations appear in{" "}
        <code>unavailableDifferences</code> with an unknown status.
        Omitting the selections uses observed motif types and declared, comparable
        count measures present in the partition ledger. An empty selection omits that
        kind of readout.
        Motif profile cells expose <code>denominatorStatus</code>. An estimated population
        retains its numeric total. A missing or incomplete population has a <code>NaN</code>
        denominator, which serializes to <code>null</code> in JSON.
      </p>
      <h2>Props</h2>
      <PropTable props={props} />
    </PageLayout>
  )
}
