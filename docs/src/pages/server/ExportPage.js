import React, { useState, useMemo, useEffect } from "react"
import { renderChart } from "../../../../src/components/server/renderToStaticSVG"
import { generateFrameSVGs } from "../../../../src/components/server/animatedGif"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

// ── Incident data ────────────────────────────────────────────────────
// 30 minutes of API latency at 1-minute intervals.
// Story: steady ~120ms → subtle wobble at t=18 → escalation → breach at t=27

function buildIncidentData() {
  const points = []
  for (let t = 0; t < 30; t++) {
    let latency
    if (t < 15) {
      // Steady state: 110-130ms with minor noise
      latency = 120 + (Math.sin(t * 0.7) * 8) + (Math.cos(t * 1.3) * 5)
    } else if (t < 20) {
      // Early warning: wobble grows, 115-160ms
      const wobble = Math.sin(t * 1.8) * (12 + (t - 15) * 6)
      latency = 130 + wobble + (t - 15) * 4
    } else if (t < 25) {
      // Escalation: oscillations widen, trend upward
      const amplitude = 20 + (t - 20) * 12
      latency = 150 + (t - 20) * 15 + Math.sin(t * 2.2) * amplitude
    } else {
      // Breach and beyond: volatile, above threshold
      latency = 200 + (t - 25) * 25 + Math.sin(t * 3) * 30
    }
    points.push({
      x: t,
      y: Math.round(Math.max(80, latency)),
    })
  }
  return points
}

const incidentData = buildIncidentData()

const barData = [
  { category: "North", value: 42 }, { category: "South", value: 28 },
  { category: "East", value: 35 }, { category: "West", value: 51 },
]

// ── Components ───────────────────────────────────────────────────────

function ExportCard({ title, description, preview, code, actions, wide }) {
  return (
    <div style={{
      background: "var(--card-bg, #fff)",
      borderRadius: "10px",
      padding: "20px",
      border: "1px solid var(--border-color, #e0e0e0)",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      ...(wide && { gridColumn: "1 / -1" }),
    }}>
      <h3 style={{ margin: "0 0 6px", fontSize: "16px" }}>{title}</h3>
      <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--text-secondary, #666)" }}>{description}</p>
      <div style={{
        display: "flex", justifyContent: "center", padding: "12px",
        background: "var(--surface-2, #f8f8f8)", borderRadius: "8px",
        marginBottom: "12px", minHeight: "180px", alignItems: "center",
      }}>
        {preview}
      </div>
      {actions && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
          {actions}
        </div>
      )}
      <details>
        <summary style={{ cursor: "pointer", fontSize: "13px", color: "var(--text-secondary, #888)", marginBottom: "8px" }}>
          Code
        </summary>
        <CodeBlock code={code} language="js" />
      </details>
    </div>
  )
}

function ActionButton({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: "6px",
      border: "1px solid var(--border-color, #ccc)",
      background: "var(--surface-2, #f8f8f8)",
      color: "var(--text-primary, #333)",
      cursor: "pointer", fontSize: "12px",
    }}>
      {label}
    </button>
  )
}

// ── Incident animation preview ───────────────────────────────────────

function IncidentPreview({ frames }) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    if (!playing || frames.length === 0) return
    // Slow down near the end for dramatic effect
    const isClimaxZone = idx > frames.length * 0.75
    const delay = isClimaxZone ? 200 / speed : 120 / speed
    const id = setTimeout(() => setIdx(p => {
      const next = p + 1
      if (next >= frames.length) {
        // Pause on last frame briefly then restart
        setTimeout(() => setIdx(0), 1500 / speed)
        return p
      }
      return next
    }), delay)
    return () => clearTimeout(id)
  }, [playing, idx, frames.length, speed])

  if (frames.length === 0) return <span style={{ color: "#888" }}>Generating...</span>

  // Compute the "time" label: minutes ago from breach
  const minutesIn = Math.round((idx / (frames.length - 1)) * 29)
  const minutesBefore = 29 - minutesIn
  const timeLabel = minutesBefore > 0
    ? `T-${minutesBefore}m`
    : "BREACH"
  const isBreached = minutesIn >= 27

  return (
    <div style={{ width: "100%" }}>
      <div dangerouslySetInnerHTML={{ __html: frames[idx] }} style={{ display: "flex", justifyContent: "center" }} />
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: "8px", padding: "0 4px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={() => setPlaying(!playing)} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--accent, #007bff)", fontSize: "12px", padding: 0,
          }}>
            {playing ? "Pause" : "Play"}
          </button>
          <button onClick={() => { setIdx(0); setPlaying(true) }} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-secondary, #888)", fontSize: "11px", padding: 0,
          }}>
            Restart
          </button>
          <select value={speed} onChange={e => setSpeed(Number(e.target.value))} style={{
            fontSize: "11px", border: "1px solid var(--border-color, #ccc)",
            borderRadius: "4px", padding: "1px 4px", background: "var(--surface-2, #f8f8f8)",
            color: "var(--text-primary, #333)",
          }}>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
          </select>
        </div>
        <span style={{
          fontSize: "12px", fontFamily: "monospace", fontWeight: 600,
          color: isBreached ? "#e45050" : "var(--text-secondary, #888)",
        }}>
          {timeLabel}
        </span>
      </div>
      {/* Progress bar */}
      <div style={{
        height: "3px", background: "var(--border-color, #e0e0e0)",
        borderRadius: "2px", marginTop: "6px", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${(idx / (frames.length - 1)) * 100}%`,
          background: isBreached ? "#e45050" : "var(--accent, #007bff)",
          transition: "width 100ms linear, background 300ms",
        }} />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────

export default function ExportPage() {
  // SVG export — the static "after" view of the incident
  const incidentStaticSVG = useMemo(() => renderChart("LineChart", {
    data: incidentData, xAccessor: "x", yAccessor: "y",
    width: 440, height: 240, theme: "journalist",
    title: "API Latency (ms) — 14:00-14:30 UTC", showGrid: true,
    annotations: [
      { type: "y-threshold", value: 200, label: "SLA: 200ms", color: "#e45050" },
    ],
  }), [])

  // Bar chart for PNG demo
  const barSVG = useMemo(() => renderChart("BarChart", {
    data: barData, categoryAccessor: "category", valueAccessor: "value",
    width: 400, height: 240, theme: "carbon", title: "Revenue by Region",
    showGrid: true,
  }), [])

  // Animated frames — the incident story
  const incidentFrames = useMemo(() => {
    try {
      return generateFrameSVGs("line", incidentData, {
        xAccessor: "x", yAccessor: "y", width: 440, height: 260,
        theme: "dark", title: "API Latency — Incident Replay",
        annotations: [
          { type: "y-threshold", value: 200, label: "SLA: 200ms", color: "#e45050" },
        ],
      }, {
        stepSize: 1,
        transitionFrames: 0,
        xExtent: [0, 29],
        yExtent: [60, 350],
      })
    } catch { return [] }
  }, [])

  // Dark theme for embed demo
  const darkSVG = useMemo(() => renderChart("BarChart", {
    data: barData, categoryAccessor: "category", valueAccessor: "value",
    width: 400, height: 200, theme: "dark", title: "Revenue",
  }), [])

  const downloadSVG = (svg, name) => {
    const blob = new Blob([svg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
  }

  const downloadPNG = (svg, name, w, h) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
    const blobUrl = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = w * 2; canvas.height = h * 2
      const ctx = canvas.getContext("2d")
      ctx.scale(2, 2)
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(blobUrl)
      const link = document.createElement("a")
      link.download = name; link.href = canvas.toDataURL("image/png"); link.click()
    }
    img.src = blobUrl
  }

  return (
    <PageLayout
      title="Export & Embed"
      breadcrumbs={[
        { label: "Server Rendering", path: "/server" },
        { label: "Export & Embed", path: "/server/export" },
      ]}
      prevPage={{ title: "Email Preview", path: "/server/email" }}
      nextPage={{ title: "API Reference", path: "/api" }}
    >
      <p>
        Every chart rendered by <code>semiotic/server</code> can be exported as SVG,
        PNG, or animated GIF. The SVG is self-contained — embed it directly in HTML,
        email, or a PDF. The PNG and GIF formats use <code>sharp</code> and{" "}
        <code>gifenc</code> on the server, but this page demonstrates client-side
        previews of the same output.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))",
        gap: "20px",
        marginTop: "24px",
      }}>
        {/* SVG Export */}
        <ExportCard
          title="SVG Export"
          description="Self-contained SVG with inline styles. Works everywhere — HTML, email, PDFs. Smallest file size, infinite resolution."
          preview={<div dangerouslySetInnerHTML={{ __html: incidentStaticSVG }} />}
          actions={<>
            <ActionButton label="Download SVG" onClick={() => downloadSVG(incidentStaticSVG, "chart.svg")} />
            <ActionButton label="Copy to Clipboard" onClick={() => navigator.clipboard?.writeText(incidentStaticSVG)} />
          </>}
          code={`import { renderChart } from "semiotic/server"

const svg = renderChart("LineChart", {
  data: latencyData,
  xAccessor: "x", yAccessor: "y",
  theme: "journalist",
  title: "API Latency (ms) — 14:00-14:30 UTC",
  showGrid: true,
  annotations: [
    { type: "y-threshold", value: 200, label: "SLA: 200ms", color: "#e45050" },
  ],
})

fs.writeFileSync("incident.svg", svg)`}
        />

        {/* PNG Export */}
        <ExportCard
          title="PNG Export"
          description="Rasterized at 2x for retina displays. Best for Slack, social media, and OG images. Requires sharp on the server."
          preview={<div dangerouslySetInnerHTML={{ __html: barSVG }} />}
          actions={<>
            <ActionButton label="Download PNG @2x" onClick={() => downloadPNG(barSVG, "chart@2x.png", 400, 240)} />
          </>}
          code={`import { renderToImage } from "semiotic/server"

const png = await renderToImage("BarChart", {
  data, categoryAccessor: "category", valueAccessor: "value",
  theme: "carbon", title: "Revenue by Region",
}, { format: "png", scale: 2 })

fs.writeFileSync("chart@2x.png", png)`}
        />

        {/* HTML Embed */}
        <ExportCard
          title="HTML Embed"
          description="Paste directly into any HTML page. No JavaScript needed. The SVG includes role='img', title, and desc for accessibility."
          preview={
            <div style={{
              background: "#1a1a2e", borderRadius: "6px", padding: "12px",
              display: "flex", justifyContent: "center",
            }}>
              <div dangerouslySetInnerHTML={{ __html: darkSVG }} />
            </div>
          }
          actions={<>
            <ActionButton label="Copy Embed Code" onClick={() => {
              navigator.clipboard?.writeText(`<!-- Semiotic server-rendered chart -->\n<div style="max-width:400px">\n${darkSVG}\n</div>`)
            }} />
          </>}
          code={`// In your HTML template or React component:
<div style={{ maxWidth: 400 }}
  dangerouslySetInnerHTML={{ __html: svg }}
/>

// Or in plain HTML:
<div style="max-width:400px">
  \${svg}
</div>`}
        />

        {/* Animated GIF — the hero */}
        <ExportCard
          wide
          title="Animated GIF — Incident Replay"
          description={
            "A static chart shows you the breach. The animation shows you the buildup. " +
            "Watch 30 minutes of API latency unfold: steady state, early wobble at T-12m, " +
            "escalating oscillations at T-7m, and the SLA breach at T-2m. " +
            "This is what you attach to the incident report — not a screenshot, but the story."
          }
          preview={<IncidentPreview frames={incidentFrames} />}
          code={`import { renderToAnimatedGif } from "semiotic/server"

// 30 minutes of latency data at 1-minute intervals
const gif = await renderToAnimatedGif("line", latencyData, {
  xAccessor: "minute", yAccessor: "latencyMs",
  theme: "dark",
  title: "API Latency — Incident Replay",
  width: 440, height: 260,
  annotations: [
    { type: "y-threshold", value: 200, label: "SLA: 200ms", color: "#e45050" },
  ],
}, {
  fps: 10,
  stepSize: 1,               // one data point per frame
  xExtent: [0, 29],          // lock axes so they don't shift
  yExtent: [60, 350],
  transitionFrames: 0,       // no easing — raw data progression
  loop: true,
})

// Attach to incident report, email, Slack
fs.writeFileSync("incident-replay.gif", gif)

// Or send in an alert email:
await sendEmail({
  to: "oncall@company.com",
  subject: "SLA Breach: API latency > 200ms",
  html: \`<p>API latency breached the 200ms SLA at 14:28 UTC.</p>
         <img src="cid:replay" width="440" />\`,
  attachments: [{ content: gif, cid: "replay", contentType: "image/gif" }],
})`}
        />
      </div>

      <h2>Why animate?</h2>
      <p>
        A static chart answers "what happened." An animated chart answers "how did we get here."
      </p>
      <p>
        The incident replay above shows the difference. The static SVG (top-left) shows
        a line that breached a threshold — useful, but flat. The animated version reveals the
        narrative: fifteen minutes of stability, then subtle instability that a human might
        have caught, then a cascade that an alert should have fired on earlier.
      </p>
      <p>
        Animated GIFs work everywhere static images work — email, Slack, PDFs, wikis — but they
        carry temporal context that screenshots cannot. Attach one to an incident report and
        the reader <em>sees</em> the system straining before it broke.
      </p>

      <h2>Format comparison</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", marginTop: "16px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border-color, #ddd)" }}>
            <th style={{ textAlign: "left", padding: "8px" }}>Format</th>
            <th style={{ textAlign: "left", padding: "8px" }}>Size</th>
            <th style={{ textAlign: "left", padding: "8px" }}>Resolution</th>
            <th style={{ textAlign: "left", padding: "8px" }}>Animation</th>
            <th style={{ textAlign: "left", padding: "8px" }}>Email</th>
            <th style={{ textAlign: "left", padding: "8px" }}>Dependencies</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid var(--border-color, #eee)" }}>
            <td style={{ padding: "8px", fontWeight: 600 }}>SVG</td>
            <td style={{ padding: "8px" }}>2-8 KB</td>
            <td style={{ padding: "8px" }}>Infinite</td>
            <td style={{ padding: "8px" }}>No</td>
            <td style={{ padding: "8px" }}>Yes</td>
            <td style={{ padding: "8px" }}>None</td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--border-color, #eee)" }}>
            <td style={{ padding: "8px", fontWeight: 600 }}>PNG</td>
            <td style={{ padding: "8px" }}>20-80 KB</td>
            <td style={{ padding: "8px" }}>Fixed (scalable via `scale`)</td>
            <td style={{ padding: "8px" }}>No</td>
            <td style={{ padding: "8px" }}>Yes (as CID attachment)</td>
            <td style={{ padding: "8px" }}><code>sharp</code></td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--border-color, #eee)" }}>
            <td style={{ padding: "8px", fontWeight: 600 }}>JPEG</td>
            <td style={{ padding: "8px" }}>15-50 KB</td>
            <td style={{ padding: "8px" }}>Fixed</td>
            <td style={{ padding: "8px" }}>No</td>
            <td style={{ padding: "8px" }}>Yes</td>
            <td style={{ padding: "8px" }}><code>sharp</code></td>
          </tr>
          <tr>
            <td style={{ padding: "8px", fontWeight: 600 }}>GIF</td>
            <td style={{ padding: "8px" }}>50-500 KB</td>
            <td style={{ padding: "8px" }}>Fixed</td>
            <td style={{ padding: "8px" }}>Yes</td>
            <td style={{ padding: "8px" }}>Yes</td>
            <td style={{ padding: "8px" }}><code>sharp</code> + <code>gifenc</code></td>
          </tr>
        </tbody>
      </table>

      <h2>Server-side API overview</h2>
      <CodeBlock code={`import {
  renderChart,          // SVG string (sync)
  renderToImage,        // PNG/JPEG Buffer (async, requires sharp)
  renderToAnimatedGif,  // GIF Buffer (async, requires sharp + gifenc)
  renderDashboard,      // Multi-chart SVG string (sync)
  generateFrameSVGs,    // Animation frame SVGs (sync, no deps)
} from "semiotic/server"`} language="js" />
    </PageLayout>
  )
}
