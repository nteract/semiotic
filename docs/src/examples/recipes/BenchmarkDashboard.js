import React, { useState } from "react"
import { GroupedBarChart, LineChart, BarChart, Heatmap, StackedBarChart } from "semiotic"

// ── Color palette ───────────────────────────────────────────────────────
const LC = {
  semiotic: "#818cf8",
  nivo: "#34d399",
  recharts: "#fbbf24",
  plot: "#f472b6",
}
// Color array matching the library key order in data
const libColors = [LC.semiotic, LC.nivo, LC.recharts, LC.plot]
const LN = {
  semiotic: "Semiotic v3",
  nivo: "Nivo",
  recharts: "Recharts",
  plot: "Obs. Plot",
}

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

// Flat array for multi-series line
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

// Heatmap data: one row per scenario × library
const heatmapData = scenarios.flatMap((s) =>
  ["semiotic", "nivo", "recharts", "plot"].map((lib) => ({
    scenario: s.id,
    library: LN[lib],
    score: s[lib],
  })),
)

// Capability coverage for stacked bar
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

// ── Dark Theme ───────────────────────
const C = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#e2e8f0",
  muted: "#94a3b8",
  dim: "#64748b",
  green: "#34d399",
  red: "#f87171",
  accent: "#6366f1",
}

// CSS custom properties for Semiotic dark mode
const semioticDarkVars = {
  "--semiotic-text": C.text,
  "--semiotic-text-secondary": C.muted,
  "--semiotic-border": C.border,
  "--semiotic-grid": C.border,
}

function Stat({ label, value, color, sub }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "12px 16px",
        flex: 1,
        minWidth: 110,
      }}
    >
      <div
        style={{
          color: C.dim,
          fontSize: 9,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
      <div style={{ color: color || C.text, fontSize: 26, fontWeight: 800, marginTop: 1 }}>
        {value}
      </div>
      {sub && <div style={{ color: C.dim, fontSize: 10, marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function Section({ title, sub, children }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h2>
      {sub && <p style={{ color: C.muted, fontSize: 11, margin: "2px 0 8px" }}>{sub}</p>}
      {children}
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 12,
        ...semioticDarkVars,
        ...(style || {}),
      }}
    >
      {children}
    </div>
  )
}

// Color accessor for libraries
function libColor(d) {
  const lib = d.library || d.lib
  return LC[lib] || C.muted
}

export default function BenchmarkDashboard() {
  const [view, setView] = useState("summary")

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
          background: view === v ? C.accent : "transparent",
          color: view === v ? "#fff" : C.muted,
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div
      style={{
        background: C.bg,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: C.text,
        padding: "16px 20px 50px",
        borderRadius: 12,
        ...semioticDarkVars,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>AI Dataviz Library Benchmark</h1>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            background: C.accent,
            color: "#fff",
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          Semiotic
        </span>
      </div>
      <p style={{ color: C.muted, fontSize: 11, margin: "2px 0 12px" }}>
        4 libraries x 30 AI scenarios + runtime perf. All charts below use Semiotic HOC components
        with CSS custom properties for dark mode.
      </p>

      <div
        style={{
          display: "flex",
          gap: 3,
          marginBottom: 14,
          background: C.card,
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
        {Object.entries(LN).map(([k, name]) => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: LC[k] }} />
            <span style={{ color: C.muted }}>{name}</span>
          </span>
        ))}
      </div>

      {/* ── SUMMARY ────────────────────────────────────────────────────── */}
      {view === "summary" && (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Stat label="Semiotic" value="92%" color={LC.semiotic} sub="AI + constant-time perf" />
            <Stat label="Nivo" value="87%" color={LC.nivo} sub="AI good, perf unusable at scale" />
            <Stat
              label="Recharts"
              value="77%"
              color={LC.recharts}
              sub="Basics only, degrades at 10K+"
            />
            <Stat label="Plot" value="73%" color={LC.plot} sub="Fast but missing chart types" />
          </div>

          <Section title="AI Score by Difficulty Tier">
            <Card>
              <GroupedBarChart
                data={tierData}
                categoryAccessor="tier"
                valueAccessor="score"
                groupBy="library"
                colorBy="library"
                colorScheme={libColors}
                responsiveWidth
                height={280}
                showGrid
                showLegend
                legendPosition="bottom"
                legendInteraction="isolate"
                tooltip={(d) => {
                  const row = d.data || d
                  return (
                    <div
                      style={{
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        color: C.text,
                        fontSize: 11,
                        padding: "6px 10px",
                      }}
                    >
                      <strong>{LN[row.library]}</strong>: {row.score}%
                    </div>
                  )
                }}
              />
            </Card>
          </Section>

          <Section
            title="Scatter Re-render Scaling (log)"
            sub="The chart type that breaks libraries. Nivo hits 8.4s at 10K points."
          >
            <Card>
              <LineChart
                data={perfLines}
                xAccessor="size"
                yAccessor="ms"
                yScaleType="log"
                lineBy="library"
                colorBy="library"
                colorScheme={libColors}
                responsiveWidth
                height={260}
                showGrid
                curve="monotoneX"
                showPoints
                pointRadius={4}
                showLegend
                legendPosition="bottom"
                legendInteraction="isolate"
                tooltip={(d) => {
                  const row = d.data || d
                  return (
                    <div
                      style={{
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        color: C.text,
                        fontSize: 11,
                        padding: "6px 10px",
                      }}
                    >
                      <strong style={{ color: LC[row.library] || C.text }}>
                        {LN[row.library]}
                      </strong>
                      <br />
                      {sizeLabels[row.size] || row.size} points:{" "}
                      {typeof row.ms === "number" ? row.ms.toFixed(1) + "ms" : "N/S"}
                    </div>
                  )
                }}
              />
            </Card>
          </Section>
        </div>
      )}

      {/* ── PERFORMANCE ───────────────────────────────────────────────── */}
      {view === "perf" && (
        <div>
          <Section
            title="Scatter Re-render Scaling"
            sub="The chart type that breaks libraries. Nivo hits 8.4s at 10K points. Semiotic: 16ms constant."
          >
            <Card>
              <LineChart
                data={perfLines}
                xAccessor="size"
                yAccessor="ms"
                yScaleType="log"
                lineBy="library"
                colorBy="library"
                colorScheme={libColors}
                responsiveWidth
                height={300}
                showGrid
                curve="monotoneX"
                showPoints
                pointRadius={4}
                tooltip={(d) => {
                  const row = d.data || d
                  return (
                    <div
                      style={{
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        color: C.text,
                        fontSize: 11,
                        padding: "6px 10px",
                      }}
                    >
                      <strong style={{ color: LC[row.library] || C.text }}>
                        {LN[row.library]}
                      </strong>
                      <br />
                      {sizeLabels[row.size] || row.size} points:{" "}
                      {typeof row.ms === "number" ? row.ms.toFixed(1) + "ms" : "N/S"}
                    </div>
                  )
                }}
                showLegend
                legendInteraction="isolate"
              />
            </Card>
          </Section>

          <Section
            title="Feature Coverage"
            sub="Out of 14 features: realtime, network viz, coordination, statistical, SSR, export."
          >
            <Card>
              <StackedBarChart
                data={capFlat}
                categoryAccessor="library"
                valueAccessor="count"
                stackBy="type"
                colorBy="type"
                colorScheme={[C.green, C.border]}
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

      {/* ── HEATMAP ───────────────────────────────────────────────────── */}
      {view === "heatmap" && (
        <div>
          <Section
            title="All 30 Scenarios by Library"
            sub="Score heatmap. Blues = high (100%), reds = low (< 50%)."
          >
            <Card>
              <Heatmap
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
                    <div
                      style={{
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        color: C.text,
                        fontSize: 11,
                        padding: "6px 10px",
                      }}
                    >
                      <strong>{row.library}</strong> — {row.scenario}: {row.score}%
                    </div>
                  )
                }}
              />
            </Card>
          </Section>
        </div>
      )}

      {/* ── CAPABILITIES ──────────────────────────────────────────────── */}
      {view === "caps" && (
        <div>
          <Section
            title="Score by Scenario"
            sub="All 30 scenarios. Libraries scoring below 50 are omitted (not supported)."
          >
            <Card>
              <GroupedBarChart
                data={scenarios.flatMap((s) =>
                  ["semiotic", "nivo", "recharts", "plot"]
                    .filter((lib) => s[lib] >= 50)
                    .map((lib) => ({ scenario: s.name, library: lib, score: s[lib] })),
                )}
                categoryAccessor="scenario"
                valueAccessor="score"
                groupBy="library"
                colorBy="library"
                colorScheme={libColors}
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
                    <div
                      style={{
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        color: C.text,
                        fontSize: 11,
                        padding: "6px 10px",
                      }}
                    >
                      <strong>{LN[row.library]}</strong> — {row.scenario}: {row.score}%
                    </div>
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
