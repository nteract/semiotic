import React from "react"
import { Link } from "react-router-dom"
import { describeChart } from "semiotic/utils"

const panel = {
  background: "var(--surface-1)",
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  padding: 16,
  margin: "20px 0",
}

const LEVELS = [
  { key: "l1", tag: "L1", name: "Encoding", color: "#0969da" },
  { key: "l2", tag: "L2", name: "Statistics", color: "#1a7f37" },
  { key: "l3", tag: "L3", name: "Trend", color: "#8250df" },
]

const DEMO = {
  component: "LineChart",
  props: {
    data: [
      { month: "Jan", sales: 4200 },
      { month: "Feb", sales: 5100 },
      { month: "Mar", sales: 6800 },
      { month: "Apr", sales: 9100 },
      { month: "May", sales: 2100 },
    ],
    xAccessor: "month",
    yAccessor: "sales",
  },
}

function LevelBreakdown() {
  const r = describeChart(DEMO.component, DEMO.props)
  return (
    <div style={panel}>
      {LEVELS.map(({ key, tag, name, color }) =>
        r.levels[key] ? (
          <div
            key={key}
            style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "baseline" }}
          >
            <span
              style={{
                flex: "0 0 88px",
                fontSize: 11,
                fontWeight: 700,
                color,
                fontFamily: "var(--font-mono)",
              }}
            >
              {tag} {name}
            </span>
            <span style={{ fontSize: 14, lineHeight: 1.5 }}>{r.levels[key]}</span>
          </div>
        ) : null,
      )}
    </div>
  )
}

function Body() {
  return (
    <>
      <p>
        “Line chart, five points” identifies a picture but leaves its finding unanswered. For the
        sales series below, a reader needs to know that April is highest at 9,100 and May falls to
        2,100. <code>describeChart()</code> turns the supplied configuration into a description that
        includes measurements and a simple account of the pattern.
      </p>
      <h2 id="why-care">Why this matters</h2>
      <p>
        Alan Lundgard and Arvind Satyanarayan's
        <a href="https://vis.csail.mit.edu/pubs/vis-text-model/">
          {" "}
          four-level model of semantic content
        </a>{" "}
        distinguishes a chart's construction, statistical relationships, patterns, and domain
        context. Their study of blind and sighted readers found that useful content depends on the
        reader, with trends and statistics particularly valuable for blind participants. A
        chart-type label alone is a thin starting point.
      </p>
      <h2 id="the-thing">Read three layers of one series</h2>
      <p>
        This synthetic series rises from January through April, then drops in May. The panel runs{" "}
        <code>describeChart()</code> on those five rows. Read Encoding to learn what is measured,
        Statistics to find the range and its months, and Trend for the generated account of the
        direction.
      </p>
      <LevelBreakdown />
      <p>
        Notice that the largest value has a month attached. “9,100 in April” gives a reader a place
        to investigate. The generated text can describe the fall to May, but these rows do not say
        whether a warehouse closed, demand fell, or a feed failed. That explanation needs evidence
        outside this chart.
      </p>
      <h2 id="how-it-works">How it works</h2>
      <p>
        The helper reads the component, data, and accessors. It describes the encoding, computes
        supported statistics, and uses rules to summarize patterns such as net direction and
        reversals. It makes no model or network call. Coverage varies by chart family: a numerical
        series supports richer statistics than a topology-only network.
      </p>
      <h2 id="when">When to reach for it</h2>
      <p>
        Use the output as a first draft, a fallback, or a caption that stays aligned with new data.
        Review the units, missing values, grouping, and scope. Write a <code>summary</code> for the
        supported conclusion and provide an exact-value table when readers need one. An
        automatically generated trend cannot establish a cause, and a passing accessibility check
        cannot replace trying the reading experience.
      </p>
      <h2 id="wiring">Wiring it up</h2>
      <pre style={{ ...panel, overflowX: "auto" }}>{`import { describeChart } from "semiotic/utils"

const description = describeChart("LineChart", props)
// Inspect description.levels before using the text in a report.

<ChartContainer
  title="Sales by month"
  chartConfig={{ component: "LineChart", props }}
  describe
>
  <LineChart {...props} />
</ChartContainer>`}</pre>
      <p>
        <code>ChartContainer</code> can present the generated description when <code>describe</code>{" "}
        is enabled. This is separate from the chart's authored <code>title</code>,
        <code> description</code>, and <code>summary</code>. Compose those layers so the reader
        encounters a useful explanation without hearing the same sentence repeatedly.
      </p>
      <h2 id="other-domains">Other places this helps</h2>
      <p>
        A dashboard needs captions that follow changing data. An email report needs the main pattern
        even when its image is unavailable. An assistant needs real statistics before drafting an
        explanation. In all three cases, computed observations are useful input; the author remains
        responsible for what the report concludes.
      </p>
      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/accessibility/descriptions">Chart descriptions reference</Link>
        </li>
        <li>
          <Link to="/accessibility/navigation">Explore a chart with structured navigation</Link>
        </li>
        <li>
          <Link to="/accessibility/audit">Accessibility audit</Link>
        </li>
        <li>
          <a href="https://vis.csail.mit.edu/pubs/vis-text-model/">
            Lundgard and Satyanarayan's four-level model
          </a>
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "what-a-screen-reader-should-hear",
  title: "What a Screen Reader Should Hear",
  subtitle:
    "Explain a chart’s measurements and pattern, then add the context that only an informed author can supply.",
  author: "Elijah Meeks",
  date: "2026-06-15",
  tags: ["case-study", "accessibility"],
  excerpt:
    "A label names the chart. A useful description helps someone read it. Follow a five-month sales series through generated encoding, statistics, and trend text, and see where human explanation still matters.",
  component: Body,
  ogChart: { component: "LineChart" },
}
