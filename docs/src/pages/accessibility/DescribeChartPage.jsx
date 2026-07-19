import React from "react"
import { describeChart } from "semiotic/utils"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

const LEVEL_META = {
  l1: { tag: "L1", name: "Encoding", color: "#0969da" },
  l2: { tag: "L2", name: "Statistics", color: "#1a7f37" },
  l3: { tag: "L3", name: "Trend", color: "#8250df" },
  l4: { tag: "L4", name: "Intent", color: "#bc4c00" },
}

const SAMPLES = {
  "Monthly sales (rises)": {
    component: "LineChart",
    props: {
      data: [
        { month: "Jan", sales: 4200 }, { month: "Feb", sales: 5100 },
        { month: "Mar", sales: 6800 }, { month: "Apr", sales: 9100 },
      ],
      xAccessor: "month", yAccessor: "sales",
    },
    capability: { family: "time-series", intentScores: { trend: 5 } },
  },
  "Error rate (alerting)": {
    component: "LineChart",
    props: {
      data: [
        { t: "09:00", errors: 12 }, { t: "10:00", errors: 9 },
        { t: "11:00", errors: 140 }, { t: "12:00", errors: 14 },
      ],
      xAccessor: "t", yAccessor: "errors",
    },
    capability: { family: "time-series", intentScores: { "change-detection": 5, trend: 2 } },
  },
  "Market share (pie)": {
    component: "PieChart",
    props: {
      data: [
        { vendor: "A", share: 45 }, { vendor: "B", share: 30 },
        { vendor: "C", share: 15 }, { vendor: "D", share: 10 },
      ],
      categoryAccessor: "vendor", valueAccessor: "share",
    },
    capability: { family: "categorical", intentScores: { "part-to-whole": 4 } },
  },
  "Quarterly bars": {
    component: "BarChart",
    props: {
      data: [
        { quarter: "Q1", revenue: 24000 }, { quarter: "Q2", revenue: 31000 },
        { quarter: "Q3", revenue: 28000 }, { quarter: "Q4", revenue: 36000 },
      ],
      categoryAccessor: "quarter", valueAccessor: "revenue",
    },
    capability: { family: "categorical", intentScores: { "compare-categories": 5, rank: 4 } },
  },
}

function DescribeDemo() {
  const [which, setWhich] = React.useState("Monthly sales (rises)")
  const cfg = SAMPLES[which]
  // Pass the chart's capability context so the opt-in L4 intent layer is emitted.
  const result = describeChart(cfg.component, cfg.props, { capability: cfg.capability })

  return (
    <div style={{ border: "1px solid var(--surface-3)", borderRadius: 8, overflow: "hidden", margin: "20px 0" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 12, background: "var(--surface-1)", borderBottom: "1px solid var(--surface-3)" }}>
        {Object.keys(SAMPLES).map((k) => (
          <button key={k} type="button" onClick={() => setWhich(k)} style={{
            padding: "5px 12px", borderRadius: 6, border: "1px solid var(--surface-3)", cursor: "pointer", fontSize: 13,
            background: which === k ? "var(--accent, #0969da)" : "var(--surface-2)",
            color: which === k ? "#fff" : "var(--text-1)",
          }}>{k}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {["l1", "l2", "l3", "l4"].map((lvl) => {
          const text = result.levels[lvl]
          if (!text) return null
          const m = LEVEL_META[lvl]
          return (
            <div key={lvl} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "baseline" }}>
              <span style={{ flex: "0 0 auto", fontSize: 11, fontWeight: 700, color: m.color, fontFamily: "var(--font-mono)" }}>
                {m.tag} {m.name}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.5 }}>{text}</span>
            </div>
          )
        })}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--surface-3)", fontSize: 13, color: "var(--text-2)" }}>
          <strong>Combined</strong> (what a screen reader hears):<br />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{result.text}</span>
        </div>
      </div>
    </div>
  )
}

export default function DescribeChartPage() {
  return (
    <PageLayout
      title="Chart Descriptions"
      breadcrumbs={[
        { label: "Accessibility", path: "/accessibility/overview" },
        { label: "Chart Descriptions", path: "/accessibility/descriptions" },
      ]}
      prevPage={{ title: "Chartability Audit", path: "/accessibility/audit" }}
      nextPage={{ title: "Structured Navigation", path: "/accessibility/navigation" }}
    >
      <p>
        A screen reader, handed a Semiotic chart, announces something terse:
        "line chart, 9 points." Accurate, useless. The research on accessible
        visualization is blunt about this:{" "}
        <a href="https://vis.csail.mit.edu/pubs/vis-text-model/" target="_blank" rel="noopener noreferrer">
          Lundgard &amp; Satyanarayan (IEEE VIS 2021)
        </a>{" "}
        found that blind and low-vision readers rank <em>statistics</em> and{" "}
        <em>trends</em> as the most useful things a description can convey —
        well above a restatement of the chart type.{" "}
        <code>describeChart()</code> generates exactly that: a layered,
        natural-language description built from the chart's config.
      </p>

      <h2 id="four-levels">The four-level model</h2>
      <p>
        Lundgard &amp; Satyanarayan organize description content into four
        levels. <code>describeChart()</code> produces the first three from the
        config alone, and — when you hand it the chart's intent — an opt-in
        fourth:
      </p>
      <ul>
        <li><strong>L1 — Encoding.</strong> The chart type and what's mapped to which channel ("a line chart of sales by month").</li>
        <li><strong>L2 — Statistics.</strong> Ranges, extrema with their labels, mean ("sales ranges from 100 in January to 350 in March").</li>
        <li><strong>L3 — Trend.</strong> Overall direction and notable shape over an ordered axis ("rises to a peak of 350 in March", or "after peaking at 400 in February").</li>
        <li><strong>L4 — Intent.</strong> The <em>illocutionary</em> sentence — what the chart is asking you to do ("This is an alerting chart; the spike at 11:00 is the point to investigate"). Opt-in: pass the chart's <code>capability</code>. Deeper <em>domain</em> meaning (why <em>this</em> chart, in <em>this</em> report) still belongs to your <code>summary</code> or an LLM.</li>
      </ul>

      <h2 id="live">Try it</h2>
      <p>Each line is one semantic level; the combined text is what a screen reader would announce. The L4 line shows how the same chart shape reads differently once you declare its intent — note how the alerting example points at the spike. Computed live in your browser.</p>
      <DescribeDemo />

      <h2 id="chart-container">Wiring: ChartContainer is the opt-in layer</h2>
      <p>
        Semiotic doesn't bake auto-description into every bare chart. Full
        accessible decoration — title, caption, and the generated description — lives
        at the <Link to="/features/chart-container">ChartContainer</Link> layer,
        as an explicit opt-in. Set <code>describe</code> and give the container a{" "}
        <code>chartConfig</code> (which it already takes for "copy config"), and
        it renders a screen-reader-only description derived from that config:
      </p>
      <CodeBlock
        code={`import { ChartContainer, LineChart } from "semiotic"

<ChartContainer
  title="Sales by month"
  chartConfig={{ component: "LineChart", props: chartProps }}
  describe                              // sr-only L1–L3 description
  // describe={{ visible: true }}       // also show it as a visible caption
  // describe={{ levels: ["l1","l2"] }} // choose verbosity
>
  <LineChart {...chartProps} />
</ChartContainer>`}
        language="jsx"
      />
      <p>
        Why opt-in at the container, not automatic on every chart? Because the
        bare chart space is a deliberate baseline (keyboard nav, focus ring,
        live region, data table), and the container is where presentation decoration
        belongs. It also keeps the description in one place instead of competing
        with the chart's own terse aria-label. The{" "}
        <Link to="/accessibility/audit">accessibility audit</Link> knows about
        this: enabling <code>describe</code> turns its{" "}
        <code>assistive.features-described</code> finding from a warning into a pass.
      </p>

      <h2 id="api">Programmatic API</h2>
      <CodeBlock
        code={`import { describeChart } from "semiotic/utils"

const { text, levels } = describeChart("LineChart", {
  data: salesData, xAccessor: "month", yAccessor: "sales",
})

text       // "A line chart of sales by month. sales ranges from … Overall sales rises …"
levels.l1  // encoding
levels.l2  // statistics
levels.l3  // trend

// Pick verbosity:
describeChart("BarChart", props, { levels: ["l1", "l2"] })`}
        language="jsx"
      />

      <h2 id="l4-intent">L4 — the communicative act</h2>
      <p>
        L1–L3 describe the chart's <em>shape</em>. L4 names its{" "}
        <strong>communicative act</strong> — the verb behind "what is this chart
        doing?" — and points the reader at the feature that act asks them to act
        on. It's the production↔reception join: the intent metadata already lives
        in each chart's{" "}
        <Link to="/intelligence/capabilities">capability descriptor</Link>, and
        feeding it to <code>describeChart</code> turns it into the layer the
        accessible description was missing.
      </p>
      <CodeBlock
        code={`import { describeChart } from "semiotic/utils"
import { LineChartCapability } from "semiotic/ai"

// Pass a full capability descriptor, or a resolved { family, intentScores }
// (a suggestion's scores are the most precise source). L4 auto-appends.
const { levels } = describeChart("LineChart", props, {
  capability: { family: "time-series", intentScores: { "change-detection": 5 } },
  audience: executiveAudience,   // optional: low familiarity → orienting nudge
})

levels.l4  // "This is an alerting chart; the peak of 9,100 at March is the point to investigate."`}
        language="jsx"
      />
      <p>
        The dominant intent picks one of eleven acts (alerting, tracking,
        comparing, ranking, apportioning, characterizing, relating, …); the
        directive clause is built from the same L2/L3 statistics. Resolve the act
        on its own with <code>resolveCommunicativeAct(component, capability)</code>.
        The default output is unchanged — without a <code>capability</code>,{" "}
        <code>describeChart</code> still stops at L3.
      </p>
      <p>
        Need all three layers <em>plus</em> the navigation structure as one payload
        for an AI agent? That's{" "}
        <Link to="/intelligence/reader-grounding">agent-reader grounding</Link>.
      </p>

      <h2 id="coverage">Coverage &amp; honesty</h2>
      <p>
        L2/L3 are richest for the families where a quantitative measure over a
        dimension is the point: <strong>XY</strong> (line, area, scatter),{" "}
        <strong>bar</strong>, <strong>part-to-whole</strong> (pie, donut, funnel),
        and <strong>distributions</strong>. For network, hierarchy, geo, and
        single-value charts, <code>describeChart()</code> returns a clean L1
        description (type and structure) and stops, rather than inventing a trend
        that isn't there. It's a strong first draft and a reliable fallback — but
        L1–L3 describe <em>shape</em>, and L4 the <em>communicative act</em>, not
        the <em>domain</em> meaning. For the deeper "why" — why this chart, in this
        report — still write a <code>summary</code> (or pipe the generated text
        plus your data through an LLM).
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/accessibility/audit">Chartability Audit</Link> — grades whether features are described</li>
        <li><Link to="/accessibility/overview">Accessibility — overview</Link></li>
        <li><Link to="/intelligence/interrogation">Interrogation</Link> — the LLM-backed path to L4 descriptions</li>
      </ul>
    </PageLayout>
  )
}
