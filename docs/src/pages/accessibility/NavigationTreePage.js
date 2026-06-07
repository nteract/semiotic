import React from "react"
import { buildNavigationTree, AccessibleNavTree, useNavigationSync, BarChart, ThemeProvider } from "semiotic"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

const BIDIR_DATA = [
  { month: "Jan", sales: 4200 }, { month: "Feb", sales: 5100 },
  { month: "Mar", sales: 6800 }, { month: "Apr", sales: 9100 }, { month: "May", sales: 2100 },
]
const BIDIR_PROPS = { component: "BarChart", props: { data: BIDIR_DATA, categoryAccessor: "month", valueAccessor: "sales" } }

function BiDirDemo() {
  const tree = React.useMemo(() => buildNavigationTree(BIDIR_PROPS.component, BIDIR_PROPS.props), [])
  const sync = useNavigationSync({ tree, chartId: "nav-bidir-demo", matchFields: ["month"] })
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start", margin: "20px 0" }}>
      <div style={{ flex: "1 1 320px", minWidth: 280 }}>
        <ThemeProvider theme="carbon">
          <BarChart
            {...BIDIR_PROPS.props}
            chartId="nav-bidir-demo"
            selection={sync.selection}
            width={360}
            height={220}
          />
        </ThemeProvider>
      </div>
      <div style={{ flex: "1 1 320px", minWidth: 280, border: "1px solid var(--surface-3)", borderRadius: 8, padding: 8, background: "var(--surface-1)" }}>
        <AccessibleNavTree
          tree={tree}
          label="Sales by month — navigable structure"
          activeId={sync.activeId}
          onActiveChange={sync.onActiveChange}
          visible
        />
      </div>
    </div>
  )
}

const DEMO = {
  component: "LineChart",
  props: {
    data: [
      { month: "Jan", sales: 4200, region: "West" }, { month: "Feb", sales: 5100, region: "West" },
      { month: "Mar", sales: 6800, region: "West" }, { month: "Jan", sales: 2200, region: "East" },
      { month: "Feb", sales: 3100, region: "East" }, { month: "Mar", sales: 2600, region: "East" },
    ],
    xAccessor: "month", yAccessor: "sales", lineBy: "region",
  },
}

function NavDemo() {
  const tree = React.useMemo(() => buildNavigationTree(DEMO.component, DEMO.props), [])
  return (
    <div style={{ border: "1px solid var(--surface-3)", borderRadius: 8, padding: 8, margin: "20px 0", background: "var(--surface-1)" }}>
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "4px 8px 8px" }}>
        Click into the tree and use <kbd>↑</kbd>/<kbd>↓</kbd> to move, <kbd>→</kbd> to expand/descend,
        {" "}<kbd>←</kbd> to collapse/ascend, <kbd>Home</kbd>/<kbd>End</kbd> to jump. (Shown visibly here; it's
        screen-reader-only by default.)
      </p>
      <AccessibleNavTree tree={tree} label="Sales by region — navigable structure" visible />
    </div>
  )
}

const ANNOTATED = {
  component: "LineChart",
  props: {
    data: [
      { month: "Jan", sales: 4200 }, { month: "Feb", sales: 5100 },
      { month: "Mar", sales: 6800 }, { month: "Apr", sales: 4600 },
    ],
    xAccessor: "month", yAccessor: "sales",
    annotations: [
      { type: "callout", x: "Mar", label: "Quarter-end peak" },
      { type: "y-threshold", y: 6000, label: "Target", provenance: { authorKind: "agent" } },
      { type: "callout", x: "Apr", label: "Dip is contested", lifecycle: { status: "disputed" } },
    ],
  },
}

function AnnotatedNavDemo() {
  const tree = React.useMemo(() => buildNavigationTree(ANNOTATED.component, ANNOTATED.props), [])
  return (
    <div style={{ border: "1px solid var(--surface-3)", borderRadius: 8, padding: 8, margin: "20px 0", background: "var(--surface-1)" }}>
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "4px 8px 8px" }}>
        Expand <strong>Annotations</strong> to hear the author's notes — the
        agent-suggested threshold and the contested dip announce their provenance
        and editorial status.
      </p>
      <AccessibleNavTree tree={tree} label="Monthly sales with author notes — navigable structure" visible />
    </div>
  )
}

export default function NavigationTreePage() {
  return (
    <PageLayout
      title="Structured Navigation"
      breadcrumbs={[
        { label: "Accessibility", path: "/accessibility/overview" },
        { label: "Structured Navigation", path: "/accessibility/navigation" },
      ]}
      prevPage={{ title: "Chart Descriptions", path: "/accessibility/descriptions" }}
      nextPage={{ title: "Observation Hooks", path: "/intelligence/observation-hooks" }}
    >
      <p>
        A data table flattens a chart into rows. But a chart has{" "}
        <em>structure</em> — series, axes, groups — and that structure is part of
        the meaning. Structured navigation exposes the chart as a navigable tree
        (chart → axes/series → data points) that a screen-reader user descends
        with arrow keys, hearing where they are at each level: "Series West,
        collapsed" → expand → "point 2 of 3: February, 5,100." It's the model
        from{" "}
        <a href="https://mitvis.github.io/olli/" target="_blank" rel="noopener noreferrer">Olli</a>{" "}
        and{" "}
        <a href="https://www.frank.computer/data-navigator/" target="_blank" rel="noopener noreferrer">Data Navigator</a>
        : a navigation structure that lives in the accessibility tree,{" "}
        <strong>uncoupled from how the chart is rendered</strong> — which is
        exactly what a canvas chart needs, since its pixels expose nothing to
        assistive tech.
      </p>

      <h2 id="why-care">Why a tree, not a table</h2>
      <p>
        A flat list of 200 points is technically complete and practically
        unusable — Chartability calls this out as "navigation is tedious." A tree
        lets a reader get the shape first (the series-level summary, generated by{" "}
        <Link to="/accessibility/descriptions"><code>describeChart()</code></Link>),
        then drill into only the branch they care about. Overview, then detail,
        on demand. The same principle that makes a good table of contents beats a
        wall of text.
      </p>

      <h2 id="live">Try it</h2>
      <NavDemo />
      <p>
        Each row is a real <code>treeitem</code> with <code>aria-level</code>,{" "}
        <code>aria-setsize</code>/<code>aria-posinset</code> ("2 of 3"), and{" "}
        <code>aria-expanded</code>. The series rows carry a generated statistical
        summary; the leaves carry the actual values. Collapsed branches keep the
        deep data out of the way until asked for.
      </p>

      <h2 id="chart-container">Wiring: the ChartContainer opt-in</h2>
      <p>
        Like descriptions, structured navigation is an opt-in at the{" "}
        <Link to="/features/chart-container">ChartContainer</Link> layer — the
        place full accessible chrome belongs — not something bolted onto every
        bare chart. Give the container a <code>chartConfig</code> and set{" "}
        <code>navigable</code>:
      </p>
      <CodeBlock
        code={`import { ChartContainer, LineChart } from "semiotic"

<ChartContainer
  title="Sales by region"
  chartConfig={{ component: "LineChart", props }}
  navigable                          // screen-reader-only navigation tree
  // navigable={{ visible: true }}    // also render it visibly
  // navigable={{ maxLeaves: 100 }}   // cap leaves per branch
>
  <LineChart {...props} />
</ChartContainer>`}
        language="jsx"
      />
      <p>
        Enabling it flips the audit's{" "}
        <Link to="/accessibility/audit"><code>compromising.navigable-structure</code></Link>{" "}
        finding to a pass — including for hierarchy charts (treemaps, trees),
        whose built-in keyboard navigation is otherwise flat.
      </p>

      <h2 id="api">Building the tree yourself</h2>
      <p>
        <code>buildNavigationTree()</code> is a pure function — use it to render
        your own navigation surface, feed a{" "}
        <a href="https://www.frank.computer/data-navigator/" target="_blank" rel="noopener noreferrer">Data Navigator</a>{" "}
        instance, or drive a custom multimodal experience. <code>AccessibleNavTree</code>{" "}
        is the ready-made ARIA <code>tree</code> renderer.
      </p>
      <CodeBlock
        code={`import { buildNavigationTree, AccessibleNavTree } from "semiotic"

const tree = buildNavigationTree("LineChart", {
  data, xAccessor: "month", yAccessor: "sales", lineBy: "region",
})
// tree: { id, role: "chart"|"axis"|"series"|"datum", label, level, value?, datum?, children? }

<AccessibleNavTree
  tree={tree}
  label="Sales by region"
  onActiveChange={(node) => highlightMatchingMark(node.datum)}  // optional sync
/>`}
        language="jsx"
      />
      <p>
        The <code>onActiveChange</code> callback fires as the user moves through
        the tree, handing you the active node (and its <code>datum</code>) — the
        hook for syncing a visual highlight back onto the chart.
      </p>

      <h2 id="bidirectional">Bidirectional sync</h2>
      <p>
        <code>useNavigationSync</code> closes the loop: navigate the tree and the
        matching mark highlights; hover or click the chart and the tree's active
        node follows. It rides the existing selection and observation stores, so
        <strong> no provider is needed</strong> — the chart just takes a{" "}
        <code>chartId</code> and <code>selection</code>; the tree takes{" "}
        <code>activeId</code> and <code>onActiveChange</code>.
      </p>

      <p>
        Try it: click a row in the tree to highlight its bar; hover a bar to move
        the tree's cursor.
      </p>
      <BiDirDemo />

      <CodeBlock
        code={`import { buildNavigationTree, AccessibleNavTree, useNavigationSync, BarChart } from "semiotic"

function SyncedChart({ data }) {
  const tree = React.useMemo(
    () => buildNavigationTree("BarChart", { data, categoryAccessor: "month", valueAccessor: "sales" }),
    [data]
  )
  const sync = useNavigationSync({ tree, chartId: "sales", matchFields: ["month"] })

  return (
    <>
      <BarChart data={data} categoryAccessor="month" valueAccessor="sales"
        chartId="sales" selection={sync.selection} />
      <AccessibleNavTree tree={tree}
        activeId={sync.activeId} onActiveChange={sync.onActiveChange} />
    </>
  )
}`}
        language="jsx"
      />
      <p>
        <code>matchFields</code> are the datum keys that identify a mark (it
        defaults to the leaf datum's primitive keys). Tree → canvas highlights via
        a field-value selection; canvas → tree maps the hovered datum back to its
        leaf and auto-expands the path to it.
      </p>

      <h2 id="annotations-branch">Annotations in the tree</h2>
      <p>
        An author-placed annotation <em>is</em> author intent in its purest
        form, so it shouldn't be reachable only when some external code calls{" "}
        <code>focusAnnotation</code>. When a chart carries annotations,{" "}
        <code>buildNavigationTree</code> adds an <strong>Annotations</strong>{" "}
        branch — a screen-reader user <em>encounters</em> the notes while
        traversing, the same way they meet the axes and series. Each node reuses
        the prose vocabulary from{" "}
        <Link to="/accessibility/descriptions"><code>describeChart()</code></Link>{" "}
        (so the tree and the description speak the same language), surfaces the
        note's <Link to="/annotations/provenance-lifecycle">provenance and
        editorial status</Link> inline (an agent-suggested threshold, a{" "}
        <code>disputed</code> note), and skips <code>retracted</code> ones.
      </p>
      <AnnotatedNavDemo />
      <CodeBlock
        code={`const tree = buildNavigationTree("LineChart", {
  data, xAccessor: "month", yAccessor: "sales",
  annotations: [
    { type: "callout", x: "Mar", label: "Quarter-end peak" },
    { type: "y-threshold", y: 6000, label: "Target", provenance: { authorKind: "agent" } },
    { type: "callout", x: "Apr", label: "Dip is contested", lifecycle: { status: "disputed" } },
  ],
})
// → root
//   ├ X axis / Value axis / data points…
//   └ Annotations: 3 marked features.
//       ├ A callout labeled "Quarter-end peak".
//       ├ An AI-suggested threshold line labeled "Target".
//       └ A callout labeled "Dip is contested" (disputed).`}
      />
      <p>
        It works on every family — even network, hierarchy, and geo charts that
        otherwise return a root-only node get their annotations branch, so the
        author's intent is always reachable.
      </p>

      <h2 id="annotation-anchors">Reaching an annotation's anchor</h2>
      <p>
        The branch lets a reader find a note <em>in the structure</em>; the flip
        side is jumping from a note to the <em>data point it's about</em>. An{" "}
        <Link to="/intelligence/conversation-arc">anchored annotation</Link> —
        an AI note pinned to a specific data point, say — is only "multiplayer"
        for sighted readers unless a non-visual reader can <em>get to</em> the
        anchored point. Pass the chart's <code>annotations</code> to{" "}
        <code>useNavigationSync</code> and each one that anchors to a datum (it
        carries that datum's <code>matchFields</code>) resolves to a nav-tree leaf:
      </p>
      <CodeBlock
        code={`const sync = useNavigationSync({ tree, chartId: "sales", matchFields: ["month"], annotations })

sync.annotatedIds          // Set<nodeId> — leaves that carry a note; mark them in the tree
sync.focusAnnotation(0)    // jump the tree + canvas to the 1st annotation's anchor
sync.focusAnnotation(note) // …or pass the annotation object; returns false if it doesn't anchor`}
        language="jsx"
      />
      <p>
        <code>focusAnnotation</code> moves the controlled <code>activeId</code> to
        the anchored leaf <em>and</em> highlights the mark on the canvas, so a
        screen-reader user lands exactly where the note lives. Threshold/band
        annotations that aren't pinned to one datum simply don't resolve.
      </p>

      <h2 id="coverage">Coverage</h2>
      <p>
        Full trees for XY, bar, part-to-whole, and distribution families. For
        network, hierarchy, geo, and single-value charts,{" "}
        <code>buildNavigationTree()</code> currently returns a root node with an
        L1 label (plus the Annotations branch, if any) rather than a fabricated
        hierarchy — enabling <code>navigable</code> still gives those charts a
        labeled entry point and any author notes, and richer data structure for
        those families is on the roadmap.
      </p>

      <h2 id="sync">Bidirectional sync</h2>
      <p>
        A nav tree is most useful wired to the canvas: focusing a leaf should
        highlight the matching mark, and hovering a mark should move the tree.{" "}
        <code>useNavigationSync</code> rides the module-global selection and
        observation stores, so <strong>no provider is needed</strong> — give the
        chart a <code>chartId</code> and <code>selection</code>, give the tree{" "}
        <code>activeId</code> / <code>onActiveChange</code>.
      </p>
      <CodeBlock language="jsx">{`import { useNavigationSync, AccessibleNavTree } from "semiotic"

const sync = useNavigationSync({ tree, chartId: "sales", annotations })

<LineChart chartId="sales" selection={sync.selection} {...props} />
<AccessibleNavTree
  tree={tree}
  activeId={sync.activeId}
  onActiveChange={sync.onActiveChange}
/>`}</CodeBlock>
      <p>
        It returns <code>{`{ activeId, onActiveChange, selection, annotatedIds, focusAnnotation }`}</code>.
        Tree → canvas highlights the matching mark (a field-value selection);
        canvas → tree maps the hovered or clicked datum back to its leaf. When
        you pass the chart's <code>annotations</code>, an anchored note resolves
        to its nav leaf: <code>annotatedIds</code> are the leaves that carry a
        note, and <code>focusAnnotation(annotation | index)</code> jumps both the
        tree and the canvas to the anchored point — so a non-visual reader can
        reach an AI's anchored annotation. Also exported from{" "}
        <code>semiotic/ai</code>.
      </p>

      <h2 id="telemetry">Reception telemetry</h2>
      <p>
        Traversal is also a <em>signal</em>. When the{" "}
        <Link to="/intelligence/conversation-arc">conversation-arc</Link> store is
        enabled, <code>AccessibleNavTree</code> emits a{" "}
        <code>nav-node-focused</code> event each time a reader moves to a node
        (keyboard or click) and a <code>nav-branch-expanded</code> event on
        expand/collapse, correlated to the chart by the tree's{" "}
        <code>chartId</code> prop. It's the framework's first reception-side
        behavioral measure — which structural nodes a non-visual (or AI) reader
        actually visits, rather than only what we render. Recording is
        zero-overhead while the arc store is disabled, and externally-driven
        active changes (a canvas hover syncing into the tree) are not counted as
        the reader's own traversal.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/accessibility/descriptions">Chart Descriptions</Link> — generates the node labels</li>
        <li><Link to="/intelligence/reader-grounding">Agent-Reader Grounding</Link> — bundles this structure with the description for an LLM</li>
        <li><Link to="/intelligence/conversation-arc">Conversation Arc</Link> — where traversal events land</li>
        <li><Link to="/accessibility/audit">Chartability Audit</Link> — grades navigable structure</li>
        <li><a href="https://www.frank.computer/data-navigator/" target="_blank" rel="noopener noreferrer">Data Navigator (Elavsky et al., IEEE VIS 2023)</a></li>
      </ul>
    </PageLayout>
  )
}
