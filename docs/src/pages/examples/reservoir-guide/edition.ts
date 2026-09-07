import { fingerprintValue } from "semiotic/artifact"
import { dateIndex, dateTime } from "./calendar"
import { resolveState } from "./state"
import type { GuideState, ReservoirSnapshot } from "./types"

export function verifySnapshot(value: unknown): ReservoirSnapshot {
  if (!value || typeof value !== "object") throw new Error("Invalid reservoir edition")
  const snapshot = value as ReservoirSnapshot
  if (snapshot.version !== 1 || snapshot.storyId !== "E03")
    throw new Error("Unsupported reservoir edition version")
  if (typeof snapshot.editionId !== "string" || !/^[a-zA-Z0-9._-]{1,160}$/.test(snapshot.editionId))
    throw new Error("Invalid edition identity")
  dateTime(snapshot.startDate)
  dateTime(snapshot.endDate)
  const length = dateIndex(snapshot.endDate, snapshot.startDate) + 1
  if (
    length < 1 ||
    length > 50_000 ||
    !Array.isArray(snapshot.reservoirs) ||
    snapshot.reservoirs.length < 1 ||
    snapshot.reservoirs.length > 50
  )
    throw new Error("Unsupported edition coverage")
  const seen = new Set<string>()
  if (
    !Number.isFinite(Date.parse(snapshot.retrievedAt)) ||
    typeof snapshot.transformVersion !== "string"
  )
    throw new Error("Invalid edition retrieval or transform metadata")
  dateTime(snapshot.referenceCapacityDate)
  if (
    !snapshot.baseline ||
    typeof snapshot.baseline.id !== "string" ||
    !snapshot.baseline.id ||
    snapshot.baseline.id.length > 160 ||
    snapshot.baseline.startWaterYear !== 1991 ||
    snapshot.baseline.endWaterYear !== 2020 ||
    snapshot.baseline.minimumPercentileYears !== 20
  )
    throw new Error(
      "Unsupported seasonal baseline; this guide supports water years 1991–2020 with a 20-year percentile minimum",
    )
  if (!Array.isArray(snapshot.sources) || !snapshot.sources.length || snapshot.sources.length > 100)
    throw new Error("Missing source inventory")
  const files = new Set<string>()
  for (const source of snapshot.sources) {
    if (
      !/^[a-zA-Z0-9._-]+$/.test(source.file) ||
      files.has(source.file) ||
      !/^https:\/\//.test(source.url) ||
      !/^[a-f0-9]{64}$/.test(source.sha256) ||
      !Number.isInteger(source.bytes) ||
      source.bytes < 0 ||
      !Number.isFinite(Date.parse(source.retrievedAt))
    )
      throw new Error("Invalid or duplicate source metadata")
    files.add(source.file)
  }
  for (const reservoir of snapshot.reservoirs) {
    if (!/^[A-Z0-9]{3}$/.test(reservoir.id) || seen.has(reservoir.id))
      throw new Error("Duplicate or invalid reservoir identity")
    seen.add(reservoir.id)
    if (
      typeof reservoir.name !== "string" ||
      !reservoir.name ||
      reservoir.name.length > 100 ||
      typeof reservoir.river !== "string" ||
      !Number.isFinite(reservoir.latitude) ||
      Math.abs(reservoir.latitude) > 90 ||
      !Number.isFinite(reservoir.longitude) ||
      Math.abs(reservoir.longitude) > 180 ||
      !files.has(reservoir.sourceFile) ||
      !files.has(reservoir.metadataFile) ||
      !Array.isArray(reservoir.changes)
    )
      throw new Error("Invalid reservoir metadata")
    const changes = new Set<string>()
    for (const change of reservoir.changes) {
      dateTime(change.from)
      if (
        typeof change.id !== "string" ||
        !change.id ||
        typeof change.explanation !== "string" ||
        changes.has(change.from)
      )
        throw new Error("Ambiguous measurement change")
      changes.add(change.from)
    }
    if (!snapshot.sourceLineOverrides?.[reservoir.id] || !snapshot.counts?.[reservoir.id])
      throw new Error("Missing row provenance or coverage counts")
    for (const [date, line] of Object.entries(snapshot.sourceLineOverrides[reservoir.id])) {
      dateTime(date)
      if (
        date < snapshot.startDate ||
        date > snapshot.endDate ||
        !Number.isInteger(line) ||
        line < 2
      )
        throw new Error("Invalid source record reference")
    }
    const rows = snapshot.series?.[reservoir.id]
    if (!Array.isArray(rows) || rows.length !== length)
      throw new Error("Edition date coverage is incomplete")
    for (const row of rows) {
      if (
        !Array.isArray(row) ||
        row.length < 2 ||
        row.length > 3 ||
        (row[0] !== null && (!Number.isFinite(row[0]) || row[0] < 0)) ||
        (row[1] !== null && !Number.isInteger(row[1])) ||
        (row[2] !== undefined && (typeof row[2] !== "string" || row[2].length > 20))
      )
        throw new Error("Invalid packed storage observation")
    }
  }
  if (!Array.isArray(snapshot.capacities)) throw new Error("Missing capacity metadata")
  const capacityIds = new Set<string>()
  for (const capacity of snapshot.capacities) {
    dateTime(capacity.validFrom)
    dateTime(capacity.validTo)
    if (
      !seen.has(capacity.stationId) ||
      typeof capacity.id !== "string" ||
      !capacity.id ||
      capacityIds.has(capacity.id) ||
      !Number.isFinite(capacity.acreFeet) ||
      capacity.acreFeet <= 0 ||
      capacity.validFrom > capacity.validTo ||
      !files.has(capacity.sourceFile) ||
      !/^https:\/\//.test(capacity.sourceURL)
    )
      throw new Error("Invalid capacity metadata")
    if (
      snapshot.capacities.some(
        (other) =>
          other !== capacity &&
          other.stationId === capacity.stationId &&
          other.validFrom <= capacity.validTo &&
          other.validTo >= capacity.validFrom,
      )
    )
      throw new Error("Overlapping capacity applicability intervals")
    capacityIds.add(capacity.id)
  }
  if (fingerprintValue({ ...snapshot, fingerprint: "" }).fingerprint !== snapshot.fingerprint)
    throw new Error("Edition values differ from its fingerprint")
  return snapshot
}

export function compareEditions(
  before: ReservoirSnapshot,
  after: ReservoirSnapshot,
  state: GuideState,
) {
  const changes: {
    stationId: string
    date: string
    before: number | null
    after: number | null
    detail: string
  }[] = []
  const ids = [
    ...new Set([...before.reservoirs, ...after.reservoirs].map((item) => item.id)),
  ].sort()
  const first = before.startDate < after.startDate ? before.startDate : after.startDate
  const last = before.endDate > after.endDate ? before.endDate : after.endDate
  const days = dateIndex(last, first) + 1
  for (const id of ids) {
    for (let index = 0; index < days; index++) {
      const date = new Date(dateTime(first) + index * 86_400_000).toISOString().slice(0, 10)
      const a = before.series[id]?.[dateIndex(date, before.startDate)]
      const b = after.series[id]?.[dateIndex(date, after.startDate)]
      if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null))
        changes.push({
          stationId: id,
          date,
          before: a?.[0] ?? null,
          after: b?.[0] ?? null,
          detail:
            a?.[0] !== b?.[0]
              ? "Storage or coverage changed"
              : "Observation timestamp or quality flag changed",
        })
    }
  }
  const nextState = { ...state, editionId: after.editionId }
  const metadataChanged =
    fingerprintValue({
      capacities: before.capacities,
      baseline: before.baseline,
      reservoirs: before.reservoirs,
    }).fingerprint !==
    fingerprintValue({
      capacities: after.capacities,
      baseline: after.baseline,
      reservoirs: after.reservoirs,
    }).fingerprint
  return {
    from: before.editionId,
    to: after.editionId,
    changes,
    metadataChanged,
    nextState,
    selectionIssue: resolveState(nextState, after),
  }
}
