import { annotationNote } from "../text/annotationTextLayout"
import * as React from "react"
import Annotation from "../Annotation"
import { packEnclose } from "d3-hierarchy"
import {
  area as d3Area,
  curveBasis,
  curveCardinal,
  curveCatmullRom,
  curveLinear,
  curveMonotoneX,
  curveMonotoneY,
  curveStep,
  curveStepAfter,
  curveStepBefore,
} from "d3-shape"
import type { CurveFactory } from "d3-shape"
import type { AnnotationContext } from "../realtime/types"
import type { CurveType } from "../stream/types"
import { AnnotationLabel } from "../charts/shared/AnnotationLabel"
import { annotationActivationProps } from "../charts/shared/annotationActivation"
import type { Datum } from "../charts/shared/datumTypes"
import { forecastModel } from "../charts/shared/forecastModel"
import { trendGeometry } from "../charts/shared/statisticalAnnotationGeometry"
import {
  regressionPoints,
  regressionNumber,
} from "../charts/shared/leastSquaresRegression"
import { getMinMax } from "../charts/shared/minMax"
import {
  isInBounds,
  resolveAnchoredPosition,
  resolveX,
  resolveY,
} from "../charts/shared/annotationResolvers"

// These are the default rule cases that have no server-specific style or
// layout concerns. Keeping them separate from the full client dispatcher
// prevents server rendering from retaining client-only threshold, band, text,
// and category-highlight branches just to support these shared annotations.
const CURVE_FACTORIES: Partial<Record<CurveType, CurveFactory>> = {
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

/**
 * Render the built-in annotation types which use only an annotation context.
 * Static frame renderers invoke this after their theme-aware handlers, so one
 * fallback serves XY, ordinal, network, and geo output without importing the
 * complete live `createDefaultAnnotationRules` factory.
 */
export function renderStaticAnnotationFallback(
  ann: Datum,
  index: number,
  context: AnnotationContext,
): React.ReactNode | null {
  switch (ann.type) {
    case "enclose": {
      const coords = (ann.coordinates || [])
        .map((coordinate: Datum) => ({
          x: resolveX({ ...coordinate, type: "point" }, context),
          y: resolveY({ ...coordinate, type: "point" }, context),
          r: 1,
        }))
        .filter(
          (coordinate: { x: number | null; y: number | null; r: number }) =>
            coordinate.x != null && coordinate.y != null,
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
            fillOpacity={ann.fillOpacity ?? 0.1}
            stroke={ann.color || "var(--semiotic-text-secondary, #666)"}
            strokeWidth={1.5}
            strokeDasharray="4,2"
          />
          {ann.label && (
            <AnnotationLabel
              x={enclosure.x}
              y={enclosure.y - enclosure.r - padding - 4}
              textAnchor="middle"
              fill={ann.color || "var(--semiotic-text-secondary, #666)"}
              fontSize={12}
              text={ann.label}
              background={ann.labelBackground ?? "none"}
            />
          )}
        </g>
      )
    }

    case "rect-enclose": {
      const coords = (ann.coordinates || [])
        .map((coordinate: Datum) => ({
          x: resolveX({ ...coordinate, type: "point" }, context),
          y: resolveY({ ...coordinate, type: "point" }, context),
        }))
        .filter(
          (coordinate: { x: number | null; y: number | null }) =>
            coordinate.x != null && coordinate.y != null,
        ) as { x: number; y: number }[]
      if (coords.length < 2) return null
      const padding = ann.padding || 10
      const [rawMinX, rawMaxX] = getMinMax(coords.map((coordinate) => coordinate.x))
      const [rawMinY, rawMaxY] = getMinMax(coords.map((coordinate) => coordinate.y))
      const minX = rawMinX - padding
      const maxX = rawMaxX + padding
      const minY = rawMinY - padding
      const maxY = rawMaxY + padding
      return (
        <g key={`ann-${index}`}>
          <rect
            x={minX}
            y={minY}
            width={maxX - minX}
            height={maxY - minY}
            fill={ann.fill || "none"}
            fillOpacity={ann.fillOpacity ?? 0.1}
            stroke={ann.color || "var(--semiotic-text-secondary, #666)"}
            strokeWidth={1.5}
            strokeDasharray="4,2"
          />
          {ann.label && (
            <AnnotationLabel
              x={(minX + maxX) / 2}
              y={minY - 4}
              textAnchor="middle"
              fill={ann.color || "var(--semiotic-text-secondary, #666)"}
              fontSize={12}
              text={ann.label}
              background={ann.labelBackground ?? "none"}
            />
          )}
        </g>
      )
    }

    case "highlight": {
      const data = context.data || []
      const matches = typeof ann.filter === "function"
        ? data.filter(ann.filter)
        : ann.field && ann.value != null
          ? data.filter((datum) => datum[ann.field] === ann.value)
          : []
      const defaultStyle = {
        stroke: ann.color || "#f97316",
        strokeWidth: 2,
        fill: "none",
      }
      return (
        <g key={`ann-${index}`}>
          {matches.map((datum, matchIndex) => {
            const x = resolveX(datum, context)
            const y = resolveY(datum, context)
            if (x == null || y == null) return null
            const radius = typeof ann.r === "function" ? ann.r(datum) : (ann.r || 6)
            const style = typeof ann.style === "function"
              ? ann.style(datum)
              : (ann.style || defaultStyle)
            return <circle key={`hl-${matchIndex}`} cx={x} cy={y} r={radius} {...style} />
          })}
        </g>
      )
    }

    case "bracket": {
      const x = resolveX(ann, context)
      const y = resolveY(ann, context)
      return (
        <Annotation
          key={`ann-${index}`}
          noteData={{
            x: x ?? 0,
            y: y ?? 0,
            dx: ann.dx || 0,
            dy: ann.dy || 0,
            note: annotationNote(ann),
            type: "bracket",
            subject: {
              type: ann.bracketType || "curly",
              width: ann.width,
              height: ann.height,
              depth: ann.depth || 30,
            },
            color: ann.color,
          }}
        />
      )
    }

    case "trend": {
      const trendPoints = trendGeometry(ann, context)
      if (trendPoints.length < 2) return null
      const linePoints = trendPoints.map(([x, y]) => `${x},${y}`).join(" ")
      const color = ann.color || "#6366f1"
      const [labelX, labelY] = trendPoints[trendPoints.length - 1]
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
            <text x={labelX + 4} y={labelY - 4} fill={color} fontSize={11}>
              {ann.label}
            </text>
          )}
        </g>
      )
    }

    case "envelope": {
      const data = context.data || []
      if (data.length < 2) return null
      const xAccessor = context.xAccessor || "x"
      const scaleX = context.scales?.x ?? context.scales?.time
      const scaleY = context.scales?.y ?? context.scales?.value
      if (!scaleX || !scaleY) return null
      const upperAccessor = ann.upperAccessor || "upperBounds"
      const lowerAccessor = ann.lowerAccessor || "lowerBounds"
      const filter = ann.filter as ((datum: Datum) => boolean) | undefined
      const bounded = data
        .filter((datum) => {
          if (datum[upperAccessor] == null || datum[lowerAccessor] == null) return false
          return !filter || filter(datum)
        })
        .sort((left, right) => (left[xAccessor] as number) - (right[xAccessor] as number))
      if (bounded.length < 2) return null
      const curve = CURVE_FACTORIES[(context.curve || "linear") as CurveType] || curveLinear
      const path = d3Area<Datum>()
        .x((datum) => scaleX(datum[xAccessor]))
        .y0((datum) => scaleY(datum[lowerAccessor]))
        .y1((datum) => scaleY(datum[upperAccessor]))
        .curve(curve)(bounded)
      if (!path) return null
      const fill = ann.fill || "#6366f1"
      const last = bounded[bounded.length - 1]
      return (
        <g key={`ann-${index}`}>
          <path d={path} fill={fill} fillOpacity={ann.fillOpacity ?? 0.15} stroke="none" />
          {ann.label && (
            <text
              x={scaleX(last[xAccessor]) + 4}
              y={scaleY(last[upperAccessor]) - 4}
              fill={fill}
              fontSize={11}
            >
              {ann.label}
            </text>
          )}
        </g>
      )
    }

    case "anomaly-band": {
      const data = (context.data || []).filter((d) => !ann.filter || ann.filter(d))
      if (data.length < 2) return null
      const yAccessor = context.yAccessor || "y"
      const scaleX = context.scales?.x ?? context.scales?.time
      const scaleY = context.scales?.y ?? context.scales?.value
      if (!scaleX || !scaleY) return null
      const values = data
        .map((datum) => regressionNumber(datum[yAccessor]))
        .filter((value): value is number => value !== null)
      if (values.length < 2) return null
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length
      const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
      const standardDeviation = Math.sqrt(variance)
      const threshold = ann.threshold ?? 2
      const upper = mean + threshold * standardDeviation
      const lower = mean - threshold * standardDeviation
      const upperPixel = scaleY(upper)
      const lowerPixel = scaleY(lower)
      const fill = ann.fill || "#6366f1"
      const anomalyColor = ann.anomalyColor || "#ef4444"
      const radius = ann.anomalyRadius ?? 6
      const outliers = data.filter((datum) => {
        const value = regressionNumber(datum[yAccessor])
        return value != null && Math.abs(value - mean) > threshold * standardDeviation
      })
      return (
        <g key={`ann-${index}`}>
          {ann.showBand !== false && (
            <rect
              x={0}
              y={Math.min(upperPixel, lowerPixel)}
              width={context.width || 0}
              height={Math.abs(lowerPixel - upperPixel)}
              fill={fill}
              fillOpacity={ann.fillOpacity ?? 0.1}
            />
          )}
          {outliers.map((datum, outlierIndex) => {
            const x = resolveX(datum, context)
            const y = resolveY(datum, context)
            if (x == null || y == null) return null
            return (
              <circle
                key={`anomaly-${outlierIndex}`}
                cx={x}
                cy={y}
                r={radius}
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
              y={Math.min(upperPixel, lowerPixel) - 4}
              textAnchor="end"
              fill={fill}
              fontSize={11}
            >
              {ann.label}
            </text>
          )}
        </g>
      )
    }

    case "forecast": {
      const data = context.data || []
      const xAccessor = context.xAccessor || "x"
      const yAccessor = context.yAccessor || "y"
      const scaleX = context.scales?.x ?? context.scales?.time
      const scaleY = context.scales?.y ?? context.scales?.value
      if (!scaleX || !scaleY) return null
      const points = regressionPoints(data.map((d) => [d[xAccessor], d[yAccessor]]))
      const model = forecastModel(points, ann)
      if (!model) return null
      const { predict } = model
      const maxX = points[points.length - 1][0]
      const envelopePoints = model.forecast(ann.steps ?? 5)
      if (!envelopePoints.length) return null
      const envelopePath = d3Area<(typeof envelopePoints)[number]>()
        .x((point) => scaleX(point.x))
        .y0((point) => scaleY(point.lower))
        .y1((point) => scaleY(point.upper))(envelopePoints)
      if (!envelopePath) return null

      const centerLine = envelopePoints
        .map((point) => `${scaleX(point.x)},${scaleY(point.y)}`)
        .join(" ")
      const fill = ann.fill || "#6366f1"
      const stroke = ann.strokeColor || "#6366f1"
      const last = envelopePoints[envelopePoints.length - 1]
      return (
        <g key={`ann-${index}`}>
          <path d={envelopePath} fill={fill} fillOpacity={ann.fillOpacity ?? 0.15} stroke="none" />
          <polyline
            points={`${scaleX(maxX)},${scaleY(predict(maxX))} ${centerLine}`}
            fill="none"
            stroke={stroke}
            strokeWidth={ann.strokeWidth ?? 2}
            strokeDasharray={ann.strokeDasharray ?? "6,3"}
          />
          {ann.label && last && (
            <text x={scaleX(last.x) + 4} y={scaleY(last.y) - 4} fill={stroke} fontSize={11}>
              {ann.label}
            </text>
          )}
        </g>
      )
    }

    case "widget": {
      let x: number
      let y: number
      if (ann.px != null && ann.py != null) {
        x = ann.px
        y = ann.py
      } else {
        const position = resolveAnchoredPosition(ann, index, context)
        if (!position) return null
        x = position.x
        y = position.y
      }
      if (!isInBounds(x, y, context)) return null
      const width = ann.width ?? 32
      const height = ann.height ?? 32
      const content = ann.content ?? (
        <span style={{ fontSize: 18, cursor: "default" }} title={ann.label || "Info"}>
          {"ℹ️"}
        </span>
      )
      return (
        <foreignObject
          key={`ann-${index}`}
          x={x + (ann.dx ?? 0) - width / 2}
          y={y + (ann.dy ?? 0) - height / 2}
          width={width}
          height={height}
          style={{ overflow: "visible", pointerEvents: "auto" }}
        >
          <div
            {...annotationActivationProps(ann)}
            style={{
              width,
              height,
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

    default:
      return null
  }
}
