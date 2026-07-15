import type { Datum } from "../charts/shared/datumTypes"
import { isGradientLegendConfig, isLegendConfig } from "../types/legendTypes"
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
import { renderSceneWithBackend } from "../stream/renderBackend"
import { resolveTheme } from "./themeResolver"
import {
  renderStaticLegend,
  extractCategories
} from "./staticLegend"
import { renderStaticAnnotations } from "./staticAnnotations"
import { resolveThemeSemanticColors } from "../store/ThemeStore"
import { reserveTitleMargin } from "../stream/titleLayout"
import type { ThemeAwareProps, CategoricalAccessor } from "./staticSVGChrome"
import {
  reserveStaticLegendMargin,
  reserveLegendConfigMargin,
  renderLegendConfig,
  wrapSVG
} from "./staticSVGChrome"

export function renderGeoFrame(props: StreamGeoFrameProps & ThemeAwareProps, sink?: EvidenceSink): string {
  const theme = resolveTheme(props.theme)
  const defaultMargin = { top: 10, right: 10, bottom: 10, left: 10 }
  const size: [number, number] = props.size || [props.width || 600, props.height || 400]
  const margin = reserveTitleMargin({ ...defaultMargin, ...props.margin }, props.title)
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
  const legendPos = props.legendPosition
  if (isLegendConfig(props.legend) || isGradientLegendConfig(props.legend)) {
    reserveLegendConfigMargin(margin, {
      legend: props.legend,
      theme,
      position: legendPos || "right",
      size,
      hasTitle: !!props.title,
      legendLayout: props.legendLayout,
    })
  } else if (props.showLegend && geoLegendCategories.length > 0) {
    reserveStaticLegendMargin(margin, {
      categories: geoLegendCategories,
      colorScheme: props.colorScheme,
      theme,
      position: legendPos || "right",
      size,
      hasTitle: !!props.title,
      legendLayout: props.legendLayout,
    })
  }
  const width = size[0] - (margin.left ?? 0) - (margin.right ?? 0)
  const height = size[1] - (margin.top ?? 0) - (margin.bottom ?? 0)

  const config: GeoPipelineConfig = {
    projection: props.projection || "equalEarth",
    xAccessor: props.xAccessor,
    yAccessor: props.yAccessor,
    lineDataAccessor: props.lineDataAccessor,
    pointIdAccessor: props.pointIdAccessor,
    lineType: props.lineType,
    areaStyle: props.areaStyle,
    pointStyle: props.pointStyle,
    lineStyle: props.lineStyle,
    graticule: props.graticule,
    fitPadding: props.fitPadding,
    projectionTransform: props.projectionTransform,
    customLayout: props.customLayout,
    layoutConfig: props.layoutConfig,
    layoutMargin: margin,
    themeCategorical: theme.colors.categorical,
    themeSemantic: resolveThemeSemanticColors(theme),
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

  if (sink) {
    sink.evidence = buildEvidence({
      frameType: "geo",
      width: size[0], height: size[1],
      marks: store.scene,
      title: props.title, description: props.description,
      annotations: props.annotations,
      legendItems: geoLegendCategories.length > 0 ? geoLegendCategories.length : undefined,
    })
  }

  if (store.scene.length === 0) {
    // Even when the data scene is empty, bg/fg graphics and annotations are
    // valid surfaces a caller may have legitimately set. Pipe them through
    // so the empty-data path doesn't silently drop them.
    const emptyContent = (props.backgroundGraphics || props.foregroundGraphics || props.annotations || store.customLayoutOverlays)
      ? (
        <>
          {props.backgroundGraphics}
          {props.annotations ? renderStaticAnnotations({
            annotations: props.annotations,
            autoPlaceAnnotations: props.autoPlaceAnnotations,
            scales: {
              geoProjection: store.scales?.projectedPoint
                ? (([lon, lat]) => store.scales!.projectedPoint(lon, lat))
                : undefined,
            },
            layout: { width, height },
            theme,
            idPrefix: props._idPrefix,
          }) : null}
          {props.foregroundGraphics}
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
        idPrefix: props._idPrefix,
      })
    )
  }

  const dataMarks = store.scene
    .map((node, i) => renderSceneWithBackend({
      node,
      index: i,
      renderMode: props.renderMode,
      fallback: () => geoSceneNodeToSVG(node, i)
    }))
    .filter(Boolean)

  // Geo annotations: `coordinates: [lon, lat]` flows through the resolved
  // projection from the store's scales; raw `x`/`y` numbers remain valid via
  // staticAnnotations' pixel passthrough for callers who pre-projected.
  const annotationNodes = props.annotations ? renderStaticAnnotations({
    annotations: props.annotations,
    autoPlaceAnnotations: props.autoPlaceAnnotations,
    scales: {
      geoProjection: store.scales?.projectedPoint
        ? (([lon, lat]) => store.scales!.projectedPoint(lon, lat))
        : undefined,
    },
    layout: { width, height },
    theme,
    idPrefix: props._idPrefix,
  }) : null

  // Geo legend: auto-build from `colorBy` on either points (proportional
  // symbol maps) or areas (choropleth maps). `colorBy` is declared on
  // `StreamGeoFrameProps`, so SSR can use it directly.
  // Matches the XY/Network auto-build pattern; categories come from whichever
  // data input is present.
  const geoAutoLegend = props.showLegend ? (() => {
    const categories = geoLegendCategories
    if (categories.length === 0) return null
    return renderStaticLegend({
      categories,
      colorScheme: props.colorScheme,
      theme,
      position: props.legendPosition || "right",
      totalWidth: size[0],
      totalHeight: size[1],
      margin,
      hasTitle: !!props.title,
      legendLayout: props.legendLayout,
    })
  })() : null

  // Honor caller-supplied pre-rendered legend element or static config object.
  const geoLegend = React.isValidElement(props.legend)
    ? (props.legend as React.ReactNode)
    : renderLegendConfig(props.legend, {
        theme,
        position: props.legendPosition || "right",
        size,
        margin,
        hasTitle: !!props.title,
        legendLayout: props.legendLayout,
        idPrefix: props._idPrefix,
      }) || geoAutoLegend

  const content = (
    <>
      {props.backgroundGraphics}
      {dataMarks}
      {annotationNodes}
      {props.foregroundGraphics}
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
