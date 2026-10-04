import { Link } from "react-router-dom"
import PageLayout from "../../components/PageLayout"
import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import CodeBlock from "../../components/CodeBlock"
import {
  NetworkResolutionDemo,
  type ResolutionReaderMode,
} from "../../components/NetworkResolutionDemo"

const props = [
  {
    name: "resolution",
    type: "PreparedNetworkResolution",
    description:
      "Required prepared data, returned as result.value by prepareNetworkResolution(atlas, spec, bindings).",
  },
  {
    name: "pageId",
    type: "string",
    description:
      "Select the last representation in the default view. Omit to use the reader's page controls.",
  },
  {
    name: "view",
    type: "ResolutionViewSpec",
    description:
      "Displayed pages, row order, and limits on displayed groups and edges. These options do not modify the prepared analysis.",
  },
  { name: "width / height", type: "number", description: "Drawing dimensions in pixels." },
  {
    name: "appearance",
    type: "ResolutionAppearance",
    description:
      "Shared generation palette, per-role mark styles, label styles, and selection opacity. Defaults follow ThemeProvider.",
  },
  {
    name: "hoverHighlight",
    type: "boolean",
    description:
      "Highlight Atlas components with overlapping original node membership across displayed generations. Enabled by default.",
  },
  {
    name: "onSelect",
    type: "function",
    description:
      "Receives a selection with source references and analysis revision, plus a target identifying the selected element.",
  },
  {
    name: "accessibleTable",
    type: "boolean",
    description: "Source ownership and original-edge history tables. Enabled by default.",
  },
  {
    name: "title / description / summary",
    type: "string",
    description: "Visible and accessible text describing the chart and its data.",
  },
]

export function NetworkResolutionChartPage({ mode }: { mode: ResolutionReaderMode }) {
  const atlas = mode === "resolution-atlas"
  const title = atlas ? "Resolution Atlas" : "Boundary Loom"
  const component = atlas ? "ResolutionAtlasChart" : "BoundaryLoomChart"
  return (
    <PageLayout
      title={title}
      tier="charts"
      breadcrumbs={undefined}
      prevPage={undefined}
      nextPage={undefined}
    >
      <div className="network-resolution-docs">
        <ComponentMeta
          componentName={component}
          tier="charts"
          wraps={undefined}
          wrapsPath={undefined}
          related={undefined}
          importStatement={`import { ${component} } from "semiotic/experimental/network-resolution/react"`}
        />
        <p>
          <strong>Experimental Network Resolution reader.</strong>{" "}
          {atlas
            ? "Resolution Atlas displays successive graph partitions in aligned panels. Rectangles represent groups of original nodes. Edges are drawn within each panel; gray lines between panels show group membership. Contiguous members share one rectangle across section boundaries. A component is drawn in separate parts only where other components interrupt its rows. The cycle strip reports cycle rank inside and between groups."
            : "Boundary Loom displays nodes as horizontal rows and original edges as vertical columns. Edge colors distinguish intra-group and inter-group connections on the selected page. Endpoint markers identify each edge's source and target. History cells show the classification on earlier pages."}
        </p>
        <p>
          {atlas ? (
            <>
              <Link to="/charts/boundary-loom-chart">Boundary Loom</Link> displays the same prepared
              data as edge columns.
            </>
          ) : (
            <>
              <Link to="/charts/resolution-atlas-chart">Resolution Atlas</Link> displays the same
              prepared data as aligned graph partitions.
            </>
          )}{" "}
          Both readers retain original edge IDs, including parallel edges and self-loops.
        </p>
        <NetworkResolutionDemo mode={mode} />
        <h2>Preparation and rendering</h2>
        <p>
          Call <code>prepareNetworkAtlas(spec, source)</code> to validate and prepare the base
          atlas. Pass that atlas to <code>prepareNetworkResolution</code> and check{" "}
          <code>result.ok</code> before rendering. Both readers accept the resulting prepared data.
          Transitivity annotation requires compatible relation types with edge semantics that
          explicitly allow it. The annotation records an indirect path and retains the original
          edge.
        </p>
        <CodeBlock
          children={undefined}
          codeAreaLabel={undefined}
          code={`import { prepareNetworkResolution } from "semiotic/experimental/network-resolution"
import { ${component}, resolutionChartProps } from "semiotic/experimental/network-resolution/react"
import { renderChartWithEvidence } from "semiotic/server"

// atlas is result.atlas from a successful prepareNetworkAtlas(atlasSpec, source) call.
const result = prepareNetworkResolution(atlas, resolutionSpec, bindings)
if (!result.ok) throw new Error(JSON.stringify(result.issues))
const props = { resolution: result.value, title: "${title}" }

<${component} {...props} />
const { svg, evidence } = renderChartWithEvidence("NetworkCustomChart", {
  ...resolutionChartProps(props, "${mode}"), accessibleTable: true
})`}
        />
        <h2>Theme and styles</h2>
        <p>
          All readers, Component Cutaway, NodeResolutionStrip, and EdgeWitnessGlyph use the active
          <code> ThemeProvider</code> for text, surfaces, edges, and semantic colors. Atlas hover
          fills use <code>colors.sequential</code>, which defaults to blues. Generation colors use
          the full analysis, so displaying fewer pages does not change a generation's color.
        </p>
        <p>
          Pass the same <code>appearance</code> object to share styling across readers. Set
          <code> generationColors</code> to a scheme name, a color array indexed by generation, or a
          function of the generation number. Short arrays retain their last color for later
          generations. Style callbacks receive the mark's datum, role, generation, hover and
          selection state, and theme. Overrides apply after the theme and interaction defaults.
        </p>
        <p>
          Internal edges use the theme's secondary color; boundary edges use its primary color.
          Override these with <code>appearance.edgeColors.internal</code> and
          <code> appearance.edgeColors.boundary</code>. Boundary Loom applies the colors to columns,
          endpoint markers, self-loops, collapsed-group caps, history cells, and its legend.
          Classification is recalculated for the selected page.
        </p>
        <CodeBlock
          children={undefined}
          codeAreaLabel={undefined}
          code={`import { ThemeProvider } from "semiotic/themes/react"
import type { ResolutionAppearance } from "semiotic/experimental/network-resolution/react"

const appearance: ResolutionAppearance = {
  edgeColors: { internal: "#b07aa1", boundary: "#4e79a7" },
  generationColors: ["#deebf7", "#9ecae1", "#4292c6", "#2171b5", "#084594"],
  styles: {
    component: ({ highlighted }) => ({ strokeWidth: highlighted ? 3 : 1 }),
    membership: { strokeDasharray: "3 2" },
    supportNo: { strokeWidth: 2 }
  },
  labelStyle: { fontWeight: 500 }
}

<ThemeProvider theme="dark">
  <${component} resolution={result.value} appearance={appearance} />
</ThemeProvider>

// Static exports receive the same theme and appearance.
const { svg } = renderChartWithEvidence("NetworkCustomChart", {
  ...resolutionChartProps({ resolution: result.value, appearance }, "${mode}"),
  theme: "dark"
})`}
        />
        <h2>Props</h2>
        <PropTable componentName={component} props={props} />
        <p>
          Component Cutaway can also be rendered independently. It draws original nodes, directed
          internal edges, and outside neighbors. A single pair gets a compact verdict; multiple
          pairs get a bounded matrix. Select a cell or an Inspect button to highlight its entry,
          exit, and supporting path. The Path evidence control switches between structural
          reachability and observed contiguous journeys with boundary context. The{" "}
          <code>basis</code> prop sets the initial reading. Colors and styles use the active theme
          and <code>appearance</code>, including <code>cutawayNode</code>, <code>cutawayEntry</code>
          ,<code>cutawayExit</code>, and <code>cutawayWitness</code> roles. A query returns{" "}
          <code>no</code> only after searching its full declared scope. Missing evidence or an
          incomplete search returns <code>unknown</code>.
        </p>
      </div>
    </PageLayout>
  )
}
