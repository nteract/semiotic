import { rememberGeoPointSource } from "./geoPointSourceIndex"
import { geoClipRectangle, geoGraticule, geoPath } from "d3-geo"
import type { GeoPath, GeoPermissibleObjects, GeoProjection } from "d3-geo"
import type {
  GeoPipelineConfig,
  GeoSceneNode,
  GraticuleConfig
} from "./geoTypes"
import type { PointSceneNode, StreamLayout, Style } from "./types"
import type { Datum } from "../charts/shared/datumTypes"
import {
  geoAccessor,
  buildArcPath,
  buildOffsetGeoPath,
  geoCoordinates,
  makeLineDataAccessor,
  resolveGeoStyle as resolveStyle,
  createGeoLineProjector,
  clipStyledGeoLine,
  themedDefaultArea,
  themedDefaultLine,
  themedDefaultPoint
} from "./geoPipelineHelpers"

interface GeoSceneBuildInput {
  config: GeoPipelineConfig
  projection: GeoProjection
  path: GeoPath<void, GeoPermissibleObjects>
  areas: GeoJSON.Feature[]
  points: Datum[]
  lines: Datum[]
  layout: StreamLayout
}

function finitePosition(point: [number, number] | undefined | null): point is [number, number] {
  return !!point?.every(Number.isFinite)
}

/** Builds the built-in geo scene independently of store-owned custom layout state. */
export function buildBuiltInGeoScene({
  config,
  projection,
  path,
  areas,
  points,
  lines,
  layout
}: GeoSceneBuildInput): GeoSceneNode[] {
  const coordinates = geoCoordinates(config)
  const nodes: GeoSceneNode[] = []
  const areaDefault = themedDefaultArea(config)
  const lineDefault = themedDefaultLine(config)
  const pointDefault = themedDefaultPoint(config)

  if (config.graticule) {
    const gratConfig: GraticuleConfig = config.graticule === true
      ? {}
      : config.graticule
    const generator = geoGraticule()
    if (gratConfig.step) generator.step(gratConfig.step)
    const pathData = path(generator()) || ""
    if (pathData) {
      nodes.push({
        type: "geoarea",
        pathData,
        centroid: [layout.width / 2, layout.height / 2],
        bounds: [[0, 0], [layout.width, layout.height]],
        screenArea: 0,
        style: {
          fill: "none",
          stroke: gratConfig.stroke || "#e0e0e0",
          strokeWidth: gratConfig.strokeWidth ?? 0.5,
          strokeDasharray: gratConfig.strokeDasharray || "2,2"
        },
        datum: null,
        interactive: false
      })
    }
  }

  const clipViewport = geoClipRectangle(0, 0, layout.width, layout.height)
  const visibleArea = geoPath({ stream: sink => projection.stream(clipViewport(sink)) })
  for (const feature of areas) {
    const pathData = path(feature)
    if (!pathData) continue
    const focusPath = visibleArea(feature)
    if (!focusPath) continue
    const centroid = visibleArea.centroid(feature)
    nodes.push({
      type: "geoarea",
      pathData,
      centroid,
      bounds: path.bounds(feature),
      screenArea: path.area(feature),
      style: resolveStyle(config.areaStyle, feature, areaDefault),
      datum: feature,
      interactive: true,
      focusPath
    })
  }

  const pointIdAcc = config.pointIdAccessor && geoAccessor(config.pointIdAccessor, "id")
  let visible: [number, number] | undefined
  const pointStream = projection.stream({
    point(x, y) { visible ??= [x, y] },
    lineStart() {}, lineEnd() {}, polygonStart() {}, polygonEnd() {}
  })

  function projectPoint(position: [number, number]): [number, number] | undefined {
    visible = undefined
    pointStream.point(...position)
    return visible
  }

  const stations: PointSceneNode[] = []
  for (const [sourceIndex, datum] of points.entries()) {
    const position = coordinates(datum)
    if (!finitePosition(position)) continue
    const projected = config.projectionTransform ? projection(position) : projectPoint(position)
    if (!finitePosition(projected)) continue
    const style = config.pointStyle ? config.pointStyle(datum) : { ...pointDefault }
    const point: PointSceneNode = {
      type: "point",
      x: projected[0],
      y: projected[1],
      r: style.r || 4,
      style,
      datum,
      pointId: pointIdAcc ? String(pointIdAcc(datum)) : undefined
    }
    rememberGeoPointSource(point, sourceIndex)
    stations.push(point)
  }
  const lineDataAcc = makeLineDataAccessor(config.lineDataAccessor)
  const stationIds = config.projectionTransform && new Set(stations.map(point => point.pointId))
  const projector = (cartogram: boolean) => createGeoLineProjector(projection, config.lineType !== "geo", coordinates, cartogram)
  let mapRoute: ReturnType<typeof projector> | undefined
  let cartogramRoute: ReturnType<typeof projector> | undefined
  const clipLine = clipStyledGeoLine(projection, layout.width, layout.height)
  for (const line of lines) {
    const coords = lineDataAcc(line)
    if (!coords || coords.length < 2) continue
    const linked = stationIds?.has(String(line.source)) && stationIds.has(String(line.target))
    const projectLine = linked ? (cartogramRoute ??= projector(true)) : (mapRoute ??= projector(false))
    const segments = projectLine(coords)
    if (linked && !segments.length) {
      const positions = coords.map(d => projection(coordinates(d)))
      if (positions.every(finitePosition)) segments.push(positions)
    }
    const style = resolveStyle(config.lineStyle, line, lineDefault) as Style
    const strokeWidth = typeof style.strokeWidth === "number" ? style.strokeWidth : 1
    let paths = segments
    if (coords.length === 2 && (config.flowStyle === "arc" || config.flowStyle === "offset")) {
      paths = segments.map(segment => config.flowStyle === "arc"
          ? buildArcPath(segment[0], segment[segment.length - 1])
          : buildOffsetGeoPath(segment, strokeWidth))
    }
    // Cartograms reattach complete routes after projecting their endpoints.
    const visibleSegments = linked ? paths : paths.flatMap(clipLine)
    for (const [index, path] of visibleSegments.entries()) {
      nodes.push({
        type: "line", path, datum: line,
        style: segments.length > 1 ? { ...style, _edgeFade: true } : style,
        ...(index > 0 && { continuation: true })
      })
    }
  }

  return nodes.concat(stations)
}
