import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  CategoryColorProvider,
  LinkedCharts,
  Scatterplot,
  StackedAreaChart,
  ThemeProvider,
  useSelection,
} from "semiotic"
import { GauntletChart, ProcessFlowChart } from "semiotic/physics"
import { unwrapDatum } from "semiotic/utils"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import { useDocsTheme } from "../../hooks/useDocsTheme"

// ---------------------------------------------------------------------------
// Shared layout styles
// ---------------------------------------------------------------------------

const demoShellStyle = {
  border: "1px solid var(--surface-3)",
  borderRadius: 10,
  background: "var(--surface-1)",
  padding: 14,
  margin: "16px 0 24px",
  overflow: "auto",
}

const controlRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  alignItems: "center",
  marginBottom: 12,
}

const buttonStyle = {
  minHeight: 34,
  border: "1px solid var(--surface-3)",
  borderRadius: 6,
  background: "var(--surface-0)",
  color: "var(--text-primary)",
  padding: "0 12px",
  cursor: "pointer",
  fontWeight: 600,
}

const readoutStyle = {
  fontSize: 13,
  color: "var(--text-secondary)",
  lineHeight: 1.5,
}

const chartTitleStyle = {
  margin: "0 0 8px",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.02em",
  textTransform: "uppercase",
  color: "var(--text-secondary)",
}

// ---------------------------------------------------------------------------
// Example 1 — Drug-trial gauntlet → stacked area of lift vs drag
// ---------------------------------------------------------------------------

const TRIAL_PROJECT = {
  id: "nexavax-7",
  label: "NexaVax-7",
  positives: ["efficacy", "safety"],
  negatives: ["toxicity", "cost"],
  metrics: { cohort: 420 },
  viability: 68,
}

// Property colors are the single source of truth for Gauntlet nodes AND the
// stacked-area series (via CategoryColorProvider + colorScheme map).
const POSITIVE_PROPERTIES = [
  { id: "efficacy", label: "Efficacy", short: "E", color: "#22c55e", value: 3.2, buoyancy: 2.6, radius: 10 },
  { id: "safety", label: "Safety", short: "S", color: "#06b6d4", value: 2.1, buoyancy: 2, radius: 9 },
  { id: "biomarker", label: "Biomarker", short: "B", color: "#a855f7", value: 2.0, buoyancy: 1.9, radius: 8 },
  { id: "manufacturing", label: "Manufacturing", short: "M", color: "#f59e0b", value: 1.5, buoyancy: 1.5, radius: 8 },
  { id: "access", label: "Access", short: "A", color: "#14b8a6", value: 1.3, buoyancy: 1.3, radius: 8 },
]

const NEGATIVE_PROPERTIES = [
  { id: "toxicity", label: "Toxicity", short: "T", color: "#ef4444", load: 1.7, radius: 8 },
  { id: "cost", label: "Cost", short: "$", color: "#f97316", load: 1.15, radius: 7 },
  { id: "recruitment", label: "Recruitment", short: "R", color: "#64748b", load: 1.0, radius: 7 },
  { id: "litigation", label: "Litigation", short: "L", color: "#be123c", load: 1.25, radius: 7 },
  { id: "supply", label: "Supply risk", short: "P", color: "#78716c", load: 0.95, radius: 7 },
]

const ALL_SERIES = [
  ...POSITIVE_PROPERTIES.map((p) => ({
    id: p.id,
    label: p.label,
    polarity: "benefit",
    color: p.color,
    magnitude: p.value ?? 1,
  })),
  ...NEGATIVE_PROPERTIES.map((p) => ({
    id: p.id,
    label: p.label,
    polarity: "risk",
    color: p.color,
    magnitude: p.load ?? 1,
  })),
]

/** Exact per-series colors — must match property `label` strings used as areaBy keys. */
const SERIES_COLOR_SCHEME = Object.fromEntries(ALL_SERIES.map((s) => [s.label, s.color]))
const SERIES_CATEGORIES = ALL_SERIES.map((s) => s.label)

const TRIAL_GATES = [
  {
    id: "preclinical",
    label: "Preclinical",
    color: "#06b6d4",
    regionEffect: { damping: 0.04, force: { x: 14, y: 0 } },
  },
  {
    id: "phase-i",
    label: "Phase I",
    color: "#f59e0b",
    regionEffect: { damping: 0.06, force: { x: 10, y: 4 } },
  },
  {
    id: "phase-ii",
    label: "Phase II",
    color: "#22c55e",
    regionEffect: { damping: 0.05, force: { x: 16, y: 0 } },
  },
  {
    id: "advisory",
    label: "Advisory vote",
    color: "#a855f7",
    regionEffect: { damping: 0.04, force: { x: 18, y: 0 } },
  },
]

/**
 * One x-tick per event (including the filed baseline). Labels are short so
 * the stacked area axis stays readable with a denser event schedule.
 */
const EVENT_TICKS = [
  { step: 0, label: "Filed", gate: "start" },
  { step: 1, label: "Tox screen", gate: "preclinical" },
  { step: 2, label: "CMC", gate: "preclinical" },
  { step: 3, label: "Dose range", gate: "phase-i" },
  { step: 4, label: "SAE review", gate: "phase-i" },
  { step: 5, label: "Enrollment", gate: "phase-i" },
  { step: 6, label: "Interim", gate: "phase-ii" },
  { step: 7, label: "Expansion", gate: "phase-ii" },
  { step: 8, label: "Readout", gate: "phase-ii" },
  { step: 9, label: "Briefing", gate: "advisory" },
  { step: 10, label: "Vote", gate: "advisory" },
]

function buildTrialEvents(project) {
  const id = project.id
  return [
    // ── Preclinical: two beats ──────────────────────────────────────────
    {
      id: `${id}-tox-screen`,
      label: "Tox screen",
      time: 0.85,
      gateId: "preclinical",
      effects: [
        {
          addNegative: ["supply"],
          metricsDelta: { toxStudies: 1 },
          stage: "tox screen",
          summary: "GLP tox raises supply-chain risk for scarce reagents.",
        },
      ],
    },
    {
      id: `${id}-cmc`,
      label: "CMC package",
      time: 1.25,
      gateId: "preclinical",
      effects: [
        {
          addPositive: ["manufacturing"],
          addNegative: ["cost"],
          metricsDelta: { cmcFiles: 1 },
          stage: "preclinical cleared",
          summary: "CMC accepted — manufacturing attaches, cost pressure doubles.",
        },
      ],
    },
    // ── Phase I: three beats ────────────────────────────────────────────
    {
      id: `${id}-dose-range`,
      label: "Dose ranging",
      time: 1.95,
      gateId: "phase-i",
      effects: [
        {
          addNegative: ["recruitment"],
          stage: "dose ranging",
          summary: "First-in-human sites open slowly; recruitment drag attaches.",
        },
      ],
    },
    {
      id: `${id}-sae`,
      label: "SAE review",
      time: 2.35,
      gateId: "phase-i",
      effects: [
        {
          addNegative: ["litigation"],
          delayDelta: 0.15,
          stage: "SAE review",
          summary: "A related-class SAE triggers precautionary legal review.",
        },
      ],
    },
    {
      id: `${id}-phase-i-close`,
      label: "Phase I close",
      time: 2.7,
      gateId: "phase-i",
      effects: [
        {
          addPositive: ["safety"],
          // second safety particle is a no-op if already active; viability still
          // gets a stage bump via summary / metrics
          metricsDelta: { phaseIPatients: 48 },
          stage: "phase I complete",
          summary: "Safety board signs off; dose selected for Phase II.",
        },
      ],
    },
    // ── Phase II: three beats — includes reverse gate (pop risk / add benefit)
    {
      id: `${id}-interim`,
      label: "Interim analysis",
      time: 3.2,
      gateId: "phase-ii",
      effects: [
        {
          // Reverse of the usual gate: clear a risk and attach a benefit.
          popNegative: { candidates: ["toxicity"], count: 1 },
          addPositive: ["biomarker"],
          stage: "interim breakthrough",
          summary: "Toxicity flag cleared; confirmatory biomarker attaches.",
        },
      ],
    },
    {
      id: `${id}-expansion`,
      label: "Expansion cohort",
      time: 3.65,
      gateId: "phase-ii",
      effects: [
        {
          popNegative: { candidates: ["litigation"], count: 1 },
          addPositive: ["access"],
          metricsDelta: { expansionSites: 12 },
          stage: "expansion open",
          summary: "Legal hold lifts; patient-access pathway attaches.",
        },
      ],
    },
    {
      id: `${id}-readout`,
      label: "Primary readout",
      time: 4.05,
      gateId: "phase-ii",
      effects: [
        {
          popNegative: { candidates: ["recruitment", "supply"], count: 1 },
          addPositive: ["efficacy"],
          metricsDelta: { primaryMet: 1 },
          stage: "phase II readout",
          summary: "Primary endpoint met; one remaining operational risk sheds.",
        },
      ],
    },
    // ── Advisory: two beats ─────────────────────────────────────────────
    {
      id: `${id}-briefing`,
      label: "Advisory briefing",
      time: 4.55,
      gateId: "advisory",
      effects: [
        {
          popNegative: { candidates: ["cost", "supply", "recruitment"], count: 1 },
          metricsDelta: { briefings: 1 },
          stage: "advisory briefing",
          summary: "Sponsor briefing sheds residual operational drag.",
        },
      ],
    },
    {
      id: `${id}-vote`,
      label: "Advisory vote",
      time: 5.05,
      gateId: "advisory",
      final: true,
      effects: [
        {
          stage: "advisory outcome",
          summary: "Committee votes on the full benefit/risk package.",
        },
      ],
    },
  ]
}

function trialViability(project, context) {
  const lift = project.activePositiveIds.reduce(
    (sum, id) => sum + (context.positiveProperties.get(id)?.value ?? 1),
    0,
  )
  const load = project.negativeIds.reduce(
    (sum, id) => sum + (context.negativeProperties.get(id)?.load ?? 1),
    0,
  )
  return Math.max(0, Math.min(100, project.datum.viability + lift * 5 - load * 10 - project.delay * 2))
}

function trialOutcome(project) {
  if (project.viability >= 62) return "built"
  if (project.viability >= 35) return "approved_not_built"
  return "bad_design_crash"
}

/**
 * Build one diverging stacked-area cross-section at an event step.
 * Benefits → positive y (stack above 0); risks → negative y (stack below 0).
 * Only active (non-zero) properties are emitted — the stack builder cuts area
 * segments at missing/zero samples so inactive series don't draw a flat line
 * on the axis.
 */
function seriesRowsForState(project, step, gateLabel) {
  const posCounts = countIds(project.activePositiveIds)
  const negCounts = countIds(project.negativeIds)
  const rows = []

  for (const series of ALL_SERIES) {
    const count =
      series.polarity === "benefit"
        ? (posCounts.get(series.id) ?? 0)
        : (negCounts.get(series.id) ?? 0)
    if (count <= 0) continue
    const magnitude = series.magnitude * count
    rows.push({
      gate: step,
      gateLabel,
      series: series.label,
      polarity: series.polarity,
      // Signed values drive baseline="diverging" (risks stack below zero).
      value: series.polarity === "risk" ? -magnitude : magnitude,
    })
  }
  return rows
}

function countIds(ids) {
  const map = new Map()
  for (const id of ids ?? []) {
    map.set(id, (map.get(id) ?? 0) + 1)
  }
  return map
}

function initialAreaRows() {
  const fakeState = {
    activePositiveIds: [...TRIAL_PROJECT.positives],
    negativeIds: [...TRIAL_PROJECT.negatives],
  }
  return seriesRowsForState(fakeState, 0, "Filed")
}

const TRIAL_DATA = [TRIAL_PROJECT]

function readoutSnapshot(project) {
  if (!project) {
    return {
      stage: "waiting",
      viability: Math.round(TRIAL_PROJECT.viability),
      positives: TRIAL_PROJECT.positives.length,
      negatives: TRIAL_PROJECT.negatives.length,
      step: 0,
      eventId: null,
    }
  }
  return {
    stage: project.stage ?? "waiting",
    viability: Math.round(project.viability ?? TRIAL_PROJECT.viability),
    positives: project.activePositiveIds?.length ?? 0,
    negatives: project.negativeIds?.length ?? 0,
    step: project.eventsApplied?.length ?? 0,
    eventId: project.lastEvent?.id ?? null,
    eventLabel: project.lastEvent?.label,
    eventSummary: project.lastEvent?.summary,
  }
}

function GauntletStackedAreaDemo({ width }) {
  const areaRef = useRef(null)
  const lastStepRef = useRef(-1)
  const lastReadoutKeyRef = useRef("")
  const [runKey, setRunKey] = useState(0)
  const [readout, setReadout] = useState(() => readoutSnapshot(null))
  const [eventLog, setEventLog] = useState([])

  // Stabilize geometry so size={[w,h]} identity thrash cannot remount the frame.
  const chartWidth = Math.max(320, width - 8)
  const physicsHeight = Math.round(chartWidth * 0.42)
  const areaHeight = Math.round(chartWidth * 0.42)
  const gauntletSize = useMemo(
    () => [chartWidth, physicsHeight],
    [chartWidth, physicsHeight],
  )

  const events = useCallback((project) => buildTrialEvents(project), [])

  // Seed / reseat the stacked area whenever the gauntlet restarts.
  useEffect(() => {
    lastStepRef.current = -1
    lastReadoutKeyRef.current = ""
    setEventLog([])
    setReadout(readoutSnapshot(null))
    const id = requestAnimationFrame(() => {
      areaRef.current?.clear?.()
      areaRef.current?.pushMany?.(initialAreaRows())
      lastStepRef.current = 0
    })
    return () => cancelAnimationFrame(id)
  }, [runKey])

  const onStateChange = useCallback((states) => {
    const project = states?.[0]
    if (!project) return

    // Only re-render the header when the visible snapshot changes — not on
    // every Gauntlet internal setStates with the same stage/counts.
    const next = readoutSnapshot(project)
    const key = `${next.stage}|${next.viability}|${next.positives}|${next.negatives}|${next.step}|${next.eventId ?? ""}`
    if (key !== lastReadoutKeyRef.current) {
      lastReadoutKeyRef.current = key
      setReadout(next)
    }

    const step = project.eventsApplied.length
    if (step <= lastStepRef.current) return
    lastStepRef.current = step

    const tick = EVENT_TICKS[Math.min(step, EVENT_TICKS.length - 1)]
    const rows = seriesRowsForState(project, step, tick.label)
    areaRef.current?.pushMany?.(rows)

    if (project.lastEvent) {
      setEventLog((prev) => {
        const entryId = `${project.lastEvent.id}-${step}`
        if (prev.some((item) => item.id === entryId)) return prev
        const entry = {
          id: entryId,
          label: project.lastEvent.label,
          summary: project.lastEvent.summary,
          step,
        }
        const nextLog = [...prev, entry]
        return nextLog.length > 10 ? nextLog.slice(nextLog.length - 10) : nextLog
      })
    }
  }, [])

  return (
    <div>
      <div style={controlRowStyle}>
        <button type="button" style={buttonStyle} onClick={() => setRunKey((k) => k + 1)}>
          Replay trial
        </button>
        <span style={readoutStyle}>
          Stage <strong>{readout.stage}</strong>
          {" · "}viability <strong>{readout.viability}</strong>
          {" · "}benefits <strong>{readout.positives}</strong>
          {" · "}risks <strong>{readout.negatives}</strong>
        </span>
      </div>

      <p style={{ ...chartTitleStyle, marginTop: 0 }}>
        Gauntlet — single compound through regulatory gates
      </p>
      <GauntletChart
        key={runKey}
        data={TRIAL_DATA}
        idAccessor="id"
        labelAccessor="label"
        positiveAccessor="positives"
        negativeAccessor="negatives"
        metricsAccessor="metrics"
        initialViability="viability"
        positiveProperties={POSITIVE_PROPERTIES}
        negativeProperties={NEGATIVE_PROPERTIES}
        gates={TRIAL_GATES}
        events={events}
        viability={trialViability}
        outcome={trialOutcome}
        onStateChange={onStateChange}
        size={gauntletSize}
        title="NexaVax-7 regulatory gauntlet"
        description="One drug candidate through a dense event schedule: preclinical (2), Phase I (3), Phase II (3 — including pop-negative + add-positive), advisory (2)."
      />

      <p style={{ ...chartTitleStyle, marginTop: 16 }}>
        Diverging stack — benefits above, risks below
      </p>
      {/*
        CategoryColorProvider + matching colorScheme map force the stacked-area
        layers to use the same hex values as Gauntlet property particles. Push
        mode alone would otherwise fall back to STREAMING_PALETTE.
        baseline="diverging" stacks signed y: benefits above 0, risks below.
      */}
      <CategoryColorProvider colors={SERIES_COLOR_SCHEME} categories={SERIES_CATEGORIES}>
        <StackedAreaChart
          ref={areaRef}
          xAccessor="gate"
          yAccessor="value"
          areaBy="series"
          colorBy="series"
          colorScheme={SERIES_COLOR_SCHEME}
          baseline="diverging"
          stackOrder="input"
          width={chartWidth}
          height={areaHeight}
          showLegend
          legendPosition="bottom"
          tooltip="multi"
          xLabel="Event step"
          yLabel="Lift (+) / drag (−)"
          xExtent={[0, EVENT_TICKS.length - 1]}
          title="Property stack by event"
          description="Diverging stacked area: benefit properties stack above zero, risk properties as negative values stack below. Colors match Gauntlet particles."
          frameProps={{
            axes: [
              {
                orient: "bottom",
                tickValues: EVENT_TICKS.map((g) => g.step),
                tickFormat: (d) => EVENT_TICKS.find((g) => g.step === d)?.label ?? d,
                autoRotate: true,
              },
              { orient: "left" },
            ],
          }}
        />
      </CategoryColorProvider>

      {eventLog.length > 0 && (
        <div style={{ ...readoutStyle, marginTop: 10 }} aria-live="polite">
          <strong>Gate feed</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {eventLog.map((item) => (
              <li key={item.id}>
                Step {item.step}: {item.label}
                {item.summary ? ` — ${item.summary}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Example 2 — Merge-pressure process flow ↔ scatter (1:1 particles)
// ---------------------------------------------------------------------------

const MERGE_STAGES = [
  { id: "coding", label: "Coding", force: 14, share: 1.05 },
  { id: "ci", label: "CI", force: 16, share: 0.9 },
  {
    id: "review",
    label: "Review",
    capacity: { unitsPerSecond: 4.2, unitAccessor: "reviewWork" },
    pressure: { pressure: 1.35 },
    force: 12,
    share: 1.35,
  },
  {
    id: "revision",
    label: "Revision",
    portal: { targetStageId: "coding", force: { x: -36, y: 0 } },
    share: 0.85,
  },
  { id: "merged", label: "Merged", absorb: true, force: 22, share: 1 },
]

const STAGE_INDEX = Object.fromEntries(MERGE_STAGES.map((s, i) => [s.id, i]))

const FEATURES = [
  { id: "auth", label: "Auth" },
  { id: "billing", label: "Billing" },
  { id: "search", label: "Search" },
  { id: "notify", label: "Notify" },
]

const AUTHOR_COLORS = {
  human: "#64748b",
  human_ai: "#0c7894",
  ai_agent: "#7c3aed",
}

function buildMergePrs() {
  const stages = ["coding", "ci", "review", "revision", "merged"]
  const rows = []
  let index = 0
  for (const feature of FEATURES) {
    const count = feature.id === "search" ? 5 : 3
    for (let pr = 0; pr < count; pr += 1) {
      const stage =
        feature.id === "search" && pr === count - 1
          ? "review"
          : feature.id === "billing" && pr === count - 1
            ? "revision"
            : stages[index % (feature.id === "search" ? 4 : stages.length)]
      const authorType =
        index % 3 === 0 ? "human" : index % 3 === 1 ? "human_ai" : "ai_agent"
      rows.push({
        id: `${feature.id}-pr-${pr}`,
        stage,
        stageIndex: STAGE_INDEX[stage] ?? 0,
        featureId: feature.id,
        featureLabel: feature.label,
        authorType,
        reviewWork: Number((0.7 + (index % 5) * 0.35 + (authorType === "ai_agent" ? -0.15 : 0.1)).toFixed(2)),
        churn: Number((12 + (index % 7) * 4 + (stage === "revision" ? 10 : 0)).toFixed(1)),
      })
      index += 1
    }
  }
  return rows
}

const MERGE_PRS = buildMergePrs()
const MERGE_SELECTION_NAME = "merge-pr"
const MERGE_DIM_OPACITY = 0.16

/**
 * Must render *inside* LinkedCharts so useSelection shares the provider store
 * with the scatter's linkedHover / selection (calling useSelection outside
 * LinkedCharts hits the module fallback store — cross-highlight never meets).
 */
function MergeLinkedInner({ halfWidth, height }) {
  const selection = useSelection({ name: MERGE_SELECTION_NAME, fields: ["id"] })
  const selectPoints = selection.selectPoints
  const clearSelection = selection.clear

  const physicsSelection = useMemo(
    () => ({
      isActive: selection.isActive,
      predicate: (body) => {
        const datum = unwrapDatum(body?.datum) ?? body?.datum
        if (!datum || typeof datum !== "object") return false
        return selection.predicate(datum)
      },
    }),
    [selection.isActive, selection.predicate],
  )

  // Dim non-selected bodies when a linked selection is active. StreamPhysicsFrame
  // only boosts selectedBodyStyle on matches — it does not auto-dim the rest.
  const bodyStyle = useCallback(
    (body, context) => {
      const datum = unwrapDatum(body?.datum) ?? body?.datum ?? {}
      const fill =
        AUTHOR_COLORS[datum.authorType] ?? "var(--semiotic-primary, #4e79a7)"
      const active = Boolean(physicsSelection.isActive)
      const selected = Boolean(context?.selected)
      return {
        fill,
        stroke: selected ? "#0f172a" : "#111827",
        strokeWidth: selected ? 2.5 : 1,
        opacity: !active ? 0.92 : selected ? 1 : MERGE_DIM_OPACITY,
      }
    },
    [physicsSelection.isActive],
  )

  const onPhysicsObservation = useCallback(
    (obs) => {
      if (obs.type === "hover-end") {
        clearSelection()
        return
      }
      if (obs.type !== "hover") return
      const datum = unwrapDatum(obs.datum) ?? obs.datum
      const id = datum && typeof datum === "object" ? datum.id : undefined
      if (id != null) selectPoints({ id: [id] })
    },
    [clearSelection, selectPoints],
  )

  const chartSize = useMemo(() => [halfWidth, height], [halfWidth, height])

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: halfWidth < 300 ? "1fr" : "1fr 1fr",
        gap: 16,
        alignItems: "start",
      }}
    >
      <div>
        <p style={chartTitleStyle}>Process flow</p>
        <ProcessFlowChart
          data={MERGE_PRS}
          idAccessor="id"
          stageAccessor="stage"
          workAccessor="reviewWork"
          colorBy="authorType"
          stages={MERGE_STAGES}
          settle
          size={chartSize}
          selection={physicsSelection}
          onObservation={onPhysicsObservation}
          chartId="merge-process"
          title="PROCESS FLOW"
          description="Each PR is one physics body. Hover a body to highlight the matching scatter point."
          showLegend={false}
          // Compact chrome: outline stage bays only — no feature-group sockets.
          chromeOptions={{
            outlineStages: true,
            showGroupSockets: false,
            showCapacityBadges: false,
          }}
          frameProps={{
            bodyStyle,
            selectedBodyStyle: {
              stroke: "#0f172a",
              strokeWidth: 2.5,
              opacity: 1,
            },
          }}
        />
      </div>
      <div>
        <p style={chartTitleStyle}>Review work × stage</p>
        <Scatterplot
          data={MERGE_PRS}
          xAccessor="reviewWork"
          yAccessor="stageIndex"
          colorBy="authorType"
          colorScheme={AUTHOR_COLORS}
          sizeBy="churn"
          sizeRange={[5, 16]}
          pointIdAccessor="id"
          width={halfWidth}
          height={height}
          linkedHover={{ name: MERGE_SELECTION_NAME, fields: ["id"] }}
          selection={{
            name: MERGE_SELECTION_NAME,
            unselectedOpacity: MERGE_DIM_OPACITY,
          }}
          chartId="merge-scatter"
          title="Review work × stage"
          description="One point per process-flow body. Shared selection is keyed by id."
          xLabel="Review work"
          yLabel="Stage"
          showLegend
          legendPosition="bottom"
          frameProps={{
            axes: [
              { orient: "bottom" },
              {
                orient: "left",
                tickValues: MERGE_STAGES.map((_, i) => i),
                tickFormat: (d) => MERGE_STAGES[d]?.label ?? d,
              },
            ],
          }}
        />
      </div>
    </div>
  )
}

function MergePressureScatterDemo({ width }) {
  const [docsTheme] = useDocsTheme()
  const themeName = docsTheme === "dark" ? "carbon-dark" : "carbon"
  const chartWidth = Math.max(320, width - 8)
  const halfWidth = Math.max(280, Math.floor((chartWidth - 16) / 2))
  const height = 300

  return (
    <ThemeProvider theme={themeName}>
      <CategoryColorProvider
        categories={["human", "human_ai", "ai_agent"]}
        colorScheme={AUTHOR_COLORS}
      >
        <LinkedCharts>
          <MergeLinkedInner halfWidth={halfWidth} height={height} />
        </LinkedCharts>
      </CategoryColorProvider>
      <p style={{ ...readoutStyle, marginTop: 10 }}>
        Hover either chart: selection is keyed on <code>id</code>, so the particle and the
        scatter mark are the same record. The physics bridge must call{" "}
        <code>useSelection</code> <em>inside</em> <code>LinkedCharts</code> so it shares the
        provider store with the scatter; physics dims non-matches in{" "}
        <code>bodyStyle</code> via <code>context.selected</code>.
      </p>
    </ThemeProvider>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnchoringComplexChartsPage() {
  const [width, widthRef] = useResponsiveWidth(640, 980)

  return (
    <PageLayout
      title="Anchoring Complex Charts"
      breadcrumbs={[
        { label: "Accessibility", path: "/accessibility/overview" },
        { label: "Anchoring Complex Charts", path: "/accessibility/anchoring-complex-charts" },
      ]}
      prevPage={{ title: "Structured Navigation", path: "/accessibility/navigation" }}
      nextPage={{ title: "Observation Hooks", path: "/intelligence/observation-hooks" }}
    >
      <p>
        Physics charts explain <em>process</em> — a compound body crosses gates, particles
        queue under capacity pressure. Traditional charts explain <em>quantity</em> — stacks,
        positions, ranks. Accessibility and coordinated views both need those two stories
        to share identity: the same project, the same PR, the same event stream. This page
        shows how to <strong>anchor</strong> a StreamPhysicsFrame HOC to an ordinary chart
        with observation hooks, the push API, and LinkedCharts selection.
      </p>

      <p>
        The pattern is the same whether the secondary chart is for a screen-reader summary,
        a static export, or a linked dashboard: treat the physics frame as a live process
        sensor, then re-encode its state into a mark the rest of the toolkit already
        understands (stacked area, scatter, table, navigation tree).
      </p>

      {/* ----------------------------------------------------------------- */}
      <h2 id="gauntlet-stacked-area">1. Gauntlet → stacked area (single trial)</h2>
      <p>
        One compound project moves through a regulatory gauntlet (not housing — a drug
        candidate, <strong>NexaVax-7</strong>). Positive property particles are benefits;
        negative particles are risks. Ten timed events (two or three per gate) fire as the
        core advances; each one snapshots into the stacked area via{" "}
        <code>onStateChange</code> + the push API, with event index as <code>x</code>.
      </p>
      <p>
        Property colors are shared end-to-end: each Gauntlet particle uses{" "}
        <code>property.color</code>, and the stacked area is wrapped in{" "}
        <code>CategoryColorProvider</code> with the same map so series layers match the
        nodes. The stack is <code>baseline=&quot;diverging&quot;</code>: benefit series
        push <strong>positive</strong> y (above the axis), risk series push{" "}
        <strong>negative</strong> y (below). Phase II&apos;s interim analysis is the
        reverse gate: <code>popNegative</code> clears <strong>Toxicity</strong> while{" "}
        <code>addPositive</code> attaches <strong>Biomarker</strong> — watch the red
        band under the axis shrink and the purple band grow above.
      </p>

      <div ref={widthRef} style={demoShellStyle}>
        <GauntletStackedAreaDemo width={width} />
      </div>

      <CodeBlock
        language="jsx"
        code={`import { useCallback, useRef } from "react"
import { StackedAreaChart } from "semiotic"
import { GauntletChart } from "semiotic/physics"

// Property colors are shared: Gauntlet particles + CategoryColorProvider map.
const SERIES_COLORS = {
  Efficacy: "#22c55e", Safety: "#06b6d4", Biomarker: "#a855f7",
  Toxicity: "#ef4444", Cost: "#f97316", /* … */
}

function TrialWithStack() {
  const areaRef = useRef()
  const lastStep = useRef(-1)

  const onStateChange = useCallback((states) => {
    const project = states[0]
    if (!project) return
    const step = project.eventsApplied.length
    if (step <= lastStep.current) return
    lastStep.current = step
    areaRef.current?.pushMany(seriesRowsForState(project, step))
  }, [])

  return (
    <>
      <GauntletChart
        data={TRIAL_DATA}
        positiveProperties={/* each { id, label, color, value|load } */}
        negativeProperties={/* … */}
        events={(project) => buildTrialEvents(project)} // 10 timed events
        onStateChange={onStateChange}
      />
      <CategoryColorProvider colors={SERIES_COLORS}>
        <StackedAreaChart
          ref={areaRef}
          xAccessor="gate"
          yAccessor="value"
          areaBy="series"
          colorBy="series"
          colorScheme={SERIES_COLORS}
          baseline="diverging" // risks as negative y stack below 0
          // omit data — push mode; provider keeps series colors exact
        />
      </CategoryColorProvider>
    </>
  )
}`}
      />

      <p>
        Implementation notes:
      </p>
      <ul>
        <li>
          <strong>Single item.</strong> One row in <code>data</code> — GauntletChart is for
          compound project stories, not multi-item factory floors (use{" "}
          <Link to="/charts/process-flow-chart">ProcessFlowChart</Link> for those). Keep{" "}
          <code>data</code> / <code>size</code> referentially stable (module const or{" "}
          <code>useMemo</code>); a fresh <code>{`data={[row]}`}</code> every render used to re-seed
          the simulation and loop with live <code>onStateChange</code> readouts.
        </li>
        <li>
          <strong>Event step as x.</strong>{" "}
          <code>project.eventsApplied.length</code> is a stable step index after each timed
          event (several per gate). Seed step 0 from the initial property set so the stack
          has a start; tick labels name the event, not only the gate.
        </li>
        <li>
          <strong>Shared colors.</strong> Define property hexes once, pass them on{" "}
          <code>positiveProperties</code>/<code>negativeProperties</code>, and feed the same
          map to <code>{`CategoryColorProvider colors={…}`}</code> +{" "}
          <code>colorScheme</code> on the stacked area so particles and layers match.
        </li>
        <li>
          <strong>Push, don&apos;t re-pass data.</strong> Omit <code>data</code> on the stacked
          area and call <code>pushMany</code> so the frame keeps prior gate samples while
          appending the next.
        </li>
        <li>
          <strong>Equal scale.</strong> Both charts share the same measured width so the
          process and the quantity story read as one figure.
        </li>
        <li>
          <strong>
            <code>popNegative</code>
          </strong>{" "}
          mirrors <code>popPositive</code> (array, <code>ids</code>, or{" "}
          <code>{`{ candidates, count }`}</code>) and pops the matching tethered body.
        </li>
      </ul>

      {/* ----------------------------------------------------------------- */}
      <h2 id="merge-scatter">2. Merge-pressure particles ↔ scatter (1:1)</h2>
      <p>
        A compact ProcessFlowChart toy of merge pressure — PRs as particles through
        capacitated review stages (no feature-group sockets; the small panel needs the
        space). Beside it, a scatterplot with <strong>the same rows</strong>: one mark per
        particle, review work on x, stage index on y, author type as color, churn as size.
      </p>
      <p>
        Cross-highlight is LinkedCharts selection on <code>id</code>. The scatter speaks
        the usual HOC dialect (<code>linkedHover</code> + <code>selection</code>); the
        physics frame needs a body predicate, so we bridge with{" "}
        <code>useSelection</code> and drive it from <code>onObservation</code> on hover.
        That bridge must live <em>inside</em> <code>LinkedCharts</code> —{" "}
        <code>useSelection</code> outside the provider uses a different store than the
        scatter. Physics also dims non-matches in <code>bodyStyle</code> (the frame only
        styles the selected body by default).
      </p>

      <div style={demoShellStyle}>
        <MergePressureScatterDemo width={width} />
      </div>

      <CodeBlock
        language="jsx"
        code={`import { LinkedCharts, Scatterplot, useSelection } from "semiotic"
import { ProcessFlowChart } from "semiotic/physics"
import { unwrapDatum } from "semiotic/utils"

// useSelection MUST run inside LinkedCharts — outside it hits the module
// fallback store and never sees the scatter's linkedHover clauses.
function MergeLinkedInner({ prs, stages }) {
  const selection = useSelection({ name: "merge-pr", fields: ["id"] })

  return (
    <>
      <ProcessFlowChart
        data={prs}
        stages={stages}
        idAccessor="id"
        stageAccessor="stage"
        colorBy="authorType"
        title="PROCESS FLOW"
        // No groupBy — skips Auth/Billing/… feature sockets in a small panel.
        chromeOptions={{ outlineStages: true, showGroupSockets: false }}
        selection={{
          isActive: selection.isActive,
          predicate: (body) =>
            selection.predicate(unwrapDatum(body.datum) ?? body.datum),
        }}
        onObservation={(obs) => {
          if (obs.type === "hover-end") return selection.clear()
          if (obs.type !== "hover") return
          const id = unwrapDatum(obs.datum)?.id
          if (id != null) selection.selectPoints({ id: [id] })
        }}
        frameProps={{
          bodyStyle: (body, ctx) => ({
            fill: authorColor(body),
            opacity: !selection.isActive ? 0.92 : ctx.selected ? 1 : 0.16,
          }),
        }}
      />
      <Scatterplot
        data={prs}
        xAccessor="reviewWork"
        yAccessor="stageIndex"
        colorBy="authorType"
        pointIdAccessor="id"
        linkedHover={{ name: "merge-pr", fields: ["id"] }}
        selection={{ name: "merge-pr", unselectedOpacity: 0.16 }}
      />
    </>
  )
}

function MergeLinked({ prs, stages }) {
  return (
    <LinkedCharts>
      <MergeLinkedInner prs={prs} stages={stages} />
    </LinkedCharts>
  )
}`}
      />

      {/* ----------------------------------------------------------------- */}
      <h2 id="why-accessibility">Why this sits under Accessibility</h2>
      <p>
        A physics simulation alone is hard to trust without a static projection — and hard
        to navigate without a second encoding that assistive tech and linked views already
        handle well. Anchoring means:
      </p>
      <ul>
        <li>
          The process chart keeps motion as explanatory context (and still ships its settled
          projection strip).
        </li>
        <li>
          The quantitative chart keeps a table, keyboard focus ring, legend, and LinkedCharts
          selection that other views can join.
        </li>
        <li>
          Shared identity (<code>id</code>, gate step, feature key) is the contract — not
          pixel proximity.
        </li>
      </ul>
      <p>
        Pair these demos with{" "}
        <Link to="/accessibility/navigation">structured navigation</Link> on the secondary
        chart, or feed the same push buffer into{" "}
        <Link to="/intelligence/observation-hooks">observation hooks</Link> for agent
        tooling.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/charts/gauntlet-chart">GauntletChart</Link> — compound project + gates
        </li>
        <li>
          <Link to="/charts/process-flow-chart">ProcessFlowChart</Link> — multi-body capacity
          lanes
        </li>
        <li>
          <Link to="/examples/merge-pressure">Merge Pressure</Link> — full narrative example
        </li>
        <li>
          <Link to="/features/small-multiples">LinkedCharts / Small Multiples</Link> —
          coordinated selection
        </li>
        <li>
          <Link to="/intelligence/observation-hooks">Observation Hooks</Link> — hover/click
          event bus
        </li>
        <li>
          <Link to="/features/push-api">Push API</Link> — streaming HOC buffers
        </li>
      </ul>
    </PageLayout>
  )
}
