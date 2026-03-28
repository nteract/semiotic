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

// ── Default annotation rules factory ──────────────────────────────────

export function createDefaultAnnotationRules(
  frameType: "xy" | "ordinal" | "network"
): (
  annotation: Record<string, any>,
  index: number,
  context: AnnotationContext
) => React.ReactNode | null {
  return function defaultAnnotationRules(
    ann: Record<string, any>,
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
        const px = resolveX(ann, context)
        if (px == null) return null
        const color = ann.color || "#f97316"
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
              <text x={px + 4} y={12} fill={color} fontSize={12} fontWeight="bold">
                {ann.label}
              </text>
            )}
          </g>
        )
      }

      // ── Y-threshold (horizontal line) ─────────────────────────────────
      case "y-threshold": {
        const py = resolveY(ann, context)
        if (py == null) return null
        const color = ann.color || "#f97316"
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
                x={(context.width || 0) - 4}
                y={py - 4}
                textAnchor="end"
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
          .map((c: Record<string, any>) => ({
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
          .map((c: Record<string, any>) => ({
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
      case "trend": {
        const data = context.data || []
        if (data.length < 2) return null
        const xAcc = context.xAccessor || "x"
        const yAcc = context.yAccessor || "y"
        const points: [number, number][] = data
          .map((d) => [d[xAcc], d[yAcc]] as [number, number])
          .filter((p) => p[0] != null && p[1] != null)
        if (points.length < 2) return null

        const scaleX = context.scales?.x ?? context.scales?.time
        const scaleY = context.scales?.y ?? context.scales?.value
        if (!scaleX || !scaleY) return null

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
          .map(([x, y]) => `${scaleX(x)},${scaleY(y)}`)
          .join(" ")
        const color = ann.color || "#6366f1"
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
                x={scaleX(trendPoints[trendPoints.length - 1][0]) + 4}
                y={scaleY(trendPoints[trendPoints.length - 1][1]) - 4}
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
        const filterFn = ann.filter as ((d: Record<string, any>) => boolean) | undefined

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
        const envelopeArea = d3Area<Record<string, any>>()
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
        const xAcc = context.xAccessor || "x"
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

      // ── Unrecognized type ─────────────────────────────────────────────
      default:
        return null
    }
  }
}
