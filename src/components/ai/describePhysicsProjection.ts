import type { Datum } from "../charts/shared/datumTypes"
import type { DescribeLevel } from "./describeChart"
import type { describePhysicsSource } from "./describePhysicsSource"
import { fmtDim } from "./chartRoles"

interface PhysicsProjectionRow {
  label: string
  count: number
  secondary?: number
  secondaryLabel?: string
  observed?: number
}

function finiteNumber(value: unknown): number | undefined {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN
  return Number.isFinite(n) ? n : undefined
}

export function physicsProjectionRows(
  props: Datum,
  fmtNum: (n: number) => string
): PhysicsProjectionRow[] | null {
  const physics =
    props.physics && typeof props.physics === "object"
      ? (props.physics as Datum)
      : null
  const settled =
    props.settledProjection && typeof props.settledProjection === "object"
      ? (props.settledProjection as Datum)
      : null
  const candidates = [
    props.settledProjectionRows,
    props.projectionRows,
    settled?.rows,
    physics?.settledProjectionRows,
    physics?.projectionRows,
    physics?.settledProjection && typeof physics.settledProjection === "object"
      ? (physics.settledProjection as Datum).rows
      : undefined
  ]
  const rawRows = candidates.find((candidate) => Array.isArray(candidate))
  if (!Array.isArray(rawRows)) return null

  return rawRows
    .map((row, index): PhysicsProjectionRow | null => {
      if (!row || typeof row !== "object") return null
      const d = row as Datum
      const count = finiteNumber(
        d.count ?? d.value ?? d.total ?? d.bodies ?? d.events
      )
      if (count == null) return null
      const rawLabel = d.label ?? d.id ?? d.name ?? `container ${index + 1}`
      const secondary = finiteNumber(d.secondary ?? d.secondaryCount)
      const observed = finiteNumber(d.observed ?? d.observedCount)
      return {
        label: fmtDim(rawLabel, fmtNum),
        count,
        ...(secondary != null ? { secondary } : {}),
        ...(typeof d.secondaryLabel === "string" && d.secondaryLabel
          ? { secondaryLabel: d.secondaryLabel }
          : {}),
        ...(observed != null ? { observed } : {})
      }
    })
    .filter((row): row is PhysicsProjectionRow => row != null)
}

function physicsRowNoun(component: string): string {
  if (component === "EventDropChart") return "time window"
  if (component === "GaltonBoardChart") return "bin"
  if (component === "CollisionSwarmChart") return "group lane"
  if (component === "PacketFlowChart") return "flow node"
  if (component === "CrucibleChart") return "result group"
  return "container"
}

function physicsUnitNoun(component: string): string {
  if (component === "EventDropChart") return "event"
  if (component === "GaltonBoardChart") return "sample"
  if (component === "CollisionSwarmChart") return "point"
  if (component === "PacketFlowChart") return "packet"
  if (component === "CrucibleChart") return "settled item"
  if (component === "UnitPileChart") return "unit"
  return "body"
}

function physicsL1Sentence(component: string, kind: string): string {
  if (component === "EventDropChart") {
    return "An event-drop physics chart that collapses moving events into a settled projection by event-time window."
  }
  if (component === "GaltonBoardChart") {
    return "A Galton board chart that collapses falling samples into a settled histogram projection."
  }
  if (component === "UnitPileChart") {
    return "A physics pile chart that collapses moving bodies into a settled bar-style projection by container."
  }
  if (component === "CollisionSwarmChart") {
    return "A collision swarm chart that separates overlapping points while preserving their quantitative axis position."
  }
  if (component === "PacketFlowChart") {
    return "A physical flow chart that keeps authored routes visible while packet bodies show throughput and proximity events."
  }
  if (component === "CrucibleChart") {
    return "A crucible physics chart that replays authored phases and events into declared products and outlets; the settled ledger, not collisions, determines the result."
  }
  return `A ${kind} whose accessible reading is the settled projection rather than individual trajectories.`
}

function formatPercent(part: number, total: number): string {
  if (!(total > 0)) return "0%"
  const pct = (part / total) * 100
  return `${pct >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10}%`
}

export function applyPhysicsLevels(
  component: string,
  kind: string,
  rows: PhysicsProjectionRow[] | null,
  levels: { l1?: string; l2?: string; l3?: string; l4?: string },
  want: Set<DescribeLevel>,
  fmtNum: (n: number) => string,
  source: ReturnType<typeof describePhysicsSource> = null
): void {
  const rowNoun = physicsRowNoun(component)
  const unitNoun =
    source && component === "EventDropChart"
      ? "accepted event"
      : physicsUnitNoun(component)
  const projection = source
    ? source.generated
      ? "The generated sample projection"
      : "The source projection"
    : "The settled projection"
  if (want.has("l1")) levels.l1 = physicsL1Sentence(component, kind)
  if (!want.has("l2") && !want.has("l3")) return
  if (!rows || rows.length === 0) {
    if (want.has("l2"))
      levels.l2 = source
        ? "No valid source records are available."
        : "No settled projection is loaded yet."
    return
  }

  const total = rows.reduce((sum, row) => sum + row.count, 0)
  const populated = rows
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
  const leader =
    populated[0] ?? rows.slice().sort((a, b) => b.count - a.count)[0]
  if (!leader) return
  const secondaryTotal = rows.reduce(
    (sum, row) => sum + (row.secondary ?? 0),
    0
  )
  const secondaryLabel =
    rows.find((row) => row.secondaryLabel)?.secondaryLabel ?? "secondary"

  if (want.has("l2")) {
    if (source && component === "EventDropChart") {
      levels.l2 = `${projection} classifies ${fmtNum(total + secondaryTotal)} ${plural(total + secondaryTotal, "event")} across ${rows.length} ${plural(rows.length, rowNoun)}: ${fmtNum(total)} accepted and ${fmtNum(secondaryTotal)} late.`
    } else if (populated.length === 0) {
      levels.l2 = `${projection} contains ${fmtNum(total)} ${plural(total, unitNoun)} across ${rows.length} ${plural(rows.length, rowNoun)}; no ${plural(2, rowNoun)} are non-empty yet.`
    } else {
      const secondarySentence =
        secondaryTotal > 0
          ? ` ${fmtNum(secondaryTotal)} ${plural(secondaryTotal, unitNoun)} ${secondaryTotal === 1 ? "is" : "are"} marked ${secondaryLabel}.`
          : ""
      levels.l2 = `${projection} contains ${fmtNum(total)} ${plural(total, unitNoun)} across ${rows.length} ${plural(rows.length, rowNoun)}; ${populated.length} ${plural(populated.length, rowNoun)} ${populated.length === 1 ? "is" : "are"} non-empty. The largest ${rowNoun} is ${leader.label} with ${fmtNum(leader.count)} ${plural(leader.count, unitNoun)}.${secondarySentence}`
    }
  }

  if (want.has("l3") && total > 0 && populated.length > 0) {
    const runnerUp = populated.find((row) => row !== leader)
    const share = formatPercent(leader.count, total)
    levels.l3 = runnerUp
      ? `${projection} is most concentrated in ${leader.label}, which holds ${fmtNum(leader.count)} ${plural(leader.count, unitNoun)} (${share}); ${runnerUp.label} follows with ${fmtNum(runnerUp.count)} ${plural(runnerUp.count, unitNoun)}.`
      : `${projection} is concentrated in ${leader.label}, which holds all ${fmtNum(leader.count)} ${plural(leader.count, unitNoun)}.`
  }
}

function plural(n: number, noun: string): string {
  if (n !== 1 && noun === "body") return "bodies"
  return n === 1 ? noun : `${noun}s`
}
