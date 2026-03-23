import React, { useState, useEffect } from "react"
import { GroupedBarChart, LineChart, BarChart, Heatmap, StackedBarChart } from "semiotic"

// ── Themes ──────────────────────────────────────────────────────────────
const THEMES = {
  pastels: {
    label: "Pastels",
    fontFamily: "Inter, system-ui, sans-serif",
    light: {
      bg: "#fdf6f0", card: "#fff5ee", border: "#e8d5c4", text: "#4a3728",
      muted: "#8b7355", dim: "#b09a7e", accent: "#c9a0dc", green: "#88d4ab", red: "#e8a0a0",
    },
    dark: {
      bg: "#1a1525", card: "#251e35", border: "#3d3455", text: "#e8ddf0",
      muted: "#a899c0", dim: "#7b6e95", accent: "#c9a0dc", green: "#88d4ab", red: "#e8a0a0",
    },
    categorical: ["#f0a0c0", "#88d4ab", "#b0a0e8", "#f0c888"],
  },
  biTool: {
    label: "BI Tool",
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    light: {
      bg: "#f5f6f8", card: "#ffffff", border: "#d8dce3", text: "#2c3e50",
      muted: "#7f8c9b", dim: "#a0aab5", accent: "#2563eb", green: "#16a34a", red: "#dc2626",
    },
    dark: {
      bg: "#111827", card: "#1f2937", border: "#374151", text: "#f3f4f6",
      muted: "#9ca3af", dim: "#6b7280", accent: "#3b82f6", green: "#22c55e", red: "#ef4444",
    },
    categorical: ["#2563eb", "#0d9488", "#ea580c", "#6b7280"],
  },
  italian: {
    label: "Italian Designer",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    light: {
      bg: "#fafafa", card: "#ffffff", border: "#e0e0e0", text: "#1a1a1a",
      muted: "#666666", dim: "#999999", accent: "#cc0000", green: "#2e7d32", red: "#cc0000",
    },
    dark: {
      bg: "#0a0a0a", card: "#1a1a1a", border: "#333333", text: "#f5f5f5",
      muted: "#aaaaaa", dim: "#777777", accent: "#ff3333", green: "#4caf50", red: "#ff3333",
    },
    categorical: ["#cc0000", "#333333", "#c8a415", "#4682b4"],
  },
  tufte: {
    label: "Tufte",
    fontFamily: "Georgia, 'Times New Roman', serif",
    light: {
      bg: "#fffff8", card: "#fffff8", border: "#e0ddd0", text: "#111111",
      muted: "#555555", dim: "#888888", accent: "#8b0000", green: "#556b2f", red: "#8b0000",
    },
    dark: {
      bg: "#1c1b18", card: "#262520", border: "#3d3c35", text: "#e8e4d8",
      muted: "#a09880", dim: "#706858", accent: "#c05050", green: "#7a8b5a", red: "#c05050",
    },
    categorical: ["#8b4513", "#556b2f", "#4a5568", "#800020"],
  },
  journalist: {
    label: "Data Journalist",
    fontFamily: "'Franklin Gothic Medium', 'Libre Franklin', Arial, sans-serif",
    light: {
      bg: "#ffffff", card: "#f8f8f8", border: "#d4d4d4", text: "#222222",
      muted: "#666666", dim: "#999999", accent: "#e45050", green: "#2a9d8f", red: "#e45050",
    },
    dark: {
      bg: "#141414", card: "#1e1e1e", border: "#383838", text: "#ededed",
      muted: "#a0a0a0", dim: "#707070", accent: "#ff6b6b", green: "#40c9a2", red: "#ff6b6b",
    },
    categorical: ["#3a86c8", "#e45050", "#d4a843", "#888888"],
  },
  playful: {
    label: "Playful",
    fontFamily: "'Nunito', 'Poppins', system-ui, sans-serif",
    light: {
      bg: "#fdf8ff", card: "#ffffff", border: "#e8d0f8", text: "#2d1b4e",
      muted: "#7c5a9e", dim: "#a888c8", accent: "#8b5cf6", green: "#06d6a0", red: "#ff6b6b",
    },
    dark: {
      bg: "#150a28", card: "#1f1138", border: "#3a2560", text: "#f0e8ff",
      muted: "#b8a0d8", dim: "#8068a8", accent: "#a78bfa", green: "#06d6a0", red: "#ff6b6b",
    },
    categorical: ["#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"],
  },
}

// ── Library names ────────────────────────────────────────────────────────
const LN = {
  semiotic: "Semiotic v3",
  nivo: "Nivo",
  recharts: "Recharts",
  plot: "Obs. Plot",
}
const libKeys = ["semiotic", "nivo", "recharts", "plot"]

// ── Data ────────────────────────────────────────────────────────────────
const tierData = [
  { tier: "Tier 1", library: "semiotic", score: 95 },
  { tier: "Tier 1", library: "nivo", score: 96 },
  { tier: "Tier 1", library: "recharts", score: 98 },
  { tier: "Tier 1", library: "plot", score: 94 },
  { tier: "Tier 2", library: "semiotic", score: 98 },
  { tier: "Tier 2", library: "nivo", score: 90 },
  { tier: "Tier 2", library: "recharts", score: 72 },
  { tier: "Tier 2", library: "plot", score: 70 },
  { tier: "Tier 3", library: "semiotic", score: 89 },
  { tier: "Tier 3", library: "nivo", score: 82 },
  { tier: "Tier 3", library: "recharts", score: 70 },
  { tier: "Tier 3", library: "plot", score: 68 },
  { tier: "Tier 4", library: "semiotic", score: 87 },
  { tier: "Tier 4", library: "nivo", score: 82 },
  { tier: "Tier 4", library: "recharts", score: 66 },
  { tier: "Tier 4", library: "plot", score: 64 },
]

const sizeLabels = { 100: "100", 1000: "1K", 10000: "10K" }
const perfData = [
  { size: 100, semiotic: 16.6, nivo: 48.4, recharts: 18.1, plot: 16.7 },
  { size: 1000, semiotic: 16.7, nivo: 357, recharts: 94, plot: 14.1 },
  { size: 10000, semiotic: 15.8, nivo: 8449, recharts: 1085, plot: 73.2 },
]

const perfLines = perfData.flatMap((d) =>
  Object.entries(d)
    .filter(([k]) => k !== "size")
    .map(([lib, ms]) => ({ size: d.size, library: lib, ms })),
)

const scenarios = [
  { id: "S01", name: "Line Chart", semiotic: 97, nivo: 100, recharts: 100, plot: 100 },
  { id: "S02", name: "Multi-Series Line", semiotic: 100, nivo: 100, recharts: 100, plot: 100 },
  { id: "S03", name: "Horizontal Bar", semiotic: 100, nivo: 100, recharts: 100, plot: 100 },
  { id: "S04", name: "Stacked Bar", semiotic: 100, nivo: 94, recharts: 100, plot: 97 },
  { id: "S05", name: "Scatterplot", semiotic: 100, nivo: 97, recharts: 100, plot: 100 },
  { id: "S06", name: "Donut Chart", semiotic: 86, nivo: 94, recharts: 97, plot: 64 },
  { id: "S07", name: "Histogram", semiotic: 81, nivo: 89, recharts: 89, plot: 100 },
  { id: "S08", name: "Stacked Area", semiotic: 100, nivo: 89, recharts: 94, plot: 94 },
  { id: "S09", name: "Force Network", semiotic: 100, nivo: 83, recharts: 36, plot: 33 },
  { id: "S10", name: "Sankey", semiotic: 100, nivo: 100, recharts: 100, plot: 17 },
  { id: "S11", name: "Heatmap", semiotic: 89, nivo: 89, recharts: 58, plot: 100 },
  { id: "S12", name: "Connected Scatter", semiotic: 100, nivo: 94, recharts: 94, plot: 100 },
  { id: "S13", name: "Box Plot", semiotic: 100, nivo: 81, recharts: 39, plot: 94 },
  { id: "S14", name: "Treemap", semiotic: 100, nivo: 94, recharts: 86, plot: 50 },
  { id: "S15", name: "RT Line", semiotic: 86, nivo: 89, recharts: 89, plot: 89 },
  { id: "S16", name: "RT Histogram", semiotic: 89, nivo: 86, recharts: 86, plot: 86 },
  { id: "S17", name: "RT Heatmap", semiotic: 83, nivo: 72, recharts: 39, plot: 72 },
  { id: "S18", name: "Stream Sankey", semiotic: 64, nivo: 67, recharts: 67, plot: 17 },
  { id: "S19", name: "Stream Scatter", semiotic: 86, nivo: 89, recharts: 89, plot: 86 },
  { id: "S20", name: "Stream Bar", semiotic: 100, nivo: 100, recharts: 100, plot: 100 },
  { id: "S21", name: "Coordinated Views", semiotic: 97, nivo: 72, recharts: 72, plot: 67 },
  { id: "S22", name: "Chart Export", semiotic: 89, nivo: 97, recharts: 97, plot: 97 },
  { id: "S23", name: "Forecast + CI", semiotic: 100, nivo: 72, recharts: 72, plot: 72 },
  { id: "S24", name: "Network Click", semiotic: 86, nivo: 86, recharts: 43, plot: 33 },
  { id: "S25", name: "Radial Hierarchy", semiotic: 94, nivo: 67, recharts: 19, plot: 28 },
  { id: "S26", name: "Dashboard Grid", semiotic: 90, nivo: 77, recharts: 77, plot: 72 },
  { id: "S27", name: "RT Dashboard", semiotic: 79, nivo: 69, recharts: 69, plot: 58 },
  { id: "S28", name: "Gradient Band", semiotic: 82, nivo: 79, recharts: 79, plot: 82 },
  { id: "S29", name: "Chord Diagram", semiotic: 100, nivo: 97, recharts: 13, plot: 13 },
  { id: "S30", name: "SSR", semiotic: 82, nivo: 90, recharts: 90, plot: 97 },
]

const heatmapData = scenarios.flatMap((s) =>
  libKeys.map((lib) => ({
    scenario: s.id,
    library: LN[lib],
    score: s[lib],
  })),
)

const capabilityData = [
  { category: "Semiotic v3", supported: 14, missing: 0 },
  { category: "Nivo", supported: 8, missing: 6 },
  { category: "Recharts", supported: 6, missing: 8 },
  { category: "Obs. Plot", supported: 5, missing: 9 },
]
const capFlat = capabilityData.flatMap((d) => [
  { library: d.category, count: d.supported, type: "Supported" },
  { library: d.category, count: d.missing, type: "Missing" },
])

// ── Helper components ───────────────────────────────────────────────────
function Stat({ label, value, color, sub, T }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: "12px 16px",
        flex: 1,
        minWidth: 110,
      }}
    >
      <div
        style={{
          color: T.dim,
          fontSize: 9,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
      <div style={{ color: color || T.text, fontSize: 26, fontWeight: 800, marginTop: 1 }}>
        {value}
      </div>
      {sub && <div style={{ color: T.dim, fontSize: 10, marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function Section({ title, sub, children, T }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{ color: T.text, fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h2>
      {sub && <p style={{ color: T.muted, fontSize: 11, margin: "2px 0 8px" }}>{sub}</p>}
      {children}
    </div>
  )
}

function Card({ children, style, T, semioticVars }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: 12,
        ...semioticVars,
        ...(style || {}),
      }}
    >
      {children}
    </div>
  )
}

// No custom Tooltip wrapper — Semiotic's normalizeTooltip wraps user content
// in defaultTooltipStyle chrome automatically. Just return plain content.

// ── Main component ──────────────────────────────────────────────────────
export default function BenchmarkDashboard() {
  const [view, setView] = useState("summary")
  const [themeName, setThemeName] = useState("biTool")
  const [mode, setMode] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"
    }
    return "dark"
  })

  useEffect(() => {
    const el = document.documentElement
    const observer = new MutationObserver(() => {
      const attr = el.getAttribute("data-theme")
      setMode(attr === "light" ? "light" : "dark")
    })
    observer.observe(el, { attributes: true, attributeFilter: ["data-theme"] })
    return () => observer.disconnect()
  }, [])

  const theme = THEMES[themeName]
  const T = theme[mode]
  const categorical = theme.categorical
  const LC = Object.fromEntries(libKeys.map((k, i) => [k, categorical[i]]))

  // Force canvas repaint when theme/mode changes — canvas reads CSS vars via
  // getComputedStyle at paint time, but doesn't know when they change.
  const chartKey = `${themeName}-${mode}`

  const semioticVars = {
    "--semiotic-text": T.text,
    "--semiotic-text-secondary": T.muted,
    "--semiotic-border": T.border,
    "--semiotic-grid": T.border,
    "--semiotic-bg": T.card,
    "--semiotic-font-family": theme.fontFamily,
    "--semiotic-tooltip-bg": T.card,
    "--semiotic-tooltip-text": T.text,
    "--semiotic-tooltip-radius": "8px",
    "--semiotic-tooltip-shadow": mode === "dark"
      ? "0 4px 12px rgba(0, 0, 0, 0.4)"
      : "0 2px 8px rgba(0, 0, 0, 0.12)",
    "--semiotic-focus": T.accent,
  }

  function navBtn(v, label) {
    return (
      <button
        onClick={() => setView(v)}
        style={{
          padding: "6px 12px",
          borderRadius: 7,
          border: "none",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          background: view === v ? T.accent : "transparent",
          color: view === v ? "#fff" : T.muted,
        }}
      >
        {label}
      </button>
    )
  }

  function themeBtn(key) {
    const t = THEMES[key]
    const isActive = themeName === key
    return (
      <button
        key={key}
        onClick={() => setThemeName(key)}
        style={{
          padding: "5px 10px",
          borderRadius: 6,
          border: isActive ? `2px solid ${T.accent}` : `1px solid ${T.border}`,
          cursor: "pointer",
          fontSize: 10,
          fontWeight: 600,
          background: isActive ? T.accent : T.card,
          color: isActive ? "#fff" : T.muted,
          transition: "all 0.15s ease",
        }}
      >
        {t.label}
      </button>
    )
  }

  return (
    <div
      style={{
        background: T.bg,
        fontFamily: theme.fontFamily,
        color: T.text,
        padding: "16px 20px 50px",
        borderRadius: 12,
        transition: "background 0.2s ease, color 0.2s ease",
        ...semioticVars,
      }}
    >
      {/* ── Theme selector ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {Object.keys(THEMES).map((key) => themeBtn(key))}
        </div>
        <span style={{ fontSize: 10, color: T.dim }}>
          Mode: {mode}. Use the site toggle to switch.
        </span>
      </div>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>AI Dataviz Library Benchmark</h1>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            background: T.accent,
            color: "#fff",
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          Semiotic
        </span>
      </div>
      <p style={{ color: T.muted, fontSize: 11, margin: "2px 0 12px" }}>
        4 libraries x 30 AI scenarios + runtime perf. All charts below use Semiotic HOC components
        with CSS custom properties for theming.
      </p>

      {/* ── View tabs ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 3,
          marginBottom: 14,
          background: T.card,
          padding: 3,
          borderRadius: 9,
          width: "fit-content",
        }}
      >
        {navBtn("summary", "Summary")}
        {navBtn("perf", "Performance")}
        {navBtn("heatmap", "Heatmap")}
        {navBtn("caps", "Capabilities")}
      </div>

      {/* Color legend */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 10, flexWrap: "wrap" }}>
        {libKeys.map((k) => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: LC[k] }} />
            <span style={{ color: T.muted }}>{LN[k]}</span>
          </span>
        ))}
      </div>

      {/* ── SUMMARY ────────────────────────────────────────────────── */}
      {view === "summary" && (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Stat T={T} label="Semiotic" value="92%" color={LC.semiotic} sub="AI + constant-time perf" />
            <Stat T={T} label="Nivo" value="87%" color={LC.nivo} sub="AI good, perf unusable at scale" />
            <Stat T={T} label="Recharts" value="77%" color={LC.recharts} sub="Basics only, degrades at 10K+" />
            <Stat T={T} label="Plot" value="73%" color={LC.plot} sub="Fast but missing chart types" />
          </div>

          <Section T={T} title="AI Score by Difficulty Tier">
            <Card T={T} semioticVars={semioticVars}>
              <GroupedBarChart
                key={chartKey + "-tier"}
                data={tierData}
                categoryAccessor="tier"
                valueAccessor="score"
                groupBy="library"
                colorBy="library"
                colorScheme={categorical}
                responsiveWidth
                height={280}
                showGrid
                showLegend
                legendPosition="bottom"
                legendInteraction="isolate"
                tooltip={(d) => {
                  const row = d.data || d
                  return (
                    <span><strong>{LN[row.library]}</strong>: {row.score}%</span>
                  )
                }}
              />
            </Card>
          </Section>

          <Section
            T={T}
            title="Scatter Re-render Scaling (log)"
            sub="The chart type that breaks libraries. Nivo hits 8.4s at 10K points."
          >
            <Card T={T} semioticVars={semioticVars}>
              <LineChart
                key={chartKey + "-perf-summary"}
                data={perfLines}
                xAccessor="size"
                yAccessor="ms"
                yScaleType="log"
                lineBy="library"
                colorBy="library"
                colorScheme={categorical}
                responsiveWidth
                height={260}
                showGrid
                curve="monotoneX"
                showPoints
                pointRadius={4}
                showLegend
                legendPosition="bottom"
                legendInteraction="isolate"
                annotations={[
                  { type: "y-threshold", value: 100, label: "100ms budget", color: T.red },
                  { type: "widget", size: 10000, ms: 8449, dy: -10, content: (
                    <span style={{ fontSize: 9, color: T.red, fontWeight: 700, whiteSpace: "nowrap" }}>
                      8.4s
                    </span>
                  )},
                ]}
                tooltip={(d) => {
                  const row = d.data || d
                  return (
                    <span>
                      <strong style={{ color: LC[row.library] || "inherit" }}>
                        {LN[row.library]}
                      </strong>
                      <br />
                      {sizeLabels[row.size] || row.size} points:{" "}
                      {typeof row.ms === "number" ? row.ms.toFixed(1) + "ms" : "N/S"}
                    </span>
                  )
                }}
              />
            </Card>
          </Section>
        </div>
      )}

      {/* ── PERFORMANCE ────────────────────────────────────────────── */}
      {view === "perf" && (
        <div>
          <Section
            T={T}
            title="Scatter Re-render Scaling"
            sub="The chart type that breaks libraries. Nivo hits 8.4s at 10K points. Semiotic: 16ms constant."
          >
            <Card T={T} semioticVars={semioticVars}>
              <LineChart
                key={chartKey + "-perf-detail"}
                data={perfLines}
                xAccessor="size"
                yAccessor="ms"
                yScaleType="log"
                lineBy="library"
                colorBy="library"
                colorScheme={categorical}
                responsiveWidth
                height={300}
                showGrid
                curve="monotoneX"
                showPoints
                pointRadius={4}
                annotations={[
                  { type: "y-threshold", value: 16.7, label: "Frame budget (16.7ms)", color: T.green },
                  { type: "y-threshold", value: 1000, label: "Unusable (1s+)", color: T.red },
                  { type: "widget", size: 10000, ms: 15.8, dy: 15, content: (
                    <span style={{ fontSize: 9, color: T.green, fontWeight: 700, background: T.card, padding: "1px 4px", borderRadius: 3, whiteSpace: "nowrap" }}>
                      Semiotic: constant 16ms
                    </span>
                  )},
                  { type: "widget", size: 10000, ms: 8449, dy: -12, content: (
                    <span style={{ fontSize: 9, color: T.red, fontWeight: 700, background: T.card, padding: "1px 4px", borderRadius: 3, whiteSpace: "nowrap" }}>
                      Nivo: 8.4 seconds
                    </span>
                  )},
                ]}
                tooltip={(d) => {
                  const row = d.data || d
                  return (
                    <span>
                      <strong style={{ color: LC[row.library] || "inherit" }}>
                        {LN[row.library]}
                      </strong>
                      <br />
                      {sizeLabels[row.size] || row.size} points:{" "}
                      {typeof row.ms === "number" ? row.ms.toFixed(1) + "ms" : "N/S"}
                    </span>
                  )
                }}
                showLegend
                legendInteraction="isolate"
              />
            </Card>
          </Section>

          <Section
            T={T}
            title="Feature Coverage"
            sub="Out of 14 features: realtime, network viz, coordination, statistical, SSR, export."
          >
            <Card T={T} semioticVars={semioticVars}>
              <StackedBarChart
                key={chartKey + "-caps-stack"}
                data={capFlat}
                categoryAccessor="library"
                valueAccessor="count"
                stackBy="type"
                colorBy="type"
                colorScheme={[T.green, T.border]}
                responsiveWidth
                height={200}
                showGrid
                showLegend
                legendInteraction="isolate"
              />
            </Card>
          </Section>
        </div>
      )}

      {/* ── HEATMAP ────────────────────────────────────────────────── */}
      {view === "heatmap" && (
        <div>
          <Section
            T={T}
            title="All 30 Scenarios by Library"
            sub="Score heatmap. Blues = high (100%), reds = low (< 50%)."
          >
            <Card T={T} semioticVars={semioticVars}>
              <Heatmap
                key={chartKey + "-heatmap"}
                data={heatmapData}
                xAccessor="scenario"
                yAccessor="library"
                valueAccessor="score"
                colorScheme="viridis"
                responsiveWidth
                height={220}
                showValues
                tooltip={(d) => {
                  const row = d.data || d
                  return (
                    <span><strong>{row.library}</strong> — {row.scenario}: {row.score}%</span>
                  )
                }}
              />
            </Card>
          </Section>
        </div>
      )}

      {/* ── CAPABILITIES ───────────────────────────────────────────── */}
      {view === "caps" && (
        <div>
          <Section
            T={T}
            title="Score by Scenario"
            sub="All 30 scenarios. Libraries scoring below 50 are omitted (not supported)."
          >
            <Card T={T} semioticVars={semioticVars}>
              <GroupedBarChart
                key={chartKey + "-caps-detail"}
                data={scenarios.flatMap((s) =>
                  libKeys
                    .filter((lib) => s[lib] >= 50)
                    .map((lib) => ({ scenario: s.name, library: lib, score: s[lib] })),
                )}
                categoryAccessor="scenario"
                valueAccessor="score"
                groupBy="library"
                colorBy="library"
                colorScheme={categorical}
                categoryLabel="Scenario"
                valueLabel="Score"
                orientation="horizontal"
                margin={{ left: 130 }}
                responsiveWidth
                height={scenarios.length * 28 + 60}
                showGrid
                showLegend
                legendPosition="top"
                legendInteraction="isolate"
                tooltip={(d) => {
                  const row = d.data || d
                  return (
                    <span><strong>{LN[row.library]}</strong> — {row.scenario}: {row.score}%</span>
                  )
                }}
              />
            </Card>
          </Section>
        </div>
      )}
    </div>
  )
}
