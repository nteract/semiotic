"use client"

import { Adder } from "d3-array"
import type { RefObject } from "react"
import { useMemo, useCallback, useRef, useLayoutEffect, useState } from "react"
import { RingBuffer } from "../../realtime/RingBuffer"
import { reserveChartRows } from "./reserveChartRows"
import { toIdSet } from "../../stream/pipelineIdentityOps"
import { resolveStringAccessor } from "../../stream/accessorUtils"
import type { StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import {
  interpolateRdBu,
  interpolatePiYG,
  interpolatePRGn,
  interpolateBrBG,
  interpolateRdYlBu,
  interpolateRdYlGn,
  interpolateSpectral,
} from "./colorPalettes"
import type { Datum } from "./datumTypes"

/** Map d3-scale-chromatic diverging interpolator keys → interpolator fn. */
const DIVERGING_INTERPOLATORS: Record<string, (t: number) => string> = {
  RdBu: interpolateRdBu,
  PiYG: interpolatePiYG,
  PRGn: interpolatePRGn,
  BrBG: interpolateBrBG,
  RdYlBu: interpolateRdYlBu,
  RdYlGn: interpolateRdYlGn,
  Spectral: interpolateSpectral,
}

// ── Types ─────────────────────────────────────────────────────────────

export interface AggregatedRow extends Datum {
  __likertCategory: string
  /** Stacking key — may be sentinel value for neutral halves */
  __likertLevel: string
  /** Human-readable level label — always the original level name (for legend/selection) */
  __likertLevelLabel: string
  __likertCount: number
  __likertPct: number
  __likertLevelIndex: number
}

export interface LikertAggregationFieldAliases {
  category?: string
  level?: string
  count?: string
  score?: string
}

/** Sentinel level names for the neutral split halves */
export const NEUTRAL_NEG = "__likert_neutral_neg"
export const NEUTRAL_POS = "__likert_neutral_pos"

// ── Accessor helper ───────────────────────────────────────────────────

export function resolveAccessorFn<T>(
  accessor: string | ((d: Datum) => T) | undefined,
  fallback: string,
): (d: Datum) => T {
  if (typeof accessor === "function") return accessor
  const key = (accessor as string) || fallback
  return (d: Datum) => d[key]
}

type LikertAccessors = Pick<UseLikertAggregationConfig, "categoryAccessor" | "valueAccessor" | "levelAccessor" | "countAccessor">

export function resolveLikertFields({ categoryAccessor, valueAccessor, levelAccessor, countAccessor }: LikertAccessors) {
  const fieldName = (accessor: LikertAccessors[keyof LikertAccessors]) => typeof accessor === "string" ? accessor : undefined
  return {
    getCat: resolveAccessorFn<string>(categoryAccessor, "question"),
    getScore: levelAccessor ? null : resolveAccessorFn<number>(valueAccessor, "score"),
    getLevel: levelAccessor ? resolveAccessorFn<string>(levelAccessor, "level") : null,
    getCount: levelAccessor ? resolveAccessorFn<number>(countAccessor, "count") : null,
    aliases: {
      category: fieldName(categoryAccessor),
      level: fieldName(levelAccessor),
      count: fieldName(countAccessor),
      score: levelAccessor ? undefined : fieldName(valueAccessor)
    }
  }
}

// ── Color scheme ──────────────────────────────────────────────────────

/**
 * Generate a diverging color scheme for N levels.
 *
 * Two paths:
 *   • `themeDivergingSchemeName` supplied → sample the named d3-scale-chromatic
 *     diverging interpolator at N evenly-spaced positions. Gives consumers the
 *     ability to change the palette by changing the active theme's
 *     `colors.diverging` string, without touching chart code.
 *   • No scheme name → the original Carbon-inspired hardcoded palette
 *     (preserves exact pre-theming behavior for consumers without a
 *     ThemeProvider, and for custom themes that don't declare `diverging`).
 *
 * Interpolates from red → gray → blue for odd, red → blue for even.
 */
export function defaultDivergingScheme(n: number, themeDivergingSchemeName?: string): string[] {
  if (n <= 0) return []
  if (themeDivergingSchemeName && Object.hasOwn(DIVERGING_INTERPOLATORS, themeDivergingSchemeName)) {
    const interpolate = DIVERGING_INTERPOLATORS[themeDivergingSchemeName]
    return Array.from({ length: n }, (_, i) => interpolate(n === 1 ? 0.5 : i / (n - 1)))
  }
  const half = Math.floor(n / 2)
  const sampleHalf = (colors: string[]) =>
    Array.from({ length: half }, (_, i) => colors[Math.floor(i * colors.length / half)])
  const negative = sampleHalf(["#da1e28", "#ff8389", "#ffb3b8"])
  const positive = sampleHalf(["#a6c8ff", "#4589ff", "#0043ce"])
  return n % 2 ? [...negative, "#a8a8a8", ...positive] : [...negative, ...positive]
}

// ── Aggregation ───────────────────────────────────────────────────────

export function aggregateData(
  data: Datum[],
  levels: string[],
  fields: ReturnType<typeof resolveLikertFields>,
  isDiverging: boolean
): AggregatedRow[] {
  const table = createLikertCounts(levels, fields)
  for (const row of data) table.adjust(row, 1)
  return aggregateRows(table.counts, levels, fields.aliases, isDiverging)
}

function createLikertCounts(
  levels: string[],
  { getCat, getScore, getLevel, getCount }: ReturnType<typeof resolveLikertFields>
) {
  const counts = new Map<string, { size: number; values: Map<string, number | Adder> }>()
  const levelSet = new Set(levels)
  function adjust(row: Datum, direction: 1 | -1) {
    const category = getCat(row)
    let level: string | undefined
    let weight = 1
    if (getScore) {
      const score = getScore(row)
      if (Number.isInteger(score) && score >= 1 && score <= levels.length) level = levels[score - 1]
      else if (process.env.NODE_ENV !== "production" && Number.isFinite(score) && !Number.isInteger(score))
        console.warn("[LikertChart] Ignoring non-integer Likert score:", score)
    } else if (getLevel && getCount) {
      const label = getLevel(row)
      weight = getCount(row)
      if (levelSet.has(label) && Number.isFinite(weight)) level = label
    }
    let group = counts.get(category)
    if (!group) {
      group = { size: 0, values: new Map() }
      counts.set(category, group)
    }
    group.size += direction
    if (!group.size) {
      counts.delete(category)
      return
    }
    if (level === undefined || weight === 0) return
    const previous = group.values.get(level)
    if (getScore) {
      group.values.set(level, Number(previous ?? 0) + direction)
    } else {
      // Expansions retain tiny weights and exactly cancel fractional FIFO removals.
      const sum = previous instanceof Adder ? previous : new Adder()
      sum.add(direction * weight)
      group.values.set(level, sum)
    }
  }
  return { counts, adjust }
}

function aggregateRows(
  counts: ReturnType<typeof createLikertCounts>["counts"],
  levels: string[],
  fieldAliases: LikertAggregationFieldAliases,
  isDiverging: boolean
): AggregatedRow[] {
  const rows: AggregatedRow[] = []
  const middle = Math.floor(levels.length / 2)
  const splitNeutral = isDiverging && levels.length % 2 === 1
  for (const [cat, { values: catMap }] of counts) {
    const countOf = (level: string) => Number(catMap.get(level) ?? 0)
    let total = 0
    for (const level of levels) total += countOf(level)
    if (total === 0) continue

    function append(li: number, fraction: number, stack = levels[li]) {
      const level = levels[li]
      const count = countOf(level)
      const publicFields: Datum = {}
      if (fieldAliases.category) publicFields[fieldAliases.category] = cat
      if (fieldAliases.level) publicFields[fieldAliases.level] = level
      if (fieldAliases.count) publicFields[fieldAliases.count] = count
      if (fieldAliases.score) publicFields[fieldAliases.score] = li + 1
      rows.push({
        ...publicFields,
        __likertCategory: cat,
        __likertLevel: stack,
        __likertLevelLabel: level,
        __likertCount: count,
        __likertPct: (count / total) * 100 * fraction,
        __likertLevelIndex: li,
      })
    }
    if (isDiverging) {
      if (splitNeutral) append(middle, -0.5, NEUTRAL_NEG)
      for (let i = middle - 1; i >= 0; i--) append(i, -1)
      if (splitNeutral) append(middle, 0.5, NEUTRAL_POS)
    }
    const firstPositive = isDiverging ? middle + Number(splitNeutral) : 0
    for (let i = firstPositive; i < levels.length; i++) append(i, 1)
  }
  return rows
}

// ── Hook ──────────────────────────────────────────────────────────────

interface UseLikertAggregationConfig {
  data: Datum[] | undefined
  levels: string[]
  categoryAccessor?: string | ((d: Datum) => string)
  valueAccessor?: string | ((d: Datum) => number)
  levelAccessor?: string | ((d: Datum) => string)
  countAccessor?: string | ((d: Datum) => number)
  isDiverging: boolean
  windowSize?: number
  dataIdAccessor?: string | ((d: Datum) => string)
  frameRef: RefObject<StreamOrdinalFrameHandle | null>
}

export function useLikertAggregation({
  data,
  levels,
  categoryAccessor,
  valueAccessor,
  levelAccessor,
  countAccessor,
  isDiverging,
  windowSize,
  dataIdAccessor,
  frameRef,
}: UseLikertAggregationConfig) {
  const [rows] = useState(() => new RingBuffer<Datum>(1))
  const fields = useMemo(() => resolveLikertFields({ categoryAccessor, valueAccessor, levelAccessor, countAccessor }),
    [categoryAccessor, valueAccessor, levelAccessor, countAccessor])

  const processedData = useMemo(() => data?.length
    ? aggregateData(data, levels, fields, isDiverging)
    : [], [data, levels, fields, isDiverging])

  const table = useMemo(() => createLikertCounts(levels, fields), [levels, fields])
  useLayoutEffect(() => {
    table.counts.clear()
    rows.forEach(row => table.adjust(row, 1))
  }, [rows, table])
  const publish = useCallback(() => {
    frameRef.current?.replace(aggregateRows(table.counts, levels, fields.aliases, isDiverging))
  }, [frameRef, table, levels, fields, isDiverging])
  const pending = useRef<(() => void) | null>(null)
  const schedule = useCallback(() => {
    if (!pending.current) queueMicrotask(() => {
      const flush = pending.current
      pending.current = null
      flush?.()
    })
    pending.current = publish
  }, [publish])
  useLayoutEffect(() => {
    for (const row of reserveChartRows(rows, 0, windowSize)) table.adjust(row, -1)
    if (data === undefined) schedule()
    return () => { pending.current = null }
  }, [rows, table, windowSize, data, schedule])

  const next = { table, windowSize, getId: resolveStringAccessor(dataIdAccessor), schedule }
  const config = useRef(next)
  useLayoutEffect(() => { config.current = next })
  const stream = useMemo(() => {
    const matches = (id: string | string[], getId: (row: Datum) => string) => {
      const ids = toIdSet(id)
      return (row: Datum) => ids.has(getId(row))
    }
    const pushMany = (batch: Datum[]) => {
      const { table, windowSize, schedule } = config.current
      for (const row of reserveChartRows(rows, batch.length, windowSize)) table.adjust(row, -1)
      for (const row of batch) {
        const evicted = rows.push(row)
        if (evicted) table.adjust(evicted, -1)
        table.adjust(row, 1)
      }
      schedule()
    }
    const clear = () => {
      pending.current = null
      rows.clear()
      config.current.table.counts.clear()
      frameRef.current?.clear()
    }
    return {
      push: (row: Datum) => pushMany([row]),
      pushMany,
      remove(id: string | string[]) {
        const { table, schedule, getId } = config.current
        const removed = getId ? rows.remove(matches(id, getId)) : []
        for (const row of removed) table.adjust(row, -1)
        if (removed.length) schedule()
        return removed
      },
      update(id: string | string[], update: (row: Datum) => Datum) {
        const { table, schedule, getId } = config.current
        if (!getId) return []
        let edited = false
        try {
          return rows.update(matches(id, getId), row => {
            edited = true
            return update(row)
          })
        } finally {
          // An updater may mutate objects shared by other retained responses.
          if (edited) {
            for (const group of table.counts.values()) {
              group.size = 0
              group.values.clear()
            }
            rows.forEach(row => table.adjust(row, 1))
            for (const [category, group] of table.counts) {
              if (!group.size) table.counts.delete(category)
            }
            schedule()
          }
        }
      },
      replace(batch: Datum[]) {
        rows.clear()
        config.current.table.counts.clear()
        pushMany(batch)
      },
      clear,
      getData: () => rows.toArray()
    }
  }, [rows, frameRef])
  return { processedData, stream }
}
