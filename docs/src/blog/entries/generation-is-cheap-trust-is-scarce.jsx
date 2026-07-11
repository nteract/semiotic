/* eslint-disable react/no-unescaped-entities */
import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { BarChart } from "semiotic"
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
          style={{
            padding: "5px 12px",
            borderRadius: 14,
            border: "1px solid var(--surface-3)",
            background: !broken ? "var(--accent)" : "var(--surface-2)",
            color: !broken ? "white" : "var(--text)",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Valid proposal
        </button>
        <button
          onClick={() => setBroken(true)}
          style={{
            padding: "5px 12px",
            borderRadius: 14,
            border: "1px solid var(--surface-3)",
            background: broken ? "var(--accent)" : "var(--surface-2)",
            color: broken ? "white" : "var(--text)",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Stacked bar, no stackBy
        </button>
      </div>
      <div style={{ marginBottom: 10 }}>
        <span
          style={{
            display: "inline-block",
            padding: "2px 10px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            color: "white",
            background: result.ok ? "#2d8a4a" : "#c43d3d",
          }}
        >
          {result.ok ? "ok · safe to render" : "blocked · do not paint"}
        </span>
      </div>
      {result.ok ? (
        <BarChart {...result.props} width={520} height={260} />
      ) : (
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#c43d3d" }}>
          {result.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "8px 6px 0" }}>
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
        An LLM can emit a chart in a sentence. That was never the hard part. The hard part is trust:
        hand-written chart code breaks on first paint, and a plausible-looking chart for the wrong
        data misleads exactly the reader who can't tell. Semiotic's new generative-UI trust layer is
        the deterministic gate between a model's confidence and the user's screen — it turns a
        proposal into a result that's validated and diagnosed (and, with a renderer, proven to paint) or comes back with precise
        reasons and ranked alternatives to retry with.
      </p>

      <h2 id="why-care">Why this matters</h2>
      <p>
        Every AI-charting product today bets on the model writing correct code. But the model's
        training data is a monoculture of a few libraries' defaults, so the bet mass-produces charts
        that render and don't communicate — and, worse, charts that render <em>wrong</em>. The
        interesting move isn't a better prompt; it's refusing to let generation be the last step.
        Make the model emit a structured proposal, then run a loop the weights can't: validate the
        props, diagnose the anti-patterns, check the chart actually fits the data, and — server-side
        — prove the scene isn't empty. Generation is cheap; the loop is where trust gets
        manufactured.
      </p>

      <h2 id="loop">The loop, accepting and rejecting</h2>
      <p>
        <code>prepareChart</code> composes the whole thing. Flip between a valid proposal and a
        broken one and watch the gate do its job — only the proposal that earns it paints:
      </p>
      <LoopDemo />

      <pre style={preStyle}>{`import { prepareChart } from "semiotic/ai"

const result = prepareChart(
  { component: "BarChart",
    props: { data, categoryAccessor: "region", valueAccessor: "revenue" } },
  { data }                            // enables the fit check + ranked alternatives
)

if (result.ok) {
  stream(result.jsx)                  // validated JSX / result.config
} else {
  retry(result.reasons, result.repair) // precise reasons + alternatives — never paint
}`}</pre>

      <h2 id="what-it-catches">What the loop catches</h2>
      <p>
        Four failure modes, four gates. <strong>Structural validation</strong> rejects a missing
        required prop or a misspelled one (with a "did you mean?" suggestion).{" "}
        <strong>Anti-pattern diagnostics</strong> flag empty data, illegible contrast, and
        misleading-design tells like an inverted axis or a part-to-whole chart with negatives.{" "}
        <strong>A fit check</strong> refuses a scatterplot on categorical data and ranks the charts
        that <em>do</em> fit. And when you inject the renderer, <strong>render evidence</strong>{" "}
        proves the scene has marks and reads back the mark count, domains, and ARIA label — the
        first-try oracle. A proposal has to clear all four to come back <code>ok</code>.
      </p>

      <h2 id="tool">It's a tool, with no vendor lock-in</h2>
      <p>
        <code>chartGenerationTool()</code> returns a framework-agnostic JSON-Schema tool definition
        — the component enum drawn from the registry, so a model can only propose a real chart — and{" "}
        <code>toAnthropicTool</code> / <code>toOpenAITool</code> shape it for those APIs. The Vercel
        AI SDK and LangChain consume the same JSON Schema. The library ships <em>no</em> AI-SDK
        dependency: just the schema and pure transforms, so it never goes stale when a framework's
        API moves.
      </p>
      <pre
        style={preStyle}
      >{`import { chartGenerationTool, toAnthropicTool, createChartToolHandler } from "semiotic/ai"

const def = chartGenerationTool()
const handler = createChartToolHandler((input) => ({ data, render }))
const tools = [toAnthropicTool(def)]   // { name, description, input_schema }`}</pre>
      <p>
        There's also a published <strong>Agent Skill</strong> packaging this workflow plus
        Semiotic's behavior contracts, so any Claude-family agent picks it up without bespoke
        prompting — the cheapest way to escape the training-data monoculture.
      </p>

      <h2 id="when">When to reach for it</h2>
      <p>
        Reach for it any time a model produces a view a user will act on: a conversational analytics
        agent streaming a dashboard, a notebook copilot turning a dataframe into a chart, an IDE
        assistant scaffolding a component. Don't reach for it as a chart <em>renderer</em> — it's
        the gate, not the canvas; pair it with the chart components or <code>semiotic/server</code>{" "}
        for the actual paint. And don't bypass it to "save a step": the skipped step is the only one
        that was ever scarce.
      </p>

      <h2 id="where-this-goes">Where this goes</h2>
      <p>
        The trust loop generalizes past charts. Anywhere a model emits a structured artifact a human
        will trust — a SQL query, a config, a form — the same shape holds: don't ship the
        generation, ship the generation that survived validation, a fit check against reality, and
        proof it does what it claims. For charts, that's the difference between an agent that draws
        confident-looking pictures and one that earns the picture it draws.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/interoperability/generative-ui">Generative-UI Trust Layer</Link> — the
          interactive page with all four failure modes and the tool wiring.
        </li>
        <li>
          <Link to="/intelligence/cli-mcp">CLI &amp; MCP</Link> — the <code>semiotic-mcp</code>{" "}
          server and <code>--doctor</code> gate that enforce the same contracts.
        </li>
        <li>
          <Link to="/interoperability/portability-spec">Portability Spec</Link> — carrying the
          capability and provenance metadata beyond Semiotic.
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "generation-is-cheap-trust-is-scarce",
  title: "Generation Is Cheap; Trust Is Scarce",
  subtitle:
    "Semiotic's generative-UI trust layer turns an LLM's chart proposal into a result that's validated and diagnosed — and, with a renderer, proven to paint — or comes back with precise reasons and ranked alternatives: validate, diagnose, repair, prove.",
  author: "Elijah Meeks",
  date: "2026-06-21",
  tags: ["case-study", "ai"],
  excerpt:
    "An LLM can emit a chart in a sentence; that was never the hard part. The hard part is trust — hand-written chart code breaks on first paint, and a plausible chart for the wrong data misleads the reader who can't tell. The trust layer is the deterministic gate between a model's confidence and the user's screen, and it ships no AI-SDK dependency.",
  component: Body,
  ogChart: { component: "BarChart" },
  draft: true,
}
