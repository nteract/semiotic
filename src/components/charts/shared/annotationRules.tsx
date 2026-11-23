import { ThresholdAnnotation } from "./ThresholdAnnotation"
import { annotationNote } from "../../text/annotationTextLayout"
import type * as React from "react"
import { cloneElement } from "react"
import Annotation from "../../Annotation"
import { packEnclose } from "../../../vendor/d3-pack-enclose"
import { area as d3Area, curveLinear } from "d3-shape"
import type { AnnotationContext } from "../../realtime/types"
import type { CurveType } from "../../stream/types"
import { resolveEnvelopeCurveFactory } from "../../stream/renderers/canvasRenderHelpers"
import { forecastModel } from "./forecastModel"
import { trendGeometry, projectAnnotationValue } from "./statisticalAnnotationGeometry"
import {
  anomalyBand,
  isAnomalous,
  regressionPoints,
} from "./leastSquaresRegression"
import { resolveX, resolveY, resolveAnchoredPosition, isInBounds } from "./annotationResolvers"
import type { Datum } from "./datumTypes"
import { getMinMax } from "./minMax"
import { annotationActivationProps, type AnnotationActivationOptions } from "./annotationActivation"
import { TOP_LABEL_BASELINE } from "./annotationLabelLayout"
import { AnnotationLabel } from "./AnnotationLabel"
import { renderBandAnnotation } from "./renderBandAnnotation"
import { FrameTextAnnotationSVG } from "./FrameTextAnnotationSVG"

export { applyAnnotationEmphasis, type AnnotationRenderPair } from "./annotationHierarchy"
export {
  renderAnnotationPass,
  renderAnnotationPassWithResult,
  type AnnotationRule,
} from "./annotationDispatch"

// ── Default annotation rules factory ──────────────────────────────────

export function createDefaultAnnotationRules(
  _frameType: "xy" | "ordinal" | "network",
  activation: AnnotationActivationOptions = {},
  /**
   * The frame paints `layer: "under"` band fills beneath its marks
   * (StreamXYFrame), so these rules draw only the label. Elsewhere such a
   * band keeps its fill in the overlay rather than losing it.
   */
  underLayerBands = false
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
      // ── Labels and callouts ───────────────────────────────────────────
      case "label":
      case "callout":
      case "callout-circle":
      case "callout-rect": {
        const pos = resolveAnchoredPosition(ann, index, context)
        if (!pos) return null
        const { x: px, y: py } = pos
        if (!isInBounds(px, py, context)) return null
        const renderedType = ann.type === "callout" ? "callout-circle" : ann.type
        const subject =
          renderedType === "callout-circle"
            ? { radius: ann.radius ?? 12, radiusPadding: ann.radiusPadding }
            : renderedType === "callout-rect"
              ? { width: ann.width, height: ann.height }
              : undefined
        return (
          <Annotation
            key={`ann-${index}`}
            noteData={{
              x: px,
              y: py,
              dx: ann.dx ?? 30,
              dy: ann.dy ?? -30,
              note: annotationNote(ann),
              type: renderedType,
              ...(subject ? { subject } : {}),
              connector: ann.connector || { end: "arrow" },
              color: ann.color,
              disable: ann.disable,
              opacity: ann.opacity,
              strokeDasharray: ann.strokeDasharray,
              className: ann.className
            }}
          />
        )
      }

      // `value` is canonical; retain x/y compatibility fields at this boundary.
      case "x-threshold":
      case "y-threshold": {
        const vertical = ann.type === "x-threshold"
        const datum = ann.value != null
          ? { ...ann, [vertical ? "x" : "y"]: ann.value }
          : ann
        const position = vertical ? resolveX(datum, context) : resolveY(datum, context)
        if (position == null) return null
        return <ThresholdAnnotation key={`ann-${index}`} ann={ann} position={position}
          vertical={vertical} width={context.width || 0} height={context.height || 0}
          color={ann.color || "#f97316"} bold />
      }

      case "enclose":
      case "rect-enclose": {
        const points: { x: number; y: number; r: number }[] = []
        for (const point of ann.coordinates ?? []) {
          const x = resolveX(point, context)
          const y = resolveY(point, context)
          if (x != null && y != null) points.push({ x, y, r: 1 })
        }
        if (points.length < 2) return null
        const padding = ann.padding ?? 10
        const color = ann.color || "var(--semiotic-text-secondary, #666)"
        const style = { fill: ann.fill || "none", fillOpacity: ann.fillOpacity ?? 0.1,
          stroke: color, strokeWidth: 1.5, strokeDasharray: "4,2" }
        let shape
        let center: number
        let top: number
        if (ann.type === "enclose") {
          const circle = packEnclose(points)
          if (!circle) return null
          const radius = circle.r + padding
          center = circle.x
          top = circle.y - radius
          shape = <circle cx={center} cy={circle.y} r={radius} {...style} />
        } else {
          const [x0, x1] = getMinMax(points, p => p.x)
          const [y0, y1] = getMinMax(points, p => p.y)
          center = (x0 + x1) / 2
          top = y0 - padding
          shape = <rect x={x0 - padding} y={top} width={x1 - x0 + 2 * padding}
            height={y1 - y0 + 2 * padding} {...style} />
        }
        return (
          <g key={`ann-${index}`}>
            {shape}
            {ann.label && <AnnotationLabel x={center} y={top - 4} textAnchor="middle"
              fill={color} fontSize={12} text={ann.label} background={ann.labelBackground ?? "none"} />}
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
              const r = typeof ann.r === "function" ? ann.r(d) : (ann.r ?? 6)
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
        if (px == null || py == null) return null
        return (
          <Annotation
            key={`ann-${index}`}
            noteData={{
              x: px,
              y: py,
              dx: ann.dx || 0,
              dy: ann.dy || 0,
              note: annotationNote(ann),
              type: "bracket",
              subject: {
                type: ann.bracketType || "curly",
                width: ann.width,
                height: ann.height,
                depth: ann.depth ?? 30
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
        const trendPoints = trendGeometry(ann, context)
        if (trendPoints.length < 2) return null
        const linePoints = trendPoints.map(([x, y]) => `${x},${y}`).join(" ")
        const color = ann.color || "#6366f1"
        const [labelPx, labelPy] = trendPoints[trendPoints.length - 1]
        return (
          <g key={`ann-${index}`}>
            <polyline
              points={linePoints}
              fill="none"
              stroke={color}
              strokeWidth={ann.strokeWidth ?? 2}
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

      case "band":
      case "x-band":
        return renderBandAnnotation(ann, {
          id: `ann-${index}`, width: context.width || 0, height: context.height || 0,
          scale: ann.type === "x-band"
            ? context.scales?.x ?? context.scales?.time
            : context.scales?.y ?? context.scales?.value,
          underLayer: underLayerBands
        })

      // ── Envelope (per-point upper/lower bounds polygon) ─────────────
      case "envelope": {
        const data = context.data || []
        if (data.length < 2) return null
        const xAcc = context.xAccessor || "x"
        const rawX = context.scales?.x ?? context.scales?.time
        const rawY = context.scales?.y ?? context.scales?.value
        if (!rawX || !rawY) return null
        const scaleX = (value: unknown) => projectAnnotationValue(rawX, value)
        const scaleY = (value: unknown) => projectAnnotationValue(rawY, value)

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
        const curveFn = resolveEnvelopeCurveFactory(context.curve as CurveType) ?? curveLinear
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
        const data = (context.data || []).filter((d) => !ann.filter || ann.filter(d))
        if (data.length < 2) return null
        const yAcc = context.yAccessor || "y"
        const rawX = context.scales?.x ?? context.scales?.time
        const rawY = context.scales?.y ?? context.scales?.value
        if (!rawX || !rawY) return null
        const scaleY = (value: unknown) => projectAnnotationValue(rawY, value)

        const band = anomalyBand(data.map((d) => d[yAcc]), ann.threshold ?? 2)
        if (!band) return null
        const showBand = ann.showBand !== false

        const bandFill = ann.fill || "#6366f1"
        const bandOpacity = ann.fillOpacity ?? 0.1
        const anomalyColor = ann.anomalyColor || "#ef4444"
        const anomalyRadius = ann.anomalyRadius ?? 6

        const y0px = scaleY(band.upper)
        const y1px = scaleY(band.lower)

        // The rows the overlay pipeline marks with `ANOMALY_FIELD`
        const outliers = data.filter((d) => isAnomalous(d[yAcc], band))

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
        const xAcc = context.xAccessor || "x"
        const yAcc = context.yAccessor || "y"
        const rawX = context.scales?.x ?? context.scales?.time
        const rawY = context.scales?.y ?? context.scales?.value
        if (!rawX || !rawY) return null
        const scaleX = (value: unknown) => projectAnnotationValue(rawX, value)
        const scaleY = (value: unknown) => projectAnnotationValue(rawY, value)

        const points = regressionPoints(data.map((d) => [d[xAcc], d[yAcc]]))
        const model = forecastModel(points, ann)
        if (!model) return null
        const { predict } = model
        // Generate forecast x-values
        const xMax = points[points.length - 1][0]
        const envelopePoints = model.forecast(ann.steps ?? 5)
        if (!envelopePoints.length) return null
        const envelopePath = d3Area<(typeof envelopePoints)[number]>()
          .x((point) => scaleX(point.x))
          .y0((point) => scaleY(point.lower))
          .y1((point) => scaleY(point.upper))(envelopePoints)
        if (!envelopePath) return null

        // Center forecast line
        const centerLine = envelopePoints
          .map((p) => `${scaleX(p.x)},${scaleY(p.y)}`)
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
                y={scaleY(envelopePoints[envelopePoints.length - 1].y) - 4}
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
        let px: number
        let py: number

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
              {...annotationActivationProps(ann, activation)}
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
        const tx = px + (ann.dx || 0)
        const ty = py + (ann.dy || 0)
        const textColor = ann.color || "var(--semiotic-text, #333)"
        // M4 redundant-cue: a colored `text` note offset from its anchor ties to
        // its target by color alone (text draws no connector). When the layout
        // pass flagged `_redundantConnector`, add a faint leader line from the
        // anchor to the text — a spatial cue a color-blind reader can follow.
        const textEl = (
          <text
            x={tx}
            y={ty}
            fill={textColor}
            fontSize={ann.fontSize || 11}
            opacity={ann.opacity}
            strokeDasharray={ann.strokeDasharray}
            dominantBaseline="middle"
            style={{ fontFamily: "inherit" }}
          >
            {ann.label}
          </text>
        )
        if (ann._redundantConnector !== true) {
          return cloneElement(textEl, { key: `ann-text-${index}` })
        }
        return (
          <g key={`ann-text-${index}`} opacity={ann.opacity} strokeDasharray={ann.strokeDasharray}>
            <line
              x1={px}
              y1={py}
              x2={tx}
              y2={ty}
              stroke={textColor}
              strokeWidth={1}
              strokeOpacity={0.5}
              style={{ pointerEvents: "none" }}
            />
            {cloneElement(textEl, { opacity: undefined, strokeDasharray: undefined })}
          </g>
        )
      }

      // ── Frame text (serializable plot-relative chrome) ──────────────
      case "frame-text":
        return <FrameTextAnnotationSVG
          key={`ann-frame-text-${index}`} annotation={ann}
          width={context.width || 0} height={context.height || 0}
        />

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
        const scales = context.scales
        const candidates: unknown[] = [scales?.o, scales?.x, scales?.y]
        const scale = candidates.find(isBandScale)
        if (!scale) return null
        const pos = scale(String(catValue))
        if (pos == null) return null
        const bandwidth = scale.bandwidth()
        const vertical = context.projection ? context.projection === "vertical" : Object.is(scale, scales?.x)
        const color = ann.color || "var(--semiotic-primary, #4589ff)"
        return (
          <g key={`ann-${index}`}>
            <rect x={vertical ? pos : 0} y={vertical ? 0 : pos}
              width={vertical ? bandwidth : context.width || 0} height={vertical ? context.height || 0 : bandwidth}
              fill={color} fillOpacity={ann.opacity ?? 0.15} />
            {ann.label && <AnnotationLabel x={vertical ? pos + bandwidth / 2 : 12}
              y={vertical ? TOP_LABEL_BASELINE : pos + bandwidth / 2}
              textAnchor={vertical ? "middle" : undefined} dominantBaseline={vertical ? undefined : "middle"}
              fill={color} fontSize={12} fontWeight="bold" text={ann.label}
              background={ann.labelBackground ?? "none"} />}
          </g>
        )
      }

      // ── Unrecognized type ─────────────────────────────────────────────
      default:
        return null
    }
  }
}
