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
    title: "Glyph Marks",
    path: "/custom-charts/glyph-marks",
    what: "The per-datum shape channel: the symbol scene-node, d3-shape glyphs, and the composite-glyph model (a filled base mark + an optional stroked inner icon).",
  },
  {
    title: "Recipe Chrome Kit",
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
      subtitle="Bespoke geometry on top of the built-in pipeline"
      breadcrumbs={[
        { label: "Custom Charts", path: "/custom-charts/overview" },
        { label: "Overview", path: "/custom-charts/overview" },
      ]}
      nextPage={{ title: "Intelligence", path: "/custom-charts/intelligence" }}
    >
      <section>
        <p>
          When the chart catalog doesn&rsquo;t fit, Semiotic gives you an <strong>escape hatch</strong>:
          four HOCs that hand a <em>layout function</em> a typed context and let it emit scene
          primitives directly. The Stream Frame still owns the hard parts — scales, theme, canvas
          hit-testing, keyboard navigation, transitions, decay, SSR/PNG export — so your layout only
          has to compute geometry. A bespoke graphic lands as a reusable <em>recipe</em>, not a
          one-off D3 script, and inherits the whole engineering substrate for free.
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
