import React, { useEffect, useRef, useState } from "react"
import { timeFormat } from "d3-time-format"
import { ProcessSankey } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"

// Default formatter the sandbox uses for both axis ticks and tooltip
// time fields. ProcessSankey treats `timeFormat` the same way XY charts
// treat `xFormat` — fall through to axis + default tooltip in tandem.
const SANDBOX_TIME_FORMAT = timeFormat("%b %d")

// ---------------------------------------------------------------------------
// Fixtures used by the docs sandbox. Each is a plain { nodes, edges,
// domain, axisTicks } payload — the shape the ProcessSankey HOC accepts
// directly.
// ---------------------------------------------------------------------------

const D = (y, m, d) => new Date(y, m - 1, d).getTime()

const TEAM_FIXTURE = {
  label: "Project team",
  domain: [D(2026, 1, 1), D(2026, 6, 30)],
  axisTicks: [
    { date: D(2026, 1, 1), label: "Jan" },
    { date: D(2026, 2, 1), label: "Feb" },
    { date: D(2026, 3, 1), label: "Mar" },
    { date: D(2026, 4, 1), label: "Apr" },
    { date: D(2026, 5, 1), label: "May" },
    { date: D(2026, 6, 1), label: "Jun" },
  ],
  nodes: [
    { id: "Alice",   category: "Person", xExtent: [D(2026, 1,  6), D(2026, 1,  6)] },
    { id: "Bob",     category: "Person", xExtent: [D(2026, 2,  1), D(2026, 2,  1)] },
    { id: "Carol",   category: "Person", xExtent: [D(2026, 3,  1), D(2026, 3,  1)] },
    { id: "Eng",     category: "Team" },
    { id: "Docs",    category: "Team" },
    { id: "QA",      category: "Team" },
    // Release accumulates mass through its incoming edges; xExtent[1]
    // extends the band past the final QA→Release flow ending Jun 5
    // out to Jun 28, keeping the lane drawing as a "shipped" milestone.
    { id: "Release", category: "Milestone", xExtent: [D(2026, 4, 15), D(2026, 6, 28)] },
  ],
  edges: [
    { id: "alice-eng",  source: "Alice", target: "Eng",     value: 8, startTime: D(2026, 1, 20), endTime: D(2026, 2, 10) },
    { id: "alice-docs", source: "Alice", target: "Docs",    value: 4, startTime: D(2026, 2, 15), endTime: D(2026, 3,  1) },
    { id: "bob-eng",    source: "Bob",   target: "Eng",     value: 5, startTime: D(2026, 2, 15), endTime: D(2026, 3, 15) },
    { id: "bob-qa",     source: "Bob",   target: "QA",      value: 6, startTime: D(2026, 3,  1), endTime: D(2026, 4,  1) },
    { id: "carol-qa",   source: "Carol", target: "QA",      value: 4, startTime: D(2026, 3, 15), endTime: D(2026, 4,  1) },
    { id: "eng-rel-8",  source: "Eng",   target: "Release", value: 8, startTime: D(2026, 4, 15), endTime: D(2026, 5, 15) },
    { id: "eng-rel-5",  source: "Eng",   target: "Release", value: 5, startTime: D(2026, 4, 20), endTime: D(2026, 5, 20) },
    { id: "docs-rel",   source: "Docs",  target: "Release", value: 4, startTime: D(2026, 4, 15), endTime: D(2026, 5, 15) },
    { id: "qa-rel-6",   source: "QA",    target: "Release", value: 6, startTime: D(2026, 5,  1), endTime: D(2026, 6,  1) },
    { id: "qa-rel-4",   source: "QA",    target: "Release", value: 4, startTime: D(2026, 5,  5), endTime: D(2026, 6,  5) },
  ],
}

const LIBRARY_FIXTURE = (() => {
  const D2 = (m, d) => D(2026, m, d)
  const commits = [
    { id: "c1",  pr: "PR1", v: 2, start: D2(1,  3), end: D2(1,  6) },
    { id: "c2",  pr: "PR1", v: 3, start: D2(1,  5), end: D2(1, 10) },
    { id: "c3",  pr: "PR1", v: 2, start: D2(1,  8), end: D2(1, 12) },
    { id: "c4",  pr: "PR2", v: 4, start: D2(1, 18), end: D2(1, 24) },
    { id: "c5",  pr: "PR2", v: 2, start: D2(1, 22), end: D2(1, 28) },
    { id: "c6",  pr: "PR3", v: 3, start: D2(2,  3), end: D2(2,  9) },
    { id: "c7",  pr: "PR3", v: 5, start: D2(2,  6), end: D2(2, 15) },
    { id: "c8",  pr: "PR3", v: 2, start: D2(2, 12), end: D2(2, 18) },
    { id: "c9",  pr: "PR4", v: 4, start: D2(2, 22), end: D2(2, 28) },
    { id: "c10", pr: "PR4", v: 3, start: D2(2, 25), end: D2(3,  3) },
    { id: "c11", pr: "PR5", v: 6, start: D2(3,  8), end: D2(3, 14) },
    { id: "c12", pr: "PR5", v: 2, start: D2(3, 11), end: D2(3, 17) },
    { id: "c13", pr: "PR5", v: 3, start: D2(3, 14), end: D2(3, 20) },
  ]
  const prMeta = {}
  for (const c of commits) {
    if (!prMeta[c.pr]) prMeta[c.pr] = { commits: [], total: 0 }
    prMeta[c.pr].commits.push(c)
    prMeta[c.pr].total += c.v
  }
  const prMerge = {
    PR1: { start: D2(1, 12), end: D2(1, 20) },
    PR2: { start: D2(1, 28), end: D2(2,  4) },
    PR3: { start: D2(2, 18), end: D2(2, 26) },
    PR4: { start: D2(3,  3), end: D2(3, 11) },
    PR5: { start: D2(3, 20), end: D2(3, 28) },
  }
  return {
    label: "Library + PRs",
    domain: [D2(1, 1), D2(4, 1)],
    axisTicks: [
      { date: D2(1,  1), label: "Jan" },
      { date: D2(2,  1), label: "Feb" },
      { date: D2(3,  1), label: "Mar" },
      { date: D2(4,  1), label: "Apr" },
    ],
    nodes: [
      // Each commit lane opens 2 days before the commit lands in its
      // PR — xExtent[0] = c.start - 2d demonstrates pre-edge lane
      // opening. The synthesized `create` event carries the commit's
      // mass back to the explicit start so the band is visible across
      // the extension, not just at the OUT moment.
      ...commits.map(c => ({
        id: c.id,
        category: "Commit",
        xExtent: [c.start - 2 * 86400000, c.start],
      })),
      ...Object.keys(prMerge).map(pr => ({ id: pr, category: "PR" })),
      // Library accumulates from every PR merge; xExtent[1] keeps the
      // band drawing past the final PR5 merge (Mar 28) out to Apr 1,
      // showing the cumulative state at the end of the time window.
      { id: "Library", category: "Library", xExtent: [D2(1, 12), D2(4, 1)] },
    ],
    edges: [
      ...commits.map(c => ({
        id: `${c.id}-${c.pr}`,
        source: c.id, target: c.pr, value: c.v,
        startTime: c.start, endTime: c.end,
      })),
      ...Object.entries(prMerge).map(([pr, t]) => ({
        id: `${pr}-Library`,
        source: pr, target: "Library", value: prMeta[pr].total,
        startTime: t.start, endTime: t.end,
      })),
    ],
  }
})()

const REVISIT_FIXTURE = (() => {
  const D2 = (m, d) => D(2026, m, d)
  return {
    label: "Revisit (PAC ↔ Candidate)",
    domain: [D2(1, 1), D2(12, 1)],
    axisTicks: [
      { date: D2(1,  1), label: "Jan" },
      { date: D2(3,  1), label: "Mar" },
      { date: D2(5,  1), label: "May" },
      { date: D2(7,  1), label: "Jul" },
      { date: D2(9,  1), label: "Sep" },
      { date: D2(11, 1), label: "Nov" },
    ],
    nodes: [
      // PAC: opens early in January with xExtent[0] = D2(1, 5) so the
      // lane is anchored before the first contribution edge.
      { id: "PAC",       category: "PAC",       xExtent: [D2(1, 5), D2(1, 5)] },
      { id: "Candidate", category: "Candidate" },
      // Media accumulates contributions; xExtent[1] = D2(12, 1) keeps
      // the band drawing past the final transfer (ends Nov 1) out to
      // the domain edge — the air-time the campaign has bought stays
      // visible through election day.
      { id: "Media",     category: "Media",    xExtent: [D2(3, 15), D2(12, 1)] },
    ],
    edges: [
      { id: "pac-cand-primary",  source: "PAC", target: "Candidate", value: 10, startTime: D2(2, 1),  endTime: D2(2, 28) },
      { id: "cand-media-primary", source: "Candidate", target: "Media", value: 7, startTime: D2(3, 15), endTime: D2(5, 1) },
      { id: "cand-pac-refund",    source: "Candidate", target: "PAC", value: 3, startTime: D2(5, 15), endTime: D2(6, 15) },
      { id: "pac-cand-general",   source: "PAC", target: "Candidate", value: 12, startTime: D2(7, 1),  endTime: D2(8, 1) },
      { id: "cand-media-general", source: "Candidate", target: "Media", value: 12, startTime: D2(9, 1),  endTime: D2(11, 1) },
    ],
  }
})()

const FANOUT_FIXTURE = {
  label: "Fan-out",
  domain: [D(2026, 1, 1), D(2026, 4, 1)],
  axisTicks: [
    { date: D(2026, 1, 1), label: "Jan" },
    { date: D(2026, 2, 1), label: "Feb" },
    { date: D(2026, 3, 1), label: "Mar" },
    { date: D(2026, 4, 1), label: "Apr" },
  ],
  nodes: [
    { id: "Service", category: "Service", xExtent: [D(2026, 1, 1), D(2026, 1, 1)] },
    { id: "Worker1", category: "Worker" },
    { id: "Worker2", category: "Worker" },
    { id: "Worker3", category: "Worker" },
  ],
  edges: [
    { id: "s-w1-a", source: "Service", target: "Worker1", value: 5, startTime: D(2026, 1,  5), endTime: D(2026, 1, 12) },
    { id: "s-w1-b", source: "Service", target: "Worker1", value: 3, startTime: D(2026, 2,  1), endTime: D(2026, 2,  8) },
    { id: "s-w1-c", source: "Service", target: "Worker1", value: 4, startTime: D(2026, 3,  1), endTime: D(2026, 3,  8) },
    { id: "s-w2-a", source: "Service", target: "Worker2", value: 4, startTime: D(2026, 1, 18), endTime: D(2026, 1, 28) },
    { id: "s-w2-b", source: "Service", target: "Worker2", value: 5, startTime: D(2026, 2, 18), endTime: D(2026, 2, 28) },
    { id: "s-w3-a", source: "Service", target: "Worker3", value: 6, startTime: D(2026, 1, 22), endTime: D(2026, 2,  4) },
    { id: "s-w3-b", source: "Service", target: "Worker3", value: 4, startTime: D(2026, 3,  8), endTime: D(2026, 3, 18) },
  ],
}

const FIXTURES = {
  team: TEAM_FIXTURE,
  library: LIBRARY_FIXTURE,
  revisit: REVISIT_FIXTURE,
  fanout: FANOUT_FIXTURE,
}

// ---------------------------------------------------------------------------
// Quick Start: a minimal static example matching the prose intro shape.
// Uses a subset of the project-team data so the diagram reads at small size.
// ---------------------------------------------------------------------------

const QUICK_START_NODES = [
  { id: "Alice",   category: "Person",    xExtent: [D(2026, 1, 6), D(2026, 1, 6)] },
  { id: "Bob",     category: "Person",    xExtent: [D(2026, 2, 1), D(2026, 2, 1)] },
  { id: "Eng",     category: "Team" },
  { id: "Release", category: "Milestone", xExtent: [D(2026, 4, 15), D(2026, 5, 30)] },
]

const QUICK_START_EDGES = [
  { id: "alice-eng", source: "Alice", target: "Eng",     value: 8,  startTime: D(2026, 1, 20), endTime: D(2026, 2, 10) },
  { id: "bob-eng",   source: "Bob",   target: "Eng",     value: 5,  startTime: D(2026, 2, 15), endTime: D(2026, 3, 15) },
  { id: "eng-rel",   source: "Eng",   target: "Release", value: 13, startTime: D(2026, 4, 15), endTime: D(2026, 5, 15) },
]

const QUICK_START_DOMAIN = [D(2026, 1, 1), D(2026, 5, 31)]

const QUICK_START_AXIS_TICKS = [
  { date: D(2026, 1, 1), label: "Jan" },
  { date: D(2026, 2, 1), label: "Feb" },
  { date: D(2026, 3, 1), label: "Mar" },
  { date: D(2026, 4, 1), label: "Apr" },
  { date: D(2026, 5, 1), label: "May" },
]

const QUICK_START_STATIC_CODE = `import { ProcessSankey } from "semiotic"

const nodes = [
  { id: "Alice", category: "Person", xExtent: ["2026-01-06", "2026-01-06"] },
  { id: "Bob",   category: "Person", xExtent: ["2026-02-01", "2026-02-01"] },
  { id: "Eng",     category: "Team" },
  { id: "Release", category: "Milestone", xExtent: ["2026-04-15", "2026-05-30"] },
]

const edges = [
  { id: "alice-eng", source: "Alice", target: "Eng",     value: 8,
    startTime: "2026-01-20", endTime: "2026-02-10" },
  { id: "bob-eng",   source: "Bob",   target: "Eng",     value: 5,
    startTime: "2026-02-15", endTime: "2026-03-15" },
  { id: "eng-rel",   source: "Eng",   target: "Release", value: 13,
    startTime: "2026-04-15", endTime: "2026-05-15" },
]

<ProcessSankey
  nodes={nodes}
  edges={edges}
  domain={["2026-01-01", "2026-05-31"]}
  colorBy="category"
  showLegend
/>`

function StaticQuickStartDemo({ width }) {
  return (
    <ProcessSankey
      nodes={QUICK_START_NODES}
      edges={QUICK_START_EDGES}
      domain={QUICK_START_DOMAIN}
      axisTicks={QUICK_START_AXIS_TICKS}
      colorBy="category"
      showLegend
      width={width}
      height={360}
      timeFormat={SANDBOX_TIME_FORMAT}
    />
  )
}

// ---------------------------------------------------------------------------
// Quick Start streaming demo. Pushes the LIBRARY_FIXTURE edges in the
// order they would naturally arrive — commits then PR merges — so the
// chart fills in over a few seconds. Same push API contract as
// SankeyDiagram: omit `edges` prop, mutate via the ref.
// ---------------------------------------------------------------------------

const STREAMING_QUICK_START_CODE = `import { useRef } from "react"
import { ProcessSankey } from "semiotic"

function StreamingProcessSankey() {
  const ref = useRef(null)

  const seed = () => {
    // Push nodes first (so push() can attach categories before any edge).
    nodes.forEach(n => ref.current?.push(n))
    // Then push timed flow events. Order doesn't matter — the layout
    // re-runs on each ingest.
    edges.forEach(e => ref.current?.push(e))
  }

  return (
    <>
      <button onClick={seed}>Seed Library</button>
      <ProcessSankey
        ref={ref}
        domain={[t0, t1]}
        colorBy="category"
        showLegend
        showParticles
      />
    </>
  )
}`

// Interleaved push order: Library → for each PR (PR node → commits of
// that PR with their commit→PR edges → PR→Library edge). This way the
// chart shows visible flow within the first handful of pushes instead of
// staying blank while 19 nodes are queued before any edge arrives.
function buildLibraryQueue(fixture) {
  const queue = []
  const lib = fixture.nodes.find((n) => n.category === "Library")
  if (lib) queue.push(lib)

  const prs = fixture.nodes.filter((n) => n.category === "PR")
  const commits = fixture.nodes.filter((n) => n.category === "Commit")
  const prMergeEdges = fixture.edges.filter((e) => e.target === (lib ? lib.id : "Library"))
  const commitEdges = fixture.edges.filter((e) => e.target !== (lib ? lib.id : "Library"))

  for (const pr of prs) {
    queue.push(pr)
    const prCommitEdges = commitEdges.filter((e) => e.target === pr.id)
    for (const ce of prCommitEdges) {
      const commit = commits.find((c) => c.id === ce.source)
      if (commit) queue.push(commit)
      queue.push(ce)
    }
    const merge = prMergeEdges.find((e) => e.source === pr.id)
    if (merge) queue.push(merge)
  }
  return queue
}

function StreamingQuickStartDemo({ width }) {
  const ref = useRef(null)
  const [running, setRunning] = useState(false)
  const [pushedCount, setPushedCount] = useState(0)
  const fixture = LIBRARY_FIXTURE
  const queue = React.useMemo(() => buildLibraryQueue(fixture), [fixture])

  // Fire one node-or-edge into the chart per tick when running. Stops
  // automatically when everything's drained.
  useEffect(() => {
    if (!running) return
    let i = pushedCount
    if (i >= queue.length) { setRunning(false); return }
    const id = setInterval(() => {
      if (!ref.current) return
      if (i >= queue.length) {
        clearInterval(id)
        setRunning(false)
        return
      }
      ref.current.push(queue[i])
      i += 1
      setPushedCount(i)
    }, 220)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  const reset = () => {
    ref.current?.clear()
    setPushedCount(0)
    setRunning(false)
  }

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          className="demo-button"
          onClick={() => setRunning(true)}
          disabled={running || pushedCount >= queue.length}
        >
          Stream Library
        </button>
        <button
          className="demo-button"
          onClick={() => setRunning(false)}
          disabled={!running}
        >
          Pause
        </button>
        <button className="demo-button" onClick={reset}>Reset</button>
        <span style={{ alignSelf: "center", fontSize: 12, color: "var(--semiotic-text-secondary, #64748b)" }}>
          pushed {pushedCount} / {queue.length}
        </span>
      </div>
      <ProcessSankey
        ref={ref}
        domain={fixture.domain}
        axisTicks={fixture.axisTicks}
        colorBy="category"
        showLegend
        showParticles
        width={width}
        height={400}
        timeFormat={SANDBOX_TIME_FORMAT}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sandbox container — width-aware wrapper so it keeps responsive.
// ---------------------------------------------------------------------------

function Segmented({ label, options, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: "var(--semiotic-text-secondary, #64748b)", minWidth: 56 }}>{label}</span>
      <div
        role="group"
        aria-label={label}
        style={{ display: "inline-flex", border: "1px solid var(--semiotic-border, #cbd5e1)", borderRadius: 6, overflow: "hidden" }}
      >
        {options.map(o => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              style={{
                padding: "4px 10px",
                fontSize: 12,
                background: active ? "var(--semiotic-primary, #2563eb)" : "transparent",
                color: active ? "#fff" : "var(--semiotic-text, #1e293b)",
                border: "none",
                cursor: "pointer",
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ProcessSankeyPage() {
  const [fixtureKey, setFixtureKey] = useState("team")
  const [pairing, setPairing] = useState("temporal")
  const [packing, setPacking] = useState("reuse")
  const [laneOrder, setLaneOrder] = useState("crossing-min")
  const [ribbonLane, setRibbonLane] = useState("both")
  const [lifetimeMode, setLifetimeMode] = useState("half")
  const [showLaneRails, setShowLaneRails] = useState(false)
  const [showParticles, setShowParticles] = useState(false)
  const [showLegend, setShowLegend] = useState(true)
  const [colorBy, setColorBy] = useState("category")

  const fixture = FIXTURES[fixtureKey] ?? TEAM_FIXTURE

  return (
    <PageLayout
      title="Process Sankey"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Network", path: "/charts" },
        { label: "Process Sankey", path: "/charts/process-sankey" },
      ]}
    >
      <ComponentMeta
        componentName="ProcessSankey"
        importStatement='import { ProcessSankey } from "semiotic"'
        tier="charts"
        wraps="StreamNetworkFrame"
        wrapsPath="/frames/network-frame"
        related={[
          { name: "SankeyDiagram", path: "/charts/sankey-diagram" },
        ]}
      />

      <p>
        Sankey-style flow with a real time x-axis. Each edge has a{" "}
        <code>startTime</code> / <code>endTime</code>; nodes may declare
        an <code>xExtent: [start, end]</code> to bound their lane
        explicitly. Use it for flow events with timestamps (PR commits
        over time, campaign-finance contributions, supply-chain
        shipments) where a static-snapshot <code>SankeyDiagram</code>{" "}
        would erase the temporal structure.
      </p>

      <h2 id="differences">How it differs from SankeyDiagram</h2>

      <ul>
        <li>
          <strong>Edges carry time.</strong> Each edge has{" "}
          <code>startTime</code> (when it leaves the source) and{" "}
          <code>endTime</code> (when it arrives at the target). Multiple
          edges can connect the same source / target pair at different
          times. Standard sankey treats edges as instantaneous and
          collapses parallel edges into one.
        </li>
        <li>
          <strong>Nodes have lifetimes, not ranks.</strong> A node&rsquo;s
          vertical lane spans <code>min(xExtent[0], earliestEdge)</code>{" "}
          to <code>max(xExtent[1], latestEdge)</code>. There is no
          node-rank prop; the layout reads timing from the data. Nodes
          may carry an optional <code>xExtent: [start, end]</code> to
          extend the lane outward — useful when a candidate exists
          before the first contribution arrives or stays open after the
          last spend settles.
        </li>
        <li>
          <strong>Static-graph cycles are valid.</strong> If A sends to
          B and B later sends back to A, the graph has a topological
          cycle but every edge still moves forward in time.{" "}
          <code>ProcessSankey</code> accepts this; standard sankey
          rejects it as a DAG violation.
        </li>
        <li>
          <strong>Lane reuse instead of dedicated rows.</strong> When
          two nodes have non-overlapping lifetimes, they share a lane
          (interval-graph greedy, depth-sorted). Pass{" "}
          <code>packing=&quot;off&quot;</code> for one row per node.
        </li>
      </ul>

      <h2 id="quick-start">Quick Start</h2>

      <p>
        The minimum a <code>ProcessSankey</code> needs is{" "}
        <code>nodes</code>, time-stamped <code>edges</code>, and a{" "}
        <code>domain</code>. Toggle <em>Streaming</em> to see the same
        chart built up via the push API — omit the <code>edges</code>{" "}
        prop, push them in via the ref.
      </p>

      <StreamingToggle
        staticContent={
          <StreamingDemo
            renderChart={(w) => <StaticQuickStartDemo width={w} />}
            code={QUICK_START_STATIC_CODE}
          />
        }
        streamingContent={
          <StreamingDemo
            renderChart={(w) => <StreamingQuickStartDemo width={w} />}
            code={STREAMING_QUICK_START_CODE}
          />
        }
      />

      <h2 id="sandbox">Sandbox</h2>

      <p>
        Pick a fixture and tune layout knobs to see how each affects
        the chart. Configurations that are good defaults for most data:
        <em> Pairing: temporal</em>, <em>Packing: reuse</em>,{" "}
        <em>Lane order: crossing-min</em>, <em>Lifetime: half edge</em>.
      </p>

      <div style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "auto", marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12 }}>
          <Segmented
            label="Fixture"
            value={fixtureKey}
            onChange={setFixtureKey}
            options={[
              { value: "team", label: "Project team" },
              { value: "library", label: "Library + PRs" },
              { value: "revisit", label: "Revisit" },
              { value: "fanout", label: "Fan-out" },
            ]}
          />
          <Segmented
            label="Packing"
            value={packing}
            onChange={setPacking}
            options={[
              { value: "off", label: "Off" },
              { value: "reuse", label: "Reuse" },
            ]}
          />
          <Segmented
            label="Lane order"
            value={laneOrder}
            onChange={setLaneOrder}
            options={[
              { value: "insertion", label: "Insertion" },
              { value: "crossing-min", label: "Crossing-min" },
              { value: "inside-out", label: "Inside-out" },
              { value: "crossing-min+inside-out", label: "Min + IO" },
            ]}
          />
          <Segmented
            label="Pairing"
            value={pairing}
            onChange={setPairing}
            options={[
              { value: "value", label: "Value-desc" },
              { value: "temporal", label: "Temporal" },
            ]}
          />
          <Segmented
            label="Ribbon lane"
            value={ribbonLane}
            onChange={setRibbonLane}
            options={[
              { value: "source", label: "Source" },
              { value: "target", label: "Target" },
              { value: "both", label: "Both" },
            ]}
          />
          <Segmented
            label="Lifetime"
            value={lifetimeMode}
            onChange={setLifetimeMode}
            options={[
              { value: "full", label: "Full edge" },
              { value: "half", label: "Half edge" },
            ]}
          />
          <Segmented
            label="Lane rails"
            value={showLaneRails ? "on" : "off"}
            onChange={(v) => setShowLaneRails(v === "on")}
            options={[
              { value: "off", label: "Off" },
              { value: "on", label: "On" },
            ]}
          />
          <Segmented
            label="Particles"
            value={showParticles ? "on" : "off"}
            onChange={(v) => setShowParticles(v === "on")}
            options={[
              { value: "off", label: "Off" },
              { value: "on", label: "On" },
            ]}
          />
          <Segmented
            label="Color by"
            value={colorBy}
            onChange={setColorBy}
            options={[
              { value: "category", label: "Category" },
              { value: "id", label: "Node id" },
            ]}
          />
          <Segmented
            label="Legend"
            value={showLegend ? "on" : "off"}
            onChange={(v) => setShowLegend(v === "on")}
            options={[
              { value: "off", label: "Off" },
              { value: "on", label: "On" },
            ]}
          />
        </div>
        <ProcessSankey
          nodes={fixture.nodes}
          edges={fixture.edges}
          domain={fixture.domain}
          axisTicks={fixture.axisTicks}
          colorBy={colorBy}
          colorScheme="category10"
          showLegend={showLegend}
          pairing={pairing}
          packing={packing}
          laneOrder={laneOrder}
          ribbonLane={ribbonLane}
          lifetimeMode={lifetimeMode}
          showLaneRails={showLaneRails}
          showParticles={showParticles}
          showQualityReadout
          timeFormat={SANDBOX_TIME_FORMAT}
        />
      </div>

      <h2 id="examples">Examples</h2>

      <p>
        Each example below isolates one setting against the same
        fixture so you can see what the knob does on its own. The full
        playground above lets you compose them.
      </p>

      <h3 id="example-categorical">Categorical coloring + legend</h3>
      <p>
        <code>colorBy=&quot;category&quot;</code> shares one color
        across every commit / PR / library node, and{" "}
        <code>showLegend</code> renders the swatch column to the right.
        Set <code>colorBy=&quot;id&quot;</code> for the per-node
        rainbow instead.
      </p>
      <div style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "auto", marginBottom: 16 }}>
        <ProcessSankey
          nodes={LIBRARY_FIXTURE.nodes}
          edges={LIBRARY_FIXTURE.edges}
          domain={LIBRARY_FIXTURE.domain}
          axisTicks={LIBRARY_FIXTURE.axisTicks}
          colorBy="category"
          colorScheme="category10"
          showLegend
          timeFormat={SANDBOX_TIME_FORMAT}
        />
      </div>

      <h3 id="example-particles">Particle flow</h3>
      <p>
        <code>showParticles</code> renders a continuous stream of dots
        flowing along every ribbon. Spawn rate is proportional to{" "}
        <code>edge.value</code>; tune visual style via{" "}
        <code>particleStyle</code> — the same config shape{" "}
        <a href="/charts/sankey-diagram">SankeyDiagram</a> uses.
      </p>
      <div style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "auto", marginBottom: 16 }}>
        <ProcessSankey
          nodes={TEAM_FIXTURE.nodes}
          edges={TEAM_FIXTURE.edges}
          domain={TEAM_FIXTURE.domain}
          axisTicks={TEAM_FIXTURE.axisTicks}
          colorBy="category"
          showLegend
          showParticles
          particleStyle={{ radius: 3 }}
          timeFormat={SANDBOX_TIME_FORMAT}
        />
      </div>

      <h3 id="example-xextent">xExtent — pre-edge and post-edge lifetime</h3>
      <p>
        Each commit lane in the Library fixture opens two days before
        its OUT edge (<code>xExtent[0] = c.start - 2d</code>) and the
        Library lane stays open through the end of the domain
        (<code>xExtent[1] = Apr 1</code>). The synthesized leading
        mass is visible as the small left-tab on each blue commit; the
        green tail past the last PR merge shows the post-edge
        extension.
      </p>
      <div style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "auto", marginBottom: 16 }}>
        <ProcessSankey
          nodes={LIBRARY_FIXTURE.nodes}
          edges={LIBRARY_FIXTURE.edges}
          domain={LIBRARY_FIXTURE.domain}
          axisTicks={LIBRARY_FIXTURE.axisTicks}
          colorBy="category"
          showLegend
          showLaneRails
          timeFormat={SANDBOX_TIME_FORMAT}
        />
      </div>

      <h3 id="example-packing-off">Packing off — one row per node</h3>
      <p>
        Default packing reuses lanes whenever two nodes have
        non-overlapping lifetimes. Setting{" "}
        <code>packing=&quot;off&quot;</code> gives every node its own
        row — useful when readers need a stable y-position per node,
        even at the cost of vertical space.
      </p>
      <div style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "auto", marginBottom: 16 }}>
        <ProcessSankey
          nodes={TEAM_FIXTURE.nodes}
          edges={TEAM_FIXTURE.edges}
          domain={TEAM_FIXTURE.domain}
          axisTicks={TEAM_FIXTURE.axisTicks}
          colorBy="category"
          showLegend
          packing="off"
          height={620}
          timeFormat={SANDBOX_TIME_FORMAT}
        />
      </div>

      <h3 id="example-ribbon-lane">Ribbon routing</h3>
      <p>
        <code>ribbonLane</code> shifts where the bezier curves bend.
        <code>&quot;source&quot;</code> hugs the source band (the
        ribbon body lives mostly under the source lane);{" "}
        <code>&quot;target&quot;</code> mirrors that on the target
        side. Useful for &ldquo;these came <em>from</em> X&rdquo;
        vs &ldquo;these go <em>to</em> Y&rdquo; readings.
      </p>
      <div style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "auto", marginBottom: 16 }}>
        <ProcessSankey
          nodes={REVISIT_FIXTURE.nodes}
          edges={REVISIT_FIXTURE.edges}
          domain={REVISIT_FIXTURE.domain}
          axisTicks={REVISIT_FIXTURE.axisTicks}
          colorBy="category"
          showLegend
          ribbonLane="source"
          timeFormat={SANDBOX_TIME_FORMAT}
        />
      </div>

      <h2 id="props">Props reference</h2>

      <h3>Data</h3>
      <ul>
        <li>
          <code>nodes</code> — array of node records. Nodes may carry
          an optional <code>xExtent: [start, end]</code> tuple. When
          present, the node&rsquo;s lane spans{" "}
          <code>min(xExtent[0], earliestEdge)</code> to{" "}
          <code>max(xExtent[1], latestEdge)</code> — set both endpoints
          to the same value for a pure-source &ldquo;opens at T&rdquo;
          anchor; set the second endpoint past the last edge to keep
          the lane drawing after the final flow settles.
        </li>
        <li><code>edges</code> — array of edge records with <code>source</code>, <code>target</code>, <code>value</code>, <code>startTime</code>, <code>endTime</code>.</li>
        <li><code>domain</code> — <code>[tStart, tEnd]</code> of the chart&rsquo;s x-axis.</li>
        <li><code>axisTicks</code> — optional array of <code>{`{ date, label }`}</code>.</li>
      </ul>

      <h3>Accessors</h3>
      <ul>
        <li><code>nodeIdAccessor</code> (default <code>&quot;id&quot;</code>)</li>
        <li><code>sourceAccessor</code> / <code>targetAccessor</code> / <code>valueAccessor</code></li>
        <li><code>startTimeAccessor</code> / <code>endTimeAccessor</code> / <code>xExtentAccessor</code></li>
        <li><code>edgeIdAccessor</code> (defaults to a synthesized id)</li>
        <li>
          Time accessors return <code>number</code>, <code>Date</code>, or
          a parseable date string. Internal computation uses ms since
          epoch.
        </li>
      </ul>

      <h3>Layout</h3>
      <ul>
        <li>
          <code>pairing</code>: <code>&quot;value&quot;</code>{" "}
          (default) pairs largest-incoming with largest-outgoing;{" "}
          <code>&quot;temporal&quot;</code> pairs by arrival/departure
          order. Try <code>&quot;temporal&quot;</code> when ribbon
          ordering matters more than per-pair magnitude.
        </li>
        <li>
          <code>packing</code>: <code>&quot;reuse&quot;</code> (default)
          packs lifetime-disjoint nodes into the same row, sorted by
          topological depth so hierarchical fixtures collapse to one
          row per level. <code>&quot;off&quot;</code> gives every node
          its own row.
        </li>
        <li>
          <code>laneOrder</code>: <code>&quot;crossing-min&quot;</code>{" "}
          (default) — brute force for ≤8 lanes / ≤40 edges, barycentric
          + adjacent-swap above. <code>&quot;inside-out&quot;</code>{" "}
          places largest-mass slot at the median.{" "}
          <code>&quot;crossing-min+inside-out&quot;</code> runs both;{" "}
          <code>&quot;insertion&quot;</code> preserves packing order.
        </li>
        <li>
          <code>ribbonLane</code>: <code>&quot;both&quot;</code> (default)
          routes ribbons via the horizontal midpoint;{" "}
          <code>&quot;source&quot;</code> hugs the source lane;{" "}
          <code>&quot;target&quot;</code> hops to the target lane early.
        </li>
        <li>
          <code>lifetimeMode</code>: <code>&quot;half&quot;</code>{" "}
          (default) charges each edge to the source-half of its
          duration at the source and the target-half at the target,
          shrinking lifetimes and enabling more reuse;{" "}
          <code>&quot;full&quot;</code> gives both endpoints the full
          extent.
        </li>
        <li>
          <code>showLaneRails</code> (default <code>false</code>) — toggle dashed lifetime rails behind each band.
        </li>
        <li>
          <code>showQualityReadout</code> — render the small
          &ldquo;crossings: A → B  edge length: X → Y&rdquo; readout
          above the chart. Useful while tuning <code>laneOrder</code>.
        </li>
      </ul>

      <h3>Coloring</h3>
      <ul>
        <li>
          <code>colorBy</code> — node accessor used to drive the color
          scale. Pass a categorical field (e.g. <code>&quot;category&quot;</code>)
          so every commit, person, or PR shares one color.
        </li>
        <li><code>colorScheme</code> — preset name or array of colors.</li>
        <li>
          <code>showLegend</code> (defaults to <code>true</code> when{" "}
          <code>colorBy</code> is set) — render a swatch + label legend
          to the right of the chart.
        </li>
        <li>
          <code>legendPosition</code> — <code>&quot;right&quot;</code>{" "}
          (default) or <code>&quot;bottom&quot;</code>.
        </li>
      </ul>

      <h3>Formatting</h3>
      <ul>
        <li>
          <code>timeFormat(d: Date)</code> — applied to axis tick labels
          (overrides <code>tick.label</code> when set) and to time
          fields in the default tooltip (<code>startTime</code>,{" "}
          <code>endTime</code>, and node mass-history timestamps). Same
          convention as <code>xFormat</code> on XY charts.
        </li>
        <li>
          <code>valueFormat(v: number)</code> — applied to{" "}
          <code>value</code> in the default edge tooltip and to total
          mass in the node mass-history table. Mirrors{" "}
          <code>yFormat</code> on XY charts.
        </li>
      </ul>

      <h4>Default tooltip layouts</h4>

      <ul>
        <li>
          <strong>Edge tooltip</strong> shows the source → target pair,
          the edge value, and the time window. Time fields use{" "}
          <code>timeFormat</code> when supplied, the value uses{" "}
          <code>valueFormat</code>.
        </li>
        <li>
          <strong>Node tooltip</strong> shows the node id and a
          mass-history table — one row per distinct mass state across
          the node&rsquo;s lifetime, with{" "}
          <code>{`{ Time, Mass }`}</code> columns formatted via{" "}
          <code>timeFormat</code> / <code>valueFormat</code>. The
          timestamps come from the layout&rsquo;s sample series so each
          row corresponds to an event that changed the band&rsquo;s
          width. The default caps display at five rows: when the node
          has more than five distinct mass states, the table condenses
          to the <code>min / q25 / median / q75 / max</code> picks
          (re-sorted by time), with a small footer noting the original
          sample count. To render the history a different way —
          sparkline, deltas, full series — pass a custom{" "}
          <code>tooltip</code> function that overrides this default body.
        </li>
        <li>
          A custom <code>tooltip</code> prop overrides both defaults.
        </li>
      </ul>

      <h3>Interaction</h3>
      <ul>
        <li>
          <code>tooltip</code> — <code>true</code>/omitted shows a default
          key/value list of the hovered datum&rsquo;s public fields;{" "}
          <code>false</code> disables; pass a <code>Tooltip(...)</code>{" "}
          config or custom function for full control. Hover targets are
          node bands and edge ribbons; the hovered datum is the original
          record from <code>nodes</code> or <code>edges</code>.
        </li>
        <li>
          <code>enableHover</code> (default <code>true</code>) — set to
          <code> false</code> to suppress hover detection entirely.
        </li>
        <li>
          <code>onClick(datum, &#123;x, y&#125;)</code> — fired when a band or ribbon is clicked.
        </li>
        <li>
          <code>onObservation</code> — fired with{" "}
          <code>&#123;type, datum, x, y, chartType, chartId, timestamp&#125;</code>{" "}
          for hover/hover-end/click events. Standard semiotic observation contract.
        </li>
      </ul>

      <h3>Particles</h3>
      <ul>
        <li>
          <code>showParticles</code> (default <code>false</code>) —
          render a continuous stream of dots along every ribbon. The
          band geometry encodes <em>when</em> a flow happens, the
          particles encode <em>how much</em>.
        </li>
        <li>
          <code>particleStyle</code> — visual config object. Same
          shape{" "}
          <a href="/charts/sankey-diagram">SankeyDiagram</a> uses:{" "}
          <code>{`{ radius, opacity, spawnRate, maxPerEdge, speedMultiplier, color, colorBy, proportionalSpeed }`}</code>.
          Defaults from <code>DEFAULT_PARTICLE_STYLE</code> (radius{" "}
          <code>3</code>, opacity <code>0.7</code>, spawnRate{" "}
          <code>0.1</code>, maxPerEdge <code>50</code>).
        </li>
      </ul>
      <p>
        Particles ride the shared canvas + ParticlePool path the rest
        of the network family uses — spawn rate scales proportional
        to <code>edge.value</code>, particles recycle out of a pre-
        allocated pool, and the rAF loop pauses cleanly when{" "}
        <code>showParticles</code> is toggled off.
      </p>

      <h2 id="push-api">Push API</h2>

      <p>
        Like the rest of the chart catalog, ProcessSankey supports
        ref-based live ingestion. Omit <code>edges</code> from props
        to enter push mode — the component then owns the edge list and
        the ref methods mutate it. <code>nodes</code> can be either
        controlled or pushed.
      </p>

      <CodeBlock language="tsx" code={`import { useRef } from "react"
import { ProcessSankey } from "semiotic"

const ref = useRef(null)

// Live mode: omit edges, push them as they arrive
<ProcessSankey
  ref={ref}
  nodes={nodes}
  domain={[t0, t1]}
/>

// Add an edge
ref.current.push({
  id: "e1", source: "Alice", target: "Eng", value: 8,
  startTime: Date.now(), endTime: Date.now() + 86400e3,
})

// Batch
ref.current.pushMany([edge1, edge2, edge3])

// Update by id (requires edgeIdAccessor or auto-id)
ref.current.update("e1", e => ({ ...e, value: 12 }))

// Remove by id
ref.current.remove(["e1", "e2"])

// Snapshot the current edge list
const all = ref.current.getData()

// Wipe everything
ref.current.clear()`} />

      <p>
        <code>push</code> auto-detects edges (records with{" "}
        <code>source</code> + <code>target</code>) vs nodes; non-edges
        go to the internal node list. <code>pushMany</code> partitions
        a mixed batch the same way. Edge writes are silently dropped
        with a console warning if <code>edges</code> is being passed
        as a prop (controlled mode); node writes always flow through.
      </p>
      <p>
        <code>remove(id)</code> and <code>update(id, fn)</code> address
        edges by id first (resolved via <code>edgeIdAccessor</code>,
        falling back to a synthesized{" "}
        <code>{`source-target-index`}</code> id) and fall through to
        nodes by <code>nodeIdAccessor</code> when no edge matches.
      </p>

      <h2 id="caveats">Caveats and known limitations</h2>

      <ul>
        <li>
          <strong>Backward-in-time edges fail validation.</strong> An
          edge with <code>endTime ≤ startTime</code> blocks rendering.
          Normalize your data before passing it in.
        </li>
        <li>
          <strong>Mid-stream nodes assume balanced flow.</strong> If a
          transit node receives more or less than it sends across its
          lifetime, the synthesis falls back to <code>create</code>{" "}
          events at <code>xExtent[0] - 1</code>. Set{" "}
          <code>xExtent</code> on net-source nodes for predictable
          behavior.
        </li>
        <li>
          <strong>Same-slot edges render as &ldquo;handoff&rdquo;
          ribbons</strong> along the bottom of the shared lane (a
          consequence of lane reuse). The visual reads correctly for
          hierarchical accreters; it can look unusual for cyclic
          fixtures with heavy reuse.
        </li>
      </ul>

    </PageLayout>
  )
}
