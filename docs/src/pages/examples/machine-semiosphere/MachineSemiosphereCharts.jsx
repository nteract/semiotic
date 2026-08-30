import React, { useEffect, useMemo } from "react"
import { NetworkCustomChart, useSelectionActions } from "semiotic/network"
import { BarChart } from "semiotic/ordinal"
import { transitDiagramLayout, unwrapDatum } from "semiotic/recipes"
import useResponsiveWidth from "../../../hooks/useResponsiveWidth"
import {
  ACTION_CHART_ROWS,
  BOARD_CHART_ROWS,
  EVIDENCE_SUMMARY_ROWS,
  HANDOFF_ROWS,
  OBSERVED_LIFETIME_ROWS,
  projectStoryGeometry,
  ROUTE_LINES,
} from "./story"

const MAP_LINE_ORDER = ["story", "incident", "memory", "services", "investigation"]
const MAP_SELECTION_NAME = "machine-semiosphere-active-chapter"
const MAP_SELECTION_CLIENT_ID = "machine-semiosphere-scroll-position"
const INCIDENT = "#e46f5d"
const MEMORY = "#b8dc68"
const SERVICES = "#57c9bd"
const INVESTIGATION = "#e1b65f"
const MUTED = "#6d7773"

function datumFrom(value) {
  return unwrapDatum(value) ?? value?.data ?? value ?? null
}

function selectedChapterIndex(selection) {
  if (!selection?.isActive) return 0
  for (let chapterIndex = 0; chapterIndex < 6; chapterIndex += 1) {
    if (selection.predicate({ chapterIndex })) return chapterIndex
  }
  return 0
}

function chapterOpacity(chapterIndex, activeChapterIndex) {
  if (chapterIndex === activeChapterIndex) return 1
  return chapterIndex < activeChapterIndex ? 0.66 : 0.25
}

function mapWithActiveChapter(context) {
  const result = transitDiagramLayout(context)

  return {
    ...result,
    restyle: (node, selection) => {
      const datum = datumFrom(node.datum)
      const chapterIndex = Number(datum?.chapterIndex ?? 0)
      const activeChapterIndex = selectedChapterIndex(selection)
      const active = chapterIndex === activeChapterIndex
      return {
        fill: active ? "var(--semiosphere-map-active, #fff2b3)" : node.style?.fill,
        strokeWidth: active ? 5.5 : node.style?.strokeWidth,
        opacity: chapterOpacity(chapterIndex, activeChapterIndex),
      }
    },
    restyleEdge: (edge, selection) => {
      const datum = datumFrom(edge.datum)
      const targetChapterIndex = Number(datum?.targetChapterIndex ?? 0)
      const activeChapterIndex = selectedChapterIndex(selection)
      const active = targetChapterIndex === activeChapterIndex
      return {
        opacity: chapterOpacity(targetChapterIndex, activeChapterIndex),
        strokeWidth: active
          ? Math.max(6.5, Number(edge.style?.strokeWidth) || 0)
          : edge.style?.strokeWidth,
      }
    },
  }
}

export function MachineSemiosphereMap({
  width,
  height,
  activeChapterIndex,
  chapterHeights,
  compact = false,
}) {
  const geometry = useMemo(() => projectStoryGeometry(chapterHeights), [chapterHeights])
  const { selectPoints, clear } = useSelectionActions(MAP_SELECTION_NAME, MAP_SELECTION_CLIENT_ID)

  useEffect(() => {
    selectPoints({ chapterIndex: [activeChapterIndex] })
  }, [activeChapterIndex, selectPoints])

  useEffect(() => () => clear(), [clear])

  return (
    <NetworkCustomChart
      chartId="machine-semiosphere-story-map"
      nodes={geometry.stations}
      edges={geometry.connections}
      layout={mapWithActiveChapter}
      layoutConfig={{
        layoutMode: "authored",
        labelAccessor: "mapLabel",
        pointsAccessor: "points",
        lineOrder: MAP_LINE_ORDER,
        padding: compact ? 16 : 54,
        cornerRadius: compact ? 7 : 12,
        lineWidth: compact ? 3.5 : 5,
        lineGap: compact ? 1 : 1.5,
        stationRadius: compact ? 4 : 5,
        interchangeRadius: compact ? 7 : 9,
        stationFill: "var(--semiosphere-map-station, #111a1b)",
        stationStroke: "var(--semiosphere-map-ink, #e7ece6)",
        showLabels: !compact,
        labelFontSize: 10,
        labelColor: "var(--semiosphere-map-ink, #e7ece6)",
      }}
      selection={{ name: MAP_SELECTION_NAME }}
      width={width}
      height={height}
      maxDevicePixelRatio={1}
      margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
      enableHover
      tooltip={(value) => <MapTooltip value={value} />}
      animate={false}
      accessibleTable
      description="A vertical subway-style map of six chapters about the July 2026 Hugging Face incident. Colored routes show recurring evidence threads, not proven causal chains."
      summary="The story moves from the recovered attack record to the shared board, persistent traces, cross-run handoffs, forensic recovery, and the bounded conclusion that digital environments can carry information between short-lived agent runs."
      frameProps={{ background: "transparent" }}
    />
  )
}

function MapTooltip({ value }) {
  const datum = datumFrom(value)
  if (!datum) return null
  if (datum.lineId) {
    return (
      <div className="semiosphere-tooltip">
        <strong>{datum.lineLabel}</strong>
        <span>{datum.description}</span>
        <small>Narrative continuity, not proof of causation.</small>
      </div>
    )
  }
  return (
    <div className="semiosphere-tooltip">
      <strong>{datum.label ?? datum.mapLabel ?? datum.id}</strong>
      {datum.description ? <span>{datum.description}</span> : null}
      <small>{datum.evidence}</small>
    </div>
  )
}

const VISUAL_META = Object.freeze({
  "daily-actions": {
    eyebrow: "Recovered external-action record",
    title: "The busiest recovered day was July 11",
    caption:
      "Hugging Face reports 17,613 recovered actions in five daily buckets. Actions are not agents, messages, or confirmed successes.",
  },
  "board-scale": {
    eyebrow: "Observed board activity",
    title: "A shared communication system grew around the runs",
    caption:
      "The categories overlap. The bars describe different views of the board and must not be added together.",
  },
  "observed-lifetimes": {
    eyebrow: "First to last published observation",
    title: "Shared traces were visible across multiple days",
    caption:
      "These spans are derived from the published dates. “Last observed” does not tell us when a trace stopped existing.",
  },
  handoffs: {
    eyebrow: "Three documented handoff patterns",
    title: "The environment carried information forward",
    caption:
      "Each row is a documented sequence or a clearly labeled grouping. Sequence alone does not establish intention or a single shared plan.",
  },
  "forensic-recovery": {
    eyebrow: "Relative findings reported by Hugging Face",
    title: "Reproducing the decoding procedure changed what investigators found",
    caption:
      "The comparison is approximate and specific to this investigation. The baseline is shown as an index of 1, not a count of secrets.",
  },
  "evidence-summary": {
    eyebrow: "A bounded reading",
    title: "What the public evidence supports—and what it does not",
    caption:
      "The wider “machine semiosphere” is a research frame proposed by this example, not a reported finding from the incident.",
  },
})

export const MachineSemiosphereChapterVisual = React.memo(function MachineSemiosphereChapterVisual({
  type,
}) {
  const [width, hostRef] = useResponsiveWidth(220, 680, { bucket: 20 })
  const meta = VISUAL_META[type]
  if (!meta) return null

  return (
    <figure className="semiosphere-chapter-visual">
      <header className="semiosphere-chapter-visual__header">
        <span className="semiosphere-chapter-visual__eyebrow">{meta.eyebrow}</span>
        <h3>{meta.title}</h3>
      </header>
      <div className="semiosphere-chapter-visual__plot" ref={hostRef}>
        <ChapterPlot type={type} width={width} />
      </div>
      <figcaption className="semiosphere-chapter-visual__caption">{meta.caption}</figcaption>
    </figure>
  )
})

function ChapterPlot({ type, width }) {
  switch (type) {
    case "daily-actions":
      return <DailyActionsChart width={width} />
    case "board-scale":
      return <BoardScaleChart width={width} />
    case "observed-lifetimes":
      return <ObservedLifetimesChart width={width} />
    case "handoffs":
      return <HandoffRows />
    case "forensic-recovery":
      return <ForensicRecoveryChart width={width} />
    case "evidence-summary":
      return <EvidenceSummary />
    default:
      return null
  }
}

function formatJulyDay(value) {
  const date = new Date(`${String(value)}T12:00:00Z`)
  return Number.isNaN(date.getTime()) ? String(value) : `Jul ${date.getUTCDate()}`
}

function DailyActionsChart({ width }) {
  return (
    <BarChart
      chartId="machine-semiosphere-daily-actions"
      data={ACTION_CHART_ROWS}
      categoryAccessor="day"
      valueAccessor="actions"
      categoryFormat={formatJulyDay}
      valueFormat={(value) => Number(value).toLocaleString()}
      sort={false}
      width={width}
      height={270}
      margin={{ top: 12, right: 12, bottom: 44, left: 54 }}
      color={INCIDENT}
      showGrid
      enableHover
      animate={false}
      accessibleTable
      description="Recovered attacker actions by day from July 9 through July 13, 2026."
      summary="July 11 is the peak with 7,677 actions. The five daily counts sum to 17,613."
      tooltip={(value) => {
        const row = datumFrom(value)
        return row ? (
          <div className="semiosphere-tooltip">
            <strong>{formatJulyDay(row.day)}</strong>
            <span>{Number(row.actions).toLocaleString()} recovered actions</span>
            <small>Reconstructed by Hugging Face</small>
          </div>
        ) : null
      }}
      frameProps={{ background: "transparent" }}
    />
  )
}

function BoardScaleChart({ width }) {
  const compactLabels = {
    "Messages + files (minimum)": "Messages + files",
    "Targeted messages": "Targeted",
  }
  return (
    <BarChart
      chartId="machine-semiosphere-board-scale"
      data={BOARD_CHART_ROWS}
      categoryAccessor="label"
      categoryFormat={(value) => (width < 420 ? (compactLabels[value] ?? value) : value)}
      valueAccessor="value"
      orientation="horizontal"
      valueFormat={(value) => Number(value).toLocaleString()}
      sort={false}
      width={width}
      height={282}
      margin={{ top: 12, right: 20, bottom: 38, left: width < 420 ? 94 : 132 }}
      color={MEMORY}
      showGrid
      enableHover
      animate={false}
      accessibleTable
      description="Published counts for messages and files, targeted messages, mailboxes, and files on the unauthorized board."
      summary="More than 70,000 messages and files were reported. These overlapping categories cannot be summed."
      tooltip={(value) => {
        const row = datumFrom(value)
        return row ? (
          <div className="semiosphere-tooltip">
            <strong>{row.label}</strong>
            <span>{row.displayValue}</span>
            <small>Observed; categories overlap</small>
          </div>
        ) : null
      }}
      frameProps={{ background: "transparent" }}
    />
  )
}

function ObservedLifetimesChart({ width }) {
  const compactLabels = {
    "Early board discoverers": "Board discoverers",
    "Convention builders (grouped)": "Conventions",
    "Hugging Face workstream": "HF workstream",
    "Public-service use (grouped)": "Public services",
  }
  return (
    <BarChart
      chartId="machine-semiosphere-observed-spans"
      data={OBSERVED_LIFETIME_ROWS}
      categoryAccessor="label"
      categoryFormat={(value) => (width < 420 ? (compactLabels[value] ?? value) : value)}
      valueAccessor="days"
      orientation="horizontal"
      colorBy="kind"
      colorScheme={{ "Agent group": INCIDENT, "Shared trace": SERVICES }}
      showLegend={false}
      valueFormat={(value) => `${Number(value).toFixed(Number(value) % 1 ? 1 : 0)} days`}
      sort={false}
      width={width}
      height={320}
      margin={{ top: 12, right: 22, bottom: 40, left: width < 420 ? 94 : 164 }}
      showGrid
      enableHover
      animate={false}
      accessibleTable
      description="Derived spans between first and last published observations for three agent groups and two shared traces."
      summary="The chart compares observation windows, not known lifespans. Several shared traces remain in the published record after short-lived agent groups end."
      tooltip={(value) => {
        const row = datumFrom(value)
        return row ? (
          <div className="semiosphere-tooltip">
            <strong>{row.label}</strong>
            <span>{Number(row.days).toFixed(Number(row.days) % 1 ? 1 : 0)} observed days</span>
            <small>
              {row.kind} · {row.endpoint} · {row.evidence}
            </small>
          </div>
        ) : null
      }}
      frameProps={{ background: "transparent" }}
    />
  )
}

function ForensicRecoveryChart({ width }) {
  const rows = [
    { label: "Initial review", value: 1, kind: "baseline" },
    { label: "Reproduced decoding", value: 4, kind: "recovered" },
  ]
  return (
    <BarChart
      chartId="machine-semiosphere-forensic-recovery"
      data={rows}
      categoryAccessor="label"
      categoryFormat={(value) => {
        if (width >= 420) return value
        return value === "Reproduced decoding" ? "Decoded" : "Initial"
      }}
      valueAccessor="value"
      orientation="horizontal"
      colorBy="kind"
      colorScheme={{ baseline: MUTED, recovered: INVESTIGATION }}
      showLegend={false}
      valueFormat={(value) => `${Number(value) === 1 ? "1× index" : `≈${value}× index`}`}
      valueExtent={[0, 4.4]}
      sort={false}
      width={width}
      height={206}
      margin={{ top: 12, right: 28, bottom: 40, left: width < 420 ? 74 : 154 }}
      showGrid
      enableHover
      animate={false}
      accessibleTable
      description="An indexed comparison of the initial review and the findings after investigators reproduced the agents' decoding procedure."
      summary="Hugging Face reports roughly four times the initial findings after reproducing the decoding procedure. The values are a relative index, not counts."
      tooltip={(value) => {
        const row = datumFrom(value)
        return row ? (
          <div className="semiosphere-tooltip">
            <strong>{row.label}</strong>
            <span>
              {row.value === 1 ? "1× comparison baseline" : "Roughly 4× the initial findings"}
            </span>
            <small>Relative index, not a count</small>
          </div>
        ) : null
      }}
      frameProps={{ background: "transparent" }}
    />
  )
}

function HandoffRows() {
  return (
    <div className="semiosphere-handoff-list" aria-label="Documented cross-run handoffs">
      {HANDOFF_ROWS.map((row) => (
        <article className="semiosphere-handoff-card" key={row.id}>
          <div className="semiosphere-handoff-steps">
            <span className="semiosphere-handoff-step">{row.first}</span>
            <span className="semiosphere-handoff-arrow" aria-hidden="true">
              ↓
            </span>
            <span className="semiosphere-handoff-step">{row.trace}</span>
            <span className="semiosphere-handoff-arrow" aria-hidden="true">
              ↓
            </span>
            <span className="semiosphere-handoff-step">{row.later}</span>
          </div>
          <small>{row.status}</small>
        </article>
      ))}
    </div>
  )
}

function EvidenceSummary() {
  return (
    <div className="semiosphere-evidence-list" aria-label="Evidence summary">
      {EVIDENCE_SUMMARY_ROWS.map((row) => {
        const statusClass = `is-${row.status.toLowerCase().replaceAll(" ", "-")}`
        return (
          <div className={`semiosphere-evidence-item ${statusClass}`} key={row.statement}>
            <strong className="semiosphere-evidence-status">{row.status}</strong>
            <span>{row.statement}</span>
          </div>
        )
      })}
    </div>
  )
}

export const MachineSemiosphereLegend = React.memo(function MachineSemiosphereLegend() {
  return (
    <div className="semiosphere-route-legend" aria-label="Evidence route legend">
      {Object.values(ROUTE_LINES).map((line) => (
        <span className="semiosphere-route-legend__item" key={line.id}>
          <span
            className="semiosphere-route-legend__line"
            style={{ "--route-color": line.color }}
            aria-hidden="true"
          />
          {line.label}
        </span>
      ))}
    </div>
  )
})
