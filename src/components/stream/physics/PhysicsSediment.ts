import type { PhysicsBodyState } from "./PhysicsKernel"

export type PhysicsSedimentAccessor =
  | string
  | ((body: PhysicsBodyState, index: number) => unknown)

export type PhysicsSedimentValueAccessor =
  | number
  | string
  | ((body: PhysicsBodyState, index: number) => unknown)

export interface RunningStatsSnapshot {
  count: number
  total: number
  mean: number
  min: number
  max: number
  variance: number
}

export interface PhysicsSedimentConfig {
  binAccessor?: PhysicsSedimentAccessor
  labelAccessor?: PhysicsSedimentAccessor
  valueAccessor?: PhysicsSedimentValueAccessor
  retainBodyIds?: number
}

export interface PhysicsSedimentBinSnapshot {
  id: string
  label: string
  count: number
  total: number
  bodyIds: string[]
  lastBodyId?: string
  lastDatum?: unknown
  x: RunningStatsSnapshot
  y: RunningStatsSnapshot
  value: RunningStatsSnapshot
}

export interface PhysicsSedimentTotals {
  bins: number
  count: number
  total: number
}

export interface PhysicsSedimentHeightfieldOptions {
  baselineY?: number
  binWidth?: number
  gap?: number
  maxHeight?: number
  value?: "count" | "total"
  x?: (bin: PhysicsSedimentBinSnapshot, index: number) => number
}

export interface PhysicsSedimentColumn {
  binId: string
  label: string
  index: number
  count: number
  total: number
  x: number
  y: number
  width: number
  height: number
  meanX: number
  meanY: number
}

interface MutableRunningStats {
  count: number
  total: number
  mean: number
  m2: number
  min: number
  max: number
}

interface MutableSedimentBin {
  id: string
  label: string
  bodyIds: string[]
  lastBodyId?: string
  lastDatum?: unknown
  x: MutableRunningStats
  y: MutableRunningStats
  value: MutableRunningStats
}

const DEFAULT_BIN_ID = "sediment"
const DEFAULT_RETAIN_BODY_IDS = 12
const DEFAULT_BIN_KEYS = ["binId", "targetBin", "category", "windowIndex", "lane", "group"]

function createRunningStats(): MutableRunningStats {
  return {
    count: 0,
    total: 0,
    mean: 0,
    m2: 0,
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY
  }
}

function addRunningValue(stats: MutableRunningStats, value: number): void {
  if (!Number.isFinite(value)) return
  stats.count += 1
  stats.total += value
  stats.min = Math.min(stats.min, value)
  stats.max = Math.max(stats.max, value)

  const delta = value - stats.mean
  stats.mean += delta / stats.count
  const nextDelta = value - stats.mean
  stats.m2 += delta * nextDelta
}

function snapshotStats(stats: MutableRunningStats): RunningStatsSnapshot {
  return {
    count: stats.count,
    total: stats.total,
    mean: stats.count > 0 ? stats.mean : 0,
    min: stats.count > 0 ? stats.min : 0,
    max: stats.count > 0 ? stats.max : 0,
    variance: stats.count > 1 ? stats.m2 / (stats.count - 1) : 0
  }
}

function restoreStats(snapshot: RunningStatsSnapshot): MutableRunningStats {
  return {
    count: snapshot.count,
    total: snapshot.total,
    mean: snapshot.mean,
    m2: snapshot.variance * Math.max(0, snapshot.count - 1),
    min: snapshot.count > 0 ? snapshot.min : Number.POSITIVE_INFINITY,
    max: snapshot.count > 0 ? snapshot.max : Number.NEGATIVE_INFINITY
  }
}

function readField(body: PhysicsBodyState, key: string): unknown {
  const bodyRecord = body as unknown as Record<string, unknown>
  if (bodyRecord[key] != null) return bodyRecord[key]
  const datum = body.datum
  if (datum && typeof datum === "object") {
    return (datum as Record<string, unknown>)[key]
  }
  return undefined
}

function accessorValue(
  accessor: PhysicsSedimentAccessor | undefined,
  body: PhysicsBodyState,
  index: number
): unknown {
  if (typeof accessor === "function") return accessor(body, index)
  if (typeof accessor === "string") return readField(body, accessor)
  return undefined
}

function valueAccessorValue(
  accessor: PhysicsSedimentValueAccessor | undefined,
  body: PhysicsBodyState,
  index: number
): number {
  if (typeof accessor === "number") return accessor
  const raw =
    typeof accessor === "function"
      ? accessor(body, index)
      : typeof accessor === "string"
        ? readField(body, accessor)
        : 1
  const value = typeof raw === "number" ? raw : Number(raw)
  return Number.isFinite(value) ? value : 1
}

function normalizeId(value: unknown): string | undefined {
  if (value == null) return undefined
  const id = String(value)
  return id.trim() ? id : undefined
}

function defaultBinId(body: PhysicsBodyState): string {
  for (const key of DEFAULT_BIN_KEYS) {
    const value = normalizeId(readField(body, key))
    if (value) return value
  }
  return DEFAULT_BIN_ID
}

function cloneBin(bin: MutableSedimentBin): PhysicsSedimentBinSnapshot {
  const value = snapshotStats(bin.value)
  return {
    id: bin.id,
    label: bin.label,
    count: value.count,
    total: value.total,
    bodyIds: bin.bodyIds.slice(),
    lastBodyId: bin.lastBodyId,
    lastDatum: bin.lastDatum,
    x: snapshotStats(bin.x),
    y: snapshotStats(bin.y),
    value
  }
}

export class PhysicsSedimentAccumulator {
  private bins = new Map<string, MutableSedimentBin>()
  private config: PhysicsSedimentConfig | false
  private nextIndex = 0

  constructor(config: PhysicsSedimentConfig | false = false) {
    this.config = config
  }

  updateConfig(config: PhysicsSedimentConfig | false | undefined): void {
    if (config === undefined) return
    this.config = config
    if (config === false) this.clear()
  }

  isEnabled(): boolean {
    return this.config !== false
  }

  add(body: PhysicsBodyState): PhysicsSedimentBinSnapshot | null {
    if (this.config === false) return null
    const index = this.nextIndex
    this.nextIndex += 1
    const id =
      normalizeId(accessorValue(this.config.binAccessor, body, index)) ??
      defaultBinId(body)
    const label =
      normalizeId(accessorValue(this.config.labelAccessor, body, index)) ?? id
    const value = valueAccessorValue(this.config.valueAccessor, body, index)
    const retainBodyIds = Math.max(
      0,
      Math.floor(this.config.retainBodyIds ?? DEFAULT_RETAIN_BODY_IDS)
    )
    let bin = this.bins.get(id)
    if (!bin) {
      bin = {
        id,
        label,
        bodyIds: [],
        x: createRunningStats(),
        y: createRunningStats(),
        value: createRunningStats()
      }
      this.bins.set(id, bin)
    }

    bin.label = label
    bin.lastBodyId = body.id
    bin.lastDatum = body.datum
    addRunningValue(bin.x, body.x)
    addRunningValue(bin.y, body.y)
    addRunningValue(bin.value, value)
    if (retainBodyIds > 0) {
      bin.bodyIds.push(body.id)
      if (bin.bodyIds.length > retainBodyIds) {
        bin.bodyIds = bin.bodyIds.slice(bin.bodyIds.length - retainBodyIds)
      }
    }
    return cloneBin(bin)
  }

  clear(): void {
    this.bins.clear()
    this.nextIndex = 0
  }

  snapshot(): PhysicsSedimentBinSnapshot[] {
    return Array.from(this.bins.values()).map(cloneBin)
  }

  restore(snapshot: PhysicsSedimentBinSnapshot[] = []): void {
    this.bins.clear()
    for (const bin of snapshot) {
      this.bins.set(bin.id, {
        id: bin.id,
        label: bin.label,
        bodyIds: bin.bodyIds.slice(),
        lastBodyId: bin.lastBodyId,
        lastDatum: bin.lastDatum,
        x: restoreStats(bin.x),
        y: restoreStats(bin.y),
        value: restoreStats(bin.value)
      })
    }
    this.nextIndex = snapshot.reduce((sum, bin) => sum + bin.count, 0)
  }

  totals(): PhysicsSedimentTotals {
    const bins = this.snapshot()
    return {
      bins: bins.length,
      count: bins.reduce((sum, bin) => sum + bin.count, 0),
      total: bins.reduce((sum, bin) => sum + bin.total, 0)
    }
  }
}

export function sedimentHeightfield(
  bins: PhysicsSedimentBinSnapshot[],
  options: PhysicsSedimentHeightfieldOptions = {}
): PhysicsSedimentColumn[] {
  const {
    baselineY = 0,
    binWidth = 24,
    gap = 2,
    maxHeight = 80,
    value = "count",
    x
  } = options
  const maxValue = Math.max(1, ...bins.map((bin) => bin[value]))

  return bins.map((bin, index) => {
    const height = Math.max(0, (bin[value] / maxValue) * maxHeight)
    const columnX = x?.(bin, index) ?? index * (binWidth + gap)
    return {
      binId: bin.id,
      label: bin.label,
      index,
      count: bin.count,
      total: bin.total,
      x: columnX,
      y: baselineY - height,
      width: binWidth,
      height,
      meanX: bin.x.mean,
      meanY: bin.y.mean
    }
  })
}
