import React, { useMemo, useState } from "react"
import { inspectChart } from "../../../../src/components/ai/chartClinic"
import { renderChartWithEvidence } from "../../../../src/components/server/renderToStaticSVG"
import PageLayout from "../../components/PageLayout"

const INITIAL_INPUT = JSON.stringify({
  component: "LineChart",
  props: {
    data: [
      { month: 1, revenue: 42 },
      { month: 2, revenue: 58 },
      { month: 3, revenue: 51 },
    ],
    xAccessor: "month",
    yAccessor: "revenue",
    title: "Monthly revenue",
  },
}, null, 2)

const panelStyle = {
  border: "1px solid var(--border-color, #d7dce3)",
  borderRadius: 8,
  padding: 16,
  background: "var(--surface-1, #fff)",
}

const labelStyle = {
  display: "block",
  marginBottom: 8,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--text-secondary, #53606d)",
}

function JsonBlock({ value }) {
  return (
    <pre style={{
      overflow: "auto",
      maxHeight: 360,
      margin: 0,
      padding: 12,
      borderRadius: 6,
      background: "var(--surface-2, #f5f7f9)",
      fontSize: 12,
      lineHeight: 1.45,
    }}>
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function ResultList({ values, empty = "None" }) {
  if (!values || values.length === 0) return <p style={{ margin: 0 }}>{empty}</p>
  return (
    <ul style={{ margin: 0, paddingLeft: 20 }}>
      {values.map((value, index) => <li key={`${value.code || value}-${index}`}>{value.message || value}</li>)}
    </ul>
  )
}

/**
 * An intentionally read-only beta. It uses the same static evidence path as
 * server rendering, but never writes config, invokes repair, or runs browser
 * chart code supplied by a visitor.
 */
export default function ChartClinicPage() {
  const [source, setSource] = useState(INITIAL_INPUT)
  const result = useMemo(() => {
    try {
      const input = JSON.parse(source)
      if (!input || typeof input !== "object" || typeof input.component !== "string") {
        return { error: "Provide a JSON object with a string component and optional props object." }
      }
      if (input.props !== undefined && (input.props === null || typeof input.props !== "object" || Array.isArray(input.props))) {
        return { error: "props must be a JSON object when provided." }
      }
      return {
        report: inspectChart(input, {
          render: (component, props) => renderChartWithEvidence(component, props),
        }),
      }
    } catch {
      return { error: "Enter valid JSON before inspecting the chart." }
    }
  }, [source])

  const report = result.report
  return (
    <PageLayout
      title="Chart Clinic (Beta)"
      breadcrumbs={[
        { label: "Server Rendering", path: "/using-ssr" },
        { label: "Chart Clinic", path: "/server/chart-clinic" },
      ]}
      prevPage={{ title: "Render Studio", path: "/server/studio" }}
      nextPage={{ title: "Theme Showcase", path: "/server/themes" }}
    >
      <p>
        Inspect a serializable chart configuration before shipping it. Chart Clinic is deliberately
        read-only: it validates and diagnoses the configuration, renders static evidence when safe,
        reports observed revisions, and suggests the relevant package lane. It does not author,
        repair, persist, or execute visitor-supplied code.
      </p>

      <section>
        <h2>Configuration</h2>
        <label htmlFor="chart-clinic-input" style={labelStyle}>Chart config JSON</label>
        <textarea
          id="chart-clinic-input"
          aria-describedby="chart-clinic-help"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          spellCheck={false}
          style={{
            width: "100%",
            minHeight: 260,
            boxSizing: "border-box",
            resize: "vertical",
            padding: 12,
            border: "1px solid var(--border-color, #b8c1cc)",
            borderRadius: 6,
            background: "var(--surface-1, #fff)",
            color: "var(--text-primary, #17212b)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 13,
            lineHeight: 1.45,
          }}
        />
        <p id="chart-clinic-help" style={{ color: "var(--text-secondary, #53606d)" }}>
          Use JSON only: function accessors and callbacks are outside the serializable inspection boundary.
        </p>
      </section>

      {result.error && (
        <p role="alert" style={{ ...panelStyle, color: "var(--danger, #b42318)" }}>{result.error}</p>
      )}

      {report && (
        <>
          <section>
            <h2>Verdict</h2>
            <div style={{ ...panelStyle, borderLeft: `4px solid ${report.ok ? "var(--success, #0b7a3a)" : "var(--warning, #b54708)"}` }}>
              <strong>{report.ok ? "Inspectable and rendered" : "Needs attention"}</strong>
              <p style={{ marginBottom: 0 }}>
                {report.ok
                  ? "The configuration passed structural checks and produced a non-empty static scene."
                  : "Review the reasons and diagnostics below before treating this configuration as ready."}
              </p>
            </div>
          </section>

          <section>
            <h2>Configuration and diagnostics</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div style={panelStyle}>
                <h3>Normalized config</h3>
                {report.normalizedConfig ? <JsonBlock value={report.normalizedConfig} /> : <p>No known chart config was produced.</p>}
              </div>
              <div style={panelStyle}>
                <h3>Diagnostics</h3>
                <ResultList values={report.diagnostics} empty="No chart diagnostics." />
                <h3 style={{ marginTop: 20 }}>Reasons</h3>
                <ResultList values={report.reasons} empty="No blocking reasons." />
              </div>
            </div>
          </section>

          <section>
            <h2>Scene evidence and revisions</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div style={panelStyle}>
                <h3>Scene summary</h3>
                {report.scene ? <JsonBlock value={report.scene} /> : <p>Static evidence was not produced because the configuration needs attention.</p>}
              </div>
              <div style={panelStyle}>
                <h3>Revision state</h3>
                <p>
                  {report.revisions.state === "not-observed"
                    ? "No retained stream-host revision snapshot was supplied; this static inspection cannot invent one."
                    : report.revisions.state === "fully-consumed"
                      ? "All supplied revisions have been consumed by the host."
                      : `Pending consumption: ${report.revisions.pending.join(", ")}.`}
                </p>
                {report.revisions.revisions && <JsonBlock value={report.revisions} />}
              </div>
            </div>
          </section>

          <section>
            <h2>Bundle guidance</h2>
            <div style={panelStyle}>
              <p>{report.bundle.note}</p>
              <dl style={{ margin: 0 }}>
                {report.bundle.category && <><dt>Family</dt><dd>{report.bundle.category}</dd></>}
                {report.bundle.recommendedImport && <><dt>Browser import</dt><dd><code>{report.bundle.recommendedImport}</code></dd></>}
                {report.bundle.serverImport && <><dt>Server evidence</dt><dd><code>{report.bundle.serverImport}</code></dd></>}
                {report.bundle.docsRoute && <><dt>Documentation</dt><dd><code>{report.bundle.docsRoute}</code></dd></>}
              </dl>
            </div>
          </section>
        </>
      )}
    </PageLayout>
  )
}
