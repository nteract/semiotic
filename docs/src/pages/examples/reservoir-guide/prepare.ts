import { dateForWaterYear, dateIndex, SEASON_DAYS, sourceObservationStamp } from "./calendar"
import { resolveState, validateState } from "./state"
import type {
  CapacityComparison,
  GuideState,
  PreparedGuide,
  Reading,
  Reservoir,
  ReservoirSnapshot,
  SeasonalComparison,
} from "./types"

export const SCOPE =
  "Six selected reservoirs, not all California storage. Historical storage alone cannot establish whether drought has ended."

export function regimeAt(reservoir: Reservoir, date: string) {
  return (
    [...reservoir.changes]
      .filter((change) => change.from <= date)
      .sort((a, b) => b.from.localeCompare(a.from))[0]?.id ?? "original-reported-series"
  )
}

export function readingAt(
  snapshot: ReservoirSnapshot,
  stationId: string,
  date: string | null,
): Reading | null {
  if (!date || date < snapshot.startDate || date > snapshot.endDate) return null
  const reservoir = snapshot.reservoirs.find((item) => item.id === stationId)
  if (!reservoir) return null
  const index = dateIndex(date, snapshot.startDate)
  const packed = snapshot.series[stationId]?.[index]
  if (!packed) return null
  const [value, offset, flag = ""] = packed
  const status =
    value === null || offset === null
      ? "missing"
      : flag === "e"
        ? "estimated"
        : flag === "r"
          ? "revised"
          : flag
            ? "unsupported-flag"
            : "reported"
  const capacity = snapshot.capacities.find(
    (item) => item.stationId === stationId && item.validFrom <= date && item.validTo >= date,
  )
  return {
    id: `${stationId}:${date}`,
    stationId,
    observationDate: date,
    sourceDateTime: `${date.replaceAll("-", "")} 0000`,
    sourceObservationDateTime: offset === null ? null : sourceObservationStamp(date, offset),
    sourceRecordLine:
      offset === null ? null : (snapshot.sourceLineOverrides[stationId]?.[date] ?? index + 2),
    storageAcreFeet: value,
    qualityFlag: flag,
    status,
    eligible: value !== null && value >= 0 && ["reported", "revised"].includes(status),
    measurementRegime: regimeAt(reservoir, date),
    snapshotId: snapshot.editionId,
    capacityId: capacity?.id ?? null,
  }
}

export function capacityComparison(
  snapshot: ReservoirSnapshot,
  stationId: string,
  reading: Reading | null,
): CapacityComparison {
  const exact = reading && snapshot.capacities.find((item) => item.id === reading.capacityId)
  const reference = snapshot.capacities.find(
    (item) =>
      item.stationId === stationId &&
      item.validFrom <= snapshot.referenceCapacityDate &&
      item.validTo >= snapshot.referenceCapacityDate,
  )
  const capacity = exact || reference || null
  const percent =
    reading?.eligible && capacity && capacity.acreFeet > 0
      ? (reading.storageAcreFeet! / capacity.acreFeet) * 100
      : null
  return {
    capacity,
    mode: exact ? "dated" : reference ? "reference" : "unavailable",
    percent,
    aboveReference: percent !== null && percent > 100,
  }
}

export function seasonalComparison(
  snapshot: ReservoirSnapshot,
  stationId: string,
  year: number,
  monthDay: string,
): SeasonalComparison {
  const reservoir = snapshot.reservoirs.find((item) => item.id === stationId)!
  const date = dateForWaterYear(year, monthDay)
  const target = readingAt(snapshot, stationId, date)
  const regime = regimeAt(reservoir, date ?? dateForWaterYear(year, "02-28")!)
  const samples: SeasonalComparison["samples"] = []
  const excluded: SeasonalComparison["excluded"] = []
  for (
    let baselineYear = snapshot.baseline.startWaterYear;
    baselineYear <= snapshot.baseline.endWaterYear;
    baselineYear++
  ) {
    const baselineDate = dateForWaterYear(baselineYear, monthDay)
    const reading = readingAt(snapshot, stationId, baselineDate)
    const reason = !baselineDate
      ? "No February 29 in this water year"
      : !reading?.eligible
        ? (reading?.status ?? "missing")
        : reading.measurementRegime !== regime
          ? "Different documented measurement regime"
          : null
    if (reason) excluded.push({ year: baselineYear, reason })
    else samples.push({ year: baselineYear, value: reading!.storageAcreFeet!, rowId: reading!.id })
  }
  const count = samples.length
  const mean = count ? samples.reduce((sum, sample) => sum + sample.value, 0) / count : null
  const less = target?.eligible
    ? samples.filter((sample) => sample.value < target.storageAcreFeet!).length
    : 0
  const equal = target?.eligible
    ? samples.filter((sample) => sample.value === target.storageAcreFeet).length
    : 0
  const enough = count >= snapshot.baseline.minimumPercentileYears
  return {
    count,
    samples,
    excluded,
    mean,
    less,
    equal,
    percentOfMean:
      target?.eligible && mean !== null && mean > 0 ? (target.storageAcreFeet! / mean) * 100 : null,
    percentile: target?.eligible && enough ? (100 * (less + equal / 2)) / count : null,
    reason: !date
      ? "This water year has no February 29."
      : !target?.eligible
        ? "The selected storage observation is missing, estimated or unsupported."
        : !count
          ? "No eligible baseline years use the same documented measurement regime."
          : !enough
            ? `Only ${count} eligible baseline years; a percentile requires ${snapshot.baseline.minimumPercentileYears}.`
            : null,
  }
}

export function prepareGuide(snapshot: ReservoirSnapshot, input: GuideState): PreparedGuide {
  const state = validateState(input)
  const issue = resolveState(state, snapshot)
  if (issue) throw new Error(issue)
  const reservoir = snapshot.reservoirs.find((item) => item.id === state.stationId)!
  const date = dateForWaterYear(state.waterYear, state.monthDay)
  const comparisonDate = dateForWaterYear(state.comparisonYear, state.monthDay)
  const reading = readingAt(snapshot, reservoir.id, date)
  const members = snapshot.reservoirs.map((item) => {
    const row = readingAt(snapshot, item.id, date)
    return { reservoir: item, reading: row, capacity: capacityComparison(snapshot, item.id, row) }
  })
  const included = members.filter(
    (member) =>
      member.reading?.eligible && member.capacity.capacity && member.capacity.percent !== null,
  )
  const storage = included.length
    ? included.reduce((sum, member) => sum + member.reading!.storageAcreFeet!, 0)
    : null
  const capacity = included.length
    ? included.reduce((sum, member) => sum + member.capacity.capacity!.acreFeet, 0)
    : null
  return {
    state,
    reservoir,
    date,
    comparisonDate,
    reading,
    comparisonReading: readingAt(snapshot, reservoir.id, comparisonDate),
    capacity: capacityComparison(snapshot, reservoir.id, reading),
    baseline: seasonalComparison(snapshot, reservoir.id, state.waterYear, state.monthDay),
    season: SEASON_DAYS.map((monthDay, day) => {
      const baseline = seasonalComparison(snapshot, reservoir.id, state.waterYear, monthDay)
      return {
        day,
        monthDay,
        active: readingAt(snapshot, reservoir.id, dateForWaterYear(state.waterYear, monthDay)),
        comparison: readingAt(
          snapshot,
          reservoir.id,
          dateForWaterYear(state.comparisonYear, monthDay),
        ),
        baselineMean: baseline.mean,
        baselineCount: baseline.count,
      }
    }),
    collection: {
      date,
      members,
      includedIds: included.map((member) => member.reservoir.id),
      excludedIds: members
        .filter((member) => !included.includes(member))
        .map((member) => member.reservoir.id),
      storage,
      capacity,
      percent:
        storage !== null && capacity !== null && capacity > 0 ? (storage / capacity) * 100 : null,
      status: !included.length
        ? "unavailable"
        : included.length === members.length
          ? "complete"
          : "partial",
      mode: !included.length
        ? "unavailable"
        : included.every((member) => member.capacity.mode === "dated")
          ? "dated"
          : "reference",
    },
    qualifications: [
      SCOPE,
      "The fixed baseline uses water years 1991–2020 and matches month/day, not ordinary day-of-year integers.",
      "Revised readings are eligible. Estimated readings remain visible in source details but are excluded from calculations; missing readings never become zero.",
      "Capacity is documented for July 30, 2025. Other dates use that explicitly labeled reference, not a reconstructed history of reservoir capacity.",
      ...reservoir.changes.map((change) => `${change.from}: ${change.explanation}`),
    ],
  }
}
