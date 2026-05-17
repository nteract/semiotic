import React from "react"
import { Link } from "react-router-dom"
import { QuadrantChart, ThemeProvider } from "semiotic"

// Effort × impact for an imaginary backlog. The quadrant config
// names each cell — "quick wins" sits low-effort high-impact;
// "money pits" is the bottom-right anti-pattern.
const BACKLOG = [
  { id: "search-typeahead",      effort: 2, impact: 9 },
  { id: "billing-rewrite",       effort: 9, impact: 8 },
  { id: "dark-mode",             effort: 3, impact: 5 },
  { id: "i18n-french",           effort: 7, impact: 4 },
  { id: "fix-csv-export",        effort: 1, impact: 7 },
  { id: "onboarding-redesign",   effort: 6, impact: 8 },
  { id: "admin-audit-log",       effort: 4, impact: 3 },
  { id: "remove-old-api",        effort: 8, impact: 2 },
  { id: "marketing-page-revamp", effort: 3, impact: 4 },
  { id: "alerting-v2",           effort: 7, impact: 7 },
  { id: "dependency-cleanup",    effort: 5, impact: 2 },
  { id: "experiment-platform",   effort: 9, impact: 9 },
]

const chartFrame = {
  background: "var(--surface-1)",
  borderRadius: 8,
  padding: 16,
  border: "1px solid var(--surface-3)",
  margin: "20px 0",
}

function Body() {
  return (
    <>
      <p>
        <Link to="/charts/quadrant-chart">QuadrantChart</Link> is a
        2×2 scatterplot — pick two metrics, split each axis at a
        threshold, label the four resulting cells. The chart's job
        is making "where does this item land?" instantly
        answerable, which is a question scatterplots are bad at on
        their own (the eye has to estimate position relative to
        the axes; the brain has to do the threshold lookup).
        Adding the lines and labels does that work up-front.
      </p>

      <h2 id="why-care">Why this exists</h2>
      <p>
        Most strategic frameworks are 2×2 grids: the BCG growth-
        share matrix (high/low market growth × high/low market
        share), the Eisenhower urgent/important matrix, RICE
        scoring, MoSCoW prioritization, risk/value, effort/impact.
        The 2×2 is so common in product, strategy, and ops that
        plotting items on one is its own visual language —
        "quick wins, top-right" is shorthand a roomful of people
        understands without a legend.
      </p>
      <p>
        A QuadrantChart is what you reach for when:
      </p>
      <ul>
        <li>
          You have two metrics that span a meaningful threshold
          (above/below average effort; high/low strategic value;
          adopted/not-adopted).
        </li>
        <li>
          The four resulting categories have NAMES the audience
          recognizes ("quick wins," "money pits," "long bets,"
          "fill-in").
        </li>
        <li>
          The decision the chart supports is{" "}
          <em>which quadrant is this in</em>, not "what's the
          continuous trend."
        </li>
      </ul>

      <h2 id="demo">Live demo</h2>
      <p>
        Effort (1–10, low to high) × impact (1–10, low to high)
        for a synthetic feature backlog. Quadrants:
      </p>
      <ul>
        <li>
          <strong>Top-left (Quick wins)</strong> — low effort,
          high impact. Do these first.
        </li>
        <li>
          <strong>Top-right (Strategic bets)</strong> — high
          effort, high impact. Worth doing but plan carefully.
        </li>
        <li>
          <strong>Bottom-left (Fill-in)</strong> — low effort, low
          impact. Pull into a sprint when you have slack.
        </li>
        <li>
          <strong>Bottom-right (Money pits)</strong> — high
          effort, low impact. Don't.
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
            quadrants={{
              topLeft:     { label: "Quick wins",      color: "var(--semiotic-success)" },
              topRight:    { label: "Strategic bets",  color: "var(--semiotic-info)" },
              bottomLeft:  { label: "Fill-in",         color: "var(--semiotic-secondary)" },
              bottomRight: { label: "Money pits",      color: "var(--semiotic-danger)" },
            }}
            width={680}
            height={420}
            tooltip
          />
        </ThemeProvider>
      </div>

      <h2 id="how-to-read">How to read it</h2>
      <ul>
        <li>
          <strong>Axes</strong> — both quantitative, just like any
          scatterplot. Pick metrics whose threshold values are
          meaningful (median, target, "minimum viable," etc.).
        </li>
        <li>
          <strong>Quadrant tints</strong> — color the cells, not
          the points. The points stay readable; the cells signal
          the prescription.
        </li>
        <li>
          <strong>Threshold lines</strong> — drawn at{" "}
          <code>xCenter</code> / <code>yCenter</code>. Omit and
          the chart uses the domain midpoint.
        </li>
      </ul>

      <h2 id="when-to-reach-for-it">When to reach for it</h2>
      <p>Reach for QuadrantChart when:</p>
      <ul>
        <li>
          A 2×2 framework is the way your audience already thinks
          about the problem.
        </li>
        <li>
          You can justify the thresholds — arbitrary cuts make
          the labels misleading.
        </li>
        <li>
          The dataset has a manageable number of items (~10–50);
          beyond that the labels overlap and the chart loses its
          point.
        </li>
      </ul>
      <p>Reach for something else when:</p>
      <ul>
        <li>
          The metrics don't naturally split at a threshold — use
          a plain{" "}
          <Link to="/charts/scatterplot">Scatterplot</Link>{" "}
          instead and let the eye find the cluster.
        </li>
        <li>
          You actually have a third dimension you want to encode
          (e.g. revenue per item) — reach for{" "}
          <Link to="/charts/bubble-chart">BubbleChart</Link>{" "}
          (you can still pass <code>quadrants</code> via{" "}
          <code>annotations</code> on a regular Scatterplot if
          you want quadrant labels too).
        </li>
        <li>
          You want a <em>diverging</em> readout — quadrants are
          categorical regions, not "above/below by how much."
          A{" "}
          <Link to="/charts/difference-chart">
            DifferenceChart
          </Link>{" "}
          is the better fit there.
        </li>
      </ul>

      <h2 id="wiring">Wiring it up</h2>
      <pre style={{ background: "var(--surface-1)", padding: 12, borderRadius: 6, fontSize: 13, overflowX: "auto" }}>
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

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/charts/quadrant-chart">
            QuadrantChart — full prop reference
          </Link>
        </li>
        <li>
          <Link to="/charts/scatterplot">Scatterplot</Link> — the
          underlying primitive
        </li>
        <li>
          <Link to="/charts/bubble-chart">BubbleChart</Link> —
          when you need a third dimension
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
