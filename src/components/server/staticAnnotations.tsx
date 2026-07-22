import type { Datum, DatumValue } from "../charts/shared/datumTypes"
/**
 * Static annotation rendering for server-side SVG.
 *
 * Supports common annotation types without DOM or React hooks.
 * Converts data coordinates to pixels using provided scales.
 */

import * as React from "react"
import Annotation from "../Annotation"
import type { SemioticTheme } from "../store/ThemeStore"
import { renderAnnotationPass } from "../charts/shared/annotationRules"
import type { AnnotationContext } from "../realtime/types"
import { annotationLayout, type AutoPlaceAnnotations } from "../recipes/annotationLayout"
import { AnnotationLabel, type AnnotationLabelBackground } from "../charts/shared/AnnotationLabel"
import { resolveSvgFill } from "../charts/shared/hatchFill"
import { filterAnnotationsByStatus } from "../ai/annotationProvenance"

const TOP_LABEL_BASELINE = 16
const TOP_THRESHOLD_LABEL_FLIP = 20

/** Resolve annotation color: explicit > theme annotation > theme text */
function resolveAnnotationColor(ann: Datum, theme: SemioticTheme): string {
  return ann.color || theme.colors.annotation || theme.colors.text
}

/**
 * Resolve an annotation's `labelBackground` into an {@link AnnotationLabel}
 * `background` for the server path. Server SVG is standalone, so CSS vars
 * won't resolve — bake the theme's resolved background color into the halo /
 * box fill (unless the caller overrode `fill`). `defaultType` is the
 * per-annotation-type default when `labelBackground` is unset.
 */
function ssrLabelBackground(
  ann: Datum,
  theme: SemioticTheme,
  defaultType: "halo" | "none",
): AnnotationLabelBackground {
  const lb = ann.labelBackground as AnnotationLabelBackground | undefined
  // A halo/box only aids legibility if it actually paints. The default light
  // theme's background is "transparent" (so charts compose over any page), but
  // baking that verbatim yields an invisible halo — a threshold label drawn
  // over a same-colored area (e.g. a semanticGradient fill) then vanishes. On
  // the client the halo is a CSS var that resolves to the real page background;
  // SSR is standalone, so fall back to the theme's opaque `surface` (the "paper"
  // behind the plot) whenever the background is transparent/unset.
  const rawBg = theme.colors.background
  const bg = rawBg && rawBg !== "transparent" ? rawBg : (theme.colors.surface || rawBg)
  if (lb === undefined) return defaultType === "none" ? "none" : { type: "halo", fill: bg }
  if (lb === false || lb === "none") return "none"
  if (lb === true || lb === "halo") return { type: "halo", fill: bg }
  if (lb === "box") return { type: "box", fill: bg }
  return { fill: bg, ...lb }
}

interface AnnotationScales {
  x?: AnnotationScale
  y?: AnnotationScale
  /** For ordinal charts: band scale */
  o?: { (v: string): number | undefined; bandwidth?: () => number }
  /** For ordinal charts: value scale */
  r?: (v: number) => number
  /**
   * For geo charts: projects [lon, lat] → [x, y] pixel coords. Set by
   * `renderGeoFrame` from the resolved `GeoPipelineStore` projection.
   * Annotations that carry `coordinates: [lon, lat]` resolve through this.
   */
  geoProjection?: (coords: [number, number]) => [number, number] | null
}

type AnnotationScale = {
  bivarianceHack(value: DatumValue): number
}["bivarianceHack"] & { domain?: () => DatumValue[] }

interface AnnotationLayout {
  width: number
  height: number
}

export interface StaticAnnotationConfig {
  annotations?: Datum[]
  autoPlaceAnnotations?: AutoPlaceAnnotations
  scales: AnnotationScales
  layout: AnnotationLayout
  theme: SemioticTheme
  /** ID prefix for multi-chart documents */
  idPrefix?: string
  xAccessor?: string
  yAccessor?: string
  /** Ordinal projection — determines whether r maps to x or y */
  projection?: "vertical" | "horizontal" | "radial"
  /**
   * Custom SVG annotation renderer — same contract as the client
   * `svgAnnotationRules` frame prop. When present, each annotation is
   * offered to this rule first; returning `null`/`undefined` falls through
   * to the built-in static type handlers. Without this, custom middle-
   * marker / bulb overlays (and any other non-built-in annotation type)
   * silently vanished from `renderChart` SVG.
   */
  svgAnnotationRules?: (
    annotation: Datum,
    index: number,
    context: AnnotationContext,
  ) => React.ReactNode
  /** Chart data forwarded into the AnnotationContext for custom rules. */
  annotationData?: Datum[]
}

/**
 * Resolve the (x, y) pixel for an annotation. Order:
 *   1. `coordinates: [lon, lat]` + `geoProjection` (geo frame)
 *   2. `x`/`y` data values + `scales.x`/`scales.y` (XY/ordinal frames)
 *   3. accessor lookup on the annotation
 *   4. raw `x`/`y` numbers as pixel passthrough (network frame, or any
 *      annotation pre-projected to pixel coords by the caller)
 */
function resolveCoords(
  ann: Datum,
  scales: AnnotationScales,
  xAccessor?: string,
  yAccessor?: string
): { x: number | null; y: number | null } {
  // Geo projection first — coordinates is the documented field for geo
  // annotations and bypasses the x/y scale entirely.
  if (Array.isArray(ann.coordinates) && ann.coordinates.length >= 2 && scales.geoProjection) {
    const projected = scales.geoProjection([ann.coordinates[0], ann.coordinates[1]])
    if (projected) return { x: projected[0], y: projected[1] }
  }

  return { x: resolveXPixel(ann, scales, xAccessor), y: resolveYPixel(ann, scales, yAccessor) }
}

function resolveXPixel(
  ann: Datum,
  scales: AnnotationScales,
  xAccessor?: string
): number | null {
  if (ann.x != null && scales.x) return scales.x(ann.x)
  if (xAccessor && ann[xAccessor] != null && scales.x) return scales.x(ann[xAccessor])
  // Pixel passthrough for frames without a continuous x scale (e.g. network)
  // or annotations that have already been projected by the caller.
  if (typeof ann.x === "number") return ann.x
  return null
}

function resolveYPixel(
  ann: Datum,
  scales: AnnotationScales,
  yAccessor?: string
): number | null {
  if (ann.y != null && scales.y) return scales.y(ann.y)
  if (yAccessor && ann[yAccessor] != null && scales.y) return scales.y(ann[yAccessor])
  if (typeof ann.y === "number") return ann.y
  return null
}

/**
 * Render annotations as static SVG elements.
 */
export function renderStaticAnnotations(config: StaticAnnotationConfig): React.ReactNode {
  const { annotations: rawAnnotations } = config
  if (!rawAnnotations || rawAnnotations.length === 0) return null
  // Match describeChart/nav tree: hide retracted & superseded notes by default
  // so SSR/MCP SVG does not paint editorial dead weight the text layers omit.
  const filtered = filterAnnotationsByStatus(rawAnnotations)

  // Mirror GeoSVGOverlay: when a geo projection is available, project
  // `coordinates: [lon, lat]` onto pixel `x`/`y` *before* custom rules run so
  // the same svgAnnotationRules body works on CSR and SSR (client uses
  // identity pixel scales after this projection step).
  const geoProject = config.scales.geoProjection
  const annotations = geoProject
    ? filtered.map((annotation) => {
        if (!Array.isArray(annotation.coordinates) || annotation.coordinates.length < 2) {
          return annotation
        }
        const projected = geoProject([
          Number(annotation.coordinates[0]),
          Number(annotation.coordinates[1]),
        ])
        return projected
          ? { ...annotation, x: projected[0], y: projected[1] }
          : annotation
      })
    : filtered

  // Geo frames that only have a projection (no Cartesian x/y scale) feed
  // identity pixel scales into the annotation context so custom rules can do
  // `context.scales.x(ann.x)` after the pre-project step above — matching
  // GeoSVGOverlay. Non-geo frames keep their real data-space scales.
  const isGeoOnly = Boolean(geoProject) && !config.scales.x && !config.scales.y
  const identity = (value: unknown) => Number(value)
  const scaleX = config.scales.x ?? (isGeoOnly ? identity : undefined)
  const scaleY = config.scales.y ?? (isGeoOnly ? identity : undefined)

  // Infer frame family the way the client overlays advertise it so custom
  // `svgAnnotationRules` that branch on `context.frameType` stay CSR/SSR
  // parity-safe. Ordinal is explicit via `config.projection`; geo reuses the
  // xy rule set (GeoSVGOverlay sets frameType:"xy"); bare network has no
  // Cartesian scales and no geo projection. Never advertise a default
  // ordinal `projection` of "vertical" on non-ordinal frames.
  const frameType: AnnotationContext["frameType"] = config.projection
    ? "ordinal"
    : geoProject || config.scales.x || config.scales.y
      ? "xy"
      : "network"
  const projection: AnnotationContext["projection"] = config.projection
    ? (config.projection === "horizontal" ? "horizontal" : "vertical")
    : undefined

  // Scales bag matches the client SVG overlay contract so custom
  // `svgAnnotationRules` can call `context.scales.x(value)` the same way.
  // Cast: static scales are structurally compatible with d3 ScaleLinear /
  // ScaleBand but carry a slightly wider domain type.
  const annotationContext: AnnotationContext = {
    scales: {
      x: scaleX,
      y: scaleY,
      time: scaleX,
      value: scaleY,
      o: config.scales.o,
      ...(geoProject ? { geoProjection: geoProject } : {}),
    } as AnnotationContext["scales"],
    width: config.layout.width,
    height: config.layout.height,
    xAccessor: config.xAccessor,
    yAccessor: config.yAccessor,
    data: config.annotationData,
    frameType,
    ...(projection ? { projection } : {}),
  }

  const layoutAnnotations = config.autoPlaceAnnotations
    ? annotationLayout({
        annotations,
        context: annotationContext,
        ...(typeof config.autoPlaceAnnotations === "object" ? config.autoPlaceAnnotations : {}),
      })
    : annotations

  // Shared dispatch with the client SVG overlays: custom rules first, then
  // built-in static handlers, then emphasis hierarchy.
  const elements = renderAnnotationPass(
    layoutAnnotations,
    (ann, i) => renderAnnotation(ann, i, config),
    config.svgAnnotationRules,
    annotationContext,
  )
  const pfx = config.idPrefix ? `${config.idPrefix}-` : ""
  return elements.length > 0 ? <g id={`${pfx}annotations`} className="semiotic-annotations">{elements}</g> : null
}

function renderAnnotation(
  ann: Datum,
  index: number,
  config: StaticAnnotationConfig,
): React.ReactNode | null {
  const { scales, layout, theme, xAccessor, yAccessor } = config
  switch (ann.type) {
    case "y-threshold": {
      const value = ann.value
      if (value == null) return null
      const color = resolveAnnotationColor(ann, theme)
      const label = ann.label
      const labelPos = ann.labelPosition || "right"
      const dasharray = ann.strokeDasharray || "6,4"
      const lineWidth = ann.strokeWidth ?? 1.5

      // For horizontal ordinal charts, r maps to x — draw a vertical threshold line
      if (config.projection === "horizontal" && scales.r) {
        const px = scales.r(value)
        if (px == null) return null
        return (
          <g key={`ann-ythresh-${index}`} opacity={ann.opacity}>
            <line x1={px} y1={0} x2={px} y2={layout.height}
              stroke={color} strokeWidth={lineWidth} strokeDasharray={dasharray} />
            {label && (
              <AnnotationLabel x={px + 4} y={TOP_LABEL_BASELINE} textAnchor="start"
                fontSize={theme.typography.tickSize} fill={color} fontFamily={theme.typography.fontFamily}
                text={label} background={ssrLabelBackground(ann, theme, "halo")} />
            )}
          </g>
        )
      }

      // Default: horizontal line (vertical ordinal or XY)
      const py = scales.y ? scales.y(value) : scales.r ? scales.r(value) : null
      if (py == null) return null
      return (
        <g key={`ann-ythresh-${index}`}>
          <line
            x1={0} y1={py} x2={layout.width} y2={py}
            stroke={color} strokeWidth={lineWidth} strokeDasharray={dasharray}
          />
          {label && (
            <AnnotationLabel
              x={labelPos === "left" ? 4 : labelPos === "center" ? layout.width / 2 : layout.width - 4}
              y={py < TOP_THRESHOLD_LABEL_FLIP
                ? Math.min(layout.height - 4, py + TOP_LABEL_BASELINE)
                : py - 6}
              textAnchor={labelPos === "left" ? "start" : labelPos === "center" ? "middle" : "end"}
              fontSize={theme.typography.tickSize}
              fill={color}
              fontFamily={theme.typography.fontFamily}
              text={label}
              background={ssrLabelBackground(ann, theme, "halo")}
            />
          )}
        </g>
      )
    }

    case "x-threshold": {
      const value = ann.value
      if (value == null) return null
      // For horizontal ordinal charts (bar/swimlane/etc.), the value axis IS
      // the x axis, so `x-threshold` must resolve against `r`, not the
      // (always-absent, for ordinal frames) XY-style `scales.x` — this
      // mirrors the CSR contract (`OrdinalSVGOverlay` maps
      // `context.scales.x` to the r-scale when `projection === "horizontal"`)
      // and the equivalent horizontal branch on `y-threshold` above.
      const px = config.projection === "horizontal" && scales.r
        ? scales.r(value)
        : scales.x ? scales.x(value) : null
      if (px == null) return null
      const color = resolveAnnotationColor(ann, theme)
      const label = ann.label
      const labelPos = ann.labelPosition || "top"
      const dasharray = ann.strokeDasharray || "6,4"
      const lineWidth = ann.strokeWidth ?? 1.5
      return (
        <g key={`ann-xthresh-${index}`} opacity={ann.opacity}>
          <line
            x1={px} y1={0} x2={px} y2={layout.height}
            stroke={color} strokeWidth={lineWidth} strokeDasharray={dasharray}
          />
          {label && (
            <AnnotationLabel
              x={px > layout.width * 0.6 ? px - 4 : px + 4}
              y={labelPos === "bottom" ? layout.height - 4 : labelPos === "center" ? layout.height / 2 : TOP_LABEL_BASELINE}
              textAnchor={px > layout.width * 0.6 ? "end" : "start"}
              fontSize={theme.typography.tickSize}
              fill={color}
              fontFamily={theme.typography.fontFamily}
              text={label}
              background={ssrLabelBackground(ann, theme, "halo")}
            />
          )}
        </g>
      )
    }

    case "band": {
      const yDomain = scales.y?.domain?.()
      // A null/omitted bound extends to the axis extent on that side
      // (y0 → domain min, y1 → domain max) rather than skipping the band.
      const y0Value = ann.y0 ?? yDomain?.[0]
      const y1Value = ann.y1 ?? yDomain?.[1]
      const y0 = y0Value != null && scales.y ? scales.y(y0Value) : null
      const y1 = y1Value != null && scales.y ? scales.y(y1Value) : null
      if (y0 == null || y1 == null) return null
      const top = Math.min(y0, y1)
      const height = Math.abs(y1 - y0)
      // Region fill may be a declarative HatchFill → inline <pattern>.
      const bandFill = resolveSvgFill(ann.fill || resolveAnnotationColor(ann, theme), `ssr-band-${index}`)
      // Base fill alpha from `fillOpacity` (matches the client renderer);
      // `opacity` is the group/decay alpha so freshness dimming composes.
      const fillOpacity = ann.fillOpacity ?? 0.1
      return (
        <g key={`ann-band-${index}`} opacity={ann.opacity}>
          {bandFill.def && <defs>{bandFill.def}</defs>}
          <rect
            x={0} y={top} width={layout.width} height={height}
            fill={bandFill.fill} fillOpacity={fillOpacity}
          />
          {ann.label && (
            <AnnotationLabel
              x={layout.width - 4} y={Math.max(top, 0) + TOP_LABEL_BASELINE}
              textAnchor="end"
              fontSize={theme.typography.tickSize}
              fill={ann.color || resolveAnnotationColor(ann, theme)}
              fontFamily={theme.typography.fontFamily}
              fontWeight="bold"
              text={ann.label}
              background={ssrLabelBackground(ann, theme, "halo")}
            />
          )}
        </g>
      )
    }

    case "x-band": {
      const xDomain = scales.x?.domain?.()
      // A null/omitted bound extends to the axis extent on that side
      // (x0 → domain min, x1 → domain max) rather than skipping the band.
      const x0Value = ann.x0 ?? xDomain?.[0]
      const x1Value = ann.x1 ?? xDomain?.[1]
      const x0 = x0Value != null && scales.x ? scales.x(x0Value) : null
      const x1 = x1Value != null && scales.x ? scales.x(x1Value) : null
      if (x0 == null || x1 == null) return null
      const left = Math.min(x0, x1)
      const width = Math.abs(x1 - x0)
      const xBandFill = resolveSvgFill(ann.fill || resolveAnnotationColor(ann, theme), `ssr-xband-${index}`)
      const fillOpacity = ann.fillOpacity ?? 0.1
      return (
        <g key={`ann-xband-${index}`} opacity={ann.opacity}>
          {xBandFill.def && <defs>{xBandFill.def}</defs>}
          <rect
            x={left} y={0} width={width} height={layout.height}
            fill={xBandFill.fill} fillOpacity={fillOpacity}
          />
          {ann.label && (
            <AnnotationLabel
              x={left + 4} y={TOP_LABEL_BASELINE}
              textAnchor="start"
              fontSize={theme.typography.tickSize}
              // Match the client x-band label default (`--semiotic-primary`),
              // not the generic annotation text color — otherwise an unlabeled-
              // color x-band reads dark in SSR but primary-tinted on canvas.
              fill={ann.color || theme.colors.primary || resolveAnnotationColor(ann, theme)}
              fontFamily={theme.typography.fontFamily}
              fontWeight="bold"
              text={ann.label}
              background={ssrLabelBackground(ann, theme, "halo")}
            />
          )}
        </g>
      )
    }

    case "category-highlight": {
      if (ann.category == null || !scales.o) return null
      const oVal = scales.o(String(ann.category))
      if (oVal == null) return null
      const bandwidth = scales.o.bandwidth ? scales.o.bandwidth() : 40
      const color = resolveAnnotationColor(ann, theme)
      const opacity = ann.opacity ?? 0.1
      const label = ann.label
      // Horizontal ordinal: highlight across Y band
      if (config.projection === "horizontal") {
        return (
          <g key={`ann-cathighlight-${index}`}>
            <rect
              x={0} y={oVal} width={layout.width} height={bandwidth}
              fill={color} opacity={opacity}
            />
            {label && (
              <AnnotationLabel
                x={12} y={oVal + bandwidth / 2}
                dominantBaseline="middle"
                fill={color}
                fontSize={theme.typography.tickSize}
                fontWeight="bold"
                fontFamily={theme.typography.fontFamily}
                text={label}
                background={ssrLabelBackground(ann, theme, "none")}
              />
            )}
          </g>
        )
      }
      return (
        <g key={`ann-cathighlight-${index}`}>
          <rect
            x={oVal} y={0} width={bandwidth} height={layout.height}
            fill={color} opacity={opacity}
          />
          {label && (
            <AnnotationLabel
              x={oVal + bandwidth / 2} y={TOP_LABEL_BASELINE}
              textAnchor="middle"
              fill={color}
              fontSize={theme.typography.tickSize}
              fontWeight="bold"
              fontFamily={theme.typography.fontFamily}
              text={label}
              background={ssrLabelBackground(ann, theme, "none")}
            />
          )}
        </g>
      )
    }

    case "label":
    case "callout":
    case "callout-circle":
    case "callout-rect":
    case "text": {
      // Use resolveCoords so geo annotations with `coordinates: [lon, lat]`
      // and network annotations with raw pixel x/y both flow through.
      const { x: px, y: py } = resolveCoords(ann, scales, xAccessor, yAccessor)
      if (px == null || py == null) return null
      const isText = ann.type === "text"
      const dx = ann.dx ?? (isText ? 0 : 30)
      const dy = ann.dy ?? (isText ? 0 : -30)
      const color = ann.color || theme.colors.text
      if (!isText) {
        const renderedType = ann.type === "callout" ? "callout-circle" : ann.type
        const subject =
          renderedType === "callout-circle"
            ? { radius: ann.radius ?? 12, radiusPadding: ann.radiusPadding }
            : renderedType === "callout-rect"
              ? { width: ann.width, height: ann.height }
              : undefined
        return (
          <Annotation
            key={`ann-label-${index}`}
            noteData={{
              x: px,
              y: py,
              dx,
              dy,
              note: {
                label: ann.label,
                title: ann.title,
                wrap: ann.wrap || 120,
              },
              type: renderedType,
              ...(subject ? { subject } : {}),
              connector: ann.connector || { end: "arrow" },
              color,
              disable: ann.disable,
              opacity: ann.opacity,
              strokeDasharray: ann.strokeDasharray,
              className: ann.className,
            }}
          />
        )
      }
      return (
        <g key={`ann-label-${index}`}>
          <text
            x={px + dx}
            y={py + dy}
            textAnchor={ann.textAnchor || "start"}
            fontSize={ann.fontSize || theme.typography.labelSize}
            fill={color}
            fontFamily={theme.typography.fontFamily}
            fontWeight={ann.fontWeight}
            opacity={ann.opacity}
            strokeDasharray={ann.strokeDasharray}
          >
            {ann.label || ann.title}
          </text>
        </g>
      )
    }

    case "highlight": {
      // Highlight matching data points — skip in static render (no data refs)
      return null
    }

    default:
      return null
  }
}
