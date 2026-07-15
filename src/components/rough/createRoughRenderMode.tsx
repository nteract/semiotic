import * as React from "react"
import rough from "roughjs"
import type { Drawable, OpSet, Options } from "roughjs/bin/core"
import type { RoughGenerator } from "roughjs/bin/generator"
import type { SceneDatum, SceneRenderBackend, Style } from "../stream/types"
import type { Datum } from "../charts/shared/datumTypes"
import { resolveCSSColor } from "../stream/renderers/resolveCSSColor"

type Point = [number, number]
type RoughSceneNode = Datum & { type?: string; style?: Style; datum?: SceneDatum }

export interface RoughRenderModeOptions {
  /** Base seed. Each scene identity derives a stable non-zero Rough.js seed. @default 1 */
  seed?: number
  roughness?: number
  bowing?: number
  maxRandomnessOffset?: number
  curveFitting?: number
  curveTightness?: number
  curveStepCount?: number
  fillStyle?: "hachure" | "solid" | "zigzag" | "cross-hatch" | "dots" | "dashed" | "zigzag-line"
  fillWeight?: number
  hachureAngle?: number
  hachureGap?: number
  dashOffset?: number
  dashGap?: number
  zigzagOffset?: number
  disableMultiStroke?: boolean
  disableMultiStrokeFill?: boolean
  preserveVertices?: boolean
  simplification?: number
  fixedDecimalPlaceDigits?: number
  /** Maximum reusable drawables retained by this mode instance. @default 1000 */
  cacheSize?: number
}

export interface RoughRenderMode extends SceneRenderBackend<RoughSceneNode> {
  readonly id: "roughjs"
  readonly seed: number
  readonly cacheEntries: number
  clearCache(): void
}

type Geometry =
  | { kind: "rectangle"; x: number; y: number; width: number; height: number }
  | { kind: "circle"; x: number; y: number; diameter: number }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "linearPath"; points: Point[] }
  | { kind: "polygon"; points: Point[] }
  | { kind: "path"; d: string; transform?: Transform }
  | { kind: "arc"; x: number; y: number; width: number; height: number; start: number; stop: number; closed: boolean }

type Transform = { x: number; y: number; rotation?: number }

type CachedDrawable = {
  drawable: Drawable
  geometry: Geometry
  style: Style
}

const DEFAULT_SEED = 1
const MAX_ROUGH_SEED = 2_147_483_647

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function points(value: unknown): Point[] | null {
  if (!Array.isArray(value)) return null
  const result: Point[] = []
  for (const point of value) {
    if (!Array.isArray(point) || !finite(point[0]) || !finite(point[1])) return null
    result.push([point[0], point[1]])
  }
  return result
}

function geometryFor(node: RoughSceneNode): Geometry | null {
  if (node.style?.icon || node.fillGradient || node.strokeGradient || node.colorThresholds || node.clipRect) {
    return null
  }

  if (node.type === "rect" && finite(node.x) && finite(node.y) && finite(node.w) && finite(node.h)) {
    return { kind: "rectangle", x: node.x, y: node.y, width: node.w, height: node.h }
  }
  if (node.type === "point" && finite(node.x) && finite(node.y) && finite(node.r)) {
    return { kind: "circle", x: node.x, y: node.y, diameter: node.r * 2 }
  }
  if (node.type === "circle" && finite(node.cx) && finite(node.cy) && finite(node.r)) {
    return { kind: "circle", x: node.cx, y: node.cy, diameter: node.r * 2 }
  }
  if (node.type === "line") {
    const path = points(node.path)
    if (path && path.length >= 2 && !node._decayOpacities) {
      return { kind: "linearPath", points: path }
    }
    if (finite(node.x1) && finite(node.y1) && finite(node.x2) && finite(node.y2)) {
      return { kind: "line", x1: node.x1, y1: node.y1, x2: node.x2, y2: node.y2 }
    }
  }
  if (node.type === "area") {
    const top = points(node.topPath)
    const bottom = points(node.bottomPath)
    if (top && bottom && top.length > 1 && bottom.length > 1 && !node._decayOpacities) {
      return { kind: "polygon", points: [...top, ...bottom.slice().reverse()] }
    }
  }
  if (node.type === "geoarea" && typeof node.pathData === "string" && node.pathData) {
    return { kind: "path", d: node.pathData }
  }
  if ((node.type === "bezier" || node.type === "ribbon" || node.type === "curved") && typeof node.pathD === "string" && node.pathD) {
    return { kind: "path", d: node.pathD }
  }
  if (node.type === "trapezoid") {
    const polygon = points(node.points)
    if (polygon && polygon.length >= 3) return { kind: "polygon", points: polygon }
  }
  if (node.type === "connector" && finite(node.x1) && finite(node.y1) && finite(node.x2) && finite(node.y2)) {
    return { kind: "line", x1: node.x1, y1: node.y1, x2: node.x2, y2: node.y2 }
  }
  if (node.type === "violin" && typeof node.pathString === "string" && finite(node.translateX) && finite(node.translateY)) {
    return { kind: "path", d: node.pathString, transform: { x: node.translateX, y: node.translateY } }
  }
  if (node.type === "symbol" && typeof node.path === "string") {
    const x = finite(node.x) ? node.x : node.cx
    const y = finite(node.y) ? node.y : node.cy
    if (finite(x) && finite(y)) {
      return { kind: "path", d: node.path, transform: { x, y, rotation: finite(node.rotation) ? node.rotation : undefined } }
    }
  }
  if (node.type === "arc" && finite(node.cx) && finite(node.cy) && finite(node.outerR) && finite(node.startAngle) && finite(node.endAngle)) {
    return {
      kind: "arc",
      x: node.cx,
      y: node.cy,
      width: node.outerR * 2,
      height: node.outerR * 2,
      start: node.startAngle,
      stop: node.endAngle,
      closed: true
    }
  }
  return null
}

function stableValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value == null || typeof value === "string" || typeof value === "boolean") return value
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value)
  if (typeof value !== "object") return String(value)
  if (seen.has(value)) return "[Circular]"
  seen.add(value)
  if (Array.isArray(value)) return value.map((item) => stableValue(item, seen))
  const record = value as Record<string, unknown>
  return Object.fromEntries(
    Object.keys(record).sort().map((key) => [key, stableValue(record[key], seen)])
  )
}

function stableString(value: unknown): string {
  return JSON.stringify(stableValue(value)) ?? String(value)
}

/** Deterministic FNV-1a seed helper suitable for Rough.js's non-zero seed range. */
export function stableRoughSeed(value: unknown): number {
  const input = typeof value === "string" ? value : stableString(value)
  let hash = 2_166_136_261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16_777_619)
  }
  return (hash >>> 0) % MAX_ROUGH_SEED + 1
}

function normalizeSeed(seed: number | undefined): number {
  if (!finite(seed)) return DEFAULT_SEED
  const integer = Math.trunc(Math.abs(seed))
  return integer % MAX_ROUGH_SEED || DEFAULT_SEED
}

function identityFor(node: RoughSceneNode): unknown {
  const datum = node.datum && typeof node.datum === "object"
    ? node.datum as Record<string, unknown>
    : undefined
  return node._transitionKey ?? node.pointId ?? node.id ?? node.category ?? node.group ??
    datum?.id ?? datum?.key ?? datum?.name ?? null
}

function serializableStyle(style: Style): Record<string, unknown> {
  return {
    fill: typeof style.fill === "string" ? style.fill : style.fill ? "[CanvasPattern]" : undefined,
    fillOpacity: style.fillOpacity,
    opacity: style.opacity,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    strokeDasharray: style.strokeDasharray,
    strokeLinecap: style.strokeLinecap
  }
}

function parseDasharray(value: string | undefined): number[] | undefined {
  if (!value) return undefined
  const dashes = value.split(/[\s,]+/).map(Number).filter(Number.isFinite)
  return dashes.length ? dashes : undefined
}

function defaultPaint(node: RoughSceneNode, style: Style): { fill?: string; stroke: string } | null {
  if (style.fill && typeof style.fill !== "string") return null
  if (typeof style.fill === "string" && style.fill.startsWith("url(")) return null

  const fill = typeof style.fill === "string" && style.fill !== "none" ? style.fill : undefined
  const stroke = style.stroke && style.stroke !== "none" ? style.stroke : undefined
  switch (node.type) {
    case "line":
    case "connector":
    case "curved":
      return { stroke: stroke ?? "#007bff" }
    case "bezier":
    case "ribbon":
      return { fill: fill ?? "#999999", stroke: stroke ?? "none" }
    case "geoarea":
      return { fill: fill ?? "#e0e0e0", stroke: stroke ?? "none" }
    case "point":
    case "circle":
      return { fill: fill ?? "#4e79a7", stroke: stroke ?? "none" }
    case "rect":
    case "area":
    case "trapezoid":
    case "violin":
    case "arc":
      return { fill: fill ?? "#4e79a7", stroke: stroke ?? "none" }
    case "symbol":
      return { fill, stroke: stroke ?? (fill ? "none" : "#4e79a7") }
    default:
      return { fill, stroke: stroke ?? "#007bff" }
  }
}

function drawableForGeometry(generator: RoughGenerator, geometry: Geometry, options: Options): Drawable {
  switch (geometry.kind) {
    case "rectangle": return generator.rectangle(geometry.x, geometry.y, geometry.width, geometry.height, options)
    case "circle": return generator.circle(geometry.x, geometry.y, geometry.diameter, options)
    case "line": return generator.line(geometry.x1, geometry.y1, geometry.x2, geometry.y2, options)
    case "linearPath": return generator.linearPath(geometry.points, options)
    case "polygon": return generator.polygon(geometry.points, options)
    case "path": return generator.path(geometry.d, options)
    case "arc": return generator.arc(geometry.x, geometry.y, geometry.width, geometry.height, geometry.start, geometry.stop, geometry.closed, options)
  }
}

function traceOperations(context: CanvasRenderingContext2D, drawing: OpSet, precision?: number): void {
  context.beginPath()
  for (const operation of drawing.ops) {
    const data = typeof precision === "number" && precision >= 0
      ? operation.data.map((value) => +value.toFixed(precision))
      : operation.data
    if (operation.op === "move") context.moveTo(data[0], data[1])
    else if (operation.op === "lineTo") context.lineTo(data[0], data[1])
    else if (operation.op === "bcurveTo") {
      context.bezierCurveTo(data[0], data[1], data[2], data[3], data[4], data[5])
    }
  }
}

function drawDrawable(
  context: CanvasRenderingContext2D,
  cached: CachedDrawable
): void {
  const { drawable, geometry, style } = cached
  const options = drawable.options
  const baseAlpha = context.globalAlpha
  const transform = geometry.kind === "path" ? geometry.transform : undefined
  if (transform) {
    context.translate(transform.x, transform.y)
    if (transform.rotation) context.rotate(transform.rotation)
  }

  for (const drawing of drawable.sets) {
    context.save()
    if (drawing.type === "path") {
      context.strokeStyle = options.stroke === "none" ? "transparent" : options.stroke
      context.lineWidth = options.strokeWidth
      context.globalAlpha = baseAlpha * (style.opacity ?? 1)
      if (options.strokeLineDash) context.setLineDash(options.strokeLineDash)
      if (options.strokeLineDashOffset) context.lineDashOffset = options.strokeLineDashOffset
      traceOperations(context, drawing, options.fixedDecimalPlaceDigits)
      context.stroke()
    } else if (drawing.type === "fillPath") {
      context.fillStyle = options.fill ?? "transparent"
      context.globalAlpha = baseAlpha * (style.opacity ?? 1) * (style.fillOpacity ?? 1)
      traceOperations(context, drawing, options.fixedDecimalPlaceDigits)
      context.fill(drawable.shape === "curve" || drawable.shape === "polygon" || drawable.shape === "path" ? "evenodd" : "nonzero")
    } else {
      const fillWeight = options.fillWeight < 0 ? options.strokeWidth / 2 : options.fillWeight
      context.strokeStyle = options.fill ?? "transparent"
      context.lineWidth = fillWeight
      context.globalAlpha = baseAlpha * (style.opacity ?? 1) * (style.fillOpacity ?? 1)
      if (options.fillLineDash) context.setLineDash(options.fillLineDash)
      if (options.fillLineDashOffset) context.lineDashOffset = options.fillLineDashOffset
      traceOperations(context, drawing, options.fixedDecimalPlaceDigits)
      context.stroke()
    }
    context.restore()
  }
}

/**
 * Create an explicit optional Rough.js scene backend. Keep one instance (for
 * example with `useMemo`) so its deterministic drawables can be reused across
 * hover, selection, and Canvas repaints.
 */
export function createRoughRenderMode(options: RoughRenderModeOptions = {}): RoughRenderMode {
  const seed = normalizeSeed(options.seed)
  const maxCacheSize = finite(options.cacheSize)
    ? Math.max(1, Math.trunc(options.cacheSize))
    : 1000
  const configuredOptions: Omit<Options, "seed" | "stroke" | "fill" | "strokeWidth" | "strokeLineDash"> = {
    roughness: options.roughness,
    bowing: options.bowing,
    maxRandomnessOffset: options.maxRandomnessOffset,
    curveFitting: options.curveFitting,
    curveTightness: options.curveTightness,
    curveStepCount: options.curveStepCount,
    fillStyle: options.fillStyle,
    fillWeight: options.fillWeight,
    hachureAngle: options.hachureAngle,
    hachureGap: options.hachureGap,
    dashOffset: options.dashOffset,
    dashGap: options.dashGap,
    zigzagOffset: options.zigzagOffset,
    disableMultiStroke: options.disableMultiStroke,
    disableMultiStrokeFill: options.disableMultiStrokeFill,
    preserveVertices: options.preserveVertices,
    simplification: options.simplification,
    fixedDecimalPlaceDigits: options.fixedDecimalPlaceDigits
  }
  // RoughGenerator merges with Object.assign, so passing an explicit
  // `undefined` would erase its defaults and produce NaN geometry.
  const roughOptions = Object.fromEntries(
    Object.entries(configuredOptions).filter(([, value]) => value !== undefined)
  ) as Omit<Options, "seed" | "stroke" | "fill" | "strokeWidth" | "strokeLineDash">
  const optionSignature = stableString({ ...roughOptions, seed })
  const generator = rough.generator()
  const cache = new Map<string, CachedDrawable>()

  function makeCacheKey(node: RoughSceneNode, style: Style): string {
    const geometry = geometryFor(node)
    return stableString({
      backend: "roughjs",
      identity: identityFor(node),
      type: node.type,
      geometry,
      style: serializableStyle(style),
      options: optionSignature,
      seed
    })
  }

  function getDrawable(
    node: RoughSceneNode,
    style: Style,
    context?: CanvasRenderingContext2D
  ): CachedDrawable | null {
    const geometry = geometryFor(node)
    if (!geometry) return null
    const paint = defaultPaint(node, style)
    if (!paint) return null

    const resolvedPaint = context
      ? {
          fill: paint.fill ? (resolveCSSColor(context, paint.fill) || paint.fill) : undefined,
          stroke: resolveCSSColor(context, paint.stroke) || paint.stroke
        }
      : paint
    const key = `${makeCacheKey(node, style)}:${stableString(resolvedPaint)}`
    const cached = cache.get(key)
    if (cached) {
      cache.delete(key)
      cache.set(key, cached)
      return cached
    }

    const nodeSeed = stableRoughSeed(`${seed}:${identityFor(node) ?? stableString(geometry)}`)
    const drawableOptions: Options = {
      ...roughOptions,
      seed: nodeSeed,
      fill: resolvedPaint.fill,
      stroke: resolvedPaint.stroke,
      strokeWidth: style.strokeWidth ?? 1,
      strokeLineDash: parseDasharray(style.strokeDasharray)
    }
    const created = {
      drawable: drawableForGeometry(generator, geometry, drawableOptions),
      geometry,
      style
    }
    cache.set(key, created)
    while (cache.size > maxCacheSize) {
      const oldest = cache.keys().next().value
      if (oldest === undefined) break
      cache.delete(oldest)
    }
    return created
  }

  const mode: RoughRenderMode = {
    id: "roughjs",
    seed,
    cacheKey: makeCacheKey,
    drawCanvas({ context, node, style }) {
      const cached = getDrawable(node, style, context)
      if (!cached) return false
      drawDrawable(context, cached)
      return true
    },
    renderStaticSVG({ node, style, key }) {
      const cached = getDrawable(node, style)
      if (!cached) return null
      const transform = cached.geometry.kind === "path" ? cached.geometry.transform : undefined
      const children = generator.toPaths(cached.drawable).map((path, index) => (
        <path
          key={`${key}-path-${index}`}
          d={path.d}
          fill={path.fill ?? "none"}
          fillOpacity={path.fill && path.fill !== "none" ? style.fillOpacity : undefined}
          stroke={path.stroke}
          strokeWidth={path.strokeWidth}
          opacity={style.opacity}
          strokeLinecap={style.strokeLinecap}
          strokeDasharray={style.strokeDasharray}
        />
      ))
      const transformValue = transform
        ? `translate(${transform.x} ${transform.y})${transform.rotation ? ` rotate(${transform.rotation * 180 / Math.PI})` : ""}`
        : undefined
      return (
        <g key={key} data-semiotic-render-backend="roughjs" transform={transformValue}>
          {children}
        </g>
      )
    },
    clearCache() {
      cache.clear()
    },
    get cacheEntries() {
      return cache.size
    }
  }
  return mode
}
