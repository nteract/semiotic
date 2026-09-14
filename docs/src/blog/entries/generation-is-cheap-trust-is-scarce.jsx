import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { BarChart } from "semiotic/ordinal"
import { prepareChart } from "semiotic/ai"

// ---------------------------------------------------------------------------
// Demo data + two proposals a model might emit: one good, one broken
// ---------------------------------------------------------------------------

const REGIONS = [
  { region: "North", revenue: 128 },
  { region: "South", revenue: 92 },
  { region: "East", revenue: 145 },
  { region: "West", revenue: 71 },
]

const VALID = {
  component: "BarChart",
  props: { data: REGIONS, categoryAccessor: "region", valueAccessor: "revenue" },
}
const BROKEN = {
  component: "StackedBarChart",
  props: { data: REGIONS, categoryAccessor: "region", valueAccessor: "revenue" },
}

const chartFrame = {
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  padding: 12,
  margin: "20px 0",
  background: "var(--surface-1)",
}

const preStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  padding: "14px 16px",
  overflowX: "auto",
  fontSize: 13,
  lineHeight: 1.5,
  margin: "16px 0",
}

function LoopDemo() {
  const [broken, setBroken] = useState(false)
  const result = useMemo(() => prepareChart(broken ? BROKEN : VALID, { data: REGIONS }), [broken])
  return (
    <div style={chartFrame}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => setBroken(false)}
          aria-pressed={!broken}
          style={{
            padding: "5px 12px",
            borderRadius: 14,
            border: "1px solid var(--surface-3)",
            background: !broken ? "var(--accent)" : "var(--surface-2)",
            color: !broken ? "white" : "var(--text-primary)",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Valid proposal
        </button>
        <button
          onClick={() => setBroken(true)}
          aria-pressed={broken}
          style={{
            padding: "5px 12px",
            borderRadius: 14,
            border: "1px solid var(--surface-3)",
            background: broken ? "var(--accent)" : "var(--surface-2)",
            color: broken ? "white" : "var(--text-primary)",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Stacked bar, no stackBy
        </button>
      </div>
      <div role="status" style={{ marginBottom: 10 }}>
        <span
          style={{
            display: "inline-block",
            padding: "2px 10px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            color: "white",
            background: result.ok ? "#236a39" : "#a32f2f",
          }}
        >
          {result.ok
            ? "Configuration checks passed · render evidence not requested"
            : "blocked · do not paint"}
        </span>
      </div>
      {result.ok ? (
        <BarChart
          {...result.props}
          responsiveWidth
          height={260}
          title="Revenue by region"
          description="Synthetic revenue: North 128, South 92, East 145, West 71."
          summary="East has the highest revenue and West the lowest."
          accessibleTable
        />
      ) : (
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--text-primary)" }}>
          {result.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "8px 6px 0" }}>
        The broken proposal never paints a misleading plain bar — it returns the precise reason a
        stacked bar needs <code>stackBy</code>, for the agent to fix and retry.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

function Body() {
  return (
    <>
      <p>
        A chart proposal can look reasonable and still leave out the field that makes it work. Ask
        for stacked bars without saying what forms the stacks, and the problem begins before a
        single bar is drawn. Semiotic's <code>prepareChart</code> checks the proposal and returns
        reasons to revise it before an application shows the result.
      </p>
      <h2 id="why-care">Why this matters</h2>
      <p>
        A person reading a chart rarely sees its configuration. They cannot tell whether an absent
        series was intentional, a field was misspelled, or the data never reached the renderer.
        Checking those conditions during generation makes the failure visible to the author, who
        still has a chance to fix it.
      </p>
      <h2 id="loop">Try an incomplete proposal</h2>
      <p>
        Start with Valid proposal: four bars compare synthetic revenue by region. East is highest
        and West is lowest. Then choose Stacked bar, no stackBy. The same rows have no field
        identifying stack segments, so validation blocks the proposal and explains the missing
        requirement. Return to Valid proposal to restore the chart.
      </p>
      <LoopDemo />
      <h2 id="what-it-catches">What a passing result means</h2>
      <p>
        Structural validation checks the component and props. Diagnostics look for known problems,
        with error-level findings blocking by default. Supplying data enables the fit check and
        repair suggestions. Supplying a renderer adds evidence about the rendered scene, including
        whether it is empty or semantically degenerate.
      </p>
      <p>
        This browser demo does not supply an evidence renderer. Its passing result means the enabled
        configuration checks passed; it does not certify the pixels, the source data, or the
        explanation. Even with render evidence, an author must review the comparison, units,
        accessibility, and the claim the chart is being used to support.
      </p>
      <h2 id="wiring">Wiring it up</h2>
      <pre style={preStyle}>{`import { prepareChart } from "semiotic/ai"
import { renderChartWithEvidence } from "semiotic/server"

const result = prepareChart(proposal, {
  data,
  render: renderChartWithEvidence, // Node or a server render path
})
if (result.ok) {
  // Review result.svg and result.evidence before publishing.
} else {
  // Show result.reasons and use result.repair to revise the proposal.
}`}</pre>
      <p>
        <code>chartGenerationTool()</code> supplies a JSON Schema tool definition drawn from the
        chart registry. The adapter functions <code>toAnthropicTool</code> and
        <code> toOpenAITool</code> shape that definition for a caller's integration. Your host
        application chooses and calls the model; these helpers do not call one.
      </p>
      <h2 id="when">When to reach for it</h2>
      <p>
        Use the check between a proposed configuration and a render in a dashboard builder,
        reporting assistant, or chart editor. Keep a human review when a chart makes a consequential
        claim or uses unfamiliar data. For a hand-authored chart that needs no generation loop, use
        the chart component directly and run the relevant validation and accessibility checks.
      </p>
      <h2 id="other-domains">Other places this helps</h2>
      <p>
        The same sequence is useful for generated forms, queries, and configuration files: inspect
        the structure, check it against the intended task, execute it in the right environment, and
        examine the result. Each step answers a different question.
      </p>
      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/interoperability/generative-ui">Generative chart checks and tool wiring</Link>
        </li>
        <li>
          <Link to="/intelligence/cli-mcp">CLI and MCP workflows</Link>
        </li>
        <li>
          <Link to="/accessibility/audit">Accessibility checks and their limits</Link>
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "generation-is-cheap-trust-is-scarce",
  title: "Generation Is Cheap; Trust Is Scarce",
  subtitle:
    "Check a proposed chart before showing it, and keep configuration checks distinct from render evidence and editorial judgment.",
  author: "Elijah Meeks",
  date: "2026-06-21",
  tags: ["case-study", "ai"],
  excerpt:
    "Try a valid bar chart and an incomplete stacked-bar proposal. The example shows what prepareChart catches, which checks are optional, and what still needs a reader’s review.",
  component: Body,
  ogChart: { component: "BarChart" },
}
