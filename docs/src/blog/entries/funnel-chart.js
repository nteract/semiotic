import React from "react"
import { Link } from "react-router-dom"
import { FunnelChart, ThemeProvider } from "semiotic"

// Classic SaaS signup funnel — each step shrinks, the drop-off
// rate is what the chart is meant to surface.
const FUNNEL = [
  { step: "Visited",   count: 25000, category: "signup" },
  { step: "Signed up", count:  9400, category: "signup" },
  { step: "Activated", count:  5700, category: "signup" },
  { step: "Subscribed", count: 2100, category: "signup" },
  { step: "Retained",  count:  1640, category: "signup" },
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
        <Link to="/charts/funnel-chart">FunnelChart</Link> shows a
        sequence of monotonically-shrinking stages and makes the
        drop-off at each stage the visual punchline. It's
        deceptively simple — five trapezoids stacked vertically,
        with a trapezoidal connector between each pair — but it
        survives because the metaphor is universally legible: each
        stage is a sieve, and you can see at a glance which sieve
        is throwing the most stuff away.
      </p>

      <h2 id="why-care">Why this exists</h2>
      <p>
        A bar chart of stage counts gets you most of the way
        there. Sorted descending, it even gets the monotonic
        property right. What it doesn't do is make the{" "}
        <em>drop-off</em> visual — the bar chart shows absolute
        sizes, not the loss between adjacent stages. The
        FunnelChart's trapezoidal connectors are the bar-chart-
        difference made geometric: each connector's slope is the
        stage-to-stage drop, and a steep connector reads as a
        problem you can point at.
      </p>
      <p>
        Common applications:
      </p>
      <ul>
        <li>
          <strong>Marketing / sales funnels.</strong> Visited →
          signed up → trial → paid → retained. Where the lake
          drains tells the growth team where to invest.
        </li>
        <li>
          <strong>Conversion analysis.</strong> Step-by-step
          checkout flow, onboarding completion, form submission.
        </li>
        <li>
          <strong>Recruiting pipelines.</strong> Applied → phone
          screen → onsite → offer → accepted.
        </li>
        <li>
          <strong>Manufacturing / QA yields.</strong> Raw → assembled
          → tested → packed → shipped.
        </li>
      </ul>

      <h2 id="demo">Live demo</h2>
      <p>
        A SaaS signup funnel for a hypothetical product. The
        steepest connectors point to where the team should focus.
      </p>
      <div style={chartFrame}>
        <ThemeProvider theme="carbon-dark">
          <FunnelChart
            data={FUNNEL}
            stepAccessor="step"
            valueAccessor="count"
            width={680}
            height={360}
            tooltip
          />
        </ThemeProvider>
      </div>
      <p>
        Visited → Signed up loses 62% — that's mostly the
        landing page's job. Signed up → Activated loses 39%
        — that's onboarding's job. Activated → Subscribed loses
        63% — that's pricing/value-prop's job. Subscribed →
        Retained loses 22% — that's product's job.
      </p>

      <h2 id="how-to-read">How to read it</h2>
      <ul>
        <li>
          <strong>Trapezoid width</strong> at each step encodes
          the count at that step.
        </li>
        <li>
          <strong>Connector slope</strong> between adjacent steps
          encodes the drop-off — steep means a leaky stage.
        </li>
        <li>
          <strong>Connector opacity</strong> is configurable via{" "}
          <code>connectorOpacity</code> — keep low when the
          point is the stages, raise when the point is the gaps.
        </li>
      </ul>

      <h2 id="when-to-reach-for-it">When to reach for it</h2>
      <p>Reach for FunnelChart when:</p>
      <ul>
        <li>
          Stages are <em>ordered</em> and counts are{" "}
          <em>monotonically non-increasing</em>. (If the second
          stage is bigger than the first, you have a different
          shape and FunnelChart will look wrong.)
        </li>
        <li>
          You want stage-to-stage drop-off to be the visual
          headline.
        </li>
        <li>
          The audience knows what "a funnel" means. (They almost
          certainly do.)
        </li>
      </ul>
      <p>Reach for something else when:</p>
      <ul>
        <li>
          Counts <em>don't</em> shrink monotonically — try a{" "}
          <Link to="/charts/bar-chart">BarChart</Link> or{" "}
          <Link to="/charts/swimlane-chart">SwimlaneChart</Link>{" "}
          ordered by step.
        </li>
        <li>
          You want to show conversion <em>rates</em>, not counts —
          consider a stacked bar chart with category="converted/
          dropped" per step. The funnel metaphor doesn't show
          rates intuitively (it shows magnitudes that the eye
          translates into rates).
        </li>
        <li>
          You have multiple cohorts you want to compare across
          the same funnel — small-multiple FunnelCharts work, but
          a{" "}
          <Link to="/charts/grouped-bar-chart">GroupedBarChart</Link>{" "}
          per step might be easier to read.
        </li>
      </ul>

      <h2 id="wiring">Wiring it up</h2>
      <pre style={{ background: "var(--surface-1)", padding: 12, borderRadius: 6, fontSize: 13, overflowX: "auto" }}>
{`import { FunnelChart } from "semiotic"

<FunnelChart
  data={[
    { step: "Visited",   count: 25000 },
    { step: "Signed up", count:  9400 },
    { step: "Activated", count:  5700 },
    { step: "Subscribed", count: 2100 },
    { step: "Retained",  count:  1640 },
  ]}
  stepAccessor="step"
  valueAccessor="count"
/>`}
      </pre>
      <p>
        Minimum required props are <code>data</code>,{" "}
        <code>stepAccessor</code>, and <code>valueAccessor</code>.
        Add <code>categoryAccessor</code> (optional) for
        per-category coloring across the same funnel. Tooltips,
        legends, annotations, and themes all work the same way
        as the rest of the chart family.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/charts/funnel-chart">
            FunnelChart — full prop reference
          </Link>
        </li>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> — when the
          shape isn't monotonic
        </li>
        <li>
          <Link to="/charts/sankey-diagram">SankeyDiagram</Link> —
          when stages branch (multiple destinations per step)
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "funnel-chart",
  title: "FunnelChart, explained",
  subtitle:
    "Five trapezoids stacked vertically; the slope of each connector tells you which stage is leaking the most.",
  author: "Elijah Meeks",
  date: "2026-03-08",
  tags: ["chart-explainer", "ordinal"],
  excerpt:
    "A FunnelChart is a bar chart with the geometry tweaked so stage-to-stage drop-off is the visual headline. Sales funnels, signup conversion, recruiting pipelines, manufacturing yield — anywhere monotonically-shrinking ordered stages need a chart that shows where the lake drains.",
  component: Body,
  ogChart: {
    component: "FunnelChart",
  },
}
