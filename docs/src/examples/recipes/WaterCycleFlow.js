/**
 * Water-cycle SankeyDiagram recipe.
 *
 * Ten reservoirs from the global hydrological cycle (Ocean, Atmosphere,
 * etc.) and 16 flows; edge values are in 1000 km³/yr (loosely cribbed
 * from USGS estimates so totals balance ±5%). The dataset is a single
 * yearly loop — return-to-Ocean edges close the cycle, which Sankey
 * draws as curved back-arrows.
 */
import React from "react"
import { SankeyDiagram, ThemeProvider } from "semiotic"
import { useDocsTheme } from "../../hooks/useDocsTheme"

// ── Shared dataset ────────────────────────────────────────────────────
//
// The 10 reservoirs the global water cycle moves through. `phase`
// gives a quick mental grouping but isn't used by the diagrams
// directly — it's for the legend/tooltip stories.
const waterNodes = [
  { id: "Ocean", phase: "ocean" },
  { id: "Atmosphere", phase: "air" },
  { id: "Clouds", phase: "air" },
  { id: "Land Rain", phase: "precip" },
  { id: "Snowpack", phase: "precip" },
  { id: "Glaciers", phase: "precip" },
  { id: "Soil Moisture", phase: "land" },
  { id: "Vegetation", phase: "land" },
  { id: "Surface Water", phase: "land" },
  { id: "Groundwater", phase: "land" },
]

// Each edge carries the classic Sankey fields (`source`, `target`,
// `value`). Volumes are thousands of cubic kilometres per year. The
// cycle: Ocean → Atmosphere → Clouds → (Land Rain | Ocean directly) →
// reservoirs → Surface Water → Ocean. Return-to-Ocean edges close the
// loop — SankeyDiagram draws those as curved back-arrows.
const waterEdges = [
  // ── Evaporation: ocean is the biggest source ──
  { source: "Ocean", target: "Atmosphere", value: 425 },
  { source: "Surface Water", target: "Atmosphere", value: 10 },
  { source: "Vegetation", target: "Atmosphere", value: 70 }, // transpiration
  // ── Condensation: atmosphere → clouds ──
  { source: "Atmosphere", target: "Clouds", value: 505 },
  // ── Precipitation: clouds split between ocean and land ──
  { source: "Clouds", target: "Ocean", value: 385 },
  { source: "Clouds", target: "Land Rain", value: 90 },
  { source: "Clouds", target: "Snowpack", value: 25 },
  { source: "Clouds", target: "Glaciers", value: 5 },
  // ── Land precipitation routes onto / into the surface ──
  { source: "Land Rain", target: "Soil Moisture", value: 50 },
  { source: "Land Rain", target: "Surface Water", value: 40 },
  // ── Snow + glacier melt ──
  { source: "Snowpack", target: "Surface Water", value: 25 },
  { source: "Glaciers", target: "Surface Water", value: 5 },
  // ── Soil moisture → vegetation (uptake) and groundwater (slow) ──
  { source: "Soil Moisture", target: "Vegetation", value: 30 },
  { source: "Soil Moisture", target: "Groundwater", value: 15 },
  // ── Return to ocean: rivers (fast) + groundwater (slow); these are the cyclic edges ──
  { source: "Surface Water", target: "Ocean", value: 60 },
  { source: "Groundwater", target: "Ocean", value: 5 },
]

// ── Carbon categorical palette (IBM Carbon extended set) ─────────────
//
// The shipped `carbon` theme has only 4 categorical colors; we have
// 10 reservoirs. Use the documented Carbon Charts extended categorical
// (categorical-14) so each reservoir gets a stable, distinct color.
// Colors picked for ordering: water-y blues for ocean / clouds /
// precip, earthy tones for land reservoirs, accent for vegetation.
const carbonScheme = [
  "#0f62fe", // blue-60 — Ocean (the dominant flow)
  "#1192e8", // cyan-50 — Atmosphere
  "#8a3ffc", // purple-60 — Clouds
  "#33b1ff", // blue-40 — Land Rain
  "#a6c8ff", // blue-20 — Snowpack
  "#d0e2ff", // blue-10 — Glaciers
  "#8a3800", // orange-70 — Soil Moisture
  "#24a148", // green-60 — Vegetation
  "#005d5d", // teal-70 — Surface Water
  "#b28600", // yellow-50 — Groundwater
]

// ── Component ────────────────────────────────────────────────────────

const Caption = ({ children }) => (
  <div
    style={{
      fontSize: 12,
      color: "var(--semiotic-text-secondary, #525252)",
      marginTop: 8,
      marginBottom: 4,
      lineHeight: 1.4,
    }}
  >
    {children}
  </div>
)

const PanelHeading = ({ children, subtitle }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--semiotic-text, #161616)" }}>
      {children}
    </div>
    {subtitle && (
      <div style={{ fontSize: 12, color: "var(--semiotic-text-secondary, #525252)", marginTop: 2 }}>
        {subtitle}
      </div>
    )}
  </div>
)

export default function WaterCycleFlow() {
  // Switch between Carbon light + Carbon dark so the recipe follows the
  // ambient docs theme instead of locking to a single brightness.
  // `useDocsTheme` mirrors `data-theme` on the document.
  const [docsTheme] = useDocsTheme()
  const themeName = docsTheme === "dark" ? "carbon-dark" : "carbon"
  return (
    <ThemeProvider theme={themeName}>
      {/* Wrapper paints `--semiotic-bg` so the whole recipe lives on the
          chosen Carbon variant's surface regardless of whether the
          surrounding docs theme is dark or light. */}
      <div
        style={{
          background: "var(--semiotic-bg)",
          color: "var(--semiotic-text)",
          padding: 20,
          borderRadius: 8,
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 24,
        }}
      >
        {/* ── Classic Sankey ─────────────────────────────────────────── */}
        <div>
          <PanelHeading subtitle="The classic Sankey layout treats reservoirs as ranked columns. Return-to-Ocean edges become curved back to represent the cycle in its column ordering. The diagram answers 'what fraction of total flow moves between these nodes annually?'">
            SankeyDiagram — system-readable, time-blind
          </PanelHeading>
          <div
            style={{
              background: "var(--semiotic-surface, #f4f4f4)",
              border: "1px solid var(--semiotic-border, #e0e0e0)",
              borderRadius: 4,
              padding: 8,
            }}
          >
            <SankeyDiagram
              nodes={waterNodes}
              edges={waterEdges}
              sourceAccessor="source"
              targetAccessor="target"
              valueAccessor="value"
              nodeIdAccessor="id"
              colorBy="id"
              colorScheme={carbonScheme}
              edgeColorBy="source"
              orientation="horizontal"
              nodePaddingRatio={0.4}
              nodeWidth={10}
              showLabels
              // Bottom legend so horizontal space isn't reserved for a
              // right-side swatch column. Width matches the ProcessSankey
              // siblings in the other process-vs-classic recipes so the
              // panel doesn't read as "small chart in big frame."
              legendPosition="bottom"
              width={780}
              height={420}
              margin={{ top: 10, bottom: 100, left: 10, right: 10 }}
            />
          </div>
          <Caption>
            <strong>What it shows well:</strong> relative magnitudes such as ocean to atmosphere
            exchange dominates because that's where most of the global flux is.
          </Caption>
        </div>
      </div>
    </ThemeProvider>
  )
}
