import type { Datum } from "../charts/shared/datumTypes"
import type { DescribeLevel } from "./describeChart"
import type { describePhysicsSource } from "./describePhysicsSource"
import { fmtDim, plural, summarizePhysicsRows } from "./chartRoles"
import {
  finiteNumberValue as finiteNumber,
  stringValue
} from "./navigationValues"
import { isAIDataRecord } from "./aiData"

interface PhysicsProjectionRow {
  id?: string
  label: string
  count: number
  secondary?: number
  secondaryLabel?: string
  observed?: number
}

export function physicsProjectionRows(
  props: Datum,
  fmtNum: (n: number) => string
): PhysicsProjectionRow[] | null {
  const physics = isAIDataRecord(props.physics) ? props.physics : null
  const settled = isAIDataRecord(props.settledProjection)
    ? props.settledProjection
    : null
  const candidates = [
    props.settledProjectionRows,
    props.projectionRows,
    settled?.rows,
    physics?.settledProjectionRows,
    physics?.projectionRows,
    isAIDataRecord(physics?.settledProjection)
      ? physics.settledProjection.rows
      : undefined
  ]
  const rawRows = candidates.find(Array.isArray)
  if (!rawRows) return null
  return normalizePhysicsProjectionRows(rawRows, (value, fallback) =>
    fmtDim(value ?? fallback, fmtNum)
  )
}

/** Descriptions and grounding must agree on which projection counts exist. */
export function normalizePhysicsProjectionRows(
  rawRows: readonly unknown[],
  formatLabel: (value: unknown, fallback: string) => string
): PhysicsProjectionRow[] {
  const rows: PhysicsProjectionRow[] = []
  for (let index = 0; index < rawRows.length; index++) {
    const d = rawRows[index]
    if (!isAIDataRecord(d)) continue
    const count = finiteNumber(
      d.count ?? d.value ?? d.total ?? d.bodies ?? d.events
    )
    if (count == null) continue
    const secondary = finiteNumber(d.secondary ?? d.secondaryCount)
    const observed = finiteNumber(d.observed ?? d.observedCount)
    rows.push({
      ...(d.id != null ? { id: stringValue(d.id) } : {}),
      label: formatLabel(d.label ?? d.id ?? d.name, `container ${index + 1}`),
      count,
      ...(secondary != null ? { secondary } : {}),
      ...(typeof d.secondaryLabel === "string"
        ? { secondaryLabel: d.secondaryLabel }
        : {}),
      ...(observed != null ? { observed } : {})
    })
  }
  return rows
}

// Keep each chart's container, unit and introductory sentence together.
const PHYSICS_LANGUAGE = new Map<string, readonly [string, string, string]>([
  [
    "EventDropChart",
    [
      "time window",
      "event",
      "An event-drop physics chart that collapses moving events into a settled projection by event-time window."
    ]
  ],
  [
    "GaltonBoardChart",
    [
      "bin",
      "sample",
      "A Galton board chart that collapses falling samples into a settled histogram projection."
    ]
  ],
  [
    "CollisionSwarmChart",
    [
      "group lane",
      "point",
      "A collision swarm chart that separates overlapping points while preserving their quantitative axis position."
    ]
  ],
  [
    "PacketFlowChart",
    [
      "flow node",
      "packet",
      "A physical flow chart that keeps authored routes visible while packet bodies show throughput and proximity events."
    ]
  ],
  [
    "CrucibleChart",
    [
      "result group",
      "settled item",
      "A crucible physics chart that replays authored phases and events into declared products and outlets; the settled ledger, not collisions, determines the result."
    ]
  ],
  [
    "UnitPileChart",
    [
      "container",
      "unit",
      "A physics pile chart that collapses moving bodies into a settled bar-style projection by container."
    ]
  ]
])
const DEFAULT_LANGUAGE = ["container", "body"] as const

export function applyPhysicsLevels(
  component: string,
  kind: string,
  rows: PhysicsProjectionRow[] | null,
  levels: { l1?: string; l2?: string; l3?: string; l4?: string },
  want: Set<DescribeLevel>,
  fmtNum: (n: number) => string,
  source: ReturnType<typeof describePhysicsSource> = null
): void {
  const [rowNoun, defaultUnitNoun, description] =
    PHYSICS_LANGUAGE.get(component) ?? DEFAULT_LANGUAGE
  const unitNoun =
    source && component === "EventDropChart"
      ? "accepted event"
      : defaultUnitNoun
  const projection = source
    ? source.generated
      ? "The generated sample projection"
      : "The source projection"
    : "The settled projection"
  if (want.has("l1"))
    levels.l1 =
      description ??
      `A ${kind} whose accessible reading is the settled projection rather than individual trajectories.`
  if (!want.has("l2") && !want.has("l3")) return
  if (!rows || rows.length === 0) {
    if (want.has("l2"))
      levels.l2 = source
        ? "No valid source records are available."
        : "No settled projection is loaded yet."
    return
  }

  const {
    total,
    populated,
    leader,
    runnerUp,
    secondaryTotal,
    secondaryLabel: label
  } = summarizePhysicsRows(rows)
  if (!leader) return
  const secondaryLabel = label ?? "secondary"

  if (want.has("l2")) {
    if (source && component === "EventDropChart") {
      levels.l2 = `${projection} classifies ${fmtNum(total + secondaryTotal)} ${plural(total + secondaryTotal, "event")} across ${rows.length} ${plural(rows.length, rowNoun)}: ${fmtNum(total)} accepted and ${fmtNum(secondaryTotal)} late.`
    } else if (populated === 0) {
      levels.l2 = `${projection} contains ${fmtNum(total)} ${plural(total, unitNoun)} across ${rows.length} ${plural(rows.length, rowNoun)}; no ${plural(2, rowNoun)} are non-empty yet.`
    } else {
      const secondarySentence =
        secondaryTotal > 0
          ? ` ${fmtNum(secondaryTotal)} ${plural(secondaryTotal, unitNoun)} ${secondaryTotal === 1 ? "is" : "are"} marked ${secondaryLabel}.`
          : ""
      levels.l2 = `${projection} contains ${fmtNum(total)} ${plural(total, unitNoun)} across ${rows.length} ${plural(rows.length, rowNoun)}; ${populated} ${plural(populated, rowNoun)} ${populated === 1 ? "is" : "are"} non-empty. The largest ${rowNoun} is ${leader.label} with ${fmtNum(leader.count)} ${plural(leader.count, unitNoun)}.${secondarySentence}`
    }
  }

  if (want.has("l3") && total > 0 && populated > 0) {
    const pct = (leader.count / total) * 100
    const share = `${pct >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10}%`
    levels.l3 = runnerUp
      ? `${projection} is most concentrated in ${leader.label}, which holds ${fmtNum(leader.count)} ${plural(leader.count, unitNoun)} (${share}); ${runnerUp.label} follows with ${fmtNum(runnerUp.count)} ${plural(runnerUp.count, unitNoun)}.`
      : `${projection} is concentrated in ${leader.label}, which holds all ${fmtNum(leader.count)} ${plural(leader.count, unitNoun)}.`
  }
}
