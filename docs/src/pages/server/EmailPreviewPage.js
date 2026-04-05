import React, { useState, useMemo } from "react"
import { renderChart } from "../../../../src/components/server/renderToStaticSVG"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

const CHART_PRESETS = {
  "weekly-report": {
    label: "Weekly KPI Report",
    subject: "Weekly Performance Update - March 31",
    body: "Here's this week's performance summary. Revenue continues to trend upward, with the North region leading growth.",
    chart: () => renderChart("BarChart", {
      data: [
        { category: "North", value: 42 }, { category: "South", value: 28 },
        { category: "East", value: 35 }, { category: "West", value: 51 },
      ],
      categoryAccessor: "category", valueAccessor: "value",
      title: "Revenue by Region ($K)", showGrid: true,
      theme: "light", width: 480, height: 280,
      annotations: [{ type: "y-threshold", value: 35, label: "Target", color: "#e45050" }],
    }),
  },
  "trend-alert": {
    label: "Trend Alert",
    subject: "Metric Alert: Latency spike detected",
    body: "Average API latency exceeded the 200ms SLA threshold at 14:30 UTC. The trend chart below shows the incident window.",
    chart: () => renderChart("LineChart", {
      data: [
        { x: 1, y: 120 }, { x: 2, y: 135 }, { x: 3, y: 128 },
        { x: 4, y: 180 }, { x: 5, y: 320 }, { x: 6, y: 280 },
        { x: 7, y: 190 }, { x: 8, y: 150 },
      ],
      xAccessor: "x", yAccessor: "y",
      title: "API Latency (ms)", showGrid: true,
      theme: "light", width: 480, height: 260,
      annotations: [{ type: "y-threshold", value: 200, label: "SLA limit", color: "#e45050" }],
    }),
  },
  "share-update": {
    label: "Market Share Update",
    subject: "Monthly Market Share - Desktop gains 3pts",
    body: "Desktop share increased to 58% this month, continuing the upward trend. Mobile share was flat at 28%.",
    chart: () => renderChart("DonutChart", {
      data: [
        { category: "Desktop", value: 58 }, { category: "Mobile", value: 28 },
        { category: "Tablet", value: 10 }, { category: "Other", value: 4 },
      ],
      categoryAccessor: "category", valueAccessor: "value",
      title: "Channel Share", theme: "light", width: 340, height: 300,
    }),
  },
}

// Mock email client chrome
function EmailFrame({ subject, from, to, body, chartSvg, emailSafe }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: "8px",
      border: "1px solid #d0d0d0",
      overflow: "hidden",
      maxWidth: "640px",
      margin: "0 auto",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: "#1a1a1a",
    }}>
      {/* Toolbar */}
      <div style={{
        background: "#f5f5f5",
        borderBottom: "1px solid #d0d0d0",
        padding: "8px 12px",
        display: "flex",
        gap: "6px",
      }}>
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
        <span style={{ fontSize: "11px", color: "#888", marginLeft: "auto" }}>
          {emailSafe ? "Email-safe mode (inline attributes only)" : "Standard SVG mode"}
        </span>
      </div>

      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee" }}>
        <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>{subject}</div>
        <div style={{ fontSize: "12px", color: "#888" }}>
          From: <strong>{from || "analytics@company.com"}</strong>
        </div>
        <div style={{ fontSize: "12px", color: "#888" }}>
          To: <strong>{to || "team@company.com"}</strong>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "20px" }}>
        <p style={{ fontSize: "14px", lineHeight: 1.6, margin: "0 0 20px", color: "#333" }}>
          {body}
        </p>

        {/* Chart */}
        <div
          style={{
            border: "1px solid #e8e8e8",
            borderRadius: "4px",
            padding: "12px",
            background: "#fafafa",
            display: "flex",
            justifyContent: "center",
          }}
          dangerouslySetInnerHTML={{ __html: chartSvg }}
        />

        <p style={{
          fontSize: "11px", color: "#999", marginTop: "20px",
          borderTop: "1px solid #eee", paddingTop: "12px",
        }}>
          This chart was generated server-side using semiotic/server.
          No JavaScript required to display it.
        </p>
      </div>
    </div>
  )
}

function stripClassesAndStyles(svg) {
  return svg
    .replace(/\sclass="[^"]*"/g, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, "")
}

export default function EmailPreviewPage() {
  const [preset, setPreset] = useState("weekly-report")
  const [emailSafe, setEmailSafe] = useState(false)

  const config = CHART_PRESETS[preset]

  const chartSvg = useMemo(() => {
    try {
      const raw = config.chart()
      return emailSafe ? stripClassesAndStyles(raw) : raw
    } catch (e) {
      return `<svg width="400" height="200"><text x="20" y="40" fill="red">${e.message}</text></svg>`
    }
  }, [preset, emailSafe, config])

  const svgSize = (chartSvg.length / 1024).toFixed(1)

  return (
    <PageLayout
      title="Email Preview"
      breadcrumbs={[
        { label: "Server Rendering", path: "/server" },
        { label: "Email Preview", path: "/server/email" },
      ]}
      prevPage={{ title: "Dashboard Gallery", path: "/server/dashboards" }}
      nextPage={{ title: "API Reference", path: "/api" }}
    >
      <p>
        Charts rendered by <code>semiotic/server</code> use inline SVG attributes — no
        external CSS, no JavaScript. This means they work in email clients that strip
        <code>&lt;style&gt;</code> tags and <code>&lt;script&gt;</code> elements.
      </p>

      <p>
        The preview below simulates an email with an embedded chart. Toggle "email-safe mode"
        to strip <code>class</code> attributes — the chart looks identical because all
        styling is already inline.
      </p>

      <div style={{
        display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center",
      }}>
        {Object.entries(CHART_PRESETS).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setPreset(key)}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: key === preset ? "2px solid var(--accent, #007bff)" : "1px solid var(--border-color, #ccc)",
              background: key === preset ? "var(--accent, #007bff)" : "var(--surface-2, #f8f8f8)",
              color: key === preset ? "#fff" : "var(--text-primary, #333)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: key === preset ? 600 : 400,
            }}
          >
            {cfg.label}
          </button>
        ))}

        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", marginLeft: "auto" }}>
          <input type="checkbox" checked={emailSafe} onChange={e => setEmailSafe(e.target.checked)} />
          Email-safe mode
        </label>
      </div>

      <EmailFrame
        subject={config.subject}
        body={config.body}
        chartSvg={chartSvg}
        emailSafe={emailSafe}
      />

      <div style={{
        marginTop: "12px",
        fontSize: "12px",
        color: "var(--text-secondary, #888)",
        textAlign: "center",
      }}>
        SVG size: {svgSize}KB {emailSafe ? "(email-safe)" : "(standard)"}
      </div>

      <h2>How it works</h2>
      <p>
        Email clients (Gmail, Outlook, Apple Mail) support inline SVG with inline
        attributes. They strip <code>&lt;style&gt;</code>, <code>&lt;script&gt;</code>,
        and most <code>class</code> attributes. Semiotic's server rendering already
        uses inline attributes for everything — fill, stroke, font-size, font-family —
        so the output is email-safe by default.
      </p>

      <h2>Integration example</h2>
      <CodeBlock code={`import { renderChart } from "semiotic/server"
import { sendEmail } from "./mailer"

const chart = renderChart("BarChart", {
  data: weeklyData,
  categoryAccessor: "region",
  valueAccessor: "revenue",
  title: "Weekly Revenue",
  theme: "light",
  width: 480,
  height: 280,
})

await sendEmail({
  to: "team@company.com",
  subject: "Weekly KPI Report",
  html: \`
    <p>Here's this week's performance summary.</p>
    \${chart}
    <p style="font-size:11px;color:#999">
      Generated by semiotic/server
    </p>
  \`,
})`} language="js" />

      <h2>Tips for email SVGs</h2>
      <ul>
        <li>Keep chart width under 600px — most email clients have a ~600px content area.</li>
        <li>Use the <code>light</code> theme — dark backgrounds can clash with dark-mode email clients.</li>
        <li>Add <code>title</code> for accessible alt text in email.</li>
        <li>SVG is typically 2-8KB — much smaller than equivalent PNG images.</li>
        <li>Test with Litmus or Email on Acid for client-specific rendering quirks.</li>
      </ul>
    </PageLayout>
  )
}
