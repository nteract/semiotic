/**
 * Water-cycle flow comparison.
 *
 * Same nodes + edges feed both `SankeyDiagram` and `ProcessSankey`,
 * but the dataset carries `startTime` / `endTime` per edge. The
 * classic Sankey ignores those fields (and draws return edges as
 * curved loops); the Process Sankey reads them as the X-axis and
 * unrolls the cycle in time. The side-by-side highlights what each
 * approach makes legible.
 *
 * Nodes are real water reservoirs from the global hydrological
 * cycle (Ocean, Atmosphere, etc.); edge values are in 1000 km³/yr
 * (loosely cribbed from USGS estimates so totals balance ±5%); edge
 * times use month-of-year so the timeline fits in a single seasonal
 * loop. The numbers are illustrative — the visual contrast is the
 * point.
 */
import React from "react"
import { SankeyDiagram, ProcessSankey, ThemeProvider } from "semiotic"

// ── Shared dataset ────────────────────────────────────────────────────
//
// The 10 reservoirs the global water cycle moves through. `phase`
// gives a quick mental grouping but isn't used by the diagrams
// directly — it's for the legend/tooltip stories.
const waterNodes = [
  { id: "Ocean",          phase: "ocean" },
  { id: "Atmosphere",     phase: "air" },
  { id: "Clouds",         phase: "air" },
  { id: "Land Rain",      phase: "precip" },
  { id: "Snowpack",       phase: "precip" },
  { id: "Glaciers",       phase: "precip" },
  { id: "Soil Moisture",  phase: "land" },
  { id: "Vegetation",     phase: "land" },
  { id: "Surface Water",  phase: "land" },
  { id: "Groundwater",    phase: "land" },
]

// Each edge carries `startMonth` / `endMonth` (1–12) plus the
// classic Sankey fields (`source`, `target`, `value`). Volumes are
// thousands of cubic kilometres per year. The cycle: Ocean →
// Atmosphere → Clouds → (Land Rain | Ocean directly) → reservoirs →
// Surface Water → Ocean. Return-to-Ocean edges close the loop —
// SankeyDiagram draws those as curved back-arrows, ProcessSankey
// places them at their actual months on the time axis.
const waterEdges = [
  // ── Evaporation: year-round, peaks summer; ocean is the biggest source ──
  { source: "Ocean",         target: "Atmosphere",    value: 425, startMonth: 1,  endMonth: 12 },
  { source: "Surface Water", target: "Atmosphere",    value: 10,  startMonth: 5,  endMonth: 9  },
  { source: "Vegetation",    target: "Atmosphere",    value: 70,  startMonth: 4,  endMonth: 10 }, // transpiration
  // ── Condensation: atmosphere → clouds, continuous ──
  { source: "Atmosphere",    target: "Clouds",        value: 505, startMonth: 1,  endMonth: 12 },
  // ── Precipitation: clouds split between ocean and land; mostly winter/spring on land ──
  { source: "Clouds",        target: "Ocean",         value: 385, startMonth: 1,  endMonth: 12 },
  { source: "Clouds",        target: "Land Rain",     value: 90,  startMonth: 3,  endMonth: 11 },
  { source: "Clouds",        target: "Snowpack",      value: 25,  startMonth: 11, endMonth: 3  },
  { source: "Clouds",        target: "Glaciers",      value: 5,   startMonth: 12, endMonth: 2  },
  // ── Land precipitation routes onto / into the surface ──
  { source: "Land Rain",     target: "Soil Moisture", value: 50,  startMonth: 3,  endMonth: 11 },
  { source: "Land Rain",     target: "Surface Water", value: 40,  startMonth: 3,  endMonth: 11 },
  // ── Snow + glacier melt: cycle's most visible temporal signal ──
  { source: "Snowpack",      target: "Surface Water", value: 25,  startMonth: 3,  endMonth: 6  },
  { source: "Glaciers",      target: "Surface Water", value: 5,   startMonth: 6,  endMonth: 9  },
  // ── Soil moisture → vegetation (uptake) and groundwater (slow) ──
  { source: "Soil Moisture", target: "Vegetation",    value: 30,  startMonth: 4,  endMonth: 10 },
  { source: "Soil Moisture", target: "Groundwater",   value: 15,  startMonth: 1,  endMonth: 12 },
  // ── Return to ocean: rivers (fast) + groundwater (slow); these are the cyclic edges ──
  { source: "Surface Water", target: "Ocean",         value: 60,  startMonth: 1,  endMonth: 12 },
  { source: "Groundwater",   target: "Ocean",         value: 5,   startMonth: 1,  endMonth: 12 },
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

// Month-label tick set for ProcessSankey's x-axis. The chart accepts
// arbitrary `{ date, label }` ticks; using calendar months keeps the
// reading mental-model intuitive.
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const monthTicks = Array.from({ length: 12 }, (_, i) => ({
  date: i + 1,
  label: MONTHS[i],
}))

// Tooltip time formatter — match the axis labels so the tooltip's
// start/end fields read as month names too. Default formatter assumes
// ms-since-epoch, which renders our 1..13 month indices as 1970-01-01.
const monthLabel = (m) => {
  const n = Number(m)
  if (!Number.isFinite(n)) return ""
  const idx = Math.floor(n) - 1
  if (idx >= 0 && idx < 12) return MONTHS[idx]
  return n === 13 ? "Dec end" : String(n)
}

// ProcessSankey passes `startMonth` / `endMonth` through verbatim, so
// `domain` is just `[1, 13]` (the 13 is "end-of-year" — a sentinel
// just past December the wrap-split uses as a clean stopping point).
// Edges whose `endMonth < startMonth` (Snowpack: Nov→Mar; Glaciers:
// Dec→Feb) are interpreted as wrapping across the year boundary —
// we pre-expand those into two half-edges so the chart sees a
// monotone time axis.
//
// The first half goes from `startMonth` to 13 (NOT 12 — using 12
// would produce a zero-duration edge for any edge whose
// `startMonth` is already 12, which ProcessSankey's validator
// rejects as "ends before it starts"). The second half goes from
// 1 to `endMonth`. Values are prorated proportionally to each
// half's share of the original duration.
const expandedEdges = waterEdges.flatMap((e) => {
  if (e.endMonth >= e.startMonth) return [e]
  const span = (13 - e.startMonth) + e.endMonth
  return [
    { ...e, endMonth: 13, value: e.value * (13 - e.startMonth) / span },
    { ...e, startMonth: 1, value: e.value * e.endMonth / span },
  ]
})

// ── Component ────────────────────────────────────────────────────────

const Caption = ({ children }) => (
  <div style={{
    fontSize: 12, color: "var(--semiotic-text-secondary, #525252)",
    marginTop: 8, marginBottom: 4, lineHeight: 1.4,
  }}>{children}</div>
)

const PanelHeading = ({ children, subtitle }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--semiotic-text, #161616)" }}>{children}</div>
    {subtitle && <div style={{ fontSize: 12, color: "var(--semiotic-text-secondary, #525252)", marginTop: 2 }}>{subtitle}</div>}
  </div>
)

export default function WaterCycleFlow() {
  return (
    <ThemeProvider theme="carbon">
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>

        {/* ── Classic Sankey ─────────────────────────────────────────── */}
        <div>
          <PanelHeading subtitle="d3-sankey lays out reservoirs as ranked columns. Return-to-Ocean edges become curved back-arrows because the layout can't represent the cycle in its column ordering. Edge times are ignored entirely — the diagram answers 'what fraction of total flow moves between these nodes annually?'">
            SankeyDiagram — system-readable, time-blind
          </PanelHeading>
          <div style={{ background: "var(--surface-1, #f4f4f4)", border: "1px solid var(--surface-3, #e0e0e0)", borderRadius: 4, padding: 12 }}>
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
              width={700}
              height={420}
            />
          </div>
          <Caption>
            <strong>What it shows well:</strong> the relative magnitudes — the ocean→atmosphere ribbon dominates because that's where most of the global flux is.{" "}
            <strong>What it loses:</strong> the entire seasonal signal (snowmelt in spring, transpiration in summer), and the cycle itself becomes a tangle of return-curves rather than a closed loop.
          </Caption>
        </div>

        {/* ── Process Sankey ─────────────────────────────────────────── */}
        <div>
          <PanelHeading subtitle="ProcessSankey reads the same edges' startMonth/endMonth as the x-axis. Cycles unroll temporally — Ocean appears once, water leaves it, travels through the atmosphere and land, and returns to it later in the year. Lanes pack vertically by lifetime so the diagram stays compact.">
            ProcessSankey — temporal, cycle-natural
          </PanelHeading>
          <div style={{ background: "var(--surface-1, #f4f4f4)", border: "1px solid var(--surface-3, #e0e0e0)", borderRadius: 4, padding: 12 }}>
            <ProcessSankey
              nodes={waterNodes}
              edges={expandedEdges}
              sourceAccessor="source"
              targetAccessor="target"
              valueAccessor="value"
              nodeIdAccessor="id"
              startTimeAccessor="startMonth"
              endTimeAccessor="endMonth"
              domain={[1, 13]}
              axisTicks={monthTicks}
              timeFormat={monthLabel}
              colorBy="id"
              colorScheme={carbonScheme}
              showLegend
              legendPosition="right"
              packing="reuse"
              laneOrder="crossing-min"
              ribbonLane="both"
              width={780}
              height={420}
            />
          </div>
          <Caption>
            <strong>What it shows well:</strong> the seasonal phase shift — precipitation lights up Nov–Mar (snowpack accumulation), then a sharp Mar–Jun snowmelt pulse feeds Surface Water before transpiration takes over in summer.{" "}
            <strong>What it loses:</strong> the immediate read of "how big is this flow?" — value magnitudes are encoded in ribbon thickness but the eye is drawn first to the temporal layout, not the relative size.
          </Caption>
        </div>
      </div>
    </ThemeProvider>
  )
}
