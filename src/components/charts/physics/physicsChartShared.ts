import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import type { Style } from "../../stream/types"
import { resolveStyleRules, makeRuleValueResolver, type StyleRule } from "../shared/styleRules"
import type { PhysicsColliderSpec } from "../../stream/physics/PhysicsKernel"
import type {
  PhysicsPipelineConfig,
  PhysicsQueuedSpawn,
  PhysicsSpawnPacingOptions
} from "../../stream/physics/PhysicsPipelineStore"
import type { PhysicsSemanticItem } from "../../stream/physics/StreamPhysicsTypes"

export interface PhysicsChartLayout {
  config: PhysicsPipelineConfig
  initialSpawns: PhysicsQueuedSpawn[]
  initialSpawnPacing?: PhysicsSpawnPacingOptions
  projectionRows: Array<{ label: string; value: number; secondary?: number }>
  metadata?: Record<string, unknown>
}

export interface PhysicsChartArea {
  width: number
  height: number
  plot: { x: number; y: number; width: number; height: number }
}

export function physicsChartArea(size: [number, number]): PhysicsChartArea {
  const [width, height] = size
  const compact = width < 160 || height < 116
  const insetX = compact ? Math.min(12, Math.max(2, width * 0.08)) : 32
  const insetY = compact ? Math.min(8, Math.max(2, height * 0.12)) : 24
  const bottomInset = compact ? insetY : 34
  const plot = {
    x: insetX,
    y: insetY,
    width: Math.max(1, width - insetX * 2),
    height: Math.max(1, height - insetY - bottomInset)
  }
  return { width, height, plot }
}

export function hashStringColor(value: unknown): string {
  const text = String(value ?? "")
  if (!text) return "#4e79a7"
  const palette = [
    "#4e79a7",
    "#59a14f",
    "#e15759",
    "#f28e2b",
    "#76b7b2",
    "#edc948",
    "#b07aa1",
    "#ff9da7"
  ]
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return palette[hash % palette.length]
}

export interface PhysicsStyleRuleOptions {
  /** Declarative style rules, merged on top of the colorBy-derived body fill. */
  styleRules?: ReadonlyArray<StyleRule>
  /** Numeric field/accessor a threshold rule compares against (defaults to `value`). */
  valueAccessor?: string | ((d: Datum) => unknown)
}

/**
 * Build a per-body `bodyStyle` from a `colorBy` accessor. When `styleRules`
 * are supplied, the merged rule style layers on top of the colorBy-derived
 * fill (last-applicable rule wins) — the physics counterpart to the ordinal
 * bar `styleRules`. Rules resolve against the body's original `datum`; `ctx` =
 * `{ value, category }` where `category` is the colorBy group. Because every
 * colorBy-driven physics HOC and its SSR config funnel through this helper,
 * one call wires rules for all of them.
 */
export function styleFromColorAccessor<TDatum extends Datum>(
  colorBy: ChartAccessor<TDatum, string> | undefined,
  fallback = "#4e79a7",
  opts?: PhysicsStyleRuleOptions
): (body: { datum?: unknown }) => Style {
  const rules = opts?.styleRules
  const hasRules = !!rules && rules.length > 0
  const resolveValue = hasRules ? makeRuleValueResolver(opts?.valueAccessor) : undefined
  return (body) => {
    const datum = body.datum as TDatum | undefined
    const value =
      datum && colorBy
        ? typeof colorBy === "function"
          ? colorBy(datum, 0)
          : datum[colorBy]
        : undefined
    const style: Style = {
      fill: value == null ? fallback : hashStringColor(value),
      stroke: "#111827",
      strokeWidth: 1,
      opacity: 0.9
    }
    if (hasRules && datum) {
      Object.assign(
        style,
        resolveStyleRules(datum as Datum, rules, {
          value: resolveValue ? resolveValue(datum as Datum) : undefined,
          category: value == null ? undefined : String(value),
        }),
      )
    }
    return style
  }
}

export function baseConfig(
  seed: number,
  colliders: PhysicsColliderSpec[],
  chartType: string,
  kernel?: Partial<NonNullable<PhysicsPipelineConfig["kernel"]>>
): PhysicsPipelineConfig {
  return {
    fixedDt: 1 / 120,
    maxSubsteps: 8,
    colliders,
    observation: {
      chartType
    },
    kernel: {
      seed,
      gravity: { x: 0, y: 760 },
      cellSize: 36,
      collisionIterations: 6,
      velocityDamping: 0.995,
      restitution: 0.08,
      friction: 0.4,
      sleepSpeed: 8,
      // A unit must be near-still for this long before it anchors — long enough
      // that being briefly held by a falling crowd does not sleep it mid-air.
      sleepAfter: 0.6,
      ...kernel
    }
  }
}

export function projectionRowsToSemanticItems(
  rows: readonly PhysicsChartLayout["projectionRows"][number][],
  size: [number, number],
  noun: string
): PhysicsSemanticItem[] {
  if (!rows.length) return []
  const area = physicsChartArea(size)
  const laneWidth = area.plot.width / Math.max(1, rows.length)
  const maxValue = Math.max(1, ...rows.map((row) => row.value))
  const maxHeight = area.plot.height * 0.62
  const yBottom = area.plot.y + area.plot.height

  return rows.map((row, index) => {
    const barHeight = Math.max(8, (row.value / maxValue) * maxHeight)
    const x = area.plot.x + (index + 0.5) * laneWidth
    const y = yBottom - barHeight / 2
    const secondary =
      row.secondary == null ? "" : `, ${row.secondary} secondary`
    const label = `${noun} ${row.label}: ${row.value}${secondary}`
    return {
      id: `${noun}-${row.label}`,
      label,
      description: label,
      datum: row,
      x,
      y,
      shape: "rect" as const,
      width: Math.max(12, laneWidth * 0.58),
      height: barHeight,
      group: noun
    }
  })
}

export function readAccessor<TDatum extends Datum, TValue>(
  datum: TDatum,
  index: number,
  accessor: ChartAccessor<TDatum, TValue>
): TValue {
  return typeof accessor === "function"
    ? accessor(datum, index)
    : (datum[accessor] as TValue)
}

export function finiteNumber(value: unknown): number | null {
  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isFinite(time) ? time : null
  }
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN
  return Number.isFinite(number) ? number : null
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function positiveNumber(value: unknown, fallback: number): number {
  const number = finiteNumber(value)
  return number != null && number > 0 ? number : fallback
}

export function normalizedFiniteExtent(
  extent: readonly [unknown, unknown] | undefined
): [number, number] | undefined {
  if (!extent) return undefined
  const a = finiteNumber(extent[0])
  const b = finiteNumber(extent[1])
  if (a == null || b == null) return undefined
  return a <= b ? [a, b] : [b, a]
}

export function safeIdPart(value: unknown): string {
  const text = String(value ?? "unknown").trim()
  return text.replace(/[^A-Za-z0-9_-]+/g, "_") || "unknown"
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
