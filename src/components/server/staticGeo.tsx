import type { Datum } from "../charts/shared/datumTypes"
import { filterSparseArray } from "../charts/shared/sparseArray"
import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import { GeoPipelineStore } from "../stream/GeoPipelineStore"
import type { GeoPipelineConfig, StreamGeoFrameProps } from "../stream/geoTypes"
import {
  buildEvidence,
  type EvidenceSink
} from "./renderEvidence"
import { geoSceneNodeToSVG } from "../stream/SceneToSVG"
import { renderSceneListWithBackend } from "../stream/renderBackend"
import { resolveTheme } from "./themeResolver"
import {
  extractCategories
} from "./staticLegend"
import {
  renderStaticAnnotations,
  type StaticAnnotationRenderResult,
} from "./staticAnnotations"
import { resolveThemeSemanticColors } from "../store/themeCore"
import { hasTextTitle, reserveTitleMargin } from "../stream/titleLayout"
import type { ThemeAwareProps, CategoricalAccessor } from "./staticSVGChrome"
import {
  reserveFrameLegendMargin,
  renderFrameLegend,
  wrapSVG
} from "./staticSVGChrome"
import { resolveFrameGraphics } from "../stream/frameGraphics"
import { collectGeoAnnotationAnchors } from "../stream/geoAnnotationAnchors"
import { DistanceCartogramOverlay } from "../charts/geo/cartogramOverlay"

export function renderGeoFrame(props: StreamGeoFrameProps & ThemeAwareProps, sink?: EvidenceSink): string {
  const theme = resolveTheme(props.theme)
  const defaultMargin = { top: 10, right: 10, bottom: 10, left: 10 }
  const size: [number, number] = props.size || [props.width || 600, props.height || 400]
  const margin = reserveTitleMargin({ ...defaultMargin, ...props.margin }, props.title)
  const hasVisibleTitle = hasTextTitle(props.title)
  const areas = Array.isArray(props.areas) ? filterSparseArray(props.areas) : props.areas
  const points = filterSparseArray(props.points)
  const lines = filterSparseArray(props.lines)
  const geoLegendCategories = props.showLegend ? (() => {
    const isAccessor = (a: unknown): a is CategoricalAccessor =>
      typeof a === "string" || typeof a === "function"
    const colorAccessor = isAccessor(props.colorBy) ? props.colorBy : undefined
    const legendSource: Datum[] = (() => {
      if (points.length > 0) return points
      if (Array.isArray(areas) && areas.length > 0) {
        if (typeof colorAccessor === "string") {
          return areas.map(f => ({ ...(f.properties || {}), ...f }))
        }
        return areas as unknown as Datum[]
      }
      return []
    })()
    return extractCategories(legendSource, colorAccessor)
  })() : []
  // Reserve legend space BEFORE computing inner dims so the geo projection
  // fits inside the post-legend area. Same shape as XY/Network.
  reserveFrameLegendMargin(margin, {
    props,
    categories: geoLegendCategories,
    theme,
    size,
    hasTitle: hasVisibleTitle,
  })
  const geoLegend = renderFrameLegend({
    props,
    categories: geoLegendCategories,
    theme,
    size,
    margin,
    hasTitle: hasVisibleTitle,
  })
  const width = size[0] - (margin.left ?? 0) - (margin.right ?? 0)
  const height = size[1] - (margin.top ?? 0) - (margin.bottom ?? 0)

  const config: GeoPipelineConfig = {
    projection: props.projection || "equalEarth",
    projectionExtent: props.projectionExtent,
    xAccessor: props.xAccessor,
    yAccessor: props.yAccessor,
    lineDataAccessor: props.lineDataAccessor,
    pointIdAccessor: props.pointIdAccessor,
    lineIdAccessor: props.lineIdAccessor,
    lineType: props.lineType,
    flowStyle: props.flowStyle,
    areaStyle: props.areaStyle,
    pointStyle: props.pointStyle,
    lineStyle: props.lineStyle,
    colorScheme: props.colorScheme,
    graticule: props.graticule,
    fitPadding: props.fitPadding,
    projectionTransform: props.projectionTransform,
    customLayout: props.customLayout,
    layoutConfig: props.layoutConfig,
    layoutMargin: margin,
    onLayoutError: props.onLayoutError,
    themeCategorical: theme.colors.categorical,
    themeSemantic: resolveThemeSemanticColors(theme),
    themeSequential: theme.colors.sequential,
    themeDiverging: theme.colors.diverging,
  }

  const store = new GeoPipelineStore(config)

  if (areas) {
    if (typeof areas === "string") {
      throw new Error(
        `Geo SSR requires pre-resolved GeoJSON features. ` +
        `Reference string "${areas}" cannot be resolved synchronously. ` +
        `Use \`const features = await resolveReferenceGeography('${areas}')\` ` +
        `before calling renderGeoToStaticSVG.`
      )
    }
    store.setAreas(areas)
  }
  if (props.points) store.setPoints(points)
  if (props.lines) store.setLines(lines)

  store.computeScene({ width, height })
  const resolvedBackgroundGraphics = resolveFrameGraphics(
    props.backgroundGraphics,
    size,
    margin,
    store.scales
  )
  const resolvedForegroundGraphics = resolveFrameGraphics(
    props.foregroundGraphics,
    size,
    margin,
    store.scales
  )

  const renderedScene = renderSceneListWithBackend({
    nodes: store.scene,
    renderMode: props.renderMode,
    fallback: (node, index) => geoSceneNodeToSVG(node, index),
  })

  if (renderedScene.length === 0) {
    let annotationRender: StaticAnnotationRenderResult | undefined
    const annotationNodes = props.annotations ? renderStaticAnnotations({
      annotations: props.annotations,
      autoPlaceAnnotations: props.autoPlaceAnnotations,
      svgAnnotationRules: props.svgAnnotationRules,
      scales: {
        geoProjection: store.scales?.projectedPoint
          ? (([lon, lat]) => store.scales!.projectedPoint(lon, lat))
          : undefined,
      },
      layout: { width, height },
      theme,
      pointNodes: collectGeoAnnotationAnchors(store.scene),
      idPrefix: props._idPrefix,
      onRender: result => { annotationRender = result },
    }) : null
    if (sink) {
      sink.evidence = buildEvidence({
        frameType: "geo",
        width: size[0], height: size[1],
        marks: renderedScene.map(entry => entry.node),
        title: props.title, description: props.description,
        annotations: props.annotations,
        annotationRender,
        legendItems: geoLegendCategories.length > 0
          ? geoLegendCategories.length
          : props.legend != null
            ? 1
            : undefined,
        margin,
      })
    }
    // Even when the data scene is empty, bg/fg graphics and annotations are
    // valid surfaces a caller may have legitimately set. Pipe them through
    // so the empty-data path doesn't silently drop them.
    const emptyContent = (resolvedBackgroundGraphics || resolvedForegroundGraphics || props.annotations || store.customLayoutOverlays)
      ? (
        <>
          {resolvedBackgroundGraphics}
          {annotationNodes}
          {resolvedForegroundGraphics}
          {store.customLayoutOverlays}
        </>
      )
      : null
    return ReactDOMServer.renderToStaticMarkup(
      wrapSVG(emptyContent, {
        width: size[0], height: size[1],
        className: `stream-geo-frame${props.className ? ` ${props.className}` : ""}`,
        title: props.title, description: props.description, background: props.background,
        theme, innerTransform: `translate(${margin.left ?? 0},${margin.top ?? 0})`,
        innerWidth: width, innerHeight: height,
        legend: geoLegend,
        idPrefix: props._idPrefix,
      })
    )
  }

  const dataMarks = renderedScene.map(entry => entry.element)
  const cartogramChrome = (props as StreamGeoFrameProps & {
    cartogramChrome?: {
      showRings?: boolean | number | number[]
      showNorth?: boolean
      showRingLabels?: boolean
      costLabel?: string
    }
  }).cartogramChrome
  const cartogramOverlay = store.cartogramLayout && cartogramChrome
    ? (
      <DistanceCartogramOverlay
        layout={{ ...store.cartogramLayout, layout: store.cartogramLayout.layout ?? "radial" }}
        ringValues={cartogramRingValues(store.cartogramLayout.maxCost, cartogramChrome.showRings)}
        showRings={cartogramChrome.showRings ?? true}
        showNorth={cartogramChrome.showNorth ?? true}
        showRingLabels={cartogramChrome.showRingLabels ?? true}
        costLabel={typeof cartogramChrome.costLabel === "string" ? cartogramChrome.costLabel : undefined}
      />
    )
    : null

  // Geo annotations: `coordinates: [lon, lat]` flows through the resolved
  // projection from the store's scales; raw `x`/`y` numbers remain valid via
  // staticAnnotations' pixel passthrough for callers who pre-projected.
  // Honor `svgAnnotationRules` so geo custom overlays (callouts with bespoke
  // SVG, pin glyphs, etc.) survive renderChart the same way they paint on the
  // client GeoSVGOverlay. Coordinates are projected via geoProjection before
  // the custom rule runs (see renderStaticAnnotations).
  let annotationRender: StaticAnnotationRenderResult | undefined
  const annotationNodes = props.annotations ? renderStaticAnnotations({
    annotations: props.annotations,
    autoPlaceAnnotations: props.autoPlaceAnnotations,
    svgAnnotationRules: props.svgAnnotationRules,
    scales: {
      geoProjection: store.scales?.projectedPoint
        ? (([lon, lat]) => store.scales!.projectedPoint(lon, lat))
        : undefined,
    },
    layout: { width, height },
    theme,
    pointNodes: collectGeoAnnotationAnchors(store.scene),
    idPrefix: props._idPrefix,
    onRender: result => { annotationRender = result },
  }) : null

  if (sink) {
    sink.evidence = buildEvidence({
      frameType: "geo",
      width: size[0], height: size[1],
      marks: renderedScene.map(entry => entry.node),
      title: props.title, description: props.description,
      annotations: props.annotations,
      annotationRender,
      legendItems: geoLegendCategories.length > 0
        ? geoLegendCategories.length
        : props.legend != null
          ? 1
          : undefined,
      margin,
    })
  }

  const content = (
    <>
      {resolvedBackgroundGraphics}
      {dataMarks}
      {annotationNodes}
      {cartogramOverlay}
      {resolvedForegroundGraphics}
      {store.customLayoutOverlays}
    </>
  )

  return ReactDOMServer.renderToStaticMarkup(
    wrapSVG(content, {
      width: size[0], height: size[1],
      className: `stream-geo-frame${props.className ? ` ${props.className}` : ""}`,
      title: props.title, description: props.description, background: props.background,
      theme, innerTransform: `translate(${margin.left ?? 0},${margin.top ?? 0})`,
      innerWidth: width, innerHeight: height,
      legend: geoLegend,
      idPrefix: props._idPrefix,
    })
  )
}

function cartogramRingValues(
  maxCost: number,
  showRings: boolean | number | number[] | undefined
): number[] {
  if (showRings === false || maxCost <= 0) return []
  if (Array.isArray(showRings)) return showRings.filter((value) => value > 0 && value <= maxCost)
  const count = typeof showRings === "number"
    ? showRings
    : Math.min(5, Math.max(2, Math.ceil(maxCost / 5)))
  const step = maxCost / count
  const values: number[] = []
  for (let i = 1; i <= count; i++) values.push(Math.round(step * i * 10) / 10)
  return values
}
