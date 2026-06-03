import * as React from "react"
import Annotation from "../../Annotation"
import { packEnclose } from "d3-hierarchy"
import { area as d3Area, curveLinear, curveMonotoneX, curveMonotoneY, curveStep, curveStepAfter, curveStepBefore, curveBasis, curveCardinal, curveCatmullRom } from "d3-shape"
import type { CurveFactory } from "d3-shape"
import type { AnnotationContext } from "../../realtime/types"
import { loess } from "./loess"
// @ts-expect-error — no type declarations for regression
import regression from "regression"
import { resolveX, resolveY, resolveAnchoredPosition, isInBounds } from "./annotationResolvers"
import type { Datum } from "./datumTypes"

const CURVE_FACTORIES: Record<string, CurveFactory> = {
  linear: curveLinear,
  monotoneX: curveMonotoneX,
  monotoneY: curveMonotoneY,
  step: curveStep,
  stepAfter: curveStepAfter,
  stepBefore: curveStepBefore,
  basis: curveBasis,
  cardinal: curveCardinal,
  catmullRom: curveCatmullRom,
}

// ── Annotation hierarchy / emphasis ───────────────────────────────────

/** A rendered annotation node paired with the source annotation it came
 *  from, so emphasis treatment can read `annotation.emphasis` after the
 *  per-type rule has produced the node. */
export interface AnnotationRenderPair {
  node: React.ReactNode
  annotation: Datum
}

const EMPHASIS_RANK: Record<string, number> = { secondary: 0, primary: 2 }
const DEFAULT_EMPHASIS_RANK = 1
/** Opacity applied to a `secondary` annotation so primary notes read as
 *  the dominant layer (Rahman et al.'s "Hierarchy" consideration). */
const SECONDARY_EMPHASIS_OPACITY = 0.6

/**
 * Apply annotation hierarchy — Rahman et al.'s "Hierarchy" consideration,
 * reusing the same `emphasis` token charts already accept (`"primary"` /
 * `"secondary"`). A `secondary` annotation dims and yields z-order; a
 * `primary` one paints at full weight and on top.
 *
 * Type-agnostic: it wraps whatever the per-type rule produced, so all
 * annotation types get hierarchy without each rule knowing about it.
 * Document order encodes z-order in SVG, so the return is stably sorted
 * `secondary → unspecified → primary`, with the original index breaking
 * ties to preserve authored order within a band.
 *
 * Zero-overhead and structure-preserving when no annotation declares an
 * emphasis: the original nodes are returned untouched (same keys, same
 * order), so existing charts render identically. The dim composes
 * multiplicatively with any lifecycle opacity already on the node.
 */
export function applyAnnotationEmphasis(
  pairs: ReadonlyArray<AnnotationRenderPair>
): React.ReactNode[] {
  const anyEmphasis = pairs.some(
    (p) => p.annotation?.emphasis === "primary" || p.annotation?.emphasis === "secondary"
  )
  if (!anyEmphasis) return pairs.map((p) => p.node)

  return pairs
    .map((p, i) => ({
      p,
      i,
      rank: EMPHASIS_RANK[p.annotation?.emphasis as string] ?? DEFAULT_EMPHASIS_RANK,
    }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map(({ p, i }) => {
      const emphasis = p.annotation?.emphasis
      if (emphasis !== "primary" && emphasis !== "secondary") return p.node
      return (
        <g
          key={`annotation-emphasis-${i}`}
          className={`annotation-emphasis annotation-emphasis--${emphasis}`}
          {...(emphasis === "secondary" ? { opacity: SECONDARY_EMPHASIS_OPACITY } : {})}
        >
          {p.node}
        </g>
      )
    })
}

type AnnotationRule = (
  annotation: Datum,
  index: number,
  context: AnnotationContext
) => React.ReactNode | null

/**
 * Run the SVG-overlay annotation pass: dispatch each annotation through the
 * user's `svgAnnotationRules` (falling back to the default rules), drop the
 * ones that render nothing, then apply emphasis hierarchy. Shared verbatim by
 * the XY and ordinal overlays so the dispatch/filter/hierarchy logic lives in
 * one place.
 *
 * Falsy-node semantics match the pre-emphasis `.filter(Boolean)` exactly: a
 * rule returning `null`/`undefined` ("skip", e.g. the default rules' out-of-
 * bounds path) — or any other falsy node (`0`/`""`/`false`) — produces no
 * annotation and is dropped. A user rule that returns `null`/`undefined` falls
 * through to the default rule, preserving the existing override contract.
 */
export function renderAnnotationPass(
  annotations: ReadonlyArray<Datum>,
  defaultRule: AnnotationRule,
  userRule: AnnotationRule | undefined,
  context: AnnotationContext
): React.ReactNode[] {
  const pairs: AnnotationRenderPair[] = []
  annotations.forEach((annotation, i) => {
    let node: React.ReactNode
    if (userRule) {
      const userResult = userRule(annotation, i, context)
      node = userResult !== null && userResult !== undefined ? userResult : defaultRule(annotation, i, context)
    } else {
      node = defaultRule(annotation, i, context)
    }
    if (node) pairs.push({ node, annotation })
  })
  return applyAnnotationEmphasis(pairs)
}

// ── Default annotation rules factory ──────────────────────────────────

export function createDefaultAnnotationRules(
  _frameType: "xy" | "ordinal" | "network"
): (
  annotation: Datum,
  index: number,
  context: AnnotationContext
) => React.ReactNode | null {
  return function defaultAnnotationRules(
    ann: Datum,
    index: number,
    context: AnnotationContext
  ): React.ReactNode | null {
    switch (ann.type) {
      // ── Label ─────────────────────────────────────────────────────────
      case "label": {
        const pos = resolveAnchoredPosition(ann, index, context)
        if (!pos) return null
        const { x: px, y: py } = pos
        if (!isInBounds(px, py, context)) return null
        return (
          <Annotation
            key={`ann-${index}`}
            noteData={{
              x: px,
              y: py,
              dx: ann.dx || 30,
              dy: ann.dy || -30,
              note: {
                label: ann.label,
                title: ann.title,
                wrap: ann.wrap || 120
              },
              type: "label",
              connector: ann.connector || { end: "arrow" },
              color: ann.color
            }}
          />
        )
      }

      // ── Callout ───────────────────────────────────────────────────────
      case "callout": {
        const pos = resolveAnchoredPosition(ann, index, context)
        if (!pos) return null
        const { x: px, y: py } = pos
        if (!isInBounds(px, py, context)) return null
        return (
          <Annotation
            key={`ann-${index}`}
            noteData={{
              x: px,
              y: py,
              dx: ann.dx || 30,
              dy: ann.dy || -30,
              note: {
                label: ann.label,
                title: ann.title,
                wrap: ann.wrap || 120
              },
              type: "callout-circle",
              subject: { radius: ann.radius || 12 },
              connector: ann.connector || { end: "arrow" },
              color: ann.color
            }}
          />
        )
      }

      // ── X-threshold (vertical line) ───────────────────────────────────
      case "x-threshold": {
        // Standardize on `value` for threshold-style annotations to match
        // server `staticAnnotations`, ordinal frame, animated GIF helper,
        // and the rest of the test surface. `x` is preserved as a fallback
        // for back-compat. Done at the rule level rather than in
        // `resolveX` itself so non-threshold annotations (label, widget,
        // text) don't accidentally interpret a payload `value` field as a
        // coordinate.
        const px = ann.value != null
          ? resolveX({ ...ann, x: ann.value }, context)
          : resolveX(ann, context)
        if (px == null) return null
        const color = ann.color || "#f97316"
        const labelPos = ann.labelPosition || "top"

        let textY: number
        if (labelPos === "bottom") {
          textY = (context.height || 0) - 4
        } else if (labelPos === "center") {
          textY = (context.height || 0) / 2
        } else {
          textY = 12
        }

        return (
          <g key={`ann-${index}`}>
            <line
              x1={px}
              y1={0}
              x2={px}
              y2={context.height || 0}
              stroke={color}
              strokeWidth={ann.strokeWidth || 1.5}
              strokeDasharray={ann.strokeDasharray || "6,3"}
            />
            {ann.label && (
              <text x={px + 4} y={textY} fill={color} fontSize={12} fontWeight="bold">
                {ann.label}
              </text>
            )}
          </g>
        )
      }

      // ── Y-threshold (horizontal line) ─────────────────────────────────
      case "y-threshold": {
        // Standardize on `value` for threshold annotations (see x-threshold
        // comment). Falls through to legacy `y` so existing annotations
        // continue to render.
        const py = ann.value != null
          ? resolveY({ ...ann, y: ann.value }, context)
          : resolveY(ann, context)
        if (py == null) return null
        const color = ann.color || "#f97316"
        const labelPos = ann.labelPosition || "right"

        let textX: number, anchor: "start" | "middle" | "end"
        if (labelPos === "left") {
          textX = 4
          anchor = "start"
        } else if (labelPos === "center") {
          textX = (context.width || 0) / 2
          anchor = "middle"
        } else {
          textX = (context.width || 0) - 4
          anchor = "end"
        }

        return (
          <g key={`ann-${index}`}>
            <line
              x1={0}
              y1={py}
              x2={context.width || 0}
              y2={py}
              stroke={color}
              strokeWidth={ann.strokeWidth || 1.5}
              strokeDasharray={ann.strokeDasharray || "6,3"}
            />
            {ann.label && (
              <text
                x={textX}
                y={py - 4}
                textAnchor={anchor}
                fill={color}
                fontSize={12}
                fontWeight="bold"
              >
                {ann.label}
              </text>
            )}
          </g>
        )
      }

      // ── Enclose (circle enclosure) ────────────────────────────────────
      case "enclose": {
        const coords = (ann.coordinates || [])
          .map((c: Datum) => ({
            x: resolveX({ ...c, type: "point" }, context),
            y: resolveY({ ...c, type: "point" }, context),
            r: 1
          }))
          .filter(
            (c: { x: number | null; y: number | null; r: number }) =>
              c.x != null && c.y != null
          ) as { x: number; y: number; r: number }[]
        if (coords.length < 2) return null
        const enclosure = packEnclose(coords)
        const padding = ann.padding || 10
        return (
          <g key={`ann-${index}`}>
            <circle
              cx={enclosure.x}
              cy={enclosure.y}
              r={enclosure.r + padding}
              fill={ann.fill || "none"}
              fillOpacity={ann.fillOpacity || 0.1}
              stroke={ann.color || "var(--semiotic-text-secondary, #666)"}
              strokeWidth={1.5}
              strokeDasharray="4,2"
            />
            {ann.label && (
              <text
                x={enclosure.x}
                y={enclosure.y - enclosure.r - padding - 4}
                textAnchor="middle"
                fill={ann.color || "var(--semiotic-text-secondary, #666)"}
                fontSize={12}
              >
                {ann.label}
              </text>
            )}
          </g>
        )
      }

      // ── Rect-enclose (bounding rectangle) ─────────────────────────────
      case "rect-enclose": {
        const coords = (ann.coordinates || [])
          .map((c: Datum) => ({
            x: resolveX({ ...c, type: "point" }, context),
            y: resolveY({ ...c, type: "point" }, context)
          }))
          .filter(
            (c: { x: number | null; y: number | null }) =>
              c.x != null && c.y != null
          ) as { x: number; y: number }[]
        if (coords.length < 2) return null
        const padding = ann.padding || 10
        const xs = coords.map((c) => c.x)
        const ys = coords.map((c) => c.y)
        const minX = Math.min(...xs) - padding
        const maxX = Math.max(...xs) + padding
        const minY = Math.min(...ys) - padding
        const maxY = Math.max(...ys) + padding
        return (
          <g key={`ann-${index}`}>
            <rect
              x={minX}
              y={minY}
              width={maxX - minX}
              height={maxY - minY}
              fill={ann.fill || "none"}
              fillOpacity={ann.fillOpacity || 0.1}
              stroke={ann.color || "var(--semiotic-text-secondary, #666)"}
              strokeWidth={1.5}
              strokeDasharray="4,2"
            />
            {ann.label && (
              <text
                x={(minX + maxX) / 2}
                y={minY - 4}
                textAnchor="middle"
                fill={ann.color || "var(--semiotic-text-secondary, #666)"}
                fontSize={12}
              >
                {ann.label}
              </text>
            )}
          </g>
        )
      }

      // ── Highlight ─────────────────────────────────────────────────────
      case "highlight": {
        const data = context.data || []
        const matches =
          typeof ann.filter === "function"
            ? data.filter(ann.filter)
            : ann.field && ann.value != null
              ? data.filter((d) => d[ann.field] === ann.value)
              : []
        const defaultStyle = {
          stroke: ann.color || "#f97316",
          strokeWidth: 2,
          fill: "none"
        }
        return (
          <g key={`ann-${index}`}>
            {matches.map((d, i) => {
              const px = resolveX(d, context)
              const py = resolveY(d, context)
              if (px == null || py == null) return null
              const r = typeof ann.r === "function" ? ann.r(d) : (ann.r || 6)
              const style = typeof ann.style === "function"
                ? ann.style(d)
                : (ann.style || defaultStyle)
              return (
                <circle key={`hl-${i}`} cx={px} cy={py} r={r} {...style} />
              )
            })}
          </g>
        )
      }

      // ── Bracket ───────────────────────────────────────────────────────
      case "bracket": {
        const px = resolveX(ann, context)
        const py = resolveY(ann, context)
        return (
          <Annotation
            key={`ann-${index}`}
            noteData={{
              x: px ?? 0,
              y: py ?? 0,
              dx: ann.dx || 0,
              dy: ann.dy || 0,
              note: {
                label: ann.label,
                title: ann.title,
                wrap: ann.wrap || 120
              },
              type: "bracket",
              subject: {
                type: ann.bracketType || "curly",
                width: ann.width,
                height: ann.height,
                depth: ann.depth || 30
              },
              color: ann.color
            }}
          />
        )
      }

      // ── Trend (regression line) ───────────────────────────────────────
      //
      // Supports both XY (continuous-axis) and ordinal frames. For
      // ordinal frames the categorical axis is treated as a numeric
      // category-index for regression input; pixel positions are
      // resolved through the band scale via category-name lookup
      // (with linear interpolation between band centers for
      // fractional LOESS indices).
      case "trend": {
        const data = context.data || []
        if (data.length < 2) return null
        const xAcc = context.xAccessor || "x"
        const yAcc = context.yAccessor || "y"

        const isOrdinal = context.frameType === "ordinal"
        const isHoriz = context.projection === "horizontal"

        // In ordinal frames, the annotation context's
        // xAccessor/yAccessor always map to oAccessor/rAccessor
        // (category/value) regardless of projection — see
        // StreamOrdinalFrame.tsx where OrdinalSVGOverlay receives
        // `xAccessor=oAccessor, yAccessor=rAccessor` for both
        // horizontal and vertical projections. Projection only
        // changes pixel projection (via scales.x / scales.y), not
        // which data field is categorical vs numeric.
        const categoricalAccessor = isOrdinal ? xAcc : null
        const valueAccessor = isOrdinal ? yAcc : null

        // Build regression input + record category order so we can
        // map regression x-output back to the band scale at render
        // time.
        let points: [number, number][]
        const categoryNames: string[] = []
        const indexByCategory = new Map<string, number>()

        if (isOrdinal && categoricalAccessor && valueAccessor) {
          // Walk data to assign each unique category an index in
          // first-seen order. Regression uses the index as a stand-in
          // for the discrete band position.
          for (const d of data) {
            const cat = d[categoricalAccessor]
            if (cat == null) continue
            const key = String(cat)
            if (!indexByCategory.has(key)) {
              indexByCategory.set(key, categoryNames.length)
              categoryNames.push(key)
            }
          }
          points = data
            .map((d) => {
              const cat = d[categoricalAccessor]
              const v = d[valueAccessor]
              if (cat == null || v == null) return null
              const idx = indexByCategory.get(String(cat))
              return idx != null ? ([idx, +v] as [number, number]) : null
            })
            .filter((p): p is [number, number] => p !== null)
        } else {
          // XY path — direct accessor read.
          points = data
            .map((d) => [d[xAcc], d[yAcc]] as [number, number])
            .filter((p) => p[0] != null && p[1] != null)
        }
        if (points.length < 2) return null

        // Resolve the pair of axis scales we'll project trend points
        // through. For XY both are linear and read directly. For
        // ordinal, the categorical scale takes a category-name
        // string → pixel; we wrap it in an interpolator that accepts
        // fractional indices (for LOESS, which produces one trend
        // point per input index).
        const scaleX = context.scales?.x ?? context.scales?.time
        const scaleY = context.scales?.y ?? context.scales?.value
        if (!scaleX || !scaleY) return null

        const interpolateBandScale = (bandScale: (k: string) => number) => (idx: number) => {
          const i0 = Math.max(0, Math.floor(idx))
          const i1 = Math.min(categoryNames.length - 1, i0 + 1)
          const t = idx - i0
          const p0 = bandScale(categoryNames[i0])
          const p1 = bandScale(categoryNames[i1])
          return p0 + (p1 - p0) * t
        }

        // Build (xPixel, yPixel) projector for regression output.
        // The cast through `unknown` is intentional: ordinal frames
        // place a `(category-name) => pixel` function in `scales.x`
        // (or `scales.y` when projection="horizontal"), but the
        // shared type narrows to `ScaleLinear<number, number>`. At
        // this branch we know the runtime shape from
        // `frameType === "ordinal"` + projection.
        //
        // For ordinal regression, points are always
        // `[categoryIndex, value]` regardless of projection. The
        // projection-aware mapping back to pixels is
        // - vertical: xPixel from band-scale on x, yPixel from
        //   linear value scale on y
        // - horizontal: xPixel from linear value scale on x (using
        //   `value`), yPixel from band-scale on y (using
        //   `categoryIndex`).
        const sxAny = scaleX as unknown as (k: any) => number
        const syAny = scaleY as unknown as (k: any) => number
        let project: (regressionX: number, regressionY: number) => [number, number]
        if (isOrdinal) {
          if (isHoriz) {
            // regressionX = categoryIndex → through band-scale (y axis)
            // regressionY = value → through linear scale (x axis)
            const yProject = interpolateBandScale(syAny)
            project = (catIdx, value) => [sxAny(value), yProject(catIdx)]
          } else {
            // regressionX = categoryIndex → through band-scale (x axis)
            // regressionY = value → through linear scale (y axis)
            const xProject = interpolateBandScale(sxAny)
            project = (catIdx, value) => [xProject(catIdx), syAny(value)]
          }
        } else {
          project = (x, y) => [sxAny(x), syAny(y)]
        }

        const method = ann.method || "linear"
        let trendPoints: [number, number][]

        if (method === "loess") {
          trendPoints = loess(points, ann.bandwidth ?? 0.3)
        } else {
          const result =
            method === "polynomial"
              ? regression.polynomial(points, {
                  order: ann.order || 2
                })
              : regression.linear(points)
          trendPoints = result.points
        }

        const linePoints = trendPoints
          .map(([x, y]) => {
            const [px, py] = project(x, y)
            return `${px},${py}`
          })
          .join(" ")
        const color = ann.color || "#6366f1"
        const last = trendPoints[trendPoints.length - 1]
        const [labelPx, labelPy] = project(last[0], last[1])
        return (
          <g key={`ann-${index}`}>
            <polyline
              points={linePoints}
              fill="none"
              stroke={color}
              strokeWidth={ann.strokeWidth || 2}
              strokeDasharray={ann.strokeDasharray || "6,3"}
            />
            {ann.label && (
              <text
                x={labelPx + 4}
                y={labelPy - 4}
                fill={color}
                fontSize={11}
              >
                {ann.label}
              </text>
            )}
          </g>
        )
      }

      // ── Band (shaded region between y0 and y1) ────────────────────────
      case "band": {
        const scaleY = context.scales?.y ?? context.scales?.value
        const y0px = scaleY?.(ann.y0) ?? 0
        const y1px = scaleY?.(ann.y1) ?? (context.height || 0)
        return (
          <g key={`ann-${index}`}>
            <rect
              x={0}
              y={Math.min(y0px, y1px)}
              width={context.width || 0}
              height={Math.abs(y1px - y0px)}
              fill={ann.fill || "var(--semiotic-primary, #6366f1)"}
              fillOpacity={ann.fillOpacity || 0.1}
            />
            {ann.label && (
              <text
                x={(context.width || 0) - 4}
                y={Math.min(y0px, y1px) - 4}
                textAnchor="end"
                fill={ann.color || "var(--semiotic-primary, #6366f1)"}
                fontSize={11}
              >
                {ann.label}
              </text>
            )}
          </g>
        )
      }

      // ── Envelope (per-point upper/lower bounds polygon) ─────────────
      case "envelope": {
        const data = context.data || []
        if (data.length < 2) return null
        const xAcc = context.xAccessor || "x"
        const scaleX = context.scales?.x ?? context.scales?.time
        const scaleY = context.scales?.y ?? context.scales?.value
        if (!scaleX || !scaleY) return null

        const upperAcc = ann.upperAccessor || "upperBounds"
        const lowerAcc = ann.lowerAccessor || "lowerBounds"
        const filterFn = ann.filter as ((d: Datum) => boolean) | undefined

        // Collect points that have bounds
        const bounded = data
          .filter((d) => {
            if (d[upperAcc] == null || d[lowerAcc] == null) return false
            if (filterFn && !filterFn(d)) return false
            return true
          })
          .sort((a, b) => (a[xAcc] as number) - (b[xAcc] as number))
        if (bounded.length < 2) return null

        // Build envelope area using d3-shape area generator with curve interpolation
        const curveFn = CURVE_FACTORIES[context.curve || "linear"] || curveLinear
        const envelopeArea = d3Area<Datum>()
          .x((d) => scaleX(d[xAcc]))
          .y0((d) => scaleY(d[lowerAcc]))
          .y1((d) => scaleY(d[upperAcc]))
          .curve(curveFn)
        const envelopePath = envelopeArea(bounded)
        if (!envelopePath) return null

        const fillColor = ann.fill || "#6366f1"
        return (
          <g key={`ann-${index}`}>
            <path
              d={envelopePath}
              fill={fillColor}
              fillOpacity={ann.fillOpacity ?? 0.15}
              stroke="none"
            />
            {ann.label && bounded.length > 0 && (
              <text
                x={scaleX(bounded[bounded.length - 1][xAcc]) + 4}
                y={scaleY(bounded[bounded.length - 1][upperAcc]) - 4}
                fill={fillColor}
                fontSize={11}
              >
                {ann.label}
              </text>
            )}
          </g>
        )
      }

      // ── Anomaly Band (mean ± N×stddev with outlier dots) ──────────────
      case "anomaly-band": {
        const data = context.data || []
        if (data.length < 2) return null
        const yAcc = context.yAccessor || "y"
        const _xAcc = context.xAccessor || "x"
        const scaleX = context.scales?.x ?? context.scales?.time
        const scaleY = context.scales?.y ?? context.scales?.value
        if (!scaleX || !scaleY) return null

        const yValues = data
          .map((d) => d[yAcc] as number)
          .filter((v) => v != null && isFinite(v))
        if (yValues.length < 2) return null

        const mean = yValues.reduce((s, v) => s + v, 0) / yValues.length
        const variance =
          yValues.reduce((s, v) => s + (v - mean) ** 2, 0) / yValues.length
        const stddev = Math.sqrt(variance)
        const threshold = ann.threshold ?? 2

        const upper = mean + threshold * stddev
        const lower = mean - threshold * stddev
        const showBand = ann.showBand !== false

        const bandFill = ann.fill || "#6366f1"
        const bandOpacity = ann.fillOpacity ?? 0.1
        const anomalyColor = ann.anomalyColor || "#ef4444"
        const anomalyRadius = ann.anomalyRadius ?? 6

        const y0px = scaleY(upper)
        const y1px = scaleY(lower)

        // Find outlier points
        const outliers = data.filter((d) => {
          const v = d[yAcc] as number
          return v != null && Math.abs(v - mean) > threshold * stddev
        })

        return (
          <g key={`ann-${index}`}>
            {showBand && (
              <rect
                x={0}
                y={Math.min(y0px, y1px)}
                width={context.width || 0}
                height={Math.abs(y1px - y0px)}
                fill={bandFill}
                fillOpacity={bandOpacity}
              />
            )}
            {outliers.map((d, i) => {
              const px = resolveX(d, context)
              const py = resolveY(d, context)
              if (px == null || py == null) return null
              return (
                <circle
                  key={`anomaly-${i}`}
                  cx={px}
                  cy={py}
                  r={anomalyRadius}
                  fill={anomalyColor}
                  fillOpacity={0.7}
                  stroke={anomalyColor}
                  strokeWidth={1.5}
                />
              )
            })}
            {ann.label && (
              <text
                x={(context.width || 0) - 4}
                y={Math.min(y0px, y1px) - 4}
                textAnchor="end"
                fill={bandFill}
                fontSize={11}
              >
                {ann.label}
              </text>
            )}
          </g>
        )
      }

      // ── Forecast (extrapolated trend with confidence envelope) ────────
      case "forecast": {
        const data = context.data || []
        if (data.length < 3) return null
        const xAcc = context.xAccessor || "x"
        const yAcc = context.yAccessor || "y"
        const scaleX = context.scales?.x ?? context.scales?.time
        const scaleY = context.scales?.y ?? context.scales?.value
        if (!scaleX || !scaleY) return null

        const points: [number, number][] = data
          .map((d) => [d[xAcc], d[yAcc]] as [number, number])
          .filter((p) => p[0] != null && p[1] != null && isFinite(p[0]) && isFinite(p[1]))
          .sort((a, b) => a[0] - b[0])
        if (points.length < 3) return null

        const forecastMethod = ann.method || "linear"
        let predict: (x: number) => number

        if (forecastMethod === "polynomial") {
          const result = regression.polynomial(points, {
            order: ann.order || 2
          })
          const coeffs: number[] = result.equation
          predict = (x: number) =>
            coeffs.reduce(
              (sum: number, c: number, i: number) => sum + c * Math.pow(x, i),
              0
            )
        } else {
          // Linear regression (inline — no dependency needed)
          const n = points.length
          let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0
          for (const [x, y] of points) {
            sumX += x; sumY += y; sumXX += x * x; sumXY += x * y
          }
          const det = n * sumXX - sumX * sumX
          if (Math.abs(det) < 1e-12) return null
          const slope = (n * sumXY - sumX * sumY) / det
          const intercept = (sumY - slope * sumX) / n
          predict = (x: number) => intercept + slope * x
        }

        // Residual standard error
        const n = points.length
        const residuals = points.map(([x, y]) => y - predict(x))
        const sse = residuals.reduce((s, r) => s + r * r, 0)
        const se = Math.sqrt(sse / Math.max(n - 2, 1))

        // Mean of x and sum of squared deviations
        const meanX = points.reduce((s, p) => s + p[0], 0) / n
        const ssX = points.reduce((s, p) => s + (p[0] - meanX) ** 2, 0)

        // Confidence z-score
        const confidence = ann.confidence ?? 0.95
        // Approximate z for common confidence levels
        const z = confidence >= 0.99 ? 2.576
          : confidence >= 0.95 ? 1.96
          : confidence >= 0.9 ? 1.645
          : 1.0

        // Generate forecast x-values
        const steps = ann.steps ?? 5
        const xMin = points[0][0]
        const xMax = points[n - 1][0]
        const step = (xMax - xMin) / Math.max(n - 1, 1)

        const forecastXs: number[] = []
        for (let i = 1; i <= steps; i++) {
          forecastXs.push(xMax + i * step)
        }

        // Compute upper/lower bounds for forecast region
        const envelopePoints: { x: number; yCenter: number; yUpper: number; yLower: number }[] = []
        for (const x of forecastXs) {
          const yCenter = predict(x)
          const predInterval = se * Math.sqrt(1 + 1 / n + (ssX > 0 ? (x - meanX) ** 2 / ssX : 0)) * z
          envelopePoints.push({
            x,
            yCenter,
            yUpper: yCenter + predInterval,
            yLower: yCenter - predInterval
          })
        }

        // Build SVG path for confidence polygon
        const upperPath = envelopePoints
          .map((p) => `${scaleX(p.x)},${scaleY(p.yUpper)}`)
          .join(" L")
        const lowerPath = envelopePoints
          .slice()
          .reverse()
          .map((p) => `${scaleX(p.x)},${scaleY(p.yLower)}`)
          .join(" L")
        const envelopePath = `M${upperPath} L${lowerPath} Z`

        // Center forecast line
        const centerLine = envelopePoints
          .map((p) => `${scaleX(p.x)},${scaleY(p.yCenter)}`)
          .join(" ")

        // Connect forecast to last data point
        const lastDataPx = `${scaleX(xMax)},${scaleY(predict(xMax))}`

        const fillColor = ann.fill || "#6366f1"
        const strokeColor = ann.strokeColor || "#6366f1"

        return (
          <g key={`ann-${index}`}>
            <path
              d={envelopePath}
              fill={fillColor}
              fillOpacity={ann.fillOpacity ?? 0.15}
              stroke="none"
            />
            <polyline
              points={`${lastDataPx} ${centerLine}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth={ann.strokeWidth ?? 2}
              strokeDasharray={ann.strokeDasharray ?? "6,3"}
            />
            {ann.label && envelopePoints.length > 0 && (
              <text
                x={scaleX(envelopePoints[envelopePoints.length - 1].x) + 4}
                y={scaleY(envelopePoints[envelopePoints.length - 1].yCenter) - 4}
                fill={strokeColor}
                fontSize={11}
              >
                {ann.label}
              </text>
            )}
          </g>
        )
      }

      // ── Widget (arbitrary HTML/React content at data coordinates) ────
      case "widget": {
        let px: number | null = null
        let py: number | null = null

        if (ann.px != null && ann.py != null) {
          // Explicit pixel coordinates bypass anchor resolution
          px = ann.px
          py = ann.py
        } else {
          const pos = resolveAnchoredPosition(ann, index, context)
          if (!pos) return null
          px = pos.x
          py = pos.y
        }
        if (px == null || py == null) return null
        if (!isInBounds(px, py, context)) return null

        const offsetX = ann.dx ?? 0
        const offsetY = ann.dy ?? 0
        const widgetWidth = ann.width ?? 32
        const widgetHeight = ann.height ?? 32

        // Default content: info emoji
        const content = ann.content ?? (
          <span style={{ fontSize: 18, cursor: "default" }} title={ann.label || "Info"}>
            {"ℹ️"}
          </span>
        )

        return (
          <foreignObject
            key={`ann-${index}`}
            x={px + offsetX - widgetWidth / 2}
            y={py + offsetY - widgetHeight / 2}
            width={widgetWidth}
            height={widgetHeight}
            style={{ overflow: "visible", pointerEvents: "auto" }}
          >
            <div
              style={{
                width: widgetWidth,
                height: widgetHeight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {content}
            </div>
          </foreignObject>
        )
      }

      // ── Text (plain label at data coordinates) ──────────────────────
      case "text": {
        const pos = resolveAnchoredPosition(ann, index, context)
        if (!pos) return null
        const { x: px, y: py } = pos
        return (
          <text
            key={`ann-text-${index}`}
            x={px + (ann.dx || 0)}
            y={py + (ann.dy || 0)}
            fill={ann.color || "var(--semiotic-text, #333)"}
            fontSize={ann.fontSize || 11}
            dominantBaseline="middle"
            style={{ fontFamily: "inherit" }}
          >
            {ann.label}
          </text>
        )
      }

      // ── Category Highlight (ordinal band behind a category) ──────────
      case "category-highlight": {
        const catValue = ann.category
        if (catValue == null) return null

        // Prefer the raw ordinal band scale (available in ordinal frames via context.scales.o).
        // Fall back to checking x/y for band scales (XY frames with band axes).
        type BandLikeScale = {
          (value: string): number | undefined
          bandwidth: () => number
        }
        const isBandScale = (scale: unknown): scale is BandLikeScale =>
          typeof scale === "function" &&
          typeof (scale as { bandwidth?: unknown }).bandwidth === "function"
        const rawO = context.scales?.o
        const oScale = context.scales?.x
        const altScale = context.scales?.y
        const scale = isBandScale(rawO)
          ? rawO
          : isBandScale(oScale) ? oScale
          : isBandScale(altScale) ? altScale
          : null
        if (!scale) return null

        const pos = scale(String(catValue))
        if (pos == null) return null
        const bandwidth = scale.bandwidth()
        // Determine orientation: use projection from context (ordinal frames),
        // or fall back to checking which axis has the band scale (XY frames)
        const isVertical = context.projection
          ? context.projection === "vertical"
          : scale === oScale

        const color = ann.color || "var(--semiotic-primary, #4589ff)"
        const opacity = ann.opacity ?? 0.15
        const label = ann.label

        if (isVertical) {
          return (
            <g key={`ann-${index}`}>
              <rect x={pos} y={0} width={bandwidth} height={context.height || 0}
                    fill={color} fillOpacity={opacity} />
              {label && (
                <text x={pos + bandwidth / 2} y={12} textAnchor="middle"
                      fill={color} fontSize={12} fontWeight="bold">{label}</text>
              )}
            </g>
          )
        } else {
          return (
            <g key={`ann-${index}`}>
              <rect x={0} y={pos} width={context.width || 0} height={bandwidth}
                    fill={color} fillOpacity={opacity} />
              {label && (
                <text x={12} y={pos + bandwidth / 2} dominantBaseline="middle"
                      fill={color} fontSize={12} fontWeight="bold">{label}</text>
              )}
            </g>
          )
        }
      }

      // ── Unrecognized type ─────────────────────────────────────────────
      default:
        return null
    }
  }
}
