import { resolveHiddenAxisMargins } from "../legendLayout"
import { scopeSvgIdentifiers } from "../shared/svgIdentifiers"
import type { Datum } from "../charts/shared/datumTypes"
import { escapeXmlAttribute, insertSvgRootContent, mapSvgAttributes } from "../shared/svgRoot"
import { renderedSvgDimensions } from "./svgSizing"
import {
  serializeArtifactContract,
  type PortableArtifactContract
} from "../artifact/serialization"
import {
  ARTIFACT_CONTRACT_VERSION,
  type ArtifactContract
} from "../artifact/types"
import { compareArtifactIdentity } from "../artifact/identity"
import { renderedSceneHash } from "../evidence/renderedSceneHash"
import { isChartMode, resolveChartMode } from "../charts/shared/chartMode"
import { chartPrimarySize, hasFixedModeSize } from "../charts/shared/chartSizeDefaults"
import { applySemanticViability } from "../ai/semanticViability"
import { normalizePartialMargin, type PartialMargin } from "../types/marginType"
/**
 * Server-side rendering of Semiotic charts to standalone SVG strings.
 * Family implementations live in staticXY / staticOrdinal / staticNetwork /
 * staticGeo / staticPhysics; shared chrome in staticSVGChrome.
 */
import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import type { StreamXYFrameProps } from "../stream/types"
import type { StreamNetworkFrameProps } from "../stream/networkTypes"
import type { StreamOrdinalFrameProps } from "../stream/ordinalTypes"
import type { StreamGeoFrameProps } from "../stream/geoTypes"
import { CHART_CONFIGS } from "./serverChartConfigs"
import { resolveTheme } from "./themeResolver"
import {
  buildEvidence,
  type EvidenceSink,
  type RenderEvidence
} from "./renderEvidence"
import {
  chartUID,
  type ThemeAwareProps,
  type StaticFrameProps,
  type FrameType
} from "./staticSVGChrome"
import { renderStreamXYFrame } from "./staticXY"
import { renderOrdinalFrame } from "./staticOrdinal"
import { renderNetworkFrame } from "./staticNetwork"
import { renderGeoFrame } from "./staticGeo"
import {
  renderPhysicsFrame,
  type StaticPhysicsFrameProps
} from "./staticPhysics"
import {
  renderValueChart,
  VALUE_RENDERERS,
  type ValueChartName
} from "./staticValue"
import {
  composeDashboard,
  type DashboardChart,
  type RenderDashboardOptions
} from "./renderDashboard"

export type {
  DashboardChart,
  DashboardLayout,
  RenderDashboardOptions
} from "./renderDashboard"

export function renderToStaticSVG(
  frameType: FrameType,
  props: StaticFrameProps
): string {
  const prefix = chartUID(props)
  props = { ...props, _idPrefix: prefix }
  let svg: string
  switch (frameType) {
    case "xy":
      svg = renderStreamXYFrame(props as StreamXYFrameProps & ThemeAwareProps)
      break
    case "ordinal":
      svg = renderOrdinalFrame(
        props as StreamOrdinalFrameProps & ThemeAwareProps
      )
      break
    case "network":
      svg = renderNetworkFrame(
        props as StreamNetworkFrameProps & ThemeAwareProps
      )
      break
    case "geo":
      svg = renderGeoFrame(props as StreamGeoFrameProps & ThemeAwareProps)
      break
    case "physics":
      svg = renderPhysicsFrame(
        props as StaticPhysicsFrameProps & ThemeAwareProps
      )
      break
    default:
      throw new Error(
        `Unknown frame type: ${frameType}. Must be "xy", "ordinal", "network", "geo", or "physics".`
      )
  }
  return scopeSvgIdentifiers(svg, prefix)
}

export function renderXYToStaticSVG(
  props: StreamXYFrameProps & ThemeAwareProps
): string {
  return renderToStaticSVG("xy", props)
}

export function renderOrdinalToStaticSVG(
  props: StreamOrdinalFrameProps & ThemeAwareProps
): string {
  return renderToStaticSVG("ordinal", props)
}

export function renderNetworkToStaticSVG(
  props: StreamNetworkFrameProps & ThemeAwareProps
): string {
  return renderToStaticSVG("network", props)
}

export function renderGeoToStaticSVG(
  props: StreamGeoFrameProps & ThemeAwareProps
): string {
  return renderToStaticSVG("geo", props)
}

// ── HOC-level renderChart API ─────────────────────────────────────────

/**
 * Chart component names renderable via `renderChart()`. Derived from the
 * registry so adding a chart to `CHART_CONFIGS` also widens this union.
 */
export type RenderChartName = keyof typeof CHART_CONFIGS | ValueChartName

export interface RenderChartOptions {
  /** Output format — currently only "svg" is synchronous */
  format?: "svg"
  /**
   * Decimal places for SVG geometry serialization. This opt-in postprocess
   * rounds numeric SVG attributes, path data, transforms, and point lists;
   * text nodes, IDs, and arbitrary CSS/style strings are left untouched.
   * Values are clamped to the practical 0–8 range. Transform coefficients
   * and angles retain at least 8 decimals to prevent distance-dependent drift.
   * Opacity is preserved; stroke widths and dashes retain at least 2 decimals.
   */
  precision?: number
  /** Preserve an interpretation contract in machine-readable render evidence. */
  artifactContract?: PortableArtifactContract
}

const PRECISION_ATTRIBUTES = new Set([
  "d",
  "transform",
  "gradientTransform",
  "patternTransform",
  "points",
  "viewBox",
  "x",
  "y",
  "x1",
  "x2",
  "y1",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "width",
  "height",
  "dx",
  "dy",
  "offset",
  "startOffset",
  "stroke-width",
  "stroke-dasharray",
  "stroke-dashoffset",
  "font-size",
  "letter-spacing"
])
const SVG_NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi

function resolvedPrecision(precision: number | undefined): number | undefined {
  if (!Number.isFinite(precision)) return undefined
  return Math.max(0, Math.min(8, Math.floor(precision as number)))
}

function roundSvgNumber(token: string, precision: number): string {
  const value = Number(token)
  if (!Number.isFinite(value)) return token
  const factor = 10 ** precision
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor
  return String(rounded)
}

/**
 * Round the numeric tokens in an SVG geometry value without changing its
 * token boundaries. Compact path syntax permits adjacent numbers such as
 * `M.4.5`; after rounding those to integers, concatenating `01` would turn a
 * coordinate pair into one number. A whitespace separator is legal in path,
 * transform, and point-list grammars, so retain the original gaps and insert
 * one only where the source deliberately used an implicit numeric boundary.
 */
function roundSvgGeometryValue(value: string, precision: number, linearCount = 0, pathData = false): string {
  const numberPattern = new RegExp(SVG_NUMBER.source, SVG_NUMBER.flags)
  let roundedValue = ""
  let cursor = 0
  let hasPreviousNumber = false
  let match: RegExpExecArray | null
  let index = 0
  let arcCommand = false
  let parameterIndex = 0

  while ((match = numberPattern.exec(value))) {
    const gap = value.slice(cursor, match.index)
    if (pathData && /[a-df-z]/i.test(gap)) {
      arcCommand = /a[^a-df-z]*$/i.test(gap)
      parameterIndex = 0
    }
    // Arc flags consume one character even when adjacent to the next flag
    // or endpoint: A10 10 0 0110 10 means flags 0,1 and endpoint 10,10.
    let token = match[0]
    const arcParameter = parameterIndex++ % 7
    if (arcCommand && (arcParameter === 3 || arcParameter === 4)) {
      token = token[0]
      if (token !== "0" && token !== "1") return value
      numberPattern.lastIndex = match.index + 1
    }
    if (hasPreviousNumber && gap.length === 0) roundedValue += " "
    else roundedValue += gap
    roundedValue += roundSvgNumber(token, index++ < linearCount ? Math.max(8, precision) : precision)
    cursor = match.index + token.length
    hasPreviousNumber = true
  }

  return roundedValue + value.slice(cursor)
}

/** Apply the documented renderChart precision contract to SVG geometry only. */
export function serializeSvgPrecision(svg: string, precision?: number): string {
  const resolved = resolvedPrecision(precision)
  if (resolved === undefined) return svg
  return mapSvgAttributes(svg, (name, value) => {
    if (
      !PRECISION_ATTRIBUTES.has(name) ||
      /\b(?:var|calc|url)\(/i.test(value)
    ) {
      return undefined
    }
    if (name === "transform" || name === "gradientTransform" || name === "patternTransform") {
      return value.replace(/(matrix|translate|scale|rotate|skewX|skewY)\(([^)]*)\)/g, (_all, operation: string, args: string) => {
        const linearCount = operation === "matrix" ? 4 : operation === "scale" ? 2 : operation === "translate" ? 0 : 1
        return `${operation}(${roundSvgGeometryValue(args, resolved, linearCount)})`
      })
    }
    const paintPrecision = name.startsWith("stroke-") ? Math.max(2, resolved) : resolved
    return roundSvgGeometryValue(value, paintPrecision, 0, name === "d")
  })
}

const COMMON_FRAME_PROP_KEYS = [
  "showAxes",
  "axes",
  "axisExtent",
  "xLabel",
  "yLabel",
  "yLabelRight",
  "categoryLabel",
  "valueLabel",
  "xFormat",
  "yFormat",
  "categoryFormat",
  "valueFormat",
  "tickFormatTime",
  "tickFormatValue",
  "xScaleType",
  "yScaleType",
  "xExtent",
  "yExtent",
  "rExtent",
  "oExtent",
  "extentPadding",
  "hoverRadius",
  "scalePadding",
  "sizeRange",
  "innerRadius",
  "centerContent",
  "curve",
  "gradientFill",
  "lineGradient",
  "lineStyle",
  "pointStyle",
  "areaStyle",
  "barStyle",
  "waterfallStyle",
  "swarmStyle",
  "pieceStyle",
  "summaryStyle",
  "nodeStyle",
  "edgeStyle",
  "connectorStyle",
  "backgroundGraphics",
  "foregroundGraphics",
  "svgPreRenderers",
  // Custom annotation rules share the Stream Frame callback contract.
  "svgAnnotationRules",
  "barColors",
  "legend",
  "legendLayout",
  // Forward the public annotation-placement option to the static frame.
  "autoPlaceAnnotations",
  // Network-family post-layout projection (distinct from geo `projection`).
  "perspective"
] as const

const CHART_MODE_PROP_KEYS = [
  "width",
  "height",
  "showAxes",
  "showGrid",
  "enableHover",
  "showLegend",
  "showLabels",
  "showCategoryTicks",
  "orientation",
  "title",
  "description",
  "summary",
  "accessibleTable",
  "xLabel",
  "yLabel",
  "categoryLabel",
  "valueLabel",
  "linkedHover",
  "mobileInteraction",
  "mobileSemantics",
  "responsiveRules"
] as const

function pickDefinedProps(source: Datum, keys: readonly string[]): Datum {
  const picked: Datum = {}
  for (const key of keys) {
    if (source[key] !== undefined) picked[key] = source[key]
  }
  return picked
}

/**
 * Render a chart using HOC-level props (categoryAccessor, valueAccessor, etc.)
 * instead of frame-level props (oAccessor, rAccessor, etc.).
 *
 * This is the primary API for AI/MCP workflows.
 */
export function renderChart(
  component: string,
  props: Datum,
  options?: RenderChartOptions
): string {
  return renderChartInternal(component, props, options).svg
}

/**
 * Render a chart and return machine-readable evidence about what actually
 * rendered — mark counts by scene type, resolved axis domains, emptiness,
 * legend/annotation counts, and the accessible name. The evidence is computed
 * from the same scene graph the SVG converter walks, so it is ground truth a
 * non-visual caller (an agent repair loop, a CI assertion) can quote without
 * pixel inspection. Exposed through the MCP `renderChart` tool response.
 */
export function renderChartWithEvidence(
  component: string,
  props: Datum,
  options?: RenderChartOptions
): { svg: string; evidence: RenderEvidence } {
  const sink: EvidenceSink = {}
  const { svg, frameType } = renderChartInternal(
    component,
    props,
    options,
    sink
  )
  const evidence: RenderEvidence =
    sink.evidence ??
    // Defensive: every frame renderer populates the sink, so this only fires
    // if a future renderer forgets — surface that as its own warning rather
    // than returning undefined evidence.
    buildEvidence({
      frameType,
      width: typeof props.width === "number" ? props.width : 600,
      height: typeof props.height === "number" ? props.height : 400,
      marks: [],
      title: typeof props.title === "string" ? props.title : undefined,
      description:
        typeof props.description === "string" ? props.description : undefined,
      annotations: props.annotations,
      extraWarnings: ["NO_EVIDENCE"]
    })
  evidence.component = component
  evidence.sceneHashVersion = 2
  evidence.sceneHash = renderedSceneHash(svg, evidence)
  applySemanticViability(evidence, component, props)
  if (options?.artifactContract) {
    const artifact = serializeArtifactContract(options.artifactContract, {
      excludeEvidenceSamples: true
    })
    if (artifact.contract) evidence.artifactContract = artifact.contract
    evidence.artifactTransfer = artifact.transfer
    evidence.artifactBinding =
      artifact.contract?.contractVersion === ARTIFACT_CONTRACT_VERSION &&
      artifact.transfer.status !== "invalid"
        ? compareArtifactIdentity(
            artifact.contract as ArtifactContract,
            props,
            component
          )
        : {
            status: "unknown",
            mismatchPaths: [],
            unknownPaths: ["artifactContract"]
          }
  }
  return { svg, evidence }
}

function renderChartInternal(
  component: string,
  props: Datum,
  options?: RenderChartOptions,
  sink?: EvidenceSink
): { svg: string; frameType: RenderEvidence["frameType"] } {
  const prefix = chartUID(props)
  props = { ...props, _idPrefix: prefix }
  if (Object.prototype.hasOwnProperty.call(VALUE_RENDERERS, component)) {
    return {
      svg: serializeSvgPrecision(
        scopeSvgIdentifiers(renderValueChart(component as ValueChartName, props, sink), prefix),
        options?.precision
      ),
      frameType: "value"
    }
  }

  // Resolve the public HOC contract before mapping chart-specific props. The
  // resolver is the same pure function every React chart HOC consumes, so
  // context/sparkline/mobile dimensions and chrome cannot drift in SSR.
  if (!Object.prototype.hasOwnProperty.call(CHART_CONFIGS, component)) {
    throw new Error(
      `Unknown chart component: "${component}". ` +
        `Run \`npx -p semiotic semiotic-ai --list\` for supported chart types.`
    )
  }
  const config = CHART_CONFIGS[component as keyof typeof CHART_CONFIGS]
  // Some chart families also own a chart-specific `mode` prop (for example
  // physics `mode="mechanical"`). Only consume the four semantic display
  // modes here; the original prop remains in `rest` for the chart builder.
  const requestedMode =
    config.layout?.mode ?? (!hasFixedModeSize(component) && isChartMode(props.mode) ? props.mode : undefined)
  const resolvedMode = resolveChartMode(
    requestedMode,
    {
      ...config.layout?.modeDefaults,
      ...pickDefinedProps(props, CHART_MODE_PROP_KEYS),
      ...(hasFixedModeSize(component) && { responsiveRules: undefined })
    },
    chartPrimarySize(component) ?? config.layout?.primarySize
  )

  const {
    data,
    theme,
    background,
    className,
    annotations,
    margin,
    colorScheme,
    colorBy,
    legendPosition,
    ...rest
  } = props

  const { width, height } = resolvedMode
  const size: [number, number] = [width, height]
  // Flatten frameProps plus known frame-level top-level props into common.
  // Top-level props win so renderChart mirrors the React HOC API.
  const framePropsOverrides = rest.frameProps || {}
  const layoutMargin = config.layout?.margin
  const chartDefaultMargin =
    typeof layoutMargin === "function"
      ? layoutMargin(props, resolvedMode)
      : (layoutMargin ?? resolvedMode.marginDefaults)
  const defaultMargin = config.frameType === "xy"
    ? resolveHiddenAxisMargins(chartDefaultMargin, rest.axes ?? framePropsOverrides.axes, !!resolvedMode.title)
    : chartDefaultMargin
  // Resolve the caller's numeric margin as a baseline. Chart-owned chrome can
  // grow it later, matching the client HOC's minimum-margin contract.
  const explicitMargin =
    margin !== undefined ? margin : framePropsOverrides.margin
  // useChartLegendAndMargin merges partial caller margins over its mode
  // defaults. Preserve that same shape before handing props to a static
  // frame; otherwise `{ right: 64 }` accidentally falls back to the lower
  // level frame's 20px top/left defaults.
  const normalizedExplicitMargin = normalizePartialMargin(
    explicitMargin as PartialMargin | undefined
  )
  const effectiveMargin =
    typeof explicitMargin === "number"
      ? {
          top: explicitMargin,
          right: explicitMargin,
          bottom: explicitMargin,
          left: explicitMargin
        }
      : { ...defaultMargin, ...normalizedExplicitMargin }
  const topLevelFrameProps = pickDefinedProps(rest, COMMON_FRAME_PROP_KEYS)
  // `frameProps` overrides mode-resolved defaults, matching the client HOC's
  // last-spread escape-hatch behavior.
  const withFramePropsOverride = <K extends keyof typeof resolvedMode>(
    key: K
  ) => (framePropsOverrides as Datum)[key] ?? resolvedMode[key]
  const common: Datum & ThemeAwareProps & { size: [number, number] } = {
    ...framePropsOverrides,
    ...topLevelFrameProps,
    theme,
    title: resolvedMode.title,
    description: resolvedMode.description,
    showAxes: withFramePropsOverride("showAxes"),
    showLegend: withFramePropsOverride("showLegend"),
    showLabels: withFramePropsOverride("showLabels"),
    showGrid: withFramePropsOverride("showGrid"),
    xLabel: withFramePropsOverride("xLabel"),
    yLabel: withFramePropsOverride("yLabel"),
    categoryLabel: withFramePropsOverride("categoryLabel"),
    valueLabel: withFramePropsOverride("valueLabel"),
    // HOCs take a surface color only through `frameProps.background`; an
    // undefined top-level value must not erase it (CSR paints it).
    background: background ?? (framePropsOverrides as Datum).background,
    className,
    annotations,
    size,
    margin: effectiveMargin,
    // Chart-owned content may distinguish context from sparkline after rules.
    __resolvedMode: resolvedMode.mode,
    __compactMode: resolvedMode.compactMode,
    // Sides the caller pinned; chart-owned chrome (direct and endpoint labels)
    // may only grow the others, as in the React charts.
    __explicitMarginSides: typeof explicitMargin === "number"
      ? ["top", "right", "bottom", "left"]
      : Object.keys(normalizedExplicitMargin ?? {}),
    // renderChart is the HOC-level server API. Its legend reservation must
    // follow useChartLegendAndMargin rather than the lower-level static
    // renderer's content-measurement-only behavior.
    __autoLegendMargin: true,
    ...(colorScheme !== undefined && { colorScheme }),
    ...(legendPosition !== undefined && { legendPosition }),
    _idPrefix: rest._idPrefix
  }

  const frameProps2 = config.buildProps(
    data,
    colorBy,
    colorScheme,
    common,
    rest
  )

  // Dispatch to a chart-owned composite renderer when one exists. This is
  // still the renderChart registry path (and therefore still evidence-backed),
  // but it avoids pretending a multi-scene HOC is one Stream Frame.
  let svg: string
  if (config.renderStatic) {
    svg = config.renderStatic(frameProps2, sink)
  } else {
    switch (config.frameType) {
      case "xy":
        svg = renderStreamXYFrame(
          frameProps2 as StreamXYFrameProps & ThemeAwareProps,
          sink
        )
        break
      case "ordinal":
        svg = renderOrdinalFrame(
          frameProps2 as StreamOrdinalFrameProps & ThemeAwareProps,
          sink
        )
        break
      case "network":
        svg = renderNetworkFrame(
          frameProps2 as StreamNetworkFrameProps & ThemeAwareProps,
          sink
        )
        break
      case "geo":
        svg = renderGeoFrame(
          frameProps2 as StreamGeoFrameProps & ThemeAwareProps,
          sink
        )
        break
      case "physics":
        svg = renderPhysicsFrame(frameProps2 as StaticPhysicsFrameProps, sink)
        break
    }
  }

  const overlay = config.renderOverlay?.(frameProps2, {
    theme: resolveTheme(theme)
  })
  if (overlay != null) {
    const overlayMarkup = ReactDOMServer.renderToStaticMarkup(<>{overlay}</>)
    // Overlays belong to the outer chart SVG. Gauge center content can itself
    // contain an <svg>, so replacing the first closing tag corrupts nesting.
    const closingSvgIndex = svg.lastIndexOf("</svg>")
    svg =
      closingSvgIndex < 0
        ? `${svg}${overlayMarkup}`
        : `${svg.slice(0, closingSvgIndex)}${overlayMarkup}${svg.slice(closingSvgIndex)}`
  }

  return {
    svg: serializeSvgPrecision(scopeSvgIdentifiers(svg, prefix), options?.precision),
    frameType: (config.resolveFrameType?.(frameProps2) ?? config.frameType) as RenderEvidence["frameType"]
  }
}

// ── Image export ────────────────────────────────────────────────────────

export interface RenderToImageOptions {
  /** Output format */
  format?: "png" | "jpeg"
  /** Scale factor (e.g., 2 for retina) */
  scale?: number
  /** Background color (overrides theme) */
  background?: string
}

/**
 * Render a chart to a PNG or JPEG Buffer.
 *
 * Requires `sharp` as an optional peer dependency.
 * Falls back to a descriptive error if sharp is not installed.
 */
export async function renderToImage(
  frameTypeOrComponent: FrameType | RenderChartName,
  props: Datum,
  options: RenderToImageOptions = {}
): Promise<Buffer> {
  const { renderImage } = await import("./renderToImage")
  return renderImage(
    frameTypeOrComponent, props, options,
    renderToStaticSVG, renderChart, resolveTheme,
    renderedSvgDimensions, insertSvgRootContent, escapeXmlAttribute
  )
}

export function renderDashboard(
  charts: DashboardChart[],
  options: RenderDashboardOptions = {}
): string {
  return composeDashboard(charts, options, {
    chart: renderChart,
    frame: renderToStaticSVG
  })
}
