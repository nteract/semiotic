import React, { useMemo } from "react"
import { CustomChart } from "../../../../src/components/charts/custom/CustomChart"
import { NetworkCustomChart } from "../../../../src/components/charts/custom/NetworkCustomChart"
import { StackedAreaChart } from "../../../../src/components/charts/xy/StackedAreaChart"
import { waffleLayout } from "../../../../src/components/recipes/waffle"
import { calendarLayout } from "../../../../src/components/recipes/calendar"
import { flextreeLayout } from "../../../../src/components/recipes/flextree"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

// ── Demo data ────────────────────────────────────────────────────────────

const waffleData = [
  { region: "AMER", share: 42 },
  { region: "EMEA", share: 28 },
  { region: "APAC", share: 18 },
  { region: "LATAM", share: 12 },
]

function buildCalendarYear(year, seed = 7) {
  // Deterministic pseudo-random walk so the demo is stable across renders.
  let s = seed
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const start = Date.UTC(year, 0, 1)
  const days = []
  for (let i = 0; i < 365; i++) {
    const day = new Date(start + i * 86_400_000)
    const dow = day.getUTCDay()
    // Weekends quieter; weekly bursts every ~10 days.
    const base = dow === 0 || dow === 6 ? 0.8 : 2.4
    const burst = Math.floor(i / 11) % 5 === 0 ? 5 + Math.floor(rand() * 8) : 0
    days.push({ date: day, count: Math.round(base + rand() * 3 + burst) })
  }
  return days
}

// Pre-positioned tree data, as if computed by d3-flextree. Showcases
// every dimension of variation flextree handles that uniform-height
// d3-tree can't:
//
//   1. Per-node height variation. Row 1 has Tutorials (h=70) next to API
//      (h=32) — top edges align, bottom edges don't.
//   2. Per-node width variation. First Chart (84) next to Setup (58),
//      Streaming (72), etc.
//   3. Asymmetric subtree breadth. Tutorials's subtree is huge (4 leaves,
//      one of which itself has 3 sub-leaves) so it claims most of the
//      horizontal real estate. API gets a narrow slot.
//   4. Asymmetric depth. Most branches stop at row 2, but two ("First
//      Chart" and "Horizon") drop a 3rd row of leaves. That uneven depth
//      is something d3-tree can express but uniform-height layouts pad
//      awkwardly.
//
// Row top edges align at: 30, 100, 200, 320 — all sized to the *tallest*
// rect in each row, which is exactly how flextree packs vertically.
const flextreeNodes = [
  // Row 0 — root.
  { id: "root", label: "Documentation", x: 320, y: 50, width: 70, height: 40 },

  // Row 1 — tops aligned at y=100.
  //   Tutorials  h=70 → center 100+35 = 135   (tall card)
  //   API        h=32 → center 100+16 = 116   (short pill)
  //   Recipes    h=58 → center 100+29 = 129   (medium card)
  { id: "tutorials", label: "Tutorials",     x: 171, y: 135, width: 92, height: 70 },
  { id: "api",       label: "API Reference", x: 422, y: 116, width: 58, height: 32 },
  { id: "recipes",   label: "Recipes",       x: 571, y: 129, width: 80, height: 58 },

  // Row 2 — tops aligned at y=200.
  //   short pills h=26 → center 200+13 = 213
  //   First Chart h=86 → center 200+43 = 243   (very tall card)
  //   Horizon     h=68 → center 200+34 = 234   (tall card)
  { id: "setup",       label: "Setup",       x: 31,  y: 213, width: 58, height: 26 },
  { id: "first-chart", label: "First Chart", x: 164, y: 243, width: 84, height: 86 },
  { id: "streaming",   label: "Streaming",   x: 304, y: 213, width: 72, height: 26 },
  { id: "charts",      label: "Charts",      x: 387, y: 213, width: 58, height: 26 },
  { id: "frames",      label: "Frames",      x: 457, y: 213, width: 58, height: 26 },
  { id: "waffle",      label: "Waffle",      x: 533, y: 213, width: 58, height: 26 },
  { id: "horizon",     label: "Horizon",     x: 606, y: 234, width: 64, height: 68 },

  // Row 3 — tops aligned at y=320. Only the wide / tall row-2 nodes have
  // children; the rest stop at row 2. That's the asymmetric depth real
  // documentation trees actually exhibit.
  //   leaves h=26 → center 320+13 = 333
  { id: "data",   label: "Data",   x: 95,  y: 333, width: 46, height: 26 },
  { id: "render", label: "Render", x: 159, y: 333, width: 58, height: 26 },
  { id: "theme",  label: "Theme",  x: 228, y: 333, width: 56, height: 26 },
  { id: "bands",  label: "Bands",  x: 606, y: 333, width: 54, height: 26 },
]
const flextreeEdges = [
  // Row 0 → 1
  { source: "root", target: "tutorials" },
  { source: "root", target: "api" },
  { source: "root", target: "recipes" },
  // Row 1 → 2
  { source: "tutorials", target: "setup" },
  { source: "tutorials", target: "first-chart" },
  { source: "tutorials", target: "streaming" },
  { source: "api", target: "charts" },
  { source: "api", target: "frames" },
  { source: "recipes", target: "waffle" },
  { source: "recipes", target: "horizon" },
  // Row 2 → 3 (only the tall / wide row-2 nodes have children)
  { source: "first-chart", target: "data" },
  { source: "first-chart", target: "render" },
  { source: "first-chart", target: "theme" },
  { source: "horizon", target: "bands" },
]

function buildStreamgraphData() {
  // Six categories x 30 time steps, smooth-ish wandering totals.
  const cats = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"]
  const out = []
  for (let i = 0; i < 30; i++) {
    for (let c = 0; c < cats.length; c++) {
      const phase = c * 0.7
      const base = 8 + 4 * Math.sin(i * 0.25 + phase)
      const drift = 2 * Math.cos(i * 0.13 + c)
      out.push({ t: i, group: cats[c], v: Math.max(0, base + drift) })
    }
  }
  return out
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function CustomChartsPage() {
  const calendarData = useMemo(() => buildCalendarYear(2025), [])
  const streamData = useMemo(() => buildStreamgraphData(), [])

  return (
    <PageLayout title="Custom Charts" subtitle="Bespoke geometry on top of the built-in pipeline">
      <section>
        <p>
          When the catalog doesn't fit, <code>CustomChart</code> lets you supply a layout
          function that emits scene nodes directly. The frame still owns scales, theme,
          hit testing, transitions, decay, accessibility, and SSR — your layout owns the
          geometry. Most novel chart types (waffle, calendar, streamgraph,
          flextree, dagre) decompose into the same primitives the built-in HOCs use.
        </p>
        <p>
          Layouts ship in <code>semiotic/recipes</code>. You can use them as-is or copy
          one and customize. Writing your own is ~30 lines.
        </p>
      </section>

      <section>
        <h2>Waffle chart</h2>
        <p>
          A grid of cells where each cell represents one share of the total. Categories
          fill row-major, allocated proportionally with the largest-remainder method.
          The whole layout is ~40 lines and emits <code>RectSceneNode</code>s — every
          theme, hover, and selection feature works without extra wiring.
        </p>
        <div style={{ background: "var(--surface-2, #f8f8f8)", borderRadius: 8, padding: 16, border: "1px solid var(--border-color, #e0e0e0)" }}>
          <CustomChart
            data={waffleData}
            layout={waffleLayout}
            layoutConfig={{
              rows: 10,
              columns: 10,
              gutter: 3,
              categoryAccessor: "region",
              valueAccessor: "share",
            }}
            width={420}
            height={420}
            margin={20}
            colorScheme={["#4e79a7", "#f28e2c", "#59a14f", "#e15759"]}
          />
        </div>
        <CodeBlock language="jsx">{`import { CustomChart } from "semiotic/xy"
import { waffleLayout } from "semiotic/recipes"

<CustomChart
  data={[
    { region: "AMER",  share: 42 },
    { region: "EMEA",  share: 28 },
    { region: "APAC",  share: 18 },
    { region: "LATAM", share: 12 },
  ]}
  layout={waffleLayout}
  layoutConfig={{
    rows: 10, columns: 10, gutter: 3,
    categoryAccessor: "region",
    valueAccessor: "share",
  }}
  width={420}
  height={420}
/>`}</CodeBlock>
      </section>

      <section>
        <h2>Calendar heatmap</h2>
        <p>
          GitHub-style day-by-day grid. 53 ISO weeks × 7 days, color-encoded by daily
          value. The recipe handles the day-of-week / week-of-year math; the active theme
          provides the default <code>surface → primary</code> color ramp. Pass a custom{" "}
          <code>colorRamp</code> for non-default ramps.
        </p>
        <div style={{ background: "var(--surface-2, #f8f8f8)", borderRadius: 8, padding: 16, border: "1px solid var(--border-color, #e0e0e0)" }}>
          <CustomChart
            data={calendarData}
            layout={calendarLayout}
            layoutConfig={{
              dateAccessor: "date",
              valueAccessor: "count",
              year: 2025,
              gutter: 2,
            }}
            width={780}
            height={130}
            margin={10}
          />
        </div>
        <CodeBlock language="jsx">{`import { calendarLayout } from "semiotic/recipes"

<CustomChart
  data={dailyEvents}
  layout={calendarLayout}
  layoutConfig={{
    dateAccessor: "date",
    valueAccessor: "count",
    year: 2025,
    colorRamp: ["#ebedf0", "#216e39"], // optional
  }}
  width={780}
  height={130}
/>`}</CodeBlock>
      </section>


      <section>
        <h2>Flextree (network)</h2>
        <p>
          Hierarchical trees where node sizes vary along the major axis —
          rendered through <code>NetworkCustomChart</code>. The user runs{" "}
          <code>d3-flextree</code> (a BYO dep) to compute positions, then
          passes the laid-out nodes and parent → child edges into the chart.
          The recipe handles scene emission: rect nodes, smooth bezier
          edges from parent-bottom to child-top, optional labels.
        </p>
        <p>
          The demo below is what flextree exists for. Four kinds of
          variation that uniform-height <code>d3-tree</code> can't pack
          tightly are all present at once:
        </p>
        <ul>
          <li>
            <strong>Per-node height.</strong> Row 1's <em>Tutorials</em>{" "}
            (tall card) sits next to <em>API Reference</em> (short pill);
            Row 2's <em>First Chart</em> is taller than every other rect
            in the row.
          </li>
          <li>
            <strong>Per-node width.</strong> Each rect hugs its label —
            from the 46px <em>Data</em> leaf to the 92px{" "}
            <em>Tutorials</em> card.
          </li>
          <li>
            <strong>Asymmetric subtree breadth.</strong>{" "}
            <em>Tutorials</em>'s subtree is huge (3 leaves, one of which
            itself has 3 sub-leaves), so it claims most of the horizontal
            room. <em>API Reference</em> only needs a narrow slot.
          </li>
          <li>
            <strong>Asymmetric depth.</strong> Two branches drop a 3rd row
            of children; the others stop at row 2. Real documentation /
            project trees look like this; flextree packs them without
            forcing every leaf to the deepest level.
          </li>
        </ul>
        <div style={{ background: "var(--surface-2, #f8f8f8)", borderRadius: 8, padding: 16, border: "1px solid var(--border-color, #e0e0e0)" }}>
          <NetworkCustomChart
            nodes={flextreeNodes}
            edges={flextreeEdges}
            layout={flextreeLayout}
            layoutConfig={{
              orientation: "vertical",
              showLabels: true,
              labelAccessor: "label",
            }}
            width={800}
            height={400}
            margin={{ top: 20, right: 80, bottom: 30, left: 80 }}
          />
        </div>
        <CodeBlock language="jsx">{`import flextree from "d3-flextree"
import { NetworkCustomChart } from "semiotic/network"
import { flextreeLayout } from "semiotic/recipes"

const layout = flextree({ nodeSize: (n) => [n.data.size, 40] })
const tree = layout.hierarchy(rootData)
layout(tree)

const nodes = tree.descendants().map(n => ({
  id: n.data.id, x: n.x, y: n.y,
  width: n.size[0], height: n.size[1],
}))
const edges = tree.links().map(l => ({
  source: l.source.data.id,
  target: l.target.data.id,
}))

<NetworkCustomChart
  nodes={nodes} edges={edges}
  layout={flextreeLayout}
  layoutConfig={{ orientation: "vertical" }}
  width={800} height={260}
/>`}</CodeBlock>
      </section>

      <section>
        <h2>Dagre (network)</h2>
        <p>
          Layered DAG layout from <code>dagre</code> (BYO dep). Same shape as
          flextree: run <code>dagre.layout(g)</code>, flatten nodes/edges,
          pass to <code>NetworkCustomChart</code>. Edges with a{" "}
          <code>points</code> waypoint array render as polylines through
          those points; without waypoints, fall back to a straight line.
        </p>
        <CodeBlock language="jsx">{`import dagre from "dagre"
import { NetworkCustomChart } from "semiotic/network"
import { dagreLayout } from "semiotic/recipes"

const g = new dagre.graphlib.Graph()
g.setGraph({ rankdir: "TB" })
g.setDefaultEdgeLabel(() => ({}))
for (const n of myNodes) g.setNode(n.id, { width: 120, height: 40, label: n.label })
for (const e of myEdges) g.setEdge(e.source, e.target)
dagre.layout(g)

const nodes = g.nodes().map(id => {
  const n = g.node(id)
  return { id, x: n.x, y: n.y, width: n.width, height: n.height, label: n.label }
})
const edges = g.edges().map(e => {
  const ed = g.edge(e)
  return { source: e.v, target: e.w, points: ed.points }
})

<NetworkCustomChart
  nodes={nodes} edges={edges}
  layout={dagreLayout}
  layoutConfig={{ edgeStyle: "smooth" }}
/>`}</CodeBlock>
      </section>

      <section>
        <h2>Streamgraph</h2>
        <p>
          Streamgraphs aren't a recipe — they're <code>StackedAreaChart</code> with{" "}
          <code>baseline="wiggle"</code> (Byron–Wattenberg offset) or{" "}
          <code>baseline="silhouette"</code> (centered). The same layout pipeline that
          drives stacked areas handles the offset; no escape hatch needed.
        </p>
        <div style={{ background: "var(--surface-2, #f8f8f8)", borderRadius: 8, padding: 16, border: "1px solid var(--border-color, #e0e0e0)" }}>
          <StackedAreaChart
            data={streamData}
            xAccessor="t"
            yAccessor="v"
            areaBy="group"
            baseline="wiggle"
            colorBy="group"
            colorScheme="category10"
            width={780}
            height={220}
            margin={{ top: 10, right: 10, bottom: 30, left: 40 }}
            showAxes={false}
          />
        </div>
        <CodeBlock language="jsx">{`<StackedAreaChart
  data={timeSeries}
  xAccessor="t"
  yAccessor="v"
  areaBy="group"
  baseline="wiggle"      // or "silhouette" for symmetric centering
  colorBy="group"
/>`}</CodeBlock>
      </section>

      <section>
        <h2>Writing your own layout</h2>
        <p>
          A layout is a pure function: <code>{"(ctx) => { nodes, overlays? }"}</code>. The
          context exposes the frame's scales, plot-rect dimensions, theme, and a{" "}
          <code>resolveColor</code> helper that honors the same{" "}
          <code>CategoryColorProvider</code> / <code>ThemeProvider</code> cascade built-in
          charts use. Emit standard scene nodes (<code>rect</code>, <code>line</code>,{" "}
          <code>area</code>, <code>point</code>, <code>heatcell</code>) and the frame
          handles the rest.
        </p>
        <CodeBlock language="tsx">{`import type { CustomLayout } from "semiotic/xy"

interface MyConfig {
  rows: number
  columns: number
  valueAccessor: string
}

export const myLayout: CustomLayout<MyConfig> = (ctx) => {
  const { rows, columns, valueAccessor } = ctx.config
  const { plot } = ctx.dimensions
  const cellW = plot.width / columns
  const cellH = plot.height / rows

  const nodes = ctx.data.map((d, i) => {
    const r = Math.floor(i / columns)
    const c = i % columns
    return {
      type: "rect",
      x: c * cellW,
      y: r * cellH,
      w: cellW - 1,
      h: cellH - 1,
      style: { fill: ctx.resolveColor(String(d[valueAccessor])) },
      datum: d,
    }
  })

  return { nodes }
}`}</CodeBlock>

        <h3>What you get for free</h3>
        <ul>
          <li><strong>Hit testing.</strong> Hover, tooltip, click — quadtree built from your scene-node geometry.</li>
          <li><strong>Transitions.</strong> Enter/exit/move animations run through the same pipeline as built-in charts.</li>
          <li><strong>Theme cascade.</strong> Use <code>ctx.resolveColor</code> instead of hard-coded literals and the chart honors <code>ThemeProvider</code> + <code>CategoryColorProvider</code>.</li>
          <li><strong>SSR.</strong> Scene nodes serialize to SVG via the same path the built-in charts use.</li>
          <li><strong>Streaming.</strong> Layouts re-run on each push/pushMany — your custom waffle becomes a streaming waffle without extra plumbing.</li>
        </ul>
      </section>

      <section>
        <h2>Sub-path import</h2>
        <p>
          <code>CustomChart</code> ships from <code>semiotic/xy</code> and{" "}
          <code>NetworkCustomChart</code> from <code>semiotic/network</code>.
          Layout recipes live on <code>semiotic/recipes</code> as a separate
          sub-path so they only land in the bundle if you actually use them.
          BYO deps (<code>d3-flextree</code>, <code>dagre</code>) are imported by
          your code, not Semiotic — keeps the library small.
        </p>
        <CodeBlock language="jsx">{`import { CustomChart } from "semiotic/xy"
import { NetworkCustomChart } from "semiotic/network"
import {
  waffleLayout, calendarLayout,
  flextreeLayout, dagreLayout,
} from "semiotic/recipes"`}</CodeBlock>
      </section>

      <section>
        <h2>Notes</h2>
        <ul>
          <li><strong>Plot-relative coordinates.</strong> Scene-node positions are in plot space — the frame already translates by the resolved <code>margin</code>. Use <code>ctx.dimensions.plot</code> for the drawing rect.</li>
          <li><strong>Renderer dispatch.</strong> When <code>customLayout</code> is provided, the frame uses a renderer set that handles every node type, so your layout can emit any mix of rects, areas, lines, etc. regardless of <code>chartType</code>.</li>
          <li><strong>Extents.</strong> If your layout uses scales, pass <code>xExtent</code> / <code>yExtent</code> on <code>CustomChart</code> to lock the domain. Layouts that don't use scales (waffle, calendar) ignore them.</li>
          <li>
            For richer composition examples, see <Link to="/recipes/benchmark-dashboard">recipes pages</Link>.
            Streamgraph baseline lives on <Link to="/charts/stacked-area-chart">StackedAreaChart</Link>.
          </li>
        </ul>
      </section>
    </PageLayout>
  )
}
