import React, { useRef } from "react"
import { Link } from "react-router-dom"
import { QuadrantChart, ThemeProvider } from "semiotic"
import BlogPushDemo from "../components/BlogPushDemo.js"

// Effort × impact for a 16-feature roadmap. Each item carries a
// short name so the dots are not just dots. The eye recognizes
// individual proposals and the quadrant they landed in. Layout
// intentionally has at least 3 items in every quadrant so the
// labels matter; the bottom-right "money pit" cluster is the
// punchline the chart exists to surface.
const BACKLOG = [
  // Quick wins (low effort, high impact)
  { id: "Search typeahead", effort: 2, impact: 9 },
  { id: "Fix CSV export bug", effort: 1, impact: 7 },
  { id: "Email digest opt-out", effort: 2, impact: 6 },
  { id: "Dark mode", effort: 4, impact: 7 },
  // Strategic bets (high effort, high impact)
  { id: "Billing rewrite", effort: 9, impact: 8 },
  { id: "Onboarding redesign", effort: 7, impact: 8 },
  { id: "Experiment platform", effort: 9, impact: 9 },
  { id: "Alerting v2", effort: 8, impact: 7 },
  // Fill-in (low effort, low impact)
  { id: "Admin audit log", effort: 4, impact: 4 },
  { id: "Marketing page revamp", effort: 2, impact: 4 },
  { id: "Per-user keyboard shortcuts", effort: 3, impact: 2 },
  // Money pits (high effort, low impact)
  { id: "i18n: French", effort: 8, impact: 4 },
  { id: "Remove deprecated API", effort: 8, impact: 2 },
  { id: "Migrate to new ORM", effort: 9, impact: 3 },
  { id: "Dependency cleanup", effort: 6, impact: 1 },
]

const chartFrame = {
  background: "var(--surface-1)",
  borderRadius: 8,
  padding: 16,
  border: "1px solid var(--surface-3)",
  margin: "20px 0",
}

function PushDemo() {
  const chartRef = useRef(null)
  return (
    <div style={chartFrame}>
      <ThemeProvider theme="carbon-dark">
        <BlogPushDemo
          chartRef={chartRef}
          frames={BACKLOG}
          pushAt={(ref, row) => ref?.push?.(row)}
          resetAt={(ref) => ref?.clear?.()}
        >
          <QuadrantChart
            ref={chartRef}
            xAccessor="effort"
            yAccessor="impact"
            pointIdAccessor="id"
            xCenter={5.5}
            yCenter={5.5}
            xExtent={[0, 10]}
            yExtent={[0, 10]}
            pointRadius={8}
            pointOpacity={0.9}
            quadrants={{
              topLeft: { label: "Quick wins", color: "#22c55e" },
              topRight: { label: "Strategic bets", color: "#3b82f6" },
              bottomLeft: { label: "Fill-in", color: "#94a3b8" },
              bottomRight: { label: "Money pits", color: "#ef4444" },
            }}
            width={680}
            height={420}
            tooltip
          />
        </BlogPushDemo>
      </ThemeProvider>
    </div>
  )
}

function Body() {
  return (
    <>
      <p>
        <Link to="/charts/quadrant-chart">QuadrantChart</Link> is a 2×2 scatterplot that lets you
        pick two metrics, split each axis at a threshold, and label the four resulting cells. The
        chart's job is to focus on regions of "where does this item land?" that have meaning beyond
        just the correlation that scatterplots traditionally provide.
      </p>

      <h2 id="why-care">Why this exists</h2>
      <p>
        Most strategic frameworks are 2×2 grids: the BCG growth-share matrix (high/low market growth
        × high/low market share), the Eisenhower urgent/important matrix, RICE scoring, MoSCoW
        prioritization, risk/value, effort/impact. The 2×2 is so common in product, strategy, and
        ops that plotting items on one is its own visual language.
      </p>
      <p>A QuadrantChart is what you reach for when:</p>
      <ul>
        <li>
          You have two metrics that span a meaningful threshold (above/below average effort;
          high/low strategic value; adopted/not-adopted).
        </li>
        <li>
          The four resulting categories have NAMES the audience recognizes ("quick wins," "money
          pits," "long bets," "fill-in").
        </li>
        <li>
          The decision the chart supports is <em>which quadrant is this in</em>, not "what's the
          continuous trend."
        </li>
      </ul>

      <h2 id="demo">Live demo</h2>
      <p>
        Effort (1–10, low to high) × impact (1–10, low to high) for a synthetic feature backlog.
        Quadrants:
      </p>
      <ul>
        <li>
          <strong>Top-left (Quick wins)</strong> shows low effort, high impact items. Do these
          first.
        </li>
        <li>
          <strong>Top-right (Strategic bets)</strong> shows high effort, high impact items. Worth
          doing but plan carefully.
        </li>
        <li>
          <strong>Bottom-left (Fill-in)</strong> shows low effort, low impact items. Pull into a
          sprint when you have slack.
        </li>
        <li>
          <strong>Bottom-right (Money pits)</strong> shows high effort, low impact items. Don't do
          these.
        </li>
      </ul>
      <div style={chartFrame}>
        <ThemeProvider theme="carbon-dark">
          <QuadrantChart
            data={BACKLOG}
            xAccessor="effort"
            yAccessor="impact"
            xCenter={5.5}
            yCenter={5.5}
            pointRadius={8}
            pointOpacity={0.9}
            xExtent={[0, 10]}
            yExtent={[0, 10]}
            quadrants={{
              topLeft: { label: "Quick wins", color: "#22c55e" },
              topRight: { label: "Strategic bets", color: "#3b82f6" },
              bottomLeft: { label: "Fill-in", color: "#94a3b8" },
              bottomRight: { label: "Money pits", color: "#ef4444" },
            }}
            annotations={BACKLOG.map((b) => ({
              type: "text",
              x: b.effort,
              y: b.impact,
              label: b.id,
              dy: -10,
              dx: 0,
              style: { fontSize: 11, fill: "var(--text-primary, #e5e7eb)" },
            }))}
            width={760}
            height={520}
            tooltip
          />
        </ThemeProvider>
      </div>

      <h2 id="how-to-read">How to read it</h2>
      <ul>
        <li>
          <strong>Axes</strong> are both quantitative, just like any scatterplot. Pick metrics whose
          threshold values are meaningful (median, target, "minimum viable," etc.). It's okay to use
          hand-wavy values there are entire industries that run on quadrants plotting hand-wavy
          values.
        </li>
        <li>
          <strong>Quadrant tints</strong> should color the cells and double-encode by coloring the
          points and use semantically meaningful colors if you're using them though many quadrants
          avoid color.
        </li>
        <li>
          <strong>Threshold lines</strong> are usually drawn at <code>xCenter</code> /{" "}
          <code>yCenter</code>. Omit and the chart uses the domain midpoint.
        </li>
      </ul>

      <h2 id="when-to-reach-for-it">When to reach for it</h2>
      <p>Reach for QuadrantChart when:</p>
      <ul>
        <li>
          You have a 2×2 framework that reflects how your audience already thinks about the problem.
        </li>
        <li>
          You can justify the thresholds without making arbitrary cuts that make the labels
          misleading.
        </li>
        <li>
          The dataset has a manageable number of items (fewer than 20); beyond that the labels
          overlap and the chart loses its point.
        </li>
      </ul>
      <p>Reach for something else when:</p>
      <ul>
        <li>
          The metrics don't naturally split at a threshold. Just use a plain{" "}
          <Link to="/charts/scatterplot">Scatterplot</Link> instead and let the eye find the
          cluster.
        </li>
        <li>
          You actually have a third dimension you want to encode (e.g. revenue per item). Use a{" "}
          <Link to="/charts/bubble-chart">BubbleChart</Link> (you can still pass{" "}
          <code>quadrants</code> via <code>annotations</code> on a regular Scatterplot if you want
          quadrant labels too).
        </li>
      </ul>

      <h2 id="wiring">Wiring it up</h2>
      <pre
        style={{
          background: "var(--surface-1)",
          padding: 12,
          borderRadius: 6,
          fontSize: 13,
          overflowX: "auto",
        }}
      >
        {`import { QuadrantChart } from "semiotic"

<QuadrantChart
  data={backlog}
  xAccessor="effort"
  yAccessor="impact"
  xCenter={5}
  yCenter={5}
  quadrants={{
    topLeft:     { label: "Quick wins",     color: "#22c55e" },
    topRight:    { label: "Strategic bets", color: "#3b82f6" },
    bottomLeft:  { label: "Fill-in",        color: "#94a3b8" },
    bottomRight: { label: "Money pits",     color: "#ef4444" },
  }}
/>`}
      </pre>

      <h2 id="streaming">Streaming / push mode</h2>
      <p>
        Quadrant charts are usually authored. Someone sat down, scored each item, dropped it on the
        grid. But streaming becomes interesting when the scores themselves come from live signals:
        ticket effort tracked from an issue tracker's labels, impact tracked from an analytics
        rollup the moment a feature ships. The grid becomes a live dashboard, not a static slide.
      </p>
      <p>
        The demo below pushes items into the chart one at a time, like backlog tickets arriving from
        a planning session.
      </p>
      <PushDemo />
      <p>Wiring:</p>
      <pre
        style={{
          background: "var(--surface-1)",
          padding: 12,
          borderRadius: 6,
          fontSize: 13,
          overflowX: "auto",
        }}
      >
        {`const ref = useRef()

ref.current.push({ id: "Search typeahead", effort: 2, impact: 9 })
// later, scores update
ref.current.update("Search typeahead", (d) => ({ ...d, impact: 8 }))

<QuadrantChart
  ref={ref}
  xAccessor="effort" yAccessor="impact"
  pointIdAccessor="id"  // required for update() / remove()
  xCenter={5.5} yCenter={5.5}
  quadrants={...}
/>`}
      </pre>
      <p>
        Why push mode helps: <code>update(id, fn)</code> mutates a single point in place without
        re-keying the rest. With <code>data={"{...}"}</code> on each tick, the whole array
        re-renders and the chart's hover state, animations, and any in-flight tooltip get reset.
        Push mode keeps the interaction context.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/charts/quadrant-chart">QuadrantChart with full prop reference</Link>
        </li>
        <li>
          <Link to="/charts/scatterplot">Scatterplot</Link> for the underlying primitive
        </li>
        <li>
          <Link to="/charts/bubble-chart">BubbleChart</Link> when you need a third dimension
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "quadrant-chart",
  title: "QuadrantChart, explained",
  subtitle:
    "A 2×2 scatterplot with labeled, tinted cells. The chart of strategy frameworks, prioritization matrices, and any decision that asks 'which quadrant is this in?'",
  author: "Elijah Meeks",
  date: "2026-04-03",
  tags: ["chart-explainer", "xy"],
  excerpt:
    "Most strategic frameworks are 2×2 grids — quick wins vs strategic bets vs fill-in vs money pits. QuadrantChart bakes the threshold lines and quadrant labels into a scatterplot so 'which quadrant is this in?' answers itself.",
  component: Body,
  ogChart: {
    component: "QuadrantChart",
  },
}
