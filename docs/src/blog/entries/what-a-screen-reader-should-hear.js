/* eslint-disable react/no-unescaped-entities */
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
      { month: "Jan", sales: 4200 }, { month: "Feb", sales: 5100 },
      { month: "Mar", sales: 6800 }, { month: "Apr", sales: 9100 },
      { month: "May", sales: 2100 },
    ],
    xAccessor: "month", yAccessor: "sales",
  },
}

function LevelBreakdown() {
  const r = describeChart(DEMO.component, DEMO.props)
  return (
    <div style={panel}>
      {LEVELS.map(({ key, tag, name, color }) =>
        r.levels[key] ? (
          <div key={key} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "baseline" }}>
            <span style={{ flex: "0 0 88px", fontSize: 11, fontWeight: 700, color, fontFamily: "var(--font-mono)" }}>{tag} {name}</span>
            <span style={{ fontSize: 14, lineHeight: 1.5 }}>{r.levels[key]}</span>
          </div>
        ) : null
      )}
    </div>
  )
}

function Body() {
  return (
    <>
      <p>
        Point a screen reader at a chart on a <code>&lt;canvas&gt;</code> and, if
        you've done everything right, it says "line chart, nine points." That's
        not a description; it's a census. The data — the rise, the peak, the
        cliff in May — is exactly the part that never makes it to the person who
        can't see the pixels. <code>describeChart()</code> closes that gap by
        generating the description the chart should have been narrating all along.
      </p>

      <h2 id="why-care">Why this matters</h2>
      <p>
        There's real research behind what a good chart description contains.
        Alan Lundgard and Arvind Satyanarayan's{" "}
        <a href="https://vis.csail.mit.edu/pubs/vis-text-model/" target="_blank" rel="noopener noreferrer">
          four-level model of semantic content
        </a>{" "}
        (IEEE VIS 2021) analyzed thousands of human-written chart descriptions and
        sorted their content into four levels: <strong>L1</strong> the encoding
        (what's a line, what's an axis), <strong>L2</strong> the statistics
        (ranges, extrema, means), <strong>L3</strong> the perceptual trends (it
        rises, it peaks, it reverses), and <strong>L4</strong> the domain meaning
        (why any of it matters). Then they asked blind and sighted readers which
        levels they valued. The punchline that should reorganize how every
        charting library does alt-text: <strong>blind and low-vision readers rank
        L2 and L3 as the most useful</strong> — the statistics and the trends —
        while most automatic captioning stops at L1, the one level that adds the
        least.
      </p>
      <p>
        So the bar isn't "label the chart." It's "tell me the numbers and the
        shape." That's a higher bar, but it's also a <em>computable</em> one: a
        chart's config already contains the data and the encoding. You can derive
        L1, L2, and most of L3 without an LLM, deterministically, offline.
      </p>

      <h2 id="the-thing">Three levels from one config</h2>
      <p>
        Here's <code>describeChart()</code> run live on a five-point line chart —
        sales that climb for four months and then fall off a cliff. Each line is
        one semantic level:
      </p>

      <LevelBreakdown />

      <p>
        L1 is the encoding. L2 is the statistics, and note it carries the{" "}
        <em>labels</em> at the extremes — not "max 9,100" but "9,100 (Apr)," which
        is the version a person can actually use. L3 is the trend, and it's doing
        the subtle thing: the series ends at its lowest point, so it reports the
        fall to May rather than pretending the April peak is the headline. Glue
        the three together and a screen reader finally narrates the chart instead
        of counting it.
      </p>

      <h2 id="how-it-works">How it works</h2>
      <p>
        No model, no network. <code>describeChart()</code> reads the chart's
        accessors to find the measure and the dimension, then:
      </p>
      <ul>
        <li><strong>L1</strong> maps the component to a chart-type phrase and names the channels — "a line chart of sales by month," "split by region" when there's a series field.</li>
        <li><strong>L2</strong> walks the data once for min, max, and mean, holding onto the dimension label at each extreme so it can say <em>where</em> the peak was.</li>
        <li><strong>L3</strong> compares first to last against the overall spread, classifies the net direction, and — the part that keeps it honest — detects reversals, so a series that peaks in the middle reads "rises … after peaking at 400 (Feb)" rather than a flat "rises."</li>
      </ul>
      <p>
        It's richest for the families where a measure over a dimension is the
        whole point — XY, bar, part-to-whole, distributions. For network,
        hierarchy, geo, and single-value charts it returns a clean L1 and stops,
        rather than inventing a trend that isn't there. Honest degradation beats
        confident nonsense.
      </p>

      <h2 id="opt-in">The description belongs to the container</h2>
      <p>
        We made one deliberate architectural choice: auto-description is{" "}
        <strong>not</strong> baked into every chart. It's an opt-in at the{" "}
        <Link to="/features/chart-container">ChartContainer</Link> layer, which is
        already where presentation chrome — title, subtitle, toolbar — lives. Give
        the container a <code>chartConfig</code> (it takes one anyway, for "copy
        config") and set <code>describe</code>:
      </p>
      <pre style={{ ...panel, fontFamily: "var(--font-mono)", fontSize: 13, whiteSpace: "pre-wrap" }}>{`<ChartContainer
  title="Sales by month"
  chartConfig={{ component: "LineChart", props }}
  describe                       // screen-reader-only L1–L3 description
>
  <LineChart {...props} />
</ChartContainer>`}</pre>
      <p>
        Why not just do it automatically on the bare chart? Two reasons. The bare
        chart space is a deliberate baseline — keyboard navigation, focus ring,
        live region, a data table — and piling presentation on top of it blurs
        that line. And a container-level description sits in one place in the
        reading order instead of fighting the chart's own terse aria-label. Full
        accessible legibility is something you opt into by reaching for the
        container, not something every chart has to carry alone. (The{" "}
        <Link to="/accessibility/audit">accessibility audit</Link> knows the
        difference: flip <code>describe</code> on and its "features described"
        finding flips from warning to pass.)
      </p>

      <h2 id="when">When to reach for it (and its limit)</h2>
      <p>
        Use it as the <strong>default first draft</strong> for any chart's
        description, and as a <strong>reliable fallback</strong> when no one has
        written one. What it gives you is the shape — type, numbers, trend. What
        it can't give you is L4: the <em>meaning</em>. It will tell you sales fell
        to 2,100 in May; it won't tell you that's because the warehouse flooded.
        For the "why," write a <code>summary</code>, or — and this is the natural
        next step — feed the generated L1–L3 text plus the data through an LLM via
        the <Link to="/intelligence/interrogation">interrogation</Link> layer and
        let it supply the domain narrative. Deterministic description for the
        shape, generative for the meaning.
      </p>

      <h2 id="other-domains">Where this pattern shows up</h2>
      <ul>
        <li><strong>Dashboards.</strong> A grid of twenty charts is twenty "line chart, N points" announcements unless each one narrates itself. Auto-description scales where hand-written alt-text doesn't.</li>
        <li><strong>Automated reporting.</strong> The same L1–L3 text is a serviceable caption for a generated PDF or email, sighted readers included.</li>
        <li><strong>LLM grounding.</strong> Handing a model the deterministic statistics keeps its narrative honest — it's describing real extrema, not hallucinating a trend.</li>
        <li><strong>Any raster visualization.</strong> Maps, WebGL scenes, game telemetry — anywhere the visual has no DOM, a config-derived description is the accessible path.</li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/accessibility/descriptions">Chart Descriptions — reference</Link></li>
        <li><Link to="/accessibility/audit">Chartability Audit</Link></li>
        <li><a href="https://vis.csail.mit.edu/pubs/vis-text-model/" target="_blank" rel="noopener noreferrer">Lundgard &amp; Satyanarayan — A Four-Level Model of Semantic Content</a></li>
      </ul>
    </>
  )
}

export default {
  slug: "what-a-screen-reader-should-hear",
  title: "What a Screen Reader Should Hear",
  subtitle:
    "describeChart() turns a chart config into a layered natural-language description — encoding, statistics, and trend — the content research says blind and low-vision readers actually want.",
  author: "Semiotic Team",
  date: "2026-06-01",
  tags: ["case-study", "accessibility"],
  excerpt:
    "A screen reader announces \"line chart, nine points\" — accurate and useless. Research on accessible visualization says readers want statistics and trends, not chart types. describeChart() generates exactly that, deterministically, from the chart's config, and ChartContainer makes it an opt-in layer.",
  component: Body,
  ogChart: { component: "LineChart" },
  draft: true,
}
