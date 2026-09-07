export interface SourceFile {
  file: string
  url: string
  retrievedAt: string
  bytes: number
  sha256: string
}

export interface Capacity {
  id: string
  stationId: string
  acreFeet: number
  validFrom: string
  validTo: string
  sourceFile: string
  sourceURL: string
}

export interface Reservoir {
  id: string
  name: string
  river: string
  latitude: number
  longitude: number
  sourceFile: string
  metadataFile: string
  changes: { from: string; id: string; explanation: string }[]
}

/** Storage AF, source OBS DATE offset in minutes from DATE TIME, optional flag. */
export type PackedReading = [number | null, number | null, string?]

export interface ReservoirSnapshot {
  version: 1
  storyId: "E03"
  editionId: string
  fingerprint: string
  retrievedAt: string
  transformVersion: string
  startDate: string
  endDate: string
  baseline: {
    id: string
    startWaterYear: number
    endWaterYear: number
    minimumPercentileYears: number
  }
  reservoirs: Reservoir[]
  capacities: Capacity[]
  referenceCapacityDate: string
  series: Record<string, PackedReading[]>
  sourceLineOverrides: Record<string, Record<string, number>>
  sources: SourceFile[]
  counts: Record<
    string,
    { rows: number; missing: number; estimated: number; revised: number; eligible: number }
  >
}

export interface GuideState {
  version: 1
  editionId: string
  stationId: string
  waterYear: number
  comparisonYear: number
  monthDay: string
  baselineId: string
}

export interface Reading {
  id: string
  stationId: string
  observationDate: string
  sourceDateTime: string
  sourceObservationDateTime: string | null
  sourceRecordLine: number | null
  storageAcreFeet: number | null
  qualityFlag: string
  status: "reported" | "revised" | "estimated" | "missing" | "unsupported-flag"
  eligible: boolean
  measurementRegime: string
  snapshotId: string
  capacityId: string | null
}

export interface SeasonalComparison {
  count: number
  samples: { year: number; value: number; rowId: string }[]
  excluded: { year: number; reason: string }[]
  mean: number | null
  percentOfMean: number | null
  percentile: number | null
  less: number
  equal: number
  reason: string | null
}

export interface CapacityComparison {
  capacity: Capacity | null
  mode: "dated" | "reference" | "unavailable"
  percent: number | null
  aboveReference: boolean
}

export interface SeasonPoint {
  day: number
  monthDay: string
  active: Reading | null
  comparison: Reading | null
  baselineMean: number | null
  baselineCount: number
}

export interface PreparedGuide {
  state: GuideState
  reservoir: Reservoir
  date: string | null
  comparisonDate: string | null
  reading: Reading | null
  comparisonReading: Reading | null
  capacity: CapacityComparison
  baseline: SeasonalComparison
  season: SeasonPoint[]
  collection: {
    date: string | null
    members: { reservoir: Reservoir; reading: Reading | null; capacity: CapacityComparison }[]
    includedIds: string[]
    excludedIds: string[]
    storage: number | null
    capacity: number | null
    percent: number | null
    status: "complete" | "partial" | "unavailable"
    mode: "dated" | "reference" | "unavailable"
  }
  qualifications: string[]
}
