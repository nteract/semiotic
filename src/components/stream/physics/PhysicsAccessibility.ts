import type { NavTreeNode } from "../../ai/navigationTree"
import type { Datum } from "../../charts/shared/datumTypes"
import type { PhysicsBodyState } from "./PhysicsKernel"
import type { PhysicsObservationEvent } from "./PhysicsPipelineStore"

export interface PhysicsProjectionContainerSpec {
  id: string
  label: string
  count?: number
  secondary?: number
  secondaryLabel?: string
  observed?: number
  metadata?: Record<string, unknown>
}

export interface PhysicsProjectionBodySummary {
  id: string
  label: string
  datum?: unknown
}

export interface PhysicsSettledProjectionRow {
  id: string
  label: string
  count: number
  share: number
  secondary?: number
  secondaryLabel?: string
  observed?: number
  bodyIds: string[]
  recentBodies: PhysicsProjectionBodySummary[]
  metadata?: Record<string, unknown>
}

export interface PhysicsSettledProjectionOptions {
  bodies?: PhysicsBodyState[]
  getContainerId?: (body: PhysicsBodyState) => string | undefined
  getBodyLabel?: (body: PhysicsBodyState) => string | undefined
  recentBodyLimit?: number
}

export interface PhysicsNavigationTreeOptions {
  chartId?: string
  chartType?: string
  title?: string
  projectionLabel?: string
  maxBodiesPerContainer?: number
}

export interface PhysicsObservationAnnouncementOptions {
  getDatumLabel?: (
    datum: unknown,
    event: PhysicsObservationEvent
  ) => string | undefined
}

function defaultBodyLabel(body: PhysicsBodyState): string {
  const datum = body.datum
  if (datum && typeof datum === "object") {
    const record = datum as Record<string, unknown>
    const label = record.label ?? record.name ?? record.id
    if (label != null && label !== "") return String(label)
  }
  return body.id
}

function defaultDatumLabel(
  datum: unknown,
  fallback: string | undefined
): string | undefined {
  if (datum && typeof datum === "object") {
    const record = datum as Record<string, unknown>
    const label = record.label ?? record.name ?? record.id
    if (label != null && label !== "") return String(label)
  }
  return fallback
}

function sentenceCase(value: string): string {
  if (value.length === 0) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function barrierTarget(event: PhysicsObservationEvent): string {
  if (event.binId) return event.binId
  if (typeof event.barrierValue === "number") return `${Math.round(event.barrierValue)}`
  return "a threshold"
}

function formatShare(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return "0%"
  if (share < 0.01) return "<1%"
  return `${Math.round(share * 100)}%`
}

function navigationDatum(value: unknown): Datum | null {
  return value && typeof value === "object" ? (value as Datum) : null
}

export function buildPhysicsSettledProjection(
  containers: PhysicsProjectionContainerSpec[],
  options: PhysicsSettledProjectionOptions = {}
): PhysicsSettledProjectionRow[] {
  const bodies = options.bodies ?? []
  const recentBodyLimit = Math.max(0, options.recentBodyLimit ?? 6)
  const bodiesByContainer = new Map<string, PhysicsBodyState[]>()

  for (const body of bodies) {
    const containerId = options.getContainerId?.(body)
    if (!containerId) continue
    const bucket = bodiesByContainer.get(containerId)
    if (bucket) bucket.push(body)
    else bodiesByContainer.set(containerId, [body])
  }

  const rows = containers.map((container) => {
    const containerBodies = bodiesByContainer.get(container.id) ?? []
    const count = Math.max(
      0,
      Math.floor(container.count ?? containerBodies.length)
    )
    const recentBodies = containerBodies
      .slice(Math.max(0, containerBodies.length - recentBodyLimit))
      .map((body) => ({
        id: body.id,
        label: options.getBodyLabel?.(body) ?? defaultBodyLabel(body),
        datum: body.datum
      }))

    return {
      id: container.id,
      label: container.label,
      count,
      share: 0,
      secondary: container.secondary,
      secondaryLabel: container.secondaryLabel,
      observed: container.observed,
      bodyIds: containerBodies.map((body) => body.id),
      recentBodies,
      metadata: container.metadata
    }
  })

  const total = rows.reduce((sum, row) => sum + row.count, 0)
  return rows.map((row) => ({
    ...row,
    share: total > 0 ? row.count / total : 0
  }))
}

export function buildPhysicsNavigationTree(
  rows: PhysicsSettledProjectionRow[],
  options: PhysicsNavigationTreeOptions = {}
): NavTreeNode {
  const chartType = options.chartType ?? "Physics chart"
  const chartId = options.chartId ?? "physics"
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  const nonEmpty = rows.filter((row) => row.count > 0).length
  const projectionLabel = options.projectionLabel ?? "settled projection"
  const maxBodies = Math.max(0, options.maxBodiesPerContainer ?? 6)
  let nextId = 0

  const root: NavTreeNode = {
    id: chartId,
    role: "chart",
    level: 1,
    label:
      options.title ??
      `${chartType}: ${total} bodies across ${rows.length} containers; ${nonEmpty} containers currently non-empty.`,
    children: rows.map((row) => {
      const bodyChildren: NavTreeNode[] = row.recentBodies
        .slice(0, maxBodies)
        .map((body) => ({
          id: `${row.id}-body-${nextId++}`,
          role: "datum",
          level: 3,
          label: body.label,
          datum: navigationDatum(body.datum)
        }))

      const omitted = Math.max(0, row.bodyIds.length - bodyChildren.length)
      if (omitted > 0) {
        bodyChildren.push({
          id: `${row.id}-more-${nextId++}`,
          role: "datum",
          level: 3,
          label: `…and ${omitted} more recent bodies`
        })
      }

      const qualifiers: string[] = [`${row.count} bodies`]
      qualifiers.push(formatShare(row.share))
      if (row.secondary != null && row.secondary > 0) {
        qualifiers.push(`${row.secondary} ${row.secondaryLabel ?? "secondary"}`)
      }
      if (row.observed != null) qualifiers.push(`${row.observed} observed`)

      return {
        id: row.id,
        role: "series",
        level: 2,
        label: `${row.label}: ${qualifiers.join(", ")} in the ${projectionLabel}.`,
        value: row.count,
        datum: row.metadata ?? null,
        children: bodyChildren
      }
    })
  }

  return root
}

export function physicsObservationAnnouncement(
  event: PhysicsObservationEvent,
  options: PhysicsObservationAnnouncementOptions = {}
): string | null {
  const subject =
    options.getDatumLabel?.(event.datum, event) ??
    defaultDatumLabel(event.datum, event.bodyId)

  if (event.type === "physics-bin-enter") {
    return `${subject ?? "A body"} entered ${event.binId ?? event.sensorId ?? "a bin"}.`
  }
  if (event.type === "physics-bin-exit") {
    return `${subject ?? "A body"} exited ${event.binId ?? event.sensorId ?? "a bin"}.`
  }
  if (event.type === "physics-proximity-enter") {
    return `${subject ?? "A body"} entered proximity sensor ${event.binId ?? event.sensorId ?? "a sensor"}.`
  }
  if (event.type === "physics-proximity-exit") {
    return `${subject ?? "A body"} exited proximity sensor ${event.binId ?? event.sensorId ?? "a sensor"}.`
  }
  if (event.type === "physics-settle") {
    return `${subject ?? "A body"} settled.`
  }
  if (event.type === "physics-late") {
    return `${subject ?? "A body"} arrived late for ${event.binId ?? event.sensorId ?? "a closed window"}.`
  }
  if (event.type === "physics-barrier-cross") {
    return `${sentenceCase(event.barrierId ?? "Barrier")} crossed ${barrierTarget(event)}.`
  }
  if (event.type === "sim-active") {
    return "Simulation running."
  }
  if (event.type === "sim-idle") {
    return "Simulation settled."
  }
  return null
}
