"use client"

import { useMemo, useCallback, useRef } from "react"
import type { StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"

// ── Types ─────────────────────────────────────────────────────────────

export interface AggregatedRow {
  __likertCategory: string
  /** Stacking key — may be sentinel value for neutral halves */
  __likertLevel: string
  /** Human-readable level label — always the original level name (for legend/selection) */
  __likertLevelLabel: string
  __likertCount: number
  __likertPct: number
  __likertLevelIndex: number
}

/** Sentinel level names for the neutral split halves */
export const NEUTRAL_NEG = "__likert_neutral_neg"
export const NEUTRAL_POS = "__likert_neutral_pos"

// ── Accessor helper ───────────────────────────────────────────────────

export function resolveAccessorFn<T>(
  accessor: string | ((d: any) => T) | undefined,
  fallback: string,
): (d: any) => T {
  if (typeof accessor === "function") return accessor
  const key = (accessor as string) || fallback
  return (d: any) => d[key]
}

// ── Color scheme ──────────────────────────────────────────────────────

/**
 * Generate a diverging color scheme for N levels.
 * Interpolates from red → gray → blue for odd, red → blue for even.
 */
export function defaultDivergingScheme(n: number): string[] {
  const negColors = ["#da1e28", "#ff8389", "#ffb3b8"]
  const posColors = ["#a6c8ff", "#4589ff", "#0043ce"]
  const neutral = "#a8a8a8"

  if (n <= 0) return []
  if (n === 1) return [neutral]

  const isOdd = n % 2 !== 0
  const halfSize = Math.floor(n / 2)
  const result: string[] = []

  for (let i = 0; i < halfSize; i++) {
    result.push(negColors[Math.min(Math.floor(i * negColors.length / halfSize), negColors.length - 1)])
  }
  if (isOdd) result.push(neutral)
  for (let i = 0; i < halfSize; i++) {
    result.push(posColors[Math.min(Math.floor(i * posColors.length / halfSize), posColors.length - 1)])
  }

  return result
}

// ── Aggregation ───────────────────────────────────────────────────────

export function aggregateData(
  data: any[],
  levels: string[],
  getCat: (d: any) => string,
  getScore: ((d: any) => number) | null,
  getLevel: ((d: any) => string) | null,
  getCount: ((d: any) => number) | null,
): AggregatedRow[] {
  const counts = new Map<string, Map<string, number>>()

  for (const d of data) {
    const cat = getCat(d)
    if (!counts.has(cat)) counts.set(cat, new Map<string, number>())
    const catMap = counts.get(cat)!

    if (getScore) {
      const score = getScore(d)
      if (score == null || !Number.isFinite(score)) continue
      if (!Number.isInteger(score)) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[LikertChart] Ignoring non-integer Likert score:", score)
        }
        continue
      }
      const idx = score - 1
      if (idx < 0 || idx >= levels.length) continue
      const level = levels[idx]
      catMap.set(level, (catMap.get(level) || 0) + 1)
    } else if (getLevel && getCount) {
      const level = getLevel(d)
      const count = getCount(d)
      if (!levels.includes(level)) continue
      catMap.set(level, (catMap.get(level) || 0) + (Number.isFinite(count) ? count : 0))
    }
  }

  const rows: AggregatedRow[] = []
  for (const [cat, catMap] of counts) {
    let total = 0
    for (const level of levels) total += catMap.get(level) || 0
    if (total === 0) continue

    for (let li = 0; li < levels.length; li++) {
      const level = levels[li]
      const count = catMap.get(level) || 0
      rows.push({
        __likertCategory: cat,
        __likertLevel: level,
        __likertLevelLabel: level,
        __likertCount: count,
        __likertPct: (count / total) * 100,
        __likertLevelIndex: li,
      })
    }
  }

  return rows
}

// ── Diverging transforms ──────────────────────────────────────────────

export function toDivergingValues(rows: AggregatedRow[], levels: string[]): AggregatedRow[] {
  const n = levels.length
  const isOdd = n % 2 !== 0
  const midIdx = Math.floor(n / 2)

  const result: AggregatedRow[] = []
  for (const r of rows) {
    const li = r.__likertLevelIndex
    if (isOdd && li === midIdx) {
      const half = r.__likertPct / 2
      result.push({ ...r, __likertLevel: NEUTRAL_NEG, __likertPct: -half })
      result.push({ ...r, __likertLevel: NEUTRAL_POS, __likertPct: half })
    } else if (li < midIdx) {
      result.push({ ...r, __likertPct: -r.__likertPct })
    } else {
      result.push(r)
    }
  }
  return result
}

export function orderForDiverging(rows: AggregatedRow[], levels: string[]): AggregatedRow[] {
  const n = levels.length
  const isOdd = n % 2 !== 0
  const midIdx = Math.floor(n / 2)

  const byCategory = new Map<string, AggregatedRow[]>()
  for (const r of rows) {
    const arr = byCategory.get(r.__likertCategory) || []
    arr.push(r)
    byCategory.set(r.__likertCategory, arr)
  }

  const result: AggregatedRow[] = []
  for (const [, catRows] of byCategory) {
    const byIdx = new Map<number, AggregatedRow>()
    let neutralNeg: AggregatedRow | undefined
    let neutralPos: AggregatedRow | undefined
    for (const r of catRows) {
      if (r.__likertLevel === NEUTRAL_NEG) neutralNeg = r
      else if (r.__likertLevel === NEUTRAL_POS) neutralPos = r
      else byIdx.set(r.__likertLevelIndex, r)
    }

    if (isOdd && neutralNeg) result.push(neutralNeg)
    for (let i = midIdx - 1; i >= 0; i--) {
      const r = byIdx.get(i)
      if (r) result.push(r)
    }
    if (isOdd && neutralPos) result.push(neutralPos)
    const posStart = isOdd ? midIdx + 1 : midIdx
    for (let i = posStart; i < n; i++) {
      const r = byIdx.get(i)
      if (r) result.push(r)
    }
  }

  return result
}

// ── Hook ──────────────────────────────────────────────────────────────

interface UseLikertAggregationConfig {
  data: any[] | undefined
  levels: string[]
  categoryAccessor?: string | ((d: any) => string)
  valueAccessor?: string | ((d: any) => number)
  levelAccessor?: string | ((d: any) => string)
  countAccessor?: string | ((d: any) => number)
  isDiverging: boolean
  frameRef: React.RefObject<StreamOrdinalFrameHandle | null>
}

interface UseLikertAggregationResult {
  /** Pre-processed data for static mode */
  processedData: AggregatedRow[]
  /** Re-aggregate all accumulated data (call from push handlers) */
  reAggregate: (rawData: any[]) => void
  /** Ref holding accumulated raw data for push mode */
  accumulatorRef: React.MutableRefObject<any[]>
}

/**
 * Encapsulates Likert-specific data aggregation:
 * - Resolves accessor functions
 * - Aggregates raw/pre-aggregated data to percentages
 * - Applies diverging transforms (sign flip, neutral split, stacking order)
 * - Provides re-aggregation callback for push API streaming
 */
export function useLikertAggregation({
  data,
  levels,
  categoryAccessor,
  valueAccessor,
  levelAccessor,
  countAccessor,
  isDiverging,
  frameRef,
}: UseLikertAggregationConfig): UseLikertAggregationResult {
  const isRawMode = !levelAccessor
  const getCat = useMemo(() => resolveAccessorFn<string>(categoryAccessor, "question"), [categoryAccessor])
  const getScore = useMemo(() => isRawMode ? resolveAccessorFn<number>(valueAccessor, "score") : null, [isRawMode, valueAccessor])
  const getLevel = useMemo(() => !isRawMode ? resolveAccessorFn<string>(levelAccessor, "level") : null, [isRawMode, levelAccessor])
  const getCount = useMemo(() => !isRawMode ? resolveAccessorFn<number>(countAccessor, "count") : null, [isRawMode, countAccessor])

  const safeData = data || []
  const accumulatorRef = useRef<any[]>([])

  const processedData = useMemo(() => {
    if (safeData.length === 0) return []
    let agg = aggregateData(safeData, levels, getCat, getScore, getLevel, getCount)
    if (isDiverging) {
      agg = toDivergingValues(agg, levels)
      agg = orderForDiverging(agg, levels)
    }
    return agg
  }, [safeData, levels, getCat, getScore, getLevel, getCount, isDiverging])

  const reAggregate = useCallback((rawData: any[]) => {
    let agg = aggregateData(rawData, levels, getCat, getScore, getLevel, getCount)
    if (isDiverging) {
      agg = toDivergingValues(agg, levels)
      agg = orderForDiverging(agg, levels)
    }
    frameRef.current?.clear()
    if (agg.length > 0) {
      frameRef.current?.pushMany(agg)
    }
  }, [levels, getCat, getScore, getLevel, getCount, isDiverging, frameRef])

  return { processedData, reAggregate, accumulatorRef }
}
