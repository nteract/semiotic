/**
 * Anscombe's Sankey — four timing scenarios with identical aggregate.
 *
 * The trick: every scenario uses the SAME 12 patient journey
 * templates (same ward sequences, same cycle structure, same total
 * counts). Only the arrival times differ. Because SankeyDiagram
 * aggregates events by source→target pair, all four scenarios
 * produce visually identical aggregate diagrams. ProcessSankey,
 * reading the timestamps as its x-axis, shows four completely
 * different operational stories.
 *
 * This is the patient-journey version of Anscombe's quartet — the
 * summary statistic (aggregate flow) is the same, the underlying
 * shape (temporal pattern) couldn't be more different.
 */
import React, { useState, useMemo } from "react"
import { SankeyDiagram, ProcessSankey, ThemeProvider } from "semiotic"

// ── Shared ward set + carbon palette ─────────────────────────────────
const wardNodes = [
  { id: "ER" },
  { id: "Surgery" },
  { id: "ICU" },
  { id: "General" },
  { id: "Discharge" },
]

const carbonScheme = [
  "#0f62fe", // ER
  "#8a3ffc", // Surgery (purple-60 — distinct from ICU's magenta-70)
  "#9f1853", // ICU
  "#005d5d", // General
  "#24a148", // Discharge
]

// ── Patient journey templates ────────────────────────────────────────
//
// Each template is a sequence of (toWard, stayLengthInDays) steps,
// starting from ER. The total path defines the patient's ward
// sequence and stay durations relative to admit time. Cycle
// structure is baked into the template (P2 General→ICU
// readmission, P8 surgical re-op, P11 cardiac re-event).
//
// Critically, every scenario reuses these templates verbatim — only
// the per-patient admit time varies. That's what locks the
// aggregate Sankey to the same shape across all four.

/** A single hop: when the patient moves to `ward`, and how long they
 *  spent in the PRIOR ward (the duration of the edge into `ward`). */
const T = (ward, durationDays) => ({ ward, durationDays })

const patientTemplates = {
  // Stroke: ER → ICU (0.15d) → General (0.95d) → Discharge (2.05d)
  P1:  [T("ICU", 0.15), T("General", 0.95), T("Discharge", 2.05)],
  // Cardiac w/ readmission cycle
  P2:  [T("ICU", 0.10), T("General", 1.35), T("ICU", 0.30), T("General", 2.10), T("Discharge", 1.90)],
  // Minor case
  P3:  [T("General", 0.20), T("Discharge", 1.10)],
  // Trauma — surgery → ICU → general
  P4:  [T("Surgery", 0.10), T("ICU", 0.20), T("General", 1.85), T("Discharge", 1.80)],
  // Critical trauma — long ICU; ends week still in General (no Discharge step)
  P5:  [T("Surgery", 0.15), T("ICU", 0.20), T("General", 3.15)],
  // Moderate trauma — no ICU
  P6:  [T("Surgery", 0.15), T("General", 1.60), T("Discharge", 1.40)],
  // Internal bleeding — ICU → Surgery (delayed) → ICU
  P7:  [T("ICU", 0.10), T("Surgery", 0.20), T("ICU", 0.20), T("General", 2.30), T("Discharge", 2.00)],
  // Severe injuries with re-op cycle; ends week still in General
  P8:  [T("Surgery", 0.15), T("ICU", 0.20), T("Surgery", 0.20), T("ICU", 0.20), T("General", 2.20)],
  // Most critical — single-edge ICU stay spanning entire window
  P9:  [T("ICU", 0.10)],
  // Fast-track minor
  P10: [T("General", 0.15), T("Discharge", 0.85)],
  // Cardiac w/ in-General re-event cycle; ends week still in General
  P11: [T("ICU", 0.15), T("General", 0.75), T("ICU", 0.40), T("General", 1.00)],
  // Planned surgery
  P12: [T("Surgery", 0.15), T("General", 0.85), T("Discharge", 0.50)],
}

/**
 * Expand a `patient → admitDay` map into a flat array of edges
 * suitable for both SankeyDiagram and ProcessSankey.
 *
 * Each edge spans the patient's full stay in its source ward —
 * `startDay` is when they arrived at the source, `endDay` is when
 * they arrive at the target. The aggregate source→target counts
 * are determined by the templates (identical across all admitTime
 * maps); only the start/end stamps vary, which is what locks the
 * SankeyDiagram aggregate to the same shape across scenarios.
 *
 * First edges (ER → next ward) carry `systemInDay = startDay - 0.1`
 * so ProcessSankey cuts a slot out of the ER band from the band's
 * left edge to the scaled `systemInDay`, sized to that edge's
 * ribbon thickness. The cumulative effect is a staircase: the ER
 * lane is mostly empty on the left, fills in step by step as
 * patients arrive, and reaches full thickness only after the last
 * admit. The 0.1-day gap between `systemInDay` and `startDay`
 * keeps the cutout visually distinct from the ribbon. Cutouts are
 * pure rendering — the layout and mass profile are unchanged.
 * SankeyDiagram ignores `systemInDay` entirely, so the aggregate
 * is unaffected.
 */
function buildEdges(admitTimes) {
  const edges = []
  for (const [patient, admitDay] of Object.entries(admitTimes)) {
    const tmpl = patientTemplates[patient]
    if (!tmpl) continue
    let prevWard = "ER"
    // `arrivalAtPrev` is when the patient ARRIVED at the source ward
    // of the upcoming edge. First edge: ER admit time. Subsequent
    // edges: the previous edge's `endDay`.
    let arrivalAtPrev = admitDay
    tmpl.forEach((step, i) => {
      const startDay = arrivalAtPrev
      const endDay = arrivalAtPrev + step.durationDays
      const edge = {
        id: `${patient}-${i + 1}`,
        patient,
        source: prevWard,
        target: step.ward,
        value: 1,
        startDay,
        endDay,
      }
      // First edge gets a wide cutout (band-left → systemInDay) on
      // the ER source band. Subtract 0.1 to leave a small visual gap
      // between the cutout's right edge and the ribbon's left edge.
      if (i === 0) edge.systemInDay = startDay - 0.1
      edges.push(edge)
      prevWard = step.ward
      arrivalAtPrev = endDay
    })
  }
  return edges
}

// ── Four scenarios (same templates, different admit-time maps) ──────

// Scenario A: Saturday-evening mass-casualty surge. Six trauma
// patients arrive in a 4-hour window (Day 1.85–2.1). Three pre-
// surge admits, three post-surge.
const SURGE_TIMES = {
  P1:  0.40,  P2:  0.75,  P3:  1.20,                              // pre-surge trickle
  P4:  1.85,  P5:  1.90,  P6:  1.95,  P7:  2.00,  P8:  2.05, P9: 2.10,  // SURGE
  P10: 3.50,  P11: 4.10,  P12: 5.40,                              // post-surge normalization
}

// Scenario B: Normal operations. Twelve admits evenly distributed
// across the week (~one every 14 hours).
const NORMAL_TIMES = {
  P1:  0.35,  P2:  0.95,  P3:  1.50,  P4:  2.10,  P5:  2.70,  P6:  3.25,
  P7:  3.80,  P8:  4.35,  P9:  4.90,  P10: 5.40,  P11: 5.90,  P12: 6.40,
}

// Scenario C: Delayed outbreak (foodborne / flu / respiratory).
// Two scattered pre-onset admits, then ten admits cluster Days 3.7–5.2
// as the outbreak peaks. Several patients still in the system at week's end.
const OUTBREAK_TIMES = {
  P1:  0.50,  P2:  1.30,                                          // baseline
  P3:  3.70,  P4:  3.85,  P5:  3.95,  P6:  4.10,  P7:  4.25,      // outbreak ramp
  P8:  4.40,  P9:  4.55,  P10: 4.70,  P11: 4.90,  P12: 5.10,
}

// Scenario D: Shift-change rhythm. Admits cluster at predictable
// times each day — morning shift (~9am, Day X.40) and evening
// shift (~8pm, Day X.85). The pattern is what an emergency
// scheduling team would aim for; the periodicity is unmistakable
// in the temporal view, invisible in the aggregate.
const RHYTHM_TIMES = {
  P1:  0.40,  P2:  0.85,
  P3:  1.40,  P4:  1.85,
  P5:  2.40,  P6:  2.85,
  P7:  3.40,  P8:  3.85,
  P9:  4.40,  P10: 4.85,
  P11: 5.40,  P12: 5.85,
}

const scenarios = [
  {
    id: "surge",
    title: "Mass-casualty surge",
    headline: "Saturday-evening bus accident; six trauma cases inside a 4-hour window.",
    times: SURGE_TIMES,
    tell: "The vertical wall around Day 2 is the surge. ICU and Surgery saturate; three surge patients still admitted at week's end.",
  },
  {
    id: "normal",
    title: "Normal operations",
    headline: "Routine week — admits drift in roughly every 14 hours.",
    times: NORMAL_TIMES,
    tell: "Even spread, low concurrent census, system never breaks a sweat. Nothing's wrong; nothing's interesting either.",
  },
  {
    id: "outbreak",
    title: "Delayed outbreak",
    headline: "Quiet first half, then ten admits cluster Days 3.7–5 as the bug peaks.",
    times: OUTBREAK_TIMES,
    tell: "Empty timeline through Wednesday, then the right half of the chart fills as the cohort piles in. End-of-week census stays elevated.",
  },
  {
    id: "rhythm",
    title: "Shift-change rhythm",
    headline: "Admits cluster at the morning and evening shift changes every day.",
    times: RHYTHM_TIMES,
    tell: "Twelve admits, six daily peaks. The periodicity is unmistakable — and only the temporal view shows it.",
  },
]

// ── UI ──────────────────────────────────────────────────────────────

const Caption = ({ children }) => (
  <div style={{
    fontSize: 12, color: "var(--semiotic-text-secondary, #525252)",
    marginTop: 8, marginBottom: 4, lineHeight: 1.4,
  }}>{children}</div>
)

const ScenarioLabel = ({ title, headline }) => (
  <div style={{ marginBottom: 6 }}>
    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--semiotic-text, #161616)" }}>{title}</div>
    <div style={{ fontSize: 11, color: "var(--semiotic-text-secondary, #525252)", marginTop: 1 }}>{headline}</div>
  </div>
)

export default function AnscombesSankey() {
  // Memoize so the hovered-scenario state setter below doesn't churn
  // a new edges/ticks reference each render — that was making the
  // aggregate SankeyDiagram re-run its entry animation every time
  // the 2×2 grid below produced a hover event.
  const aggregateEdges = useMemo(() => buildEdges(SURGE_TIMES), [])
  // Domain extended to Day 8 so the post-surge / outbreak / shift-change
  // scenarios — whose late admits push some patient journeys past the
  // end of a strict 7-day window — don't clip at the chart's right edge.
  const dayTicks = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ date: i, label: `Day ${i}` })), [])
  // Match the day-axis labels in tooltips. ProcessSankey ships a Date
  // formatter as default; without an explicit `timeFormat`, our small
  // day-index values would render as 1970-01-01.
  const dayLabel = useMemo(() => (d) => {
    const day = Number(d)
    if (!Number.isFinite(day)) return ""
    return Number.isInteger(day) ? `Day ${day}` : `Day ${day.toFixed(2)}`
  }, [])
  // Memoize per-scenario edges too so each ProcessSankey only re-runs
  // its layout when its own data actually changes (i.e., never).
  const scenarioEdges = useMemo(() => scenarios.map((s) => buildEdges(s.times)), [])
  const [hoveredScenario, setHoveredScenario] = useState(null)

  return (
    <ThemeProvider theme="carbon">
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>

        {/* ── Single aggregate ────────────────────────────────────── */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: "var(--semiotic-text, #161616)" }}>
            One aggregate Sankey — true for all four scenarios below
          </div>
          <div style={{ fontSize: 12, color: "var(--semiotic-text-secondary, #525252)", marginBottom: 8 }}>
            Same 12 patients, same routes, same ribbon thicknesses. The aggregate cannot tell these four weeks apart.
          </div>
          <div style={{ background: "var(--surface-1, #f4f4f4)", border: "1px solid var(--surface-3, #e0e0e0)", borderRadius: 4, padding: 12 }}>
            <SankeyDiagram
              nodes={wardNodes}
              edges={aggregateEdges}
              sourceAccessor="source"
              targetAccessor="target"
              valueAccessor="value"
              nodeIdAccessor="id"
              colorBy="id"
              colorScheme={carbonScheme}
              edgeColorBy="source"
              orientation="horizontal"
              nodePaddingRatio={0.3}
              nodeWidth={10}
              showLabels
              width={700}
              height={320}
            />
          </div>
        </div>

        {/* ── 2×2 grid of ProcessSankeys ──────────────────────────── */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: "var(--semiotic-text, #161616)" }}>
            Four ProcessSankeys — the four weeks the aggregate just hid
          </div>
          <div style={{ fontSize: 12, color: "var(--semiotic-text-secondary, #525252)", marginBottom: 12 }}>
            Identical aggregate above, but the temporal layout reveals four operationally distinct realities.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {scenarios.map((sc, idx) => {
              const isHovered = hoveredScenario === sc.id
              return (
                <div
                  key={sc.id}
                  onMouseEnter={() => setHoveredScenario(sc.id)}
                  onMouseLeave={() => setHoveredScenario(null)}
                  style={{
                    background: "var(--surface-1, #f4f4f4)",
                    border: `1px solid ${isHovered ? "var(--semiotic-primary, #0f62fe)" : "var(--surface-3, #e0e0e0)"}`,
                    borderRadius: 4,
                    padding: 12,
                    transition: "border-color 0.15s ease",
                  }}
                >
                  <ScenarioLabel title={sc.title} headline={sc.headline} />
                  <ProcessSankey
                    nodes={wardNodes}
                    edges={scenarioEdges[idx]}
                    sourceAccessor="source"
                    targetAccessor="target"
                    valueAccessor="value"
                    nodeIdAccessor="id"
                    edgeIdAccessor="id"
                    startTimeAccessor="startDay"
                    endTimeAccessor="endDay"
                    systemInTimeAccessor="systemInDay"
                    domain={[0, 8]}
                    axisTicks={dayTicks}
                    timeFormat={dayLabel}
                    colorBy="id"
                    colorScheme={carbonScheme}
                    showLegend={false}
                    packing="reuse"
                    laneOrder="crossing-min"
                    ribbonLane="both"
                    width={380}
                    height={240}
                  />
                  <Caption>{sc.tell}</Caption>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
