import React from "react"
import { Link } from "react-router-dom"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { roundedEnclosure, boundsOf, bandLabel, markCallout } from "semiotic/recipes"

const DOTS = [
  { x: 70, y: 70 }, { x: 95, y: 95 }, { x: 120, y: 64 }, { x: 140, y: 100 },
  { x: 88, y: 120 }, { x: 160, y: 78 }, { x: 116, y: 110 }, { x: 150, y: 130 },
]

function KitDemo() {
  const box = boundsOf(DOTS.map((d) => ({ ...d, r: 6 })), 10)
  return (
    <svg width={320} height={190} role="img" aria-label="Recipe chrome kit demo" style={{ background: "#0a1330", borderRadius: 8 }}>
      {/* the marks (what a layout emits to canvas; here just SVG dots) */}
      {DOTS.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={5} fill="#7b52c9" />
      ))}
      {/* chrome kit pieces, exactly as a recipe would return them in overlays */}
      {box && roundedEnclosure({ ...box, x: box.x, y: box.y, width: box.width, height: box.height, stroke: "rgba(233,238,255,0.7)", strokeWidth: 1.5, radius: 12 })}
      {bandLabel({ text: "cluster", x: 16, y: box ? box.y + box.height / 2 : 90, anchor: "start", color: "rgba(233,238,255,0.7)", fontSize: 12 })}
      {markCallout({ markX: 160, markY: 78, labelX: 250, labelY: 165, label: "outlier", markRadius: 9, stroke: "rgba(233,238,255,0.85)", color: "rgba(233,238,255,0.9)", connector: "elbow" })}
    </svg>
  )
}

export default function RecipeKitPage() {
  return (
    <PageLayout
      title="Recipe Chrome Kit"
      subtitle="Composable overlay building blocks for custom layouts"
      breadcrumbs={[
        { label: "Custom Charts", path: "/custom-charts/overview" },
        { label: "Recipe Chrome Kit", path: "/custom-charts/recipe-kit" },
      ]}
      prevPage={{ title: "Glyph Marks", path: "/custom-charts/glyph-marks" }}
    >
      <section>
        <p>
          A custom layout returns scene primitives <em>and</em> an <code>overlays</code> ReactNode
          painted on top (for the chrome the canvas doesn&rsquo;t draw: labels, enclosures, callouts).
          Surveying the recipes, the same overlay chores recurred — so the building blocks live in one
          small, composable kit, exported from <code>semiotic/recipes</code>. They return plain SVG
          with <code>pointer-events: none</code>, so they decorate without intercepting canvas
          hit-testing, and they&rsquo;re pure / SSR-safe.
        </p>
        <div style={{ margin: "14px 0" }}>
          <KitDemo />
        </div>
        <p style={{ fontSize: 13, color: "var(--text-2)" }}>
          Above: a <code>roundedEnclosure</code> sized by <code>boundsOf</code>, a left{" "}
          <code>bandLabel</code>, and a <code>markCallout</code> with an elbow connector — the same
          pieces the <Link to="/recipes/satellites-in-space">Satellites in Space</Link> recipe uses
          for its orbit-band borders and named-satellite callouts.
        </p>
      </section>

      <section>
        <h2>The kit</h2>
        <table className="recipe-customization-table">
          <thead>
            <tr>
              <th>Helper</th>
              <th>Returns</th>
              <th>Use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>roundedEnclosure(props)</code></td>
              <td>a rounded <code>&lt;rect&gt;</code></td>
              <td>a border around a group of marks (a cell, a row/column band, a cluster)</td>
            </tr>
            <tr>
              <td><code>boundsOf(points, pad)</code></td>
              <td><code>{`{ x, y, width, height }`}</code></td>
              <td>the padded bounding box of a point set — the usual precursor to an enclosure</td>
            </tr>
            <tr>
              <td><code>bandLabel(props)</code></td>
              <td>a <code>&lt;text&gt;</code> (or null)</td>
              <td>an axis/band label, suppressed when it would overflow <code>maxWidth</code></td>
            </tr>
            <tr>
              <td><code>markCallout(props)</code></td>
              <td>a <code>&lt;g&gt;</code>: ring + connector + label</td>
              <td>an editorial leader-line callout to a specific mark a layout emitted</td>
            </tr>
            <tr>
              <td><code>readField(node, key, fallback)</code></td>
              <td>the value</td>
              <td>read <code>node.data.&lt;key&gt;</code> (the network ingest wrapper) or the node itself</td>
            </tr>
            <tr>
              <td><code>dimFor(datum, opts)</code></td>
              <td>an opacity</td>
              <td>the highlight/dim rule: lit marks (matching <code>highlight</code> AND <code>predicate</code>) stay bright, the rest fall to <code>dimOpacity</code></td>
            </tr>
            <tr>
              <td><code>signatureKey</code> / <code>LayoutCache</code></td>
              <td>a key / a cache</td>
              <td>content-signature geometry cache — re-style on interaction without re-running an expensive layout</td>
            </tr>
            <tr>
              <td><code>legendGroupsFrom(input)</code></td>
              <td><code>LegendGroup[]</code></td>
              <td>build the legend a custom layout passes through <code>frameProps.legend</code> (color / symbol / size channels)</td>
            </tr>
            <tr>
              <td><code>shade</code> / <code>makeShade</code></td>
              <td>a color</td>
              <td>perceptual (CIELAB) lightness ramp on a hue — a continuous channel</td>
            </tr>
            <tr>
              <td><code>symbolPathString</code> / <code>symbolExtent</code></td>
              <td>a path string / radius</td>
              <td>glyph path + true extent (see <Link to="/custom-charts/glyph-marks">Glyph Marks</Link>)</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Composing overlays</h2>
        <CodeBlock language="jsx">{`import { roundedEnclosure, boundsOf, bandLabel, markCallout, readField } from "semiotic/recipes"

function myLayout(ctx) {
  const sceneNodes = ctx.nodes.map((n) => ({
    type: "circle", cx: read(n), cy: ..., r: 4, style: { fill: ctx.resolveColor(readField(n, "group", "")) }, datum: n.data, id: n.id,
  }))

  const box = boundsOf(sceneNodes.map((s) => ({ x: s.cx, y: s.cy, r: s.r })), 6)
  const overlays = (
    <g style={{ pointerEvents: "none" }}>
      {box && roundedEnclosure({ ...box, stroke: "var(--semiotic-text)", radius: 10 })}
      {bandLabel({ text: "Group A", x: box.x, y: box.y - 6, anchor: "start" })}
      {markCallout({ markX, markY, labelX, labelY, label: "peak", markRadius: 8 })}
    </g>
  )
  return { sceneNodes, overlays }
}`}</CodeBlock>
      </section>

      <section>
        <h2>Restyling on hover/selection without a relayout</h2>
        <p>
          By default, a selection or hover change re-runs the layout — rebuilding scene nodes,
          repainting the canvas, and rebuilding the hit-test quadtree. For a big graph that&rsquo;s an
          O(nodes+edges) cost on every hover. Two opt-ins keep selection styling cheap (the layout
          runs only on data/size changes):
        </p>
        <ul>
          <li>
            <strong>Canvas marks</strong> — return a <code>restyle(node, selection)</code> from the
            layout result (network also takes <code>restyleEdge</code>). Compute geometry once in the
            layout body; express dimming/highlighting in <code>restyle</code>. A selection change then
            re-applies styles to the existing marks <em>off each mark&rsquo;s base style</em> and just
            repaints — no relayout, no quadtree rebuild.
          </li>
          <li>
            <strong>Overlays</strong> — call <code>useCustomLayoutSelection()</code> inside an overlay
            component for <code>{`{ isActive, predicate }`}</code>. The frame swaps only the context
            value on selection change, so subscribing overlays re-render while the canvas and quadtree
            stay untouched.
          </li>
        </ul>
        <CodeBlock language="jsx">{`import { useCustomLayoutSelection } from "semiotic/recipes"

function myLayout(ctx) {
  const sceneNodes = ctx.nodes.map((n) => ({ type: "circle", cx, cy, r: 5, style: { fill, opacity: 1 }, datum: n.data, id: n.id }))
  return {
    sceneNodes,
    // Re-applied on selection WITHOUT a relayout; patch merges onto the base style.
    restyle: (node, selection) =>
      selection?.isActive && !selection.predicate(node.datum) ? { opacity: 0.12 } : { opacity: 1 },
    overlays: <Labels />,   // <Labels> calls useCustomLayoutSelection() to dim its text
  }
}`}</CodeBlock>
        <p style={{ fontSize: 13, color: "var(--text-2)" }}>
          Drive selection through the selection store (<code>selection</code> / <code>linkedHover</code>
          on the chart, or <code>useSelectionActions</code>) rather than <code>layoutConfig</code>, so
          changes ride this path instead of forcing a rebuild.
        </p>
      </section>

      <section>
        <h2>Why a kit, not props on the frame</h2>
        <p>
          The frame deliberately owns interaction, accessibility, transitions, and SSR; recipes own
          chrome; the host owns the editorial aesthetic. Keeping these as small composable functions
          (rather than a giant options bag on the frame, or one render-everything recipe) means a new
          layout — or an AI generating one — assembles exactly the chrome it needs from named pieces
          with obvious signatures.
        </p>
        <p style={{ fontSize: 13, color: "var(--text-2)" }}>
          Annotations can now anchor to a mark a custom layout emits: give the scene node an{" "}
          <code>id</code> and pass an annotation <code>{`{ pointId: "<id>" }`}</code> to the chart&rsquo;s{" "}
          <code>annotations</code> prop (all three custom HOCs accept it). <code>markCallout</code> remains
          for fully bespoke, recipe-drawn leader lines.
        </p>
      </section>
    </PageLayout>
  )
}
