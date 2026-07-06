import React from "react"
import { Link } from "react-router-dom"
import { LineChart } from "semiotic/xy"
import { unstable_buildDataPitfallsBridge } from "semiotic/experimental"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"

const REVENUE_DATA = [
  { month: 1, label: "Jan", revenue: 8200 },
  { month: 2, label: "Feb", revenue: 7800 },
  { month: 3, label: "Mar", revenue: 8100 },
  { month: 4, label: "Apr", revenue: 7900 },
  { month: 5, label: "May", revenue: 8300 },
  { month: 6, label: "Jun", revenue: 8050 },
  { month: 7, label: "Jul", revenue: 8400 },
  { month: 8, label: "Aug", revenue: 8600 },
  { month: 9, label: "Sep", revenue: 9000 },
  { month: 10, label: "Oct", revenue: 9300 },
  { month: 11, label: "Nov", revenue: 9700 },
  { month: 12, label: "Dec", revenue: 10100 },
]

const CHART_PROPS = {
  data: REVENUE_DATA,
  xAccessor: "month",
  yAccessor: "revenue",
  xExtent: [9, 12],
  width: 760,
  height: 320,
  responsiveWidth: true,
  title: "Monthly revenue",
  summary: "Monthly revenue rises in the visible September to December window.",
  xLabel: "Month number",
  yLabel: "Revenue",
  showPoints: true,
  pointRadius: 4,
  colorScheme: ["#5b8ff9"],
}

const CONTEXT = "Question: did monthly revenue improve enough to justify adding sales capacity?"
const NARRATIVE = "Monthly revenue is accelerating sharply, so we should increase sales capacity next quarter."
const RENDER_EVIDENCE = {
  status: "ok",
  empty: false,
  markCount: 5,
  markCountByType: { line: 1, point: 4 },
  xDomain: [9, 12],
  yDomain: [9000, 10100],
  ariaLabel: "Monthly revenue",
}

const RENDERED_SVG = `<svg role="img" aria-label="Monthly revenue" width="760" height="320">
  <title>Monthly revenue</title>
  <path d="M40,260 L260,210 L500,140 L720,80" />
</svg>`

const DISCLOSE_WINDOW_FIX = "Show the full year, or label this view as Sep-Dec only and add the capacity threshold the decision depends on."

const styles = {
  demoShell: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--surface-3)",
    borderRadius: 8,
    overflow: "hidden",
    margin: "20px 0",
  },
  chartBand: {
    padding: 16,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--surface-3)",
    background: "var(--surface-2)",
  },
  toolbar: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  checkbox: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
  },
  lowerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
    padding: 16,
    alignItems: "start",
  },
  controlsColumn: {
    minWidth: 0,
  },
  resultColumn: {
    minWidth: 0,
  },
  chartPanel: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--surface-3)",
    borderRadius: 8,
    padding: 12,
    background: "var(--surface-1)",
    overflow: "hidden",
    width: "100%",
    boxSizing: "border-box",
  },
  stageList: {
    display: "grid",
    gap: 8,
    marginTop: 12,
  },
  stageButton: {
    display: "block",
    width: "100%",
    textAlign: "left",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--surface-3)",
    borderRadius: 6,
    padding: "8px 10px",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    cursor: "pointer",
  },
  stageButtonActive: {
    borderColor: "var(--accent, #0969da)",
    boxShadow: "0 0 0 1px var(--accent, #0969da) inset",
  },
  stageRole: {
    display: "block",
    fontWeight: 700,
    fontSize: 13,
  },
  stageMeta: {
    display: "block",
    marginTop: 2,
    fontSize: 11,
    color: "var(--text-secondary)",
    fontFamily: "var(--font-code)",
  },
  metricRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
    marginTop: 12,
  },
  metric: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--surface-3)",
    borderRadius: 6,
    padding: 8,
    background: "var(--surface-2)",
  },
  metricLabel: {
    display: "block",
    fontSize: 11,
    color: "var(--text-secondary)",
  },
  metricValue: {
    display: "block",
    marginTop: 2,
    fontWeight: 700,
    fontFamily: "var(--font-code)",
  },
  responsePanel: {
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "var(--surface-3)",
    padding: 16,
    background: "var(--surface-1)",
  },
  responseHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  responseTitle: {
    margin: 0,
    fontSize: 18,
  },
  responseNote: {
    margin: "4px 0 0",
    color: "var(--text-secondary)",
    fontSize: 13,
    maxWidth: 680,
  },
  responseBadge: {
    borderRadius: 999,
    padding: "4px 10px",
    background: "var(--surface-2)",
    color: "var(--text-secondary)",
    fontSize: 12,
    fontFamily: "var(--font-code)",
    whiteSpace: "nowrap",
  },
  responseSummary: {
    margin: "0 0 12px",
    lineHeight: 1.55,
  },
  evidenceRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  evidenceChip: {
    borderRadius: 999,
    padding: "3px 8px",
    background: "var(--surface-2)",
    color: "var(--text-secondary)",
    fontSize: 11,
    fontFamily: "var(--font-code)",
  },
  findingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 12,
  },
  findingCard: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--surface-3)",
    borderRadius: 8,
    padding: 12,
    background: "var(--surface-2)",
  },
  findingHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  findingTitle: {
    margin: 0,
    fontSize: 14,
  },
  severityPill: {
    borderRadius: 999,
    padding: "2px 7px",
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  severityHigh: {
    background: "rgba(220, 38, 38, 0.16)",
    color: "var(--semiotic-danger, #ef4444)",
  },
  severityMedium: {
    background: "rgba(217, 119, 6, 0.16)",
    color: "var(--semiotic-warning, #d97706)",
  },
  severityInfo: {
    background: "rgba(37, 99, 235, 0.16)",
    color: "var(--semiotic-info, #3a8eff)",
  },
  findingBody: {
    margin: "0 0 8px",
    fontSize: 13,
    lineHeight: 1.5,
  },
  evidenceList: {
    margin: "0 0 8px",
    paddingLeft: 18,
    color: "var(--text-secondary)",
    fontSize: 12,
    lineHeight: 1.45,
  },
  nextStep: {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.45,
  },
  recommendationBox: {
    marginTop: 12,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--surface-3)",
    borderRadius: 8,
    padding: 12,
    background: "var(--surface-2)",
  },
  recommendationLabel: {
    display: "block",
    marginBottom: 4,
    color: "var(--text-secondary)",
    fontSize: 11,
    fontFamily: "var(--font-code)",
    textTransform: "uppercase",
  },
}

function artifactPreview(artifact) {
  if (artifact.kind === "image") {
    return JSON.stringify({
      kind: artifact.kind,
      images: artifact.images.map((image) => ({
        mediaType: image.mediaType,
        filename: image.filename,
        content: `${image.content.length} base64 chars`,
      })),
    }, null, 2)
  }
  if (artifact.kind === "slides") return JSON.stringify(artifact, null, 2)
  return artifact.content
}

function buildSimulatedDataPitfallsResponse({
  bridge,
  includeContext,
  includeData,
  includeNarrative,
  includeRendered,
}) {
  const diagnostics = bridge.diagnosis?.diagnoses ?? []
  const warningCount = diagnostics.filter((d) => d.severity === "warning").length
  const evidenceChips = [
    "Semiotic config",
    "JSX reconstruction",
    "reader grounding",
    `${warningCount} config warnings`,
    bridge.accessibility?.ok ? "a11y audit: ok" : "a11y audit: review",
    includeRendered ? "render evidence" : "no render evidence",
    includeContext ? "business question" : "no business question",
    includeNarrative ? "author claim" : "no author claim",
    includeData ? "source data included" : "source data withheld",
  ]

  return {
    verdict: includeNarrative && includeContext
      ? "Review before using this chart to justify sales capacity."
      : "Add the missing claim/context before treating this as decision support.",
    confidence: includeRendered ? "high" : "medium",
    summary: includeContext
      ? "A Data Pitfalls review can connect the chart to the capacity question, then separate what the chart supports from what the decision still needs. Here it can say revenue rose in the visible window, but the view alone does not prove the increase is enough to add headcount."
      : "Without the analytical question, the detector can still flag visual risks, but it cannot judge whether the chart answers the business decision.",
    evidenceChips,
    findings: [
      {
        severity: "high",
        title: includeNarrative
          ? "The claim is stronger than the visible evidence"
          : "No claim is available to validate",
        body: includeNarrative
          ? "The narrative says revenue is accelerating sharply, but the rendered chart only shows Sep-Dec and hides the first eight months from the visible x-domain."
          : "The chart has an upward line, but no caption or claim was supplied for Data Pitfalls to compare against the evidence.",
        evidence: [
          "Config evidence: xExtent is [9, 12].",
          includeRendered
            ? "Render evidence: one line and four points are visible over xDomain [9, 12]."
            : "Render evidence is missing, so the review would lean more heavily on config and grounding.",
          includeData
            ? "Full source data is available for a full-year trend comparison."
            : "Source data is withheld, which is privacy-friendly but limits independent trend checks.",
        ],
        nextStep: DISCLOSE_WINDOW_FIX,
      },
      {
        severity: includeContext ? "medium" : "high",
        title: includeContext ? "The decision threshold is missing" : "The business question is missing",
        body: includeContext
          ? "The question asks whether revenue improved enough, but neither the chart nor context defines enough: quota coverage, CAC payback, sales cycle, hiring cost, or target revenue lift."
          : "The chart can be reviewed for design risks, but Data Pitfalls cannot assess whether it supports a capacity decision without the user's decision question.",
        evidence: [
          includeContext ? CONTEXT : "No Analysis context stage is present.",
          "The axes show revenue over month number, but no target band or required lift annotation is present.",
        ],
        nextStep: "Add a target line or annotation for the capacity threshold, then ask whether the observed lift clears it.",
      },
      {
        severity: "info",
        title: "The useful output is coaching, not just a warning",
        body: "The report can give a safer framing the author can reuse with stakeholders instead of only saying the chart is risky.",
        evidence: [
          "Reader grounding supplies what the chart says without relying only on pixels.",
          "Diagnostics and accessibility audit explain which issues are deterministic Semiotic checks.",
        ],
        nextStep: "Use the revised wording below as the start of a decision memo or PR review comment.",
      },
    ],
    recommendation: includeNarrative
      ? "Revenue rose from 9000 to 10100 in the visible Sep-Dec window. Before adding sales capacity, show the full-year trend and compare the lift against the required hiring threshold."
      : "This chart shows revenue rising in Sep-Dec. Add the intended decision claim, then review whether the visible evidence and full-year context support it.",
  }
}

function severityStyle(severity) {
  if (severity === "high") return { ...styles.severityPill, ...styles.severityHigh }
  if (severity === "medium") return { ...styles.severityPill, ...styles.severityMedium }
  return { ...styles.severityPill, ...styles.severityInfo }
}

function SimulatedDataPitfallsResponse({ response }) {
  return (
    <section style={styles.responsePanel} aria-labelledby="simulated-data-pitfalls-response">
      <div style={styles.responseHeader}>
        <div>
          <h3 id="simulated-data-pitfalls-response" style={styles.responseTitle}>
            Simulated Data Pitfalls response
          </h3>
          <p style={styles.responseNote}>
            This demo does not call a model. It shows the kind of evidence-backed support the
            bridge lets Data Pitfalls provide once the chain is sent to <code>detectPitfalls()</code>.
          </p>
        </div>
        <span style={styles.responseBadge}>confidence: {response.confidence}</span>
      </div>

      <p style={styles.responseSummary}>
        <strong>Verdict:</strong> {response.verdict} {response.summary}
      </p>

      <div style={styles.evidenceRow} aria-label="Evidence available to Data Pitfalls">
        {response.evidenceChips.map((chip) => (
          <span key={chip} style={styles.evidenceChip}>{chip}</span>
        ))}
      </div>

      <div style={styles.findingGrid}>
        {response.findings.map((finding) => (
          <article key={finding.title} style={styles.findingCard}>
            <div style={styles.findingHeader}>
              <h4 style={styles.findingTitle}>{finding.title}</h4>
              <span style={severityStyle(finding.severity)}>{finding.severity}</span>
            </div>
            <p style={styles.findingBody}>{finding.body}</p>
            <ul style={styles.evidenceList}>
              {finding.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p style={styles.nextStep}>
              <strong>Next step:</strong> {finding.nextStep}
            </p>
          </article>
        ))}
      </div>

      <div style={styles.recommendationBox}>
        <span style={styles.recommendationLabel}>Safer stakeholder wording</span>
        {response.recommendation}
      </div>
    </section>
  )
}

function BridgeDemo() {
  const [includeData, setIncludeData] = React.useState(false)
  const [includeRendered, setIncludeRendered] = React.useState(true)
  const [includeContext, setIncludeContext] = React.useState(true)
  const [includeNarrative, setIncludeNarrative] = React.useState(true)
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  const bridge = React.useMemo(
    () =>
      unstable_buildDataPitfallsBridge("LineChart", CHART_PROPS, {
        context: includeContext ? CONTEXT : undefined,
        narrative: includeNarrative ? NARRATIVE : undefined,
        rendered: includeRendered
          ? { svg: RENDERED_SVG, evidence: RENDER_EVIDENCE }
          : undefined,
        config: { includeData },
        grounding: { includeStructure: false },
        accessibility: { inChartContainer: true, describe: true, navigable: true },
      }),
    [includeContext, includeData, includeNarrative, includeRendered]
  )

  React.useEffect(() => {
    if (selectedIndex >= bridge.input.stages.length) {
      setSelectedIndex(Math.max(0, bridge.input.stages.length - 1))
    }
  }, [bridge.input.stages.length, selectedIndex])

  const safeSelectedIndex = Math.min(selectedIndex, bridge.input.stages.length - 1)
  const selectedStage = bridge.input.stages[safeSelectedIndex]
  const errors = bridge.diagnosis?.diagnoses.filter((d) => d.severity === "error").length ?? 0
  const warnings = bridge.diagnosis?.diagnoses.filter((d) => d.severity === "warning").length ?? 0
  const simulatedResponse = buildSimulatedDataPitfallsResponse({
    bridge,
    includeContext,
    includeData,
    includeNarrative,
    includeRendered,
  })

  return (
    <div style={styles.demoShell}>
      <div style={styles.chartBand}>
        <div style={styles.chartPanel}>
          <LineChart {...CHART_PROPS} />
        </div>
      </div>

      <div style={styles.lowerGrid}>
        <div style={styles.controlsColumn}>
          <div style={styles.toolbar}>
            <label style={styles.checkbox}>
              <input type="checkbox" checked={includeData} onChange={(e) => setIncludeData(e.target.checked)} />
              Include data in config
            </label>
            <label style={styles.checkbox}>
              <input type="checkbox" checked={includeRendered} onChange={(e) => setIncludeRendered(e.target.checked)} />
              Add render evidence
            </label>
            <label style={styles.checkbox}>
              <input type="checkbox" checked={includeContext} onChange={(e) => setIncludeContext(e.target.checked)} />
              Add context
            </label>
            <label style={styles.checkbox}>
              <input type="checkbox" checked={includeNarrative} onChange={(e) => setIncludeNarrative(e.target.checked)} />
              Add narrative
            </label>
          </div>

          <div style={styles.metricRow}>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Stages</span>
              <span style={styles.metricValue}>{bridge.input.stages.length}</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Diagnostics</span>
              <span style={styles.metricValue}>{errors}E / {warnings}W</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>A11y audit</span>
              <span style={styles.metricValue}>{bridge.accessibility?.ok ? "ok" : "review"}</span>
            </div>
          </div>

          <div style={styles.stageList} aria-label="Data Pitfalls chain stages">
            {bridge.input.stages.map((stage, index) => (
              <button
                key={`${stage.role}-${index}`}
                type="button"
                onClick={() => setSelectedIndex(index)}
                style={{
                  ...styles.stageButton,
                  ...(safeSelectedIndex === index ? styles.stageButtonActive : {}),
                }}
              >
                <span style={styles.stageRole}>{stage.role}</span>
                <span style={styles.stageMeta}>
                  {stage.artifact.kind}
                  {"filename" in stage.artifact && stage.artifact.filename ? ` · ${stage.artifact.filename}` : ""}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.resultColumn}>
          <p style={{ marginTop: 0 }}>
            Selected stage: <strong>{selectedStage.role}</strong>
          </p>
          <CodeBlock
            wrap
            language={selectedStage.artifact.kind === "code" ? selectedStage.artifact.language || "txt" : "json"}
            code={artifactPreview(selectedStage.artifact)}
          />
        </div>
      </div>

      <SimulatedDataPitfallsResponse response={simulatedResponse} />
    </div>
  )
}

export default function DataPitfallsBridgePage() {
  return (
    <PageLayout
      title="Experimental Data Pitfalls Bridge"
      breadcrumbs={[
        { label: "Intelligence", path: "/intelligence" },
        { label: "Experimental Data Pitfalls Bridge", path: "/intelligence/data-pitfalls" },
      ]}
      prevPage={{ title: "Agent-Reader Grounding", path: "/intelligence/reader-grounding" }}
      nextPage={{ title: "Conversation Arc", path: "/intelligence/conversation-arc" }}
    >
      <p>
        <code>unstable_toDataPitfallsChain()</code> packages a Semiotic chart into the experimental
        chain input expected by{" "}
        <a href="https://github.com/bjonesdataliteracy/datapitfalls" target="_blank" rel="noreferrer">
          datapitfalls
        </a>
        . Semiotic contributes the chart config, JSX, reader grounding, config diagnostics,
        accessibility audit, and optional render evidence. Data Pitfalls remains the model-backed
        detector that reviews that chain against its pitfall taxonomy.
      </p>

      <h2 id="live-demo">Live payload builder</h2>
      <p>
        This demo does not call the Claude API. It shows the exact chain payload you would pass to
        <code>detectPitfalls()</code>, plus an illustrative response showing how Data Pitfalls can
        turn Semiotic evidence into decision support. The chart intentionally shows only the
        late-year window, so the Semiotic diagnostics stage has something substantive to hand off
        without making the visual example fragile.
      </p>
      <BridgeDemo />

      <h2 id="server-workflow">Server workflow</h2>
      <p>
        In production, build the bridge in a server job or CI step. Use{" "}
        <code>renderChartWithEvidence()</code> when the chart is SSR-renderable, then pass the
        resulting chain into Data Pitfalls.
      </p>

      <CodeBlock language="ts">{`import { unstable_toDataPitfallsChain } from "semiotic/experimental"
import { renderChartWithEvidence } from "semiotic/server"
import { detectPitfalls, formatReport, hasBlockingFindings } from "datapitfalls"

const { svg, evidence } = renderChartWithEvidence("LineChart", props)

const input = unstable_toDataPitfallsChain("LineChart", props, {
  context: "Question: did monthly revenue improve enough to justify adding capacity?",
  narrative: "Monthly revenue is accelerating sharply.",
  rendered: { svg, evidence },
  config: { includeData: false }, // omits raw rows from config/JSX stages
})

const report = await detectPitfalls(input, {
  apiKey: process.env.ANTHROPIC_API_KEY,
})

console.log(formatReport(report))
if (hasBlockingFindings(report)) process.exit(1)`}
      </CodeBlock>

      <h2 id="what-semiotic-adds">What Semiotic adds</h2>
      <ul>
        <li>
          <strong>Config and JSX</strong> give Data Pitfalls source-level evidence for accessors,
          scales, extents, color choices, annotations, and omitted data.
        </li>
        <li>
          <strong>Reader grounding</strong> gives the detector a non-visual account of what the
          chart says, including the L1-L4 description used by the agent-reader path.
        </li>
        <li>
          <strong>Diagnostics</strong> surface Semiotic's deterministic checks, including misleading
          design smells such as non-zero baselines, inverted axes, over-sliced pies, and low contrast.
        </li>
        <li>
          <strong>Accessibility audit</strong> packages Chartability findings so Data Pitfalls can
          reason over accessibility and design dangers without relying only on pixels.
        </li>
        <li>
          <strong>Render evidence</strong> adds scene-graph facts such as mark counts, domains,
          emptiness, annotations, and accessible names when a server render is available.
        </li>
      </ul>

      <h2 id="options">Bridge options</h2>
      <CodeBlock language="ts">{`unstable_toDataPitfallsChain(component, props, {
  includeConfig: true,
  includeJSX: true,
  includeGrounding: true,
  includeDiagnostics: true,
  includeAccessibility: true,
  context: "Analytical question, upstream assumptions, or intended audience.",
  narrative: "Caption or claim that should be checked against the chart.",
  rendered: {
    svg,       // optional rendered SVG
    evidence,  // optional renderChartWithEvidence() payload
    image,     // optional base64 PNG/JPEG/GIF/WebP for Vision review
  },
  config: { includeData: false }, // other stages may still summarize data-derived facts
  grounding: { includeStructure: false },
  accessibility: { inChartContainer: true, describe: true, navigable: true },
  additionalStages: [
    {
      role: "Upstream SQL",
      artifact: { kind: "code", language: "sql", content: "..." },
    },
  ],
})`}
      </CodeBlock>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/intelligence/reader-grounding">Agent-Reader Grounding</Link> - the semantic chart payload inside the bridge.</li>
        <li><Link to="/accessibility/audit">Chartability Audit</Link> - the accessibility report included as a chain stage.</li>
        <li><Link to="/intelligence/serialization">Serialization</Link> - the config and JSX stages use the same serializer.</li>
        <li><Link to="/intelligence/cli-mcp">CLI &amp; MCP</Link> - render evidence and diagnostics are also exposed to agents through tools.</li>
      </ul>
    </PageLayout>
  )
}
