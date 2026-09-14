import React, { useMemo } from "react"
import { Link } from "react-router-dom"
import { BarChart } from "semiotic/ordinal"
import { NetworkCustomChart } from "semiotic/network"
import { mermaidDagLayout } from "semiotic/recipes"
import { fromArrow } from "semiotic/data"
import { unstable_fromMermaid as fromMermaid } from "semiotic/experimental"

// ── Mermaid demo ─────────────────────────────────────────────────────────────

const MERMAID = `graph TD
  A[Ingest] --> B{Valid?}
  B -->|Yes| C[Transform]
  B -->|No| D[Quarantine]
  C --> E[(Warehouse)]
  C --> F[Metrics]
  F --> G[Dashboard]`

function MermaidDemo() {
  const r = useMemo(() => fromMermaid(MERMAID), [])
  return (
    <div style={chartFrame}>
      <NetworkCustomChart
        nodes={r.nodes}
        edges={r.edges}
        nodeIDAccessor="id"
        sourceAccessor="source"
        targetAccessor="target"
        layout={mermaidDagLayout}
        layoutConfig={{ direction: r.direction }}
        title="A record moves through validation and reporting"
        description="Ingest leads to a validation decision. Valid records reach Transform, Warehouse, Metrics, and Dashboard; rejected records reach Quarantine."
        summary="Follow the arrow labels Yes and No to compare the two routes."
        accessibleTable
        responsiveWidth
        height={300}
      />
      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 6px 0" }}>
        Follow the arrows from top to bottom. The diamond separates valid records from records sent
        to quarantine; the cylinder marks storage. Exact nodes and links are available in the
        chart's data table.
      </p>
    </div>
  )
}

// ── Arrow demo ───────────────────────────────────────────────────────────────

function mockArrowTable(columns) {
  const names = Object.keys(columns)
  const numRows = names.length ? columns[names[0]].length : 0
  return {
    numRows,
    schema: { fields: names.map((name) => ({ name })) },
    getChild: (name) => (columns[name] ? { get: (i) => columns[name][i] } : null),
  }
}

const TABLE = mockArrowTable({
  region: ["North", "South", "East", "West"],
  revenue: [128, 92, 145, 71],
  orders: [1240n, 980n, 1510n, 760n], // int64 → bigint, coerced by fromArrow
})

function ArrowDemo() {
  const rows = useMemo(() => fromArrow(TABLE), [])
  return (
    <div style={chartFrame}>
      <BarChart
        data={rows}
        categoryAccessor="region"
        valueAccessor="revenue"
        title="Revenue by region"
        description="Four synthetic regions: North 128, South 92, East 145, West 71."
        summary="East has the highest revenue; West has the lowest."
        accessibleTable
        responsiveWidth
        height={260}
      />
      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 6px 0" }}>
        Synthetic revenue values read from an Arrow-shaped sample table. Bar length shows revenue;
        each bar and table row names its region.
      </p>
    </div>
  )
}

const chartFrame = {
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  padding: 12,
  margin: "20px 0",
  background: "var(--surface-1)",
}

// ── Body ─────────────────────────────────────────────────────────────────────

function Body() {
  return (
    <>
      <p>
        A useful diagram may start as a few lines of Mermaid. A useful dataset may arrive as an
        Arrow table from a database query. Semiotic's <Link to="/interoperability">adapters</Link>{" "}
        give those inputs a route into the same chart application, so you can keep the work already
        done and add the interaction your readers need.
      </p>
      <h2 id="why-care">Why the handoff matters</h2>
      <p>
        Moving between tools is a chance to lose meaning. A decision can become an unlabeled
        junction; a large integer can lose precision; a source chart's extra layer can disappear. A
        useful adapter makes its output inspectable and tells the caller what it could not preserve.
        The author still needs to check the result and explain it to the reader.
      </p>
      <h2 id="mermaid">Read a flowchart as a process</h2>
      <p>
        Follow the example from Ingest to the Valid? decision. The Yes branch transforms a record
        and sends it toward storage and reporting. The No branch sends it to Quarantine. Rectangles
        are steps, the diamond is a decision, and arrows show direction.
      </p>
      <MermaidDemo />
      <p>
        <code>unstable_fromMermaid</code> reads a subset of Mermaid flowchart syntax and returns
        nodes, edges, and suggested layers. The <code>mermaidDagLayout</code> recipe uses those
        layers to draw this example. Mermaid flowcharts can contain cycles; the adapter warns when
        it must use a best-effort layering. It also warns about flattened subgraphs and other
        unsupported syntax. Read <code>warnings</code> before treating the translation as complete.
      </p>
      <p>
        Mermaid has its own{" "}
        <a href="https://mermaid.js.org/config/accessibility.html">
          accessible titles and descriptions
        </a>
        . The reason to translate is to use the graph inside a Semiotic application: coordinated
        interaction, theme settings, and authored accessible text. A richer navigation tree is a
        separate composition, not something this adapter creates automatically.
      </p>
      <h2 id="arrow">Read columns as chart rows</h2>
      <p>
        In the second example, compare the lengths of four revenue bars. East is highest at 145;
        West is lowest at 71. The sample table implements the small Arrow interface the adapter
        reads, so the demonstration runs without a database connection.
      </p>
      <ArrowDemo />
      <p>
        <code>fromArrow</code> materializes ordinary row objects. You can select just the columns
        you need with <code>fields</code>. Safe integer values become JavaScript numbers; integers
        outside the safe range remain bigints and produce a warning. Resolve those values
        deliberately before using them on a numeric scale. This conversion copies data; it is not a
        zero-copy columnar renderer.
      </p>
      <h2 id="when">When to reach for an adapter</h2>
      <p>
        Use these adapters when the source already expresses the relationships or measurements you
        need and the supported subset preserves them. Keep the original renderer for a diagram whose
        unsupported grouping or layout is essential. For an Arrow result too large to inspect
        usefully, aggregate or filter it in the query before making chart rows.
      </p>
      <h2 id="wiring">Wiring it up</h2>
      <pre style={{ ...chartFrame, overflowX: "auto" }}>{`import { fromArrow } from "semiotic/data"
import { unstable_fromMermaid } from "semiotic/experimental"

const rows = fromArrow(table, { fields: ["region", "revenue"] })
const graph = unstable_fromMermaid(flowchartText)
// Inspect graph.warnings, then pass nodes and edges to NetworkCustomChart.
// Add a title, description, and the reading tools your audience needs.`}</pre>
      <h2 id="other-domains">Other places this helps</h2>
      <p>
        The same handoff appears in a pipeline explorer, a notebook moving into an application, and
        a report assembled from a browser database. In each case, preserve the source's meaning
        before adding another way to explore it.
      </p>
      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/interoperability/mermaid">Mermaid adapter and supported syntax</Link>
        </li>
        <li>
          <Link to="/interoperability/arrow">Arrow adapter and column projection</Link>
        </li>
        <li>
          <Link to="/accessibility/navigation">Adding structured navigation</Link>
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "an-interoperability-layer",
  title: "An Interoperability Layer for Semiotic",
  subtitle:
    "Bring Mermaid flowcharts and Arrow tables into a chart application while keeping their meaning and translation limits visible.",
  author: "Elijah Meeks",
  date: "2026-06-21",
  tags: ["case-study", "network"],
  excerpt:
    "A diagram and a database result arrive in different forms. These two examples show how to translate them into Semiotic, read the result, and check what the adapter could not preserve.",
  component: Body,
  ogChart: { component: "ForceDirectedGraph" },
}
