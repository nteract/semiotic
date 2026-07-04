import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { BarChart, LineChart, Scatterplot } from "semiotic"
import { prepareChart, chartGenerationTool } from "semiotic/ai"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

// ── Demo data ────────────────────────────────────────────────────────────────

const REGIONS = [
  { region: "North", revenue: 128 },
  { region: "South", revenue: 92 },
  { region: "East", revenue: 145 },
  { region: "West", revenue: 71 },
]

const CHART_COMPONENTS = { BarChart, LineChart, Scatterplot }

// ── LLM "proposals" — what a model might emit, good and bad ─────────────────

const PROPOSALS = {
  "A valid bar chart": {
    input: { component: "BarChart", props: { data: REGIONS, categoryAccessor: "region", valueAccessor: "revenue", title: "Revenue by region" } },
    data: REGIONS,
    note: "A well-formed proposal: it validates, carries no error diagnostics, and fits the data. The loop returns ok — and only then do we paint.",
  },
  "Missing a required prop": {
    input: { component: "StackedBarChart", props: { data: REGIONS, categoryAccessor: "region", valueAccessor: "revenue" } },
    data: REGIONS,
    note: "A stacked bar with no stackBy. Validation rejects it before render — the agent gets a precise reason to retry, not a chart that paints as a plain bar and silently drops the stacking the user asked for.",
  },
  "Wrong chart for the data": {
    input: { component: "Scatterplot", props: { data: REGIONS, xAccessor: "region", yAccessor: "revenue" } },
    data: REGIONS,
    note: "A scatterplot wants two numeric axes; region is categorical. The fit check refuses and ranks alternatives, so the agent re-proposes the right chart instead of misleading the reader with a degenerate scatter.",
  },
  "An invented component": {
    input: { component: "SunburstFlowChart", props: { data: REGIONS } },
    data: REGIONS,
    note: "A hallucinated component name. It isn't in the registry, so no config is built and no JSX is emitted — the loop hands back alternatives instead.",
  },
}

const pretty = (v) => JSON.stringify(v, null, 2)

const panelStyle = {
  border: "1px solid var(--surface-3)",
  borderRadius: 10,
  background: "var(--surface-1)",
  padding: 16,
}

function Badge({ ok }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        color: "white",
        background: ok ? "var(--semiotic-success, #2d8a4a)" : "var(--semiotic-danger, #c43d3d)",
      }}
    >
      {ok ? "ok · safe to render" : "blocked · do not paint"}
    </span>
  )
}

export default function GenerativeUIPage() {
  const [name, setName] = useState(Object.keys(PROPOSALS)[0])
  const proposal = PROPOSALS[name]

  // The trust loop, in the browser (validate → diagnose → repair; the optional
  // render+evidence step is server-side and shown in the wiring snippet below).
  const result = useMemo(
    () => prepareChart(proposal.input, { data: proposal.data }),
    [proposal]
  )

  const Chart = result.ok ? CHART_COMPONENTS[result.component] : null
  const repairAlts =
    result.repair && result.repair.status !== "ok" ? result.repair.alternatives : []

  const toolSchema = useMemo(() => chartGenerationTool({ components: ["BarChart", "LineChart", "Scatterplot", "AreaChart", "PieChart"] }), [])

  return (
    <PageLayout
      title="Generative-UI Trust Layer"
      breadcrumbs={[
        { label: "Interoperability", path: "/interoperability" },
        { label: "Generative-UI Trust Layer", path: "/interoperability/generative-ui" },
      ]}
      prevPage={{ title: "Data-Truth Bridge", path: "/interoperability/data-quality-bridge" }}
      nextPage={{ title: "CLI & MCP", path: "/intelligence/cli-mcp" }}
    >
      <p>
        An LLM can emit a chart in a sentence. The problem isn't generation — it's
        trust: hand-written chart JSX breaks on first paint, and a plausible-looking
        chart for the wrong data misleads exactly the reader who can't tell. The
        generative-UI trust layer is what an AI framework wraps around chart
        generation. It turns a model's <em>proposal</em> — a component name and props —
        into a result that is either <strong>guaranteed renderable</strong> or
        accompanied by precise reasons and ranked alternatives to retry with. Never a
        broken chart.
      </p>

      <h2>Why this matters</h2>
      <p>
        "Generation is cheap; trust is scarce." Every AI-charting story today bets on
        the model writing correct code — and the model's training data is a monoculture
        of the same few libraries' defaults, which mass-produces charts that render but
        don't communicate. Semiotic inverts the bet: the model emits a validated{" "}
        <code>ChartConfig</code>, and a deterministic loop — <em>validate → diagnose →
        repair → prove</em> — does the trust work the weights can't. Structural
        validation catches the missing prop. Anti-pattern diagnostics catch the
        misleading design. A fit check catches the wrong chart for the data. Render
        evidence proves the scene isn't empty. The agent never ships a chart it hasn't
        earned.
      </p>

      <h2>Watch the loop accept and reject</h2>
      <p>
        Pick a proposal a model might emit. Each runs through{" "}
        <code>prepareChart</code> live; only the ones that pass paint.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        {Object.keys(PROPOSALS).map((key) => (
          <button
            key={key}
            onClick={() => setName(key)}
            style={{
              padding: "5px 12px",
              borderRadius: 14,
              border: "1px solid var(--surface-3)",
              background: key === name ? "var(--accent)" : "var(--surface-2)",
              color: key === name ? "white" : "var(--text-primary)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {key}
          </button>
        ))}
      </div>

      <div style={{ ...panelStyle, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Badge ok={result.ok} />
          <code style={{ fontSize: 13 }}>{result.component}</code>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{proposal.note}</p>

        {result.ok && Chart ? (
          <div>
            <Chart {...result.props} height={260} />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Why it was blocked</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                {result.reasons.map((r, i) => (
                  <li key={i} style={{ color: "var(--semiotic-danger, #c43d3d)" }}>{r}</li>
                ))}
              </ul>
            </div>
            {repairAlts.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Ranked alternatives (from repair)</div>
                <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                  {repairAlts.slice(0, 3).map((a, i) => (
                    <li key={i}><strong>{a.component}</strong></li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        The result object the agent reads back:
      </p>
      <CodeBlock language="json" wrap>
        {pretty({
          ok: result.ok,
          component: result.component,
          validation: result.validation,
          diagnostics: result.diagnostics.map((d) => ({ severity: d.severity, code: d.code })),
          repair: result.repair ? { status: result.repair.status } : undefined,
          reasons: result.reasons,
        })}
      </CodeBlock>

      <h2>The loop, in code</h2>
      <CodeBlock language="ts">
{`import { prepareChart } from "semiotic/ai"
// Server/SSR only — inject to also prove the scene paints + read evidence:
// import { renderChartWithEvidence } from "semiotic/server"

const result = prepareChart(
  { component: "BarChart", props: { data, categoryAccessor: "region", valueAccessor: "revenue" } },
  {
    data,                              // enables the fit check + ranked alternatives
    // render: renderChartWithEvidence, // optional: prove non-empty, read mark count/ARIA
  }
)

if (result.ok) {
  stream(result.jsx)                   // guaranteed-renderable JSX / result.config
} else {
  retry(result.reasons, result.repair) // precise reasons + ranked alternatives — never paint
}`}
      </CodeBlock>

      <h2>As an agent tool — no vendor SDK required</h2>
      <p>
        <code>chartGenerationTool()</code> returns a framework-agnostic JSON-Schema
        tool definition that mirrors the MCP <code>renderChart</code> contract.
        The component enum is drawn from the registry, so a model can only propose a
        real chart:
      </p>
      <CodeBlock language="json" wrap>{pretty(toolSchema)}</CodeBlock>
      <p>
        Shape it for any framework — the library ships no SDK dependency, only the
        schema and pure transforms:
      </p>
      <CodeBlock language="ts">
{`import {
  chartGenerationTool, toAnthropicTool, toOpenAITool, createChartToolHandler,
} from "semiotic/ai"

const def = chartGenerationTool()
const handler = createChartToolHandler((input) => ({ data, render }))

// Anthropic Messages API
const anthropicTools = [toAnthropicTool(def)]            // { name, description, input_schema }

// OpenAI / function calling
const openaiTools = [toOpenAITool(def)]                   // { type: "function", function: {...} }

// Vercel AI SDK — the same JSON Schema, via its jsonSchema() helper:
//   tool({ description: def.description, parameters: jsonSchema(def.inputSchema),
//          execute: (input) => handler(input) })

// LangChain — a DynamicStructuredTool over the same schema + handler.`}
      </CodeBlock>

      <h2>Where this goes</h2>
      <p>
        The trust loop is the same wherever a model produces a view: a conversational
        analytics agent that streams a cross-filtered dashboard, a notebook copilot
        that turns a dataframe into a chart, an IDE assistant scaffolding a component.
        In each case the durable value isn't the generation — it's the deterministic
        gate between the model's confidence and the user's screen. There's also a
        published <strong>Agent Skill</strong> packaging this workflow plus the
        behavior contracts, so any Claude-family agent gets it without bespoke
        prompting.
      </p>

      <h2>Related</h2>
      <ul>
        <li>
          <Link to="/intelligence/cli-mcp">CLI &amp; MCP</Link> — the{" "}
          <code>semiotic-mcp</code> server and the <code>--doctor</code> gate that
          enforce the same contracts outside the loop.
        </li>
        <li>
          <Link to="/intelligence/suggestions">Chart Suggestions</Link> and{" "}
          <Link to="/intelligence/variant-discovery">Variant Discovery</Link> — the
          fit/ranking engine the repair step rides.
        </li>
        <li>
          <Link to="/intelligence/serialization">Serialization</Link> — the{" "}
          <code>ChartConfig</code> contract the loop compiles to.
        </li>
        <li>
          <Link to="/interoperability/portability-spec">Portability Spec</Link> — carrying
          the capability/provenance metadata beyond Semiotic.
        </li>
      </ul>
    </PageLayout>
  )
}
