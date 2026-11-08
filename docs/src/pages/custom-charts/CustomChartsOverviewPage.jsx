import React from "react"
import { Link } from "react-router-dom"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { IntentMark } from "../../../../src/components/ai/IntentMark"
import { intentManifestFromRecipe } from "../../../../src/components/ai/intentManifest"
import { waffleRecipeManifest } from "./waffleRecipeManifest"

const panelStyle = {
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  padding: "16px 18px",
  marginBottom: 16,
  background: "var(--surface-1)",
}

const HOCS = [
  {
    name: "XYCustomChart",
    importPath: "semiotic/xy",
    ctx: "data, scales {x,y}, dimensions, theme, resolveColor, config",
    emits: "point / line / area / rect / symbol scene nodes + overlays",
    examples: "waffle, calendar, streamgraph",
  },
  {
    name: "OrdinalCustomChart",
    importPath: "semiotic/ordinal",
    ctx: "data, scales {o,r,projection}, dimensions, theme, resolveColor, config",
    emits: "rect / wedge / connector / trapezoid / symbol nodes + overlays",
    examples: "marimekko, bullet, parallel coordinates",
  },
  {
    name: "NetworkCustomChart",
    importPath: "semiotic/network",
    ctx: "nodes, edges, dimensions, theme, resolveColor, config, selection",
    emits: "circle / rect / arc / symbol nodes, edges, labels + overlays",
    examples: "flextree, dagre, lineage DAG, packed-cluster matrix",
  },
  {
    name: "GeoCustomChart",
    importPath: "semiotic/geo",
    ctx: "areas, points, lines, GeoScales, dimensions, theme, resolveColor, config",
    emits: "geographic area / point / line scene nodes + overlays",
    examples: "isometric landmark atlas, hex territory board",
  },
]

const BUILDING_BLOCKS = [
  {
    title: "Custom Layouts",
    path: "/custom-charts/custom-layouts",
    what: "The four escape-hatch HOCs, the layout-function contract, the scene primitives, and the full recipe gallery (waffle, calendar, flextree, dagre, marimekko, bullet, parallel coordinates, isometric landmarks).",
  },
  {
    title: "PhysicsCustomChart",
    path: "/charts/physics-custom-chart",
    what: "The physics escape hatch: a layout function returns bodies, barriers, proximity sensors, overlays, and observation metadata while the chart still exposes data-oriented props and realtime push methods.",
  },
  {
    title: "Glyph Marks",
    path: "/custom-charts/glyph-marks",
    what: "The per-datum shape channel: the symbol scene-node, d3-shape glyphs, and the composite-glyph model (a filled base mark + an optional stroked inner icon).",
  },
  {
    title: "Recipe Decoration Kit",
    path: "/custom-charts/recipe-kit",
    what: "Small composable helpers for the decoration recipes draw in their overlays — group enclosures, band/axis labels, leader-line callouts, the node.data reader, and color/shade utilities.",
  },
]

const WORKED_EXAMPLES = [
  { title: "Satellites in Space", path: "/recipes/satellites-in-space", what: "The packedClusterMatrix recipe — a matrix of packed beeswarm clusters with four-channel composite glyphs, banded rows, and callouts. Fully interactive controls." },
  { title: "Kafka Streams topology", path: "/recipes/kstreams", what: "The lineageDagLayout recipe — a layered DAG of composite node glyphs with reach-dimming and linked selection." },
  { title: "GoFish layouts", path: "/interoperability/gofish", what: "GoFish's baked DisplayList render IR mapped onto a custom layout by role — GoFish owns the geometry, Semiotic owns interaction and accessibility." },
  { title: "Marimekko", path: "/cookbook/marimekko-chart", what: "Variable-width stacked bars via the marimekko ordinal recipe." },
]

export default function CustomChartsOverviewPage() {
  return (
    <PageLayout
      title="Custom Charts"
      subtitle="Compose charts, annotations, and custom geometry"
      breadcrumbs={[
        { label: "Custom Charts", path: "/custom-charts/overview" },
        { label: "Overview", path: "/custom-charts/overview" },
      ]}
      nextPage={{ title: "Intelligence", path: "/custom-charts/intelligence" }}
    >
      <section>
        <p>
          Start with a high-level chart and compose its props, annotations, and graphics.
          When the geometry itself needs to change, a custom layout can emit scene primitives
          while the Stream Frame handles rendering, hit testing, and navigation. This page
          connects those options to their detailed contracts and examples.
        </p>
        <p>
          The frame gives custom geometry Semiotic&rsquo;s runtime affordances. The recipe gives
          that geometry meaning. See{" "}
          <Link to="/custom-charts/intelligence">Custom Charts as Reception Strategies</Link>.
        </p>
        <CodeBlock language="jsx">{`import { NetworkCustomChart } from "semiotic/network"
import { packedClusterMatrix } from "semiotic/recipes"

<NetworkCustomChart nodes={data} layout={packedClusterMatrix} layoutConfig={{ /* ... */ }} />`}</CodeBlock>
        <IntentMark
          manifest={intentManifestFromRecipe(waffleRecipeManifest, {
            chartId: "custom-charts-overview-waffle",
            reviewStatus: "docs example",
          })}
        />
      </section>

      <section>
        <h2 id="composition-path">Choose the smallest extension</h2>
        <ol>
          <li>
            Use the chart's high-level props for data, accessors, extents, colors, axes,
            legends, and annotations. Keep <code>title</code>, <code>description</code>,
            <code> summary</code>, and <code>accessibleTable</code> on the chart when
            its schema supports them.
          </li>
          <li>
            If the component exposes <code>frameProps</code>, use it for additional
            properties of its underlying frame. These can override values derived by
            the chart wrapper; check the family's
            <Link to="/frames/xy-frame"> XY</Link>,
            <Link to="/frames/ordinal-frame"> ordinal</Link>,
            <Link to="/frames/network-frame"> network</Link>, or
            <Link to="/frames/geo-frame"> geo</Link> reference.
          </li>
          <li>
            Add <Link to="/annotations/overview">annotations</Link> or
            <Link to="/features/composition"> graphics</Link> when the
            marks already have the right geometry. Use a custom layout when you need
            to position the marks yourself. Reach for a Stream Frame directly when
            the high-level component does not expose the required control.
          </li>
        </ol>
        <p>
          Annotations such as thresholds and <code>frame-text</code> use plain objects.
          Custom <code>svgAnnotationRules</code>
          and <code>foregroundGraphics</code>/<code>backgroundGraphics</code> accept
          JavaScript callbacks or React nodes where the frame exposes them. XY and
          ordinal frames also expose <code>interactiveGraphics</code> for controls.
          Custom-layout overlays use plot coordinates; network layouts additionally
          support positioned <Link to="/custom-charts/custom-layouts#html-marks">HTML marks</Link>.
          These are documented composition APIs; incidental DOM nesting, generated SVG
          IDs, and undocumented selectors are not extension points.
        </p>
      </section>

      <section>
        <h2 id="public-imports">Public imports and types</h2>
        <p>
          Import charts and frame/layout types from their family entry. For example,
          <code> NetworkCustomLayout</code>, <code>NetworkLayoutContext</code>, and
          <code> StreamNetworkFrameProps</code> come from <code>semiotic/network</code>;
          <code> CustomLayout</code> comes from <code>semiotic/xy</code>, and
          <code> OrdinalCustomLayout</code> from <code>semiotic/ordinal</code>.
          Recipe-specific configuration types are available from <code>semiotic/recipes</code>.
        </p>
        <CodeBlock language="tsx">{`import { NetworkCustomChart } from "semiotic/network"
import type { NetworkCustomLayout, StreamNetworkFrameProps } from "semiotic/network"
import type { InteractiveGraphicsContext } from "semiotic/xy"
import type { OnObservationCallback } from "semiotic/ai"`}</CodeBlock>
        <p>
          Custom-chart tooltip callbacks receive authored data; lower-level
          <code> frameProps.tooltipContent</code> receives a hover wrapper. Node and
          edge records have different shapes. See the
          <a href="https://github.com/nteract/semiotic/blob/main/ai/behaviorContracts.cjs"> callback contracts</a>
          and <Link to="/features/tooltips">tooltip guide</Link> before adapting a renderer.
        </p>
      </section>

      <section>
        <h2 id="layout-and-state">Size, state, and layout work</h2>
        <p>
          <Link to="/features/chart-states#resolve-chart-size"><code>resolveChartSize</code></Link>
          {" "}from <code>semiotic/utils</code> resolves the chart's viewport defaults and
          supplied dimensions. It does not measure external CSS or reserve every label
          and legend. <Link to="/features/axes#axis-extent"><code>resolveAxisTickCount</code></Link>
          {" "}uses the axis length, orientation, and requested ticks; it is not a text measurer.
          The opt-in <Link to="/annotations/text-layout">text adapter</Link> runs after browser mount.
        </p>
        <p>
          In React, omit <code>data</code> (or the family's equivalent) and use a ref
          to select push mode. <code>{"data={[]}"}</code> is an explicitly empty bounded
          chart. Handles differ by family: consult the
          <Link to="/features/push-api"> push API contracts</Link>
          for push/update/remove/clear support. Static and serialized configs need real data.
        </p>
        <p>
          For visual selection in XY, ordinal, and network layouts, return
          <code> restyle</code> (and network <code>restyleEdge</code>) and read
          <code> useCustomLayoutSelection()</code> inside overlays. Keep hover and camera
          state out of <code>layoutConfig</code> unless they change geometry.
          <Link to="/custom-charts/custom-layouts#when-layouts-run"> When layouts run</Link>
          {" "}covers invalidation and <code>relayout()</code>, with
          <a href="https://github.com/nteract/semiotic/blob/main/src/components/stream/networkCustomLayout.ts"> the source contract</a>
          {" "}and <a href="https://github.com/nteract/semiotic/blob/main/src/components/stream/NetworkPipelineStore.customLayout.test.ts">regression tests</a>.
        </p>
      </section>

      <section>
        <h2 id="portable-composition">React composition and portable configs</h2>
        <p>
          A serialized <code>{"{ component, props }"}</code> config can carry real data,
          string accessors, named themes, and supported annotation objects. The
          <Link to="/annotations/overview#compact-caption"> compact legend/caption row</Link>
          {" "}uses that shape. Registered <code>ChartRecipe</code> layouts can also use
          their schema-backed configuration.
        </p>
        <p>
          Layout functions, formatter callbacks such as <code>xFormat</code>, custom
          tooltip renderers, React graphics and widget content, refs, and DOM elements require JavaScript
          or React. They cannot be turned into JSON by replacing functions with strings.
          The <Link to="/using-ssr#runtime-output">runtime and output guide</Link> explains
          browser SVG, Node image export, theme resolution, and render evidence.
        </p>
      </section>

      <section>
        <h2>The four escape-hatch HOCs</h2>
        <p>
          Each wraps a Stream Frame and differs only in the context it hands the layout (which scales
          and data shape) and the scene primitives it can paint:
        </p>
        <table className="recipe-customization-table">
          <thead>
            <tr>
              <th>HOC</th>
              <th>Import</th>
              <th>Layout context</th>
              <th>Emits</th>
              <th>Recipes</th>
            </tr>
          </thead>
          <tbody>
            {HOCS.map((h) => (
              <tr key={h.name}>
                <td>
                  <code>{h.name}</code>
                </td>
                <td>
                  <code>{h.importPath}</code>
                </td>
                <td>{h.ctx}</td>
                <td>{h.emits}</td>
                <td>{h.examples}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Building blocks</h2>
        {BUILDING_BLOCKS.map((b) => (
          <div key={b.path} style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>
              <Link to={b.path}>{b.title}</Link>
            </h3>
            <p style={{ marginBottom: 0 }}>{b.what}</p>
          </div>
        ))}
      </section>

      <section>
        <h2>Worked examples</h2>
        <p>Full recipes built on the escape hatch — each is interactive:</p>
        {WORKED_EXAMPLES.map((e) => (
          <div key={e.path} style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>
              <Link to={e.path}>{e.title}</Link>
            </h3>
            <p style={{ marginBottom: 0 }}>{e.what}</p>
          </div>
        ))}
      </section>

      <section>
        <h2>When to reach for it</h2>
        <p>
          Prefer a built-in HOC whenever one fits — they&rsquo;re simpler and fully supported. Reach
          for a custom layout when the geometry itself is the point (a packed matrix, a bespoke DAG,
          a multi-channel glyph) and no built-in expresses it. The recipe still gets interaction,
          accessibility, theming, and server rendering from the frame; you only write the layout.
        </p>
      </section>
    </PageLayout>
  )
}
