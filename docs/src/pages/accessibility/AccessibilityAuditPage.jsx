import React from "react"
import { auditAccessibility } from "semiotic/utils"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Live audit demo — runs the real auditAccessibility() in the browser
// ---------------------------------------------------------------------------

const STATUS_META = {
  pass: { icon: "✓", color: "#1a7f37", bg: "rgba(26,127,55,0.10)" },
  fail: { icon: "✗", color: "#cf222e", bg: "rgba(207,34,46,0.10)" },
  warn: { icon: "⚠", color: "#9a6700", bg: "rgba(154,103,0,0.10)" },
  manual: { icon: "○", color: "#0969da", bg: "rgba(9,105,218,0.10)" },
  "not-applicable": { icon: "·", color: "var(--text-2)", bg: "transparent" },
}

const SAMPLE_CONFIGS = {
  "Bare chart (no labels)": {
    component: "LineChart",
    props: {
      data: [
        { month: 1, sales: 4200 },
        { month: 2, sales: 5100 },
        { month: 3, sales: 6800 },
      ],
      xAccessor: "month",
      yAccessor: "sales",
      colorScheme: ["#eeeeee"],
    },
  },
  "Described + in ChartContainer": {
    component: "LineChart",
    props: {
      data: [
        { month: 1, sales: 4200 },
        { month: 2, sales: 5100 },
        { month: 3, sales: 6800 },
      ],
      xAccessor: "month",
      yAccessor: "sales",
      xLabel: "Month",
      yLabel: "Sales",
      title: "Sales by month",
      description: "A line chart of monthly sales.",
      summary: "Sales rose across the quarter. Use the arrow keys to move between points.",
      colorScheme: ["#08306b"],
    },
    options: { inChartContainer: true },
  },
  "Pie with too many slices": {
    component: "PieChart",
    props: {
      data: Array.from({ length: 9 }, (_, i) => ({ category: `Segment ${i + 1}`, value: i + 2 })),
      categoryAccessor: "category",
      valueAccessor: "value",
      title: "Market share",
    },
  },
}

function AuditDemo() {
  const [which, setWhich] = React.useState("Bare chart (no labels)")
  const config = SAMPLE_CONFIGS[which]
  const result = auditAccessibility(config.component, config.props, config.options || {})
  const s = result.summary

  const principles = [
    "perceivable", "operable", "understandable", "robust", "compromising", "assistive", "flexible",
  ]

  return (
    <div style={{ border: "1px solid var(--surface-3)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 12, background: "var(--surface-1)", borderBottom: "1px solid var(--surface-3)" }}>
        {Object.keys(SAMPLE_CONFIGS).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setWhich(k)}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              border: "1px solid var(--surface-3)",
              cursor: "pointer",
              fontSize: 13,
              background: which === k ? "var(--accent, #0969da)" : "var(--surface-2)",
              color: which === k ? "#fff" : "var(--text-1)",
            }}
          >
            {k}
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 16px", background: result.ok ? "rgba(26,127,55,0.08)" : "rgba(207,34,46,0.08)", borderBottom: "1px solid var(--surface-3)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
        <strong>{result.ok ? "✓" : "✗"} {result.component}</strong> —{" "}
        {s.criticalsPassed}/{s.criticalsEvaluated} critical heuristics pass · {s.warnings} warning(s) · {s.manual} to verify manually
      </div>

      <div style={{ padding: 16, fontSize: 13, lineHeight: 1.5 }}>
        {principles.map((p) => {
          const group = result.findings.filter((f) => f.principle === p && f.status !== "not-applicable")
          if (group.length === 0) return null
          return (
            <div key={p} style={{ marginBottom: 14 }}>
              <div style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: "0.06em", color: "var(--text-2)", marginBottom: 6, fontWeight: 700 }}>{p}</div>
              {group.map((f) => {
                const meta = STATUS_META[f.status]
                return (
                  <div key={f.id} style={{ display: "flex", gap: 8, padding: "5px 8px", marginBottom: 3, borderRadius: 4, background: meta.bg }}>
                    <span style={{ color: meta.color, fontWeight: 700 }}>{meta.icon}</span>
                    <span>
                      <code style={{ color: meta.color }}>{f.id}</code>
                      {f.critical && <span style={{ color: "#cf222e", fontSize: 11, fontWeight: 700 }}> [critical]</span>}
                      {" — "}{f.message}
                      {f.fix && (f.status === "fail" || f.status === "warn" || f.status === "manual") && (
                        <span style={{ display: "block", color: "var(--text-2)", marginTop: 2 }}>→ {f.fix}</span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AccessibilityAuditPage() {
  return (
    <PageLayout
      title="Chartability Audit"
      breadcrumbs={[
        { label: "Accessibility", path: "/accessibility/overview" },
        { label: "Chartability Audit", path: "/accessibility/audit" },
      ]}
      prevPage={{ title: "Overview", path: "/accessibility/overview" }}
      nextPage={{ title: "Chart Descriptions", path: "/accessibility/descriptions" }}
    >
      <p>
        <code>auditAccessibility()</code> grades a Semiotic chart configuration
        against{" "}
        <a href="https://chartability.github.io/POUR-CAF/" target="_blank" rel="noopener noreferrer">
          Chartability
        </a>
        , Frank Elavsky's accessibility framework for data visualization. It
        organizes 50 heuristics under seven principles —{" "}
        <strong>P</strong>erceivable, <strong>O</strong>perable,{" "}
        <strong>U</strong>nderstandable, <strong>R</strong>obust (the WCAG
        principles) plus <strong>C</strong>ompromising, <strong>A</strong>ssistive,
        and <strong>F</strong>lexible — of which 14 are marked critical.
      </p>

      <p>
        The audit is <strong>static</strong>: it analyzes the same{" "}
        <code>(component, props)</code> a renderer would, with no DOM and no live
        assistive technology. That has two honest consequences, and the audit is
        built around them rather than hiding them:
      </p>

      <ul>
        <li>
          Many criticals <strong>pass by construction</strong>, because every
          Semiotic HOC ships keyboard navigation, a shape-adaptive focus ring, a
          skip link, a screen-reader data table (<code>accessibleTable</code>,
          on by default), reduced-motion + forced-colors handling, and shareable
          state. The audit credits these so you see what you already get for free.
        </li>
        <li>
          Some heuristics <strong>can't be settled from config</strong> — does the
          rendered chart actually pass NVDA + Firefox? is the resolved theme
          contrast ≥ 3:1? Those are reported as <code>manual</code> with the test
          to run, not a false <code>pass</code>.
        </li>
      </ul>

      <blockquote>
        Chartability is explicitly not a pass/fail certification — "you cannot
        pass Chartability 100%." Treat this audit as triage: it surfaces the
        author-actionable gaps and routes everything else to the right manual
        test. Always pair it with real screen-reader testing.
      </blockquote>

      <h2 id="live">Try it</h2>

      <p>
        This runs the real <code>auditAccessibility()</code> in your browser.
        Switch configurations to see how the findings change.
      </p>

      <AuditDemo />

      <h2 id="statuses">Statuses</h2>

      <p>Each finding carries one of five statuses:</p>

      <ul>
        <li><strong>✓ pass</strong> — satisfied, by your config or by Semiotic's built-ins.</li>
        <li><strong>✗ fail</strong> — a problem provable from the config. A critical fail makes the audit <code>ok: false</code>.</li>
        <li><strong>⚠ warn</strong> — a likely problem or a default worth revisiting (it does not block).</li>
        <li><strong>○ manual</strong> — can't be settled statically; run the named Chartability test by hand.</li>
        <li><strong>· not-applicable</strong> — the heuristic doesn't apply to this chart (e.g. a data table for a <Link to="/charts/big-number">BigNumber</Link>).</li>
      </ul>

      <h2 id="api">Programmatic API</h2>

      <CodeBlock
        code={`import { auditAccessibility, formatAccessibilityAudit } from "semiotic/utils"

const result = auditAccessibility("LineChart", {
  data: salesData,
  xAccessor: "month",
  yAccessor: "sales",
  title: "Sales by month",
}, { inChartContainer: true })

result.ok          // false if any critical heuristic FAILS (warn/manual don't block)
result.summary     // { criticalsPassed, criticalsEvaluated, fails, warnings, manual, passes }
result.findings    // A11yFinding[] — { id, principle, heuristic, critical, status, message, fix }

// Human-readable report (same text the CLI + MCP print):
console.log(formatAccessibilityAudit(result))`}
        language="jsx"
      />

      <p>
        Pass <code>inChartContainer: true</code> when the chart is (or will be)
        wrapped in a <Link to="/features/chart-container">ChartContainer</Link>{" "}
        that exposes data-download / copy-config affordances — it lets the audit
        credit the "downloadable table" and "shareable state" heuristics.
      </p>

      <h2 id="cli">CLI</h2>

      <p>
        The <code>semiotic-ai</code> CLI runs the audit from JSON on stdin or
        argv. It exits non-zero when a critical heuristic fails, so it slots into
        CI as an accessibility gate.
      </p>

      <CodeBlock
        code={`# Audit a configuration
npx semiotic-ai --audit-a11y '{"component":"LineChart","props":{"data":[{"month":1,"sales":10}],"title":"Sales"}}'

# Or pipe it in (e.g. from a config generator)
echo '{"component":"BarChart","props":{...},"inChartContainer":true}' | npx semiotic-ai --audit-a11y

# Exit code: 0 when no critical heuristic fails, 1 otherwise`}
        language="bash"
      />

      <h2 id="mcp">MCP tool</h2>

      <p>
        The same audit is exposed to AI agents as the <code>auditAccessibility</code>{" "}
        MCP tool, so a model generating a chart can check its own work before
        handing back code.
      </p>

      <CodeBlock
        code={`// MCP tool: auditAccessibility
{
  "component": "LineChart",
  "props": { "data": [...], "xAccessor": "x", "yAccessor": "y", "title": "..." },
  "inChartContainer": true
}
// → the same per-principle report, with the 14 critical heuristics marked`}
        language="json"
      />

      <h2 id="downloadable-data">A note on downloadable data</h2>

      <p>
        Chartability's <em>"Table/data is static"</em> heuristic asks that the
        accessible table be downloadable, sortable, or filterable. Semiotic
        surfaces data download as an <strong>opt-in ChartContainer action</strong>,
        never as built-in per-chart functionality. That's deliberate: many
        deployments must be able to <em>withhold</em> raw-data export (governance,
        licensing, privacy), and forcing it on every chart would make the toolkit
        a non-starter for them. So the audit's remediation points you to the
        ChartContainer action rather than reporting a hard failure.
      </p>

      <h2 id="heuristics">What it checks</h2>

      <p>
        The audit evaluates all 14 critical heuristics plus a curated set of
        non-critical ones. Highlights by principle:
      </p>

      <ul>
        <li><strong>Perceivable</strong> — contrast (reuses the WCAG math from <code>diagnoseConfig</code>), default tick-text size, seizure risk, color-only encoding, and CVD-safety (a pass when you opt into the Wong palette).</li>
        <li><strong>Operable</strong> — keyboard parity, a separate check that complex actions (brush, zoom, legend filtering) have a standard-UI alternative, pointer target size (24px), the single-tab-stop navigation model, interaction cues, AT-shortcut safety, and the focus indicator.</li>
        <li><strong>Understandable</strong> — title/description/summary, an explanation of purpose, a Flesch–Kincaid reading-grade estimate, axis labels, dual-axis complexity, statistical-uncertainty communication, and whether changes are easy to follow.</li>
        <li><strong>Robust</strong> — manual WCAG / semantic-validity checks, plus credit for rendering that isn't tied to one technology (canvas + SVG overlay, SSR-to-SVG).</li>
        <li><strong>Compromising</strong> — the data table, its exportability, shareable state, and navigable structure (flagged for hierarchy charts).</li>
        <li><strong>Assistive</strong> — data density (by data points <em>or</em> node count), human-readable number formatting, whether trends/outliers are described in text, and skippable navigation.</li>
        <li><strong>Flexible</strong> — user-style respect (CSS variables + forced-colors), animation controls for looping/streaming motion, zoom/reflow support, and adjustable textures.</li>
      </ul>

      <p>
        The "are visually apparent features described?" check is the one most
        worth your attention. Enabling{" "}
        <Link to="/accessibility/descriptions">ChartContainer's <code>describe</code> option</Link>{" "}
        (auto-generated L1–L3 descriptions via <code>describeChart()</code>) turns
        that finding from a warning into a pass — pass{" "}
        <code>{`{ describe: true }`}</code> to the audit to reflect it.
      </p>
    </PageLayout>
  )
}
