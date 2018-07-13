// @flow

import { projectLineData, projectAreaData } from "../svg/lineDrawing"
import {
  projectedX,
  projectedY,
  projectedYTop,
  projectedYMiddle,
  projectedYBottom
} from "../constants/coordinateNames"
import {
  differenceLine,
  stackedArea,
  bumpChart,
  lineChart
} from "../svg/lineDrawing"

import { contouring, hexbinning, heatmapping } from "../svg/areaDrawing"
import { max, min, extent } from "d3-array"

import type { ProjectedPoint } from "../types/generalTypes"

const builtInTransformations = {
  "stackedarea": stackedArea,
  "stackedarea-invert": stackedArea,
  "stackedpercent": stackedArea,
  "stackedpercent-invert": stackedArea,
  "linepercent": stackedArea,
  "difference": differenceLine,
  "bumparea": bumpChart,
  "bumpline": bumpChart,
  "bumparea-invert": bumpChart,
  "line": lineChart
}

export const stringToFn = (
  accessor?: Function | string | boolean | Object,
  defaultAccessor?: Function,
  raw?: boolean
): Function => {
  if (!accessor && defaultAccessor) {
    return defaultAccessor
  } else if (typeof accessor !== "function" && raw !== undefined) {
    return () => accessor
  }

  return typeof accessor !== "function" ? (d: Object) => d[accessor] : accessor
}

export const stringToArrayFn = (
  accessor?:
    | Function
    | string
    | boolean
    | Object
    | Array<Function | string | boolean | Object>,
  defaultAccessor?: Function,
  raw?: boolean
): Array<Function> => {
  if (!accessor) {
    return [stringToFn(accessor, defaultAccessor, raw)]
  }
  const arrayOfAccessors = Array.isArray(accessor) ? accessor : [accessor]

  return arrayOfAccessors.map(a => stringToFn(a, defaultAccessor, raw))
}

type CalculateDataTypes = {
  lineDataAccessor: Array<Function>,
  areaDataAccessor: Array<Function>,
  xAccessor: Array<Function>,
  yAccessor: Array<Function>,
  areas?: Array<Object>,
  points?: Array<Object>,
  lines?: Array<Object>,
  lineType: Object,
  showLinePoints?: boolean,
  xExtent?: Array<number> | Object,
  yExtent?: Array<number> | Object,
  invertX?: boolean,
  invertY?: boolean,
  areaType: Object,
  adjustedSize: Array<number>,
  xScaleType: Function,
  yScaleType: Function,
  defined?: Function
}

export const calculateDataExtent = ({
  lineDataAccessor,
  xAccessor,
  yAccessor,
  areas,
  points,
  lines,
  lineType,
  showLinePoints,
  xExtent,
  yExtent,
  invertX,
  invertY,
  areaDataAccessor,
  areaType,
  adjustedSize: size,
  xScaleType,
  yScaleType,
  defined = () => true
}: CalculateDataTypes) => {
  let fullDataset: Array<ProjectedPoint> = []
  let initialProjectedLines = []

  let projectedPoints: Array<ProjectedPoint> = [],
    projectedLines: Array<Object> = [],
    projectedAreas: Array<Object> = []
  if (points) {
    xAccessor.forEach(actualXAccessor => {
      yAccessor.forEach(actualYAccessor => {
        points.forEach((d, i) => {
          const x = actualXAccessor(d, i)
          const y = actualYAccessor(d, i)
          projectedPoints.push({ x, y, data: d })
        })
      })
    })

    fullDataset = projectedPoints
  }
  if (lines) {
    initialProjectedLines = projectLineData({
      data: lines,
      lineDataAccessor,
      xProp: projectedX,
      yProp: projectedY,
      yPropTop: projectedYTop,
      yPropBottom: projectedYBottom,
      xAccessor,
      yAccessor
    })

    const optionsObject = {
      xProp: projectedX,
      yProp: projectedY,
      yPropMiddle: projectedYMiddle,
      yPropTop: projectedYTop,
      yPropBottom: projectedYBottom
    }

    projectedLines = lineTransformation(lineType, optionsObject)(
      initialProjectedLines
    )

    projectedLines.forEach(d => {
      fullDataset = [
        ...fullDataset,
        ...d.data
          .filter((p, q) => defined(Object.assign({}, p.data, p), q))
          .map(p => {
            const mappedP: ProjectedPoint = {
              parentLine: d,
              y: p.y,
              x: p.x,
              yTop: p.yTop,
              yMiddle: p.yMiddle,
              yBottom: p.yBottom,
              data: p.data
            }
            if (p.percent) {
              mappedP.percent = p.percent
            }
            return mappedP
          })
      ]
    })
  }

  if (areas) {
    projectedAreas = projectAreaData({
      data: areas,
      areaDataAccessor,
      xProp: projectedX,
      yProp: projectedY,
      yPropTop: projectedYTop,
      yPropBottom: projectedYBottom,
      xAccessor,
      yAccessor
    })
    projectedAreas.forEach(d => {
      const baseData = d._baseData
      if (d._xyfCoordinates[0][0][0]) {
        d._xyfCoordinates[0].forEach(multi => {
          fullDataset = [
            ...fullDataset,
            ...multi.map((p, q) =>
              Object.assign({ parentArea: d }, baseData[q], {
                [projectedX]: p[0],
                [projectedY]: p[1]
              })
            )
          ]
        })
      } else {
        fullDataset = [
          ...fullDataset,
          ...d._xyfCoordinates.map((p, q) =>
            Object.assign({ parentArea: d }, baseData[q], {
              [projectedX]: p[0],
              [projectedY]: p[1]
            })
          )
        ]
      }
    })
  }

  if (showLinePoints) {
    projectedPoints = fullDataset.map(d => ({
      ...d,
      [projectedY]: d[projectedYTop] || d[projectedYBottom] || d.y
    }))
  }

  const calculatedXExtent = extent(fullDataset.map(d => d[projectedX]))
  const calculatedYExtent = [
    min(
      fullDataset.map(
        d =>
          d[projectedYBottom] === undefined
            ? d[projectedY]
            : Math.min(d[projectedYTop], d[projectedYBottom])
      )
    ),

    max(
      fullDataset.map(
        d =>
          d[projectedYTop] === undefined
            ? d[projectedY]
            : Math.max(d[projectedYBottom], d[projectedYTop])
      )
    )
  ]

  const xMin =
    xExtent && xExtent[0] !== undefined ? xExtent[0] : calculatedXExtent[0]
  const xMax =
    xExtent && xExtent[1] !== undefined ? xExtent[1] : calculatedXExtent[1]

  const yMin =
    yExtent && yExtent[0] !== undefined ? yExtent[0] : calculatedYExtent[0]
  const yMax =
    yExtent && yExtent[1] !== undefined ? yExtent[1] : calculatedYExtent[1]

  let finalYExtent = [yMin, yMax]
  let finalXExtent = [xMin, xMax]

  if (invertX) {
    finalXExtent = [finalXExtent[1], finalXExtent[0]]
  }
  if (invertY) {
    finalYExtent = [finalYExtent[1], finalYExtent[0]]
  }

  if (areaType.type && areaType.type === "contour") {
    projectedAreas = contouring({
      areaType,
      data: projectedAreas,
      projectedX,
      projectedY,
      finalXExtent,
      finalYExtent
    })
  } else if (areaType.type && areaType.type === "hexbin") {
    projectedAreas = hexbinning({
      areaType,
      data: projectedAreas,
      projectedX,
      projectedY,
      finalXExtent,
      finalYExtent,
      size,
      xScaleType,
      yScaleType
    })
    fullDataset = [
      ...projectedAreas.map(d => d.data),
      ...fullDataset.filter(d => !d.parentArea)
    ]
  } else if (areaType.type && areaType.type === "heatmap") {
    projectedAreas = heatmapping({
      areaType,
      data: projectedAreas,
      projectedX,
      projectedY,
      finalXExtent,
      finalYExtent,
      size,
      xScaleType,
      yScaleType
    })

    fullDataset = [
      ...projectedAreas.map(d => ({ ...d })),
      ...fullDataset.filter(d => !d.parentArea)
    ]
  } /*else if (
    typeof areaType === "function" ||
    (areaType && areaType.type && typeof areaType.type === "function")
  ) {
    const areaFunction = areaType.type || areaType

    projectedAreas = areaFunction({
      xExtent: finalXExtent,
      yExtent: finalYExtent,
      projectedX,
      projectedY,
      fullDataset,
      projectedAreas
    })
  } */

  return {
    xExtent: finalXExtent,
    yExtent: finalYExtent,
    projectedLines,
    projectedPoints,
    projectedAreas,
    fullDataset,
    calculatedXExtent,
    calculatedYExtent
  }
}

const differenceCatch = (olineType, data) =>
  olineType === "difference" && data.length !== 2 ? "line" : olineType

function lineTransformation(lineType, options) {
  return data =>
    builtInTransformations[differenceCatch(lineType.type, data)]({
      ...lineType,
      ...options,
      data
    })
}
