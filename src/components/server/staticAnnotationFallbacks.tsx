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
import { loess } from "../charts/shared/loess"
import {
  confidenceZScore,
  fitLinearForForecast,
  forecastIntervalStats,
  linearRegression,
  polynomialRegression,
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
            note: {
              label: ann.label,
              title: ann.title,
              wrap: ann.wrap || 120,
            },
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
      const data = context.data || []
      if (data.length < 2) return null
      const xAccessor = context.xAccessor || "x"
      const yAccessor = context.yAccessor || "y"
      const isOrdinal = context.frameType === "ordinal"
      const isHorizontal = context.projection === "horizontal"
      const categoricalAccessor = isOrdinal ? xAccessor : null
      const valueAccessor = isOrdinal ? yAccessor : null

      let points: [number, number][]
      const categoryNames: string[] = []
      const indexByCategory = new Map<string, number>()
      if (isOrdinal && categoricalAccessor && valueAccessor) {
        for (const datum of data) {
          const category = datum[categoricalAccessor]
          if (category == null) continue
          const key = String(category)
          if (!indexByCategory.has(key)) {
            indexByCategory.set(key, categoryNames.length)
            categoryNames.push(key)
          }
        }
        points = data
          .map((datum) => {
            const category = datum[categoricalAccessor]
            const value = datum[valueAccessor]
            if (category == null || value == null) return null
            const categoryIndex = indexByCategory.get(String(category))
            return categoryIndex != null ? ([categoryIndex, +value] as [number, number]) : null
          })
          .filter((point): point is [number, number] => point !== null)
      } else {
        points = data
          .map((datum) => [datum[xAccessor], datum[yAccessor]] as [number, number])
          .filter((point) => point[0] != null && point[1] != null)
      }
      if (points.length < 2) return null

      const scaleX = context.scales?.x ?? context.scales?.time
      const scaleY = context.scales?.y ?? context.scales?.value
      if (!scaleX || !scaleY) return null
      const interpolateBandScale = (bandScale: (key: string) => number) => (index: number) => {
        const lowerIndex = Math.max(0, Math.floor(index))
        const upperIndex = Math.min(categoryNames.length - 1, lowerIndex + 1)
        const fraction = index - lowerIndex
        const lower = bandScale(categoryNames[lowerIndex])
        const upper = bandScale(categoryNames[upperIndex])
        return lower + (upper - lower) * fraction
      }
      const sx = scaleX as (key: string | number | Date) => number
      const sy = scaleY as (key: string | number | Date) => number
      let project: (x: number, y: number) => [number, number]
      if (isOrdinal) {
        if (isHorizontal) {
          const projectCategory = interpolateBandScale(sy)
          project = (categoryIndex, value) => [sx(value), projectCategory(categoryIndex)]
        } else {
          const projectCategory = interpolateBandScale(sx)
          project = (categoryIndex, value) => [projectCategory(categoryIndex), sy(value)]
        }
      } else {
        project = (x, y) => [sx(x), sy(y)]
      }

      const method = ann.method || "linear"
      const trendPoints = method === "loess"
        ? loess(points, ann.bandwidth ?? 0.3)
        : (method === "polynomial"
          ? polynomialRegression(points, ann.order || 2)
          : linearRegression(points)).points
      const linePoints = trendPoints
        .map(([x, y]) => {
          const [pixelX, pixelY] = project(x, y)
          return `${pixelX},${pixelY}`
        })
        .join(" ")
      const color = ann.color || "#6366f1"
      const last = trendPoints[trendPoints.length - 1]
      const [labelX, labelY] = project(last[0], last[1])
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
      const data = context.data || []
      if (data.length < 2) return null
      const yAccessor = context.yAccessor || "y"
      const scaleX = context.scales?.x ?? context.scales?.time
      const scaleY = context.scales?.y ?? context.scales?.value
      if (!scaleX || !scaleY) return null
      const values = data
        .map((datum) => datum[yAccessor] as number)
        .filter((value) => value != null && isFinite(value))
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
        const value = datum[yAccessor] as number
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
      if (data.length < 3) return null
      const xAccessor = context.xAccessor || "x"
      const yAccessor = context.yAccessor || "y"
      const scaleX = context.scales?.x ?? context.scales?.time
      const scaleY = context.scales?.y ?? context.scales?.value
      if (!scaleX || !scaleY) return null
      const points = data
        .map((datum) => [datum[xAccessor], datum[yAccessor]] as [number, number])
        .filter((point) => point[0] != null && point[1] != null && isFinite(point[0]) && isFinite(point[1]))
        .sort((left, right) => left[0] - right[0])
      if (points.length < 3) return null
      let predict: (x: number) => number
      if (ann.method === "polynomial") {
        const coefficients: number[] = polynomialRegression(points, ann.order || 2).equation
        predict = (x) => coefficients.reduce((sum, coefficient, degree) => (
          sum + coefficient * Math.pow(x, degree)
        ), 0)
      } else {
        const fit = fitLinearForForecast(points)
        if (!fit) return null
        predict = fit
      }
      const { se, meanX, ssX } = forecastIntervalStats(points, predict)
      const count = points.length
      const confidence = ann.confidence ?? 0.95
      const zScore = confidenceZScore(confidence)
      const minX = points[0][0]
      const maxX = points[count - 1][0]
      const step = (maxX - minX) / Math.max(count - 1, 1)
      const envelopePoints = Array.from({ length: ann.steps ?? 5 }, (_, offset) => {
        const x = maxX + (offset + 1) * step
        const center = predict(x)
        const interval = se * Math.sqrt(
          1 + 1 / count + (ssX > 0 ? (x - meanX) ** 2 / ssX : 0),
        ) * zScore
        return { x, center, upper: center + interval, lower: center - interval }
      })
      const upperPath = envelopePoints
        .map((point) => `${scaleX(point.x)},${scaleY(point.upper)}`)
        .join(" L")
      const lowerPath = envelopePoints
        .slice()
        .reverse()
        .map((point) => `${scaleX(point.x)},${scaleY(point.lower)}`)
        .join(" L")
      const centerLine = envelopePoints
        .map((point) => `${scaleX(point.x)},${scaleY(point.center)}`)
        .join(" ")
      const fill = ann.fill || "#6366f1"
      const stroke = ann.strokeColor || "#6366f1"
      const last = envelopePoints[envelopePoints.length - 1]
      return (
        <g key={`ann-${index}`}>
          <path d={`M${upperPath} L${lowerPath} Z`} fill={fill} fillOpacity={ann.fillOpacity ?? 0.15} stroke="none" />
          <polyline
            points={`${scaleX(maxX)},${scaleY(predict(maxX))} ${centerLine}`}
            fill="none"
            stroke={stroke}
            strokeWidth={ann.strokeWidth ?? 2}
            strokeDasharray={ann.strokeDasharray ?? "6,3"}
          />
          {ann.label && last && (
            <text x={scaleX(last.x) + 4} y={scaleY(last.center) - 4} fill={stroke} fontSize={11}>
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
