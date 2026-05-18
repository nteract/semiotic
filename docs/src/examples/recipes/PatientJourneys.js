/**
 * Patient-journey comparison: SankeyDiagram vs ProcessSankey.
 *
 * Built around a Saturday-evening mass-casualty event so the recipe
 * has a STORY only the temporal layout can tell. Three pre-surge
 * patients arrive Friday/Saturday morning at a normal trickle.
 * Then at Day 1.85 (Saturday ~9pm) six trauma patients arrive
 * inside a 4-hour window — a bus accident, food poisoning outbreak,
 * pick your real-world analogue. The wave cascades: surgery rooms
 * saturate Day 2.0–2.5, ICU runs near capacity Day 2.2–3.0, the
 * General ward fills as the surge cohort recovers. Three patients
 * from the surge (P5, P8, P9) are still admitted at the week's end.
 * Then on Day 3.5+ normal admit rates resume.
 *
 * The story Sankey loses: 12 patients route through the same five
 * wards either way. The aggregate ribbon thicknesses are identical
 * whether those admits arrived uniformly or in a single 4-hour
 * burst. ProcessSankey makes the burst visible as a vertical wall
 * of activity around Day 2 — the kind of pattern a hospital
 * operations dashboard exists to surface.
 *
 * The cycles still in play (independent of the surge): P2 ICU
 * readmission, P8 surgical re-op, P11 cardiac re-event in General.
 * Each is a forward-moving event on the timeline rather than a
 * back-arrow in the layout.
 */
import React from "react"
import { SankeyDiagram, ProcessSankey, ThemeProvider } from "semiotic"
import { useDocsTheme } from "../../hooks/useDocsTheme"

// ── Five wards in the patient's path. Surgery and ICU live in the
//    middle of the typical journey; General is the recovery stop;
//    Discharge is the sink. ER is the source. ───────────────────────
//
// Discharge carries an explicit `xExtent` ending at Day 7 so the lane
// keeps drawing past the last discharge edge (Day 6.9, P12-3) out to
// the domain's right edge. Two reasons: (1) `axisRight` follows the
// widest lane lifetime, so without the extension the Day-7 axis tick
// gets hidden and the axis line stops a few pixels short of the plot
// edge; (2) the band gains a bit more breathing room which makes the
// rightmost discharge slots easier to read in the small height the
// blog reserves for this chart.
const wardNodes = [
  { id: "ER" },
  { id: "Surgery" },
  { id: "ICU" },
  { id: "General" },
  { id: "Discharge", xExtent: [2.5, 7] },
]

// ── 12 patients × 41 transition events over 7 days. Three temporal
//    phases on purpose: PRE-SURGE (Days 0–1.7) is a normal trickle
//    of 3 admits. THE SURGE (Day 1.85–2.1) is a mass-casualty event
//    that drops 6 trauma patients into the ER inside a 4-hour
//    window. POST-SURGE (Days 3.5+) the admit rate returns to
//    normal. Each `value: 1` makes the aggregated SankeyDiagram
//    show patient counts; ProcessSankey paints every event at its
//    actual day. ────────────────────────────────────────────────────
const patientEvents = [
  // ── Pre-surge: normal Friday-Saturday-morning admits ────────────

  // P1 — stroke, Friday evening
  {
    id: "P1-1",
    patient: "P1",
    source: "ER",
    target: "ICU",
    value: 1,
    systemInDay: 0.3,
    startDay: 0.4,
    endDay: 0.55,
  },
  {
    id: "P1-2",
    patient: "P1",
    source: "ICU",
    target: "General",
    value: 1,
    startDay: 0.55,
    endDay: 1.5,
  },
  {
    id: "P1-3",
    patient: "P1",
    source: "General",
    target: "Discharge",
    value: 1,
    startDay: 1.5,
    endDay: 3.6,
  },

  // P2 — cardiac event with bounceback (independent readmission cycle —
  //       happens to crash through the surge window, increasing pressure)
  {
    id: "P2-1",
    patient: "P2",
    source: "ER",
    target: "ICU",
    value: 1,
    systemInDay: 0.65,
    startDay: 0.75,
    endDay: 0.85,
  },
  {
    id: "P2-2",
    patient: "P2",
    source: "ICU",
    target: "General",
    value: 1,
    startDay: 0.85,
    endDay: 2.2,
  },
  {
    id: "P2-3",
    patient: "P2",
    source: "General",
    target: "ICU",
    value: 1,
    startDay: 2.2,
    endDay: 2.5,
  }, // back to ICU
  {
    id: "P2-4",
    patient: "P2",
    source: "ICU",
    target: "General",
    value: 1,
    startDay: 2.5,
    endDay: 4.6,
  },
  {
    id: "P2-5",
    patient: "P2",
    source: "General",
    target: "Discharge",
    value: 1,
    startDay: 4.6,
    endDay: 6.5,
  },

  // P3 — minor case Saturday morning, fast track
  {
    id: "P3-1",
    patient: "P3",
    source: "ER",
    target: "General",
    value: 1,
    systemInDay: 1.1,
    startDay: 1.2,
    endDay: 1.4,
  },
  {
    id: "P3-2",
    patient: "P3",
    source: "General",
    target: "Discharge",
    value: 1,
    startDay: 1.4,
    endDay: 2.5,
  },

  // ── THE SURGE — Saturday ~9pm. Mass-casualty event drops six
  //    trauma patients into the ER inside a 4-hour window. The
  //    aggregate counts blur into the background; the temporal
  //    cluster is the story. ──────────────────────────────────────

  // P4 — trauma victim, immediate surgery
  {
    id: "P4-1",
    patient: "P4",
    source: "ER",
    target: "Surgery",
    value: 1,
    systemInDay: 1.75,
    startDay: 1.85,
    endDay: 1.95,
  },
  {
    id: "P4-2",
    patient: "P4",
    source: "Surgery",
    target: "ICU",
    value: 1,
    startDay: 1.95,
    endDay: 2.15,
  },
  {
    id: "P4-3",
    patient: "P4",
    source: "ICU",
    target: "General",
    value: 1,
    startDay: 2.15,
    endDay: 4.0,
  },
  {
    id: "P4-4",
    patient: "P4",
    source: "General",
    target: "Discharge",
    value: 1,
    startDay: 4.0,
    endDay: 5.8,
  },

  // P5 — critical trauma, long ICU stay (still admitted at week's end)
  {
    id: "P5-1",
    patient: "P5",
    source: "ER",
    target: "Surgery",
    value: 1,
    systemInDay: 1.8,
    startDay: 1.9,
    endDay: 2.05,
  },
  {
    id: "P5-2",
    patient: "P5",
    source: "Surgery",
    target: "ICU",
    value: 1,
    startDay: 2.05,
    endDay: 2.25,
  },
  {
    id: "P5-3",
    patient: "P5",
    source: "ICU",
    target: "General",
    value: 1,
    startDay: 2.25,
    endDay: 5.4,
  },
  // (P5 still in General at end of window — no discharge edge)

  // P6 — moderate trauma, no ICU
  {
    id: "P6-1",
    patient: "P6",
    source: "ER",
    target: "Surgery",
    value: 1,
    systemInDay: 1.85,
    startDay: 1.95,
    endDay: 2.1,
  },
  {
    id: "P6-2",
    patient: "P6",
    source: "Surgery",
    target: "General",
    value: 1,
    startDay: 2.1,
    endDay: 3.7,
  },
  {
    id: "P6-3",
    patient: "P6",
    source: "General",
    target: "Discharge",
    value: 1,
    startDay: 3.7,
    endDay: 5.1,
  },

  // P7 — internal bleeding, exploratory surgery after ICU stabilization
  {
    id: "P7-1",
    patient: "P7",
    source: "ER",
    target: "ICU",
    value: 1,
    systemInDay: 1.9,
    startDay: 2.0,
    endDay: 2.1,
  },
  {
    id: "P7-2",
    patient: "P7",
    source: "ICU",
    target: "Surgery",
    value: 1,
    startDay: 2.1,
    endDay: 2.3,
  }, // delayed surgery
  {
    id: "P7-3",
    patient: "P7",
    source: "Surgery",
    target: "ICU",
    value: 1,
    startDay: 2.3,
    endDay: 2.5,
  },
  {
    id: "P7-4",
    patient: "P7",
    source: "ICU",
    target: "General",
    value: 1,
    startDay: 2.5,
    endDay: 4.8,
  },
  {
    id: "P7-5",
    patient: "P7",
    source: "General",
    target: "Discharge",
    value: 1,
    startDay: 4.8,
    endDay: 6.8,
  },

  // P8 — severe injuries, post-op re-op for bleeding (surgical cycle)
  {
    id: "P8-1",
    patient: "P8",
    source: "ER",
    target: "Surgery",
    value: 1,
    systemInDay: 1.95,
    startDay: 2.05,
    endDay: 2.2,
  },
  {
    id: "P8-2",
    patient: "P8",
    source: "Surgery",
    target: "ICU",
    value: 1,
    startDay: 2.2,
    endDay: 2.4,
  },
  {
    id: "P8-3",
    patient: "P8",
    source: "ICU",
    target: "Surgery",
    value: 1,
    startDay: 2.4,
    endDay: 2.6,
  }, // re-op
  {
    id: "P8-4",
    patient: "P8",
    source: "Surgery",
    target: "ICU",
    value: 1,
    startDay: 2.6,
    endDay: 2.8,
  },
  {
    id: "P8-5",
    patient: "P8",
    source: "ICU",
    target: "General",
    value: 1,
    startDay: 2.8,
    endDay: 5.0,
  },
  // (P8 still in General at end of window — no discharge edge)

  // P9 — most critical, stays in ICU all week
  {
    id: "P9-1",
    patient: "P9",
    source: "ER",
    target: "ICU",
    value: 1,
    systemInDay: 2,
    startDay: 2.1,
    endDay: 2.2,
  },
  // (P9 still in ICU at end of window — single transition, illustrates the
  //  "long admission spanning the data window" case real dashboards face)

  // ── Post-surge: normal admit rate resumes ──────────────────────

  // P10 — minor case, fast track Monday
  {
    id: "P10-1",
    patient: "P10",
    source: "ER",
    target: "General",
    value: 1,
    systemInDay: 3.4,
    startDay: 3.5,
    endDay: 3.65,
  },
  {
    id: "P10-2",
    patient: "P10",
    source: "General",
    target: "Discharge",
    value: 1,
    startDay: 3.65,
    endDay: 4.5,
  },

  // P11 — cardiac, in-General re-event (deterioration cycle)
  {
    id: "P11-1",
    patient: "P11",
    source: "ER",
    target: "ICU",
    value: 1,
    systemInDay: 4,
    startDay: 4.1,
    endDay: 4.25,
  },
  {
    id: "P11-2",
    patient: "P11",
    source: "ICU",
    target: "General",
    value: 1,
    startDay: 4.25,
    endDay: 5.0,
  },
  {
    id: "P11-3",
    patient: "P11",
    source: "General",
    target: "ICU",
    value: 1,
    startDay: 5.0,
    endDay: 5.4,
  }, // re-event
  {
    id: "P11-4",
    patient: "P11",
    source: "ICU",
    target: "General",
    value: 1,
    startDay: 5.4,
    endDay: 6.4,
  },
  // (P11 still in General at end of window)

  // P12 — planned surgery Tuesday
  {
    id: "P12-1",
    patient: "P12",
    source: "ER",
    target: "Surgery",
    value: 1,
    systemInDay: 5.3,
    startDay: 5.4,
    endDay: 5.55,
  },
  {
    id: "P12-2",
    patient: "P12",
    source: "Surgery",
    target: "General",
    value: 1,
    startDay: 5.55,
    endDay: 6.4,
  },
  {
    id: "P12-3",
    patient: "P12",
    source: "General",
    target: "Discharge",
    value: 1,
    startDay: 6.4,
    endDay: 6.9,
  },
]

// ── Day-label ticks for ProcessSankey's x-axis. The data spans 7
//    days; render labels 0..7 so the reader can map back to "day of
//    week" naturally. ──────────────────────────────────────────────
const dayTicks = Array.from({ length: 8 }, (_, i) => ({
  date: i,
  label: `Day ${i}`,
}))

// Tooltip time formatter — match the axis-label convention so the
// tooltip's start/end fields read as "Day N" too. Without this the
// chart's default `new Date(t).toISOString()` formatter renders the
// small day numbers as 1970-01-01.
const dayLabel = (d) => {
  const day = Number(d)
  if (!Number.isFinite(day)) return ""
  return Number.isInteger(day) ? `Day ${day}` : `Day ${day.toFixed(2)}`
}

// Carbon palette — same 5-element subset for both diagrams so the
// ward identities are visually consistent across them.
const carbonScheme = [
  "#0f62fe", // ER
  "#8a3ffc", // Surgery (purple-60 — distinct from ICU's magenta-70)
  "#9f1853", // ICU (critical)
  "#005d5d", // General (recovery)
  "#24a148", // Discharge (good outcome)
]

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

export default function PatientJourneys() {
  // Follow the ambient docs theme so dark-mode readers don't see a
  // light-Carbon island. `useDocsTheme` mirrors `<html data-theme>`.
  const [docsTheme] = useDocsTheme()
  const themeName = docsTheme === "dark" ? "carbon-dark" : "carbon"
  return (
    <ThemeProvider theme={themeName}>
      {/* Wrapper paints `--semiotic-bg` so the whole recipe lives on the
          chosen Carbon variant's surface. */}
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
        {/* ── Classic Sankey — aggregated patient flow ───────────────── */}
        <div>
          <PanelHeading subtitle="Classical sankey diagrams collapse every patient's transitions into the underlying source to target counts. You see the funnel clearly: most patients hit ICU before General, and ribbon thickness is the total patient count along each route. The same 12 patients could have arrived uniformly across the week or in a single 4-hour burst; this chart looks identical either way.">
            SankeyDiagram — aggregated ward flow
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
              nodes={wardNodes}
              edges={patientEvents}
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
              // Match the ProcessSankey below — bottom legend so the
              // horizontal lane fills the panel instead of reserving
              // 110 px on the right for an unread legend. Width pinned
              // to 780 to mirror the ProcessSankey, otherwise the
              // Sankey reads as a smaller-framed sibling.
              legendPosition="bottom"
              width={780}
              height={360}
            />
          </div>
        </div>

        {/* ── Process Sankey — every event at its actual time ───────── */}
        <div>
          <PanelHeading subtitle="Same data on a time axis with a process sankey. The vertical wall around Day 2 is the surge as six trauma patients hit ER, Surgery, then ICU inside a 4-hour window. The pre- and post-surge admit rates are visibly thinner. Independent cycles (P2 ICU readmission on Day 2.2; P8 surgical re-op on Day 2.4; P11 cardiac re-event on Day 5.0) unroll as forward-moving events in time.">
            ProcessSankey — per-patient timeline
          </PanelHeading>
          <div
            style={{
              background: "var(--semiotic-surface, #f4f4f4)",
              border: "1px solid var(--semiotic-border, #e0e0e0)",
              borderRadius: 4,
              padding: 8,
            }}
          >
            <ProcessSankey
              nodes={wardNodes}
              edges={patientEvents}
              sourceAccessor="source"
              targetAccessor="target"
              valueAccessor="value"
              nodeIdAccessor="id"
              edgeIdAccessor="id"
              startTimeAccessor="startDay"
              endTimeAccessor="endDay"
              systemInTimeAccessor="systemInDay"
              domain={[0, 7]}
              axisTicks={dayTicks}
              timeFormat={dayLabel}
              colorBy="id"
              colorScheme={carbonScheme}
              showLegend
              legendPosition="bottom"
              packing="reuse"
              laneOrder="crossing-min"
              ribbonLane="both"
              width={780}
              height={440}
            />
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
