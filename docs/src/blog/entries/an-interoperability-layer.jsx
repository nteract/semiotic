/* eslint-disable react/no-unescaped-entities */
import React, { useMemo } from "react"
import { Link } from "react-router-dom"
import { BarChart } from "semiotic"
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
        responsiveWidth
        height={300}
      />
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "6px 6px 0" }}>
        A Mermaid flowchart, parsed by <code>fromMermaid</code> and rendered as a layered Semiotic
        graph — shape glyphs (a decision diamond, a store cylinder), directional arrows, and edge
        labels — from the layering the adapter computed. A flowchart is a DAG, not a force blob.
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
        width={560}
        height={260}
      />
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "6px 6px 0" }}>
        A columnar Arrow table (the shape DuckDB-Wasm returns) read by <code>fromArrow</code> into
        row objects and charted directly.
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
        Semiotic now has an <Link to="/interoperability">interoperability layer</Link>: a coherent
        home for the adapters that let other tools' charts, data, and quality signals become
        Semiotic charts — and a library-neutral schema that lets Semiotic's ideas travel the other
        way. Two new adapters round it out: <code>fromMermaid</code> turns the web's most common
        text-to-graph language into interactive, accessible graphs, and <code>fromArrow</code> feeds
        an in-browser analytics engine straight into the chart accessor path.
      </p>

      <h2 id="why-care">Why an "adapter" is more than a parser</h2>
      <p>
        The temptation with interoperability is to stop at appearance: read one format's marks, emit
        another's. But a parser only ever reproduces what the source already had. The more useful
        question is what the source <em>didn't</em> have — and for a chart, that's almost always the
        metadata that makes it trustworthy: which intents it serves, who can read it, where a
        callout came from, whether it's even renderable. Every adapter in the new layer is built to
        carry that, and to compile to the same small set of gate-defended artifacts (a serializable
        config, a provenanced annotation, the generate→validate→prove loop) so reach never costs
        coherence. And when an adapter can't faithfully represent something, it{" "}
        <strong>refuses with a reason</strong> rather than emit a plausible-but-wrong chart.
      </p>

      <h2 id="mermaid">Mermaid: an inaccessible diagram class, made accessible</h2>
      <p>
        Mermaid is everywhere — GitHub, Notion, LLM output — and it renders as flat,
        non-interactive, inaccessible SVG. <code>fromMermaid</code> parses the <code>graph</code>/
        <code>flowchart</code> syntax into a topology that renders with hover, isolation, theme
        tokens, keyboard navigation, and an accessible navigation tree.
      </p>
      <MermaidDemo />
      <p>
        The design choice that matters: a Mermaid flowchart is a directed acyclic graph, not a
        force-of-springs blob. So the adapter doesn't just hand back nodes and edges — it computes a
        longest-path layering and stamps each node with a <code>layer</code> and <code>row</code>,
        ready for a proper layered render via the <code>lineageDagLayout</code> recipe. Rebuild the
        analytical logic, not the appearance. Other Mermaid diagram types (sequence, class, state,
        mindmap) are declined with a reason, not coerced into a wrong graph.
      </p>

      <h2 id="arrow">Apache Arrow: zero-plumbing client-side data</h2>
      <p>
        DuckDB-Wasm runs real SQL over millions of rows in the browser, and returns columnar Apache
        Arrow tables. <code>fromArrow</code> reads one into the row objects a chart expects — leanly
        (cell-by-cell, skipping Arrow's row-proxy machinery, with column projection), and coercing{" "}
        <code>int64</code> bigints to numbers so the scales work.
      </p>
      <ArrowDemo />
      <p>
        Honest scope: v1 materializes rows, because Semiotic's data path is row-oriented today. The
        genuinely zero-copy columnar path is deliberately <em>not</em> built yet — it touches the
        streaming core, so it waits on a real high-throughput consumer and a measured benchmark
        rather than a marketing one.
      </p>

      <h2 id="when">When to reach for the layer</h2>
      <p>
        Reach for an adapter at a boundary: a notebook chart going to production (
        <Link to="/interoperability/observable-plot">Observable Plot</Link>,{" "}
        <Link to="/interoperability/vega-lite">Vega-Lite</Link>), a Mermaid diagram that should be
        interactive, a DuckDB result that should be a chart, a dbt failure that should annotate the
        dashboard (<Link to="/interoperability/data-quality-bridge">Data-Truth Bridge</Link>), an
        agent that should ship a chart it can't break (
        <Link to="/interoperability/generative-ui">Generative-UI Trust Layer</Link>). Don't reach
        for them to reproduce an exotic source pixel-for-pixel; they translate the standard cases
        and tell you, out loud, when they can't.
      </p>

      <h2 id="where-this-goes">Where this goes</h2>
      <p>
        The layer is open-ended by construction: a new format is a pure function returning an
        inspectable object, slotting into the same framework with the same discipline. The leading
        sign it's working won't be adapter downloads — it'll be someone implementing the{" "}
        <Link to="/interoperability/portability-spec">portability schemas</Link> in a stack that
        isn't Semiotic at all. That's the boutique setting a standard rather than shipping a parser.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/interoperability">Interoperability overview</Link> — the whole adapter family
          and the strategy behind it.
        </li>
        <li>
          <Link to="/interoperability/mermaid">Mermaid Adapter</Link> and{" "}
          <Link to="/interoperability/arrow">Apache Arrow Adapter</Link> — the two new adapters,
          interactive.
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "an-interoperability-layer",
  title: "An Interoperability Layer for Semiotic",
  subtitle:
    "Semiotic's adapters now live in one coherent Interoperability section, joined by two new ones: fromMermaid turns the web's dominant text-to-graph language into interactive, accessible graphs, and fromArrow feeds in-browser DuckDB/Arrow data straight into the chart accessor path.",
  author: "Elijah Meeks",
  date: "2026-06-21",
  tags: ["case-study", "network"],
  excerpt:
    "An adapter is more than a parser — it carries the metadata a source format lacks and refuses rather than mistranslate. The new Interoperability layer gathers Semiotic's adapters in one place and adds fromMermaid (accessible graphs from Mermaid text) and fromArrow (columnar DuckDB/Arrow data into charts).",
  component: Body,
  ogChart: { component: "ForceDirectedGraph" },
  draft: true,
}
