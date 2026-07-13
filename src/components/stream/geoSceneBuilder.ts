import {
  geoDistance,
  geoGraticule,
  geoInterpolate
} from "d3-geo"
import type { GeoPath, GeoPermissibleObjects, GeoProjection } from "d3-geo"
import type {
  GeoLineSceneNode,
  GeoPipelineConfig,
  GeoSceneNode,
  GraticuleConfig
} from "./geoTypes"
import type { PointSceneNode, StreamLayout, Style } from "./types"
import type { Datum } from "../charts/shared/datumTypes"
import {
  buildArcPath,
  buildOffsetGeoPath,
  buildOffsetPath,
  makeGeoNumericAccessor as makeAccessor,
  makeLineDataAccessor,
  resolveGeoStyle as resolveStyle,
  splitAntiMeridianPath,
  themedDefaultArea,
  themedDefaultLine,
  themedDefaultPoint
} from "./geoPipelineHelpers"

interface GeoSceneBuildInput {
  config: GeoPipelineConfig
  projection: GeoProjection
  path: GeoPath<any, GeoPermissibleObjects>
  areas: GeoJSON.Feature[]
  points: Datum[]
  lines: Datum[]
  layout: StreamLayout
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
  const xAcc = makeAccessor(config.xAccessor, "lon")
  const yAcc = makeAccessor(config.yAccessor, "lat")
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
          strokeWidth: gratConfig.strokeWidth || 0.5,
          strokeDasharray: gratConfig.strokeDasharray || "2,2"
        },
        datum: null,
        interactive: false
      })
    }
  }

  for (const feature of areas) {
    const pathData = path(feature)
    if (!pathData) continue
    const centroid = path.centroid(feature)
    const featureBounds = path.bounds(feature)
    const featureArea = path.area(feature)
    nodes.push({
      type: "geoarea",
      pathData,
      centroid: centroid as [number, number],
      bounds: featureBounds as [[number, number], [number, number]],
      screenArea: featureArea,
      style: resolveStyle(config.areaStyle, feature, areaDefault),
      datum: feature,
      interactive: true
    })
  }

  const lineDataAcc = makeLineDataAccessor(config.lineDataAccessor)
  for (const line of lines) {
    const coords = lineDataAcc(line)
    if (!coords || coords.length < 2) continue
    let screenPath: [number, number][] = []
    if (config.lineType === "geo") {
      const lineCoords: [number, number][] = new Array(coords.length)
      for (let i = 0; i < coords.length; i++) {
        lineCoords[i] = [xAcc(coords[i]), yAcc(coords[i])]
      }
      for (let i = 0; i < lineCoords.length - 1; i++) {
        const start = lineCoords[i]
        const end = lineCoords[i + 1]
        const dist = geoDistance(start, end) || 0
        const steps = Math.max(2, Math.ceil(dist / (Math.PI / 180)))
        const interpolate = geoInterpolate(start, end)
        for (let step = 0; step <= steps; step++) {
          if (i > 0 && step === 0) continue
          const projected = projection(interpolate(step / steps) as [number, number])
          if (projected != null) screenPath.push(projected as [number, number])
        }
      }
    } else {
      for (let i = 0; i < coords.length; i++) {
        const datum = coords[i]
        const projected = projection([xAcc(datum), yAcc(datum)])
        if (projected != null) screenPath.push(projected as [number, number])
      }
    }
    if (screenPath.length < 2) continue
    const style = resolveStyle(config.lineStyle, line, lineDefault) as Style
    const strokeWidth = typeof style.strokeWidth === "number" ? style.strokeWidth : 1
    if (coords.length === 2 && screenPath.length >= 2 && config.flowStyle === "arc") {
      screenPath = buildArcPath(screenPath[0], screenPath[screenPath.length - 1])
    } else if (coords.length === 2 && screenPath.length >= 2 && config.flowStyle === "offset") {
      screenPath = config.lineType === "geo"
        ? buildOffsetGeoPath(screenPath, strokeWidth)
        : buildOffsetPath(screenPath[0], screenPath[screenPath.length - 1], line, lines, strokeWidth)
    }
    const segments = splitAntiMeridianPath(screenPath, layout.width)
    if (segments.length <= 1) {
      nodes.push({
        type: "line",
        path: screenPath.length >= 2 ? screenPath : segments[0] || screenPath,
        style,
        datum: line
      } as GeoLineSceneNode)
    } else {
      for (const segment of segments) {
        if (segment.length < 2) continue
        nodes.push({
          type: "line",
          path: segment,
          style: { ...style, _edgeFade: true },
          datum: line
        } as GeoLineSceneNode)
      }
    }
  }

  const pointIdAcc = config.pointIdAccessor
    ? (typeof config.pointIdAccessor === "function"
      ? config.pointIdAccessor
      : (datum: Datum) => datum[config.pointIdAccessor as string])
    : null
  const clipAngle = projection.clipAngle ? (projection.clipAngle() ?? 0) : 0
  const clipRadians = clipAngle > 0 ? (clipAngle * Math.PI) / 180 : null
  const rotation = projection.rotate ? projection.rotate() : [0, 0, 0]
  const center = typeof projection.center === "function" ? projection.center() : [0, 0]
  const projectionCenter: [number, number] = [
    (center[0] ?? 0) - rotation[0],
    (center[1] ?? 0) - rotation[1]
  ]

  for (const datum of points) {
    const lon = xAcc(datum)
    const lat = yAcc(datum)
    if (clipRadians != null && geoDistance([lon, lat], projectionCenter) > clipRadians) {
      continue
    }
    const projected = projection([lon, lat])
    if (!projected) continue
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
    nodes.push(point)
  }
  return nodes
}
