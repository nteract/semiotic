// @flow

import { projectLineData, projectAreaData } from "../svg/lineDrawing"
import {
  projectedX,
  projectedY,
  projectedYTop,
  projectedYMiddle,
  projectedYBottom,
  projectedXBottom,
  projectedXMiddle,
  projectedXTop
} from "../constants/coordinateNames"
import {
  differenceLine,
  stackedArea,
  bumpChart,
  lineChart,
  cumulativeLine
} from "../svg/lineDrawing"

import { contouring, hexbinning, heatmapping } from "../svg/areaDrawing"
import { max, min } from "d3-array"

import { extentValue } from "./unflowedFunctions"

import type { ProjectedPoint, accessorType } from "../types/generalTypes"

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
  "line": lineChart,
  "area": lineChart,
  "cumulative": cumulativeLine,
  "cumulative-reverse": cumulativeLine
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
  accessor?: Function | string | boolean | Object | accessorType,
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
    xAccessor.forEach((actualXAccessor, xIndex) => {
      yAccessor.forEach((actualYAccessor, yIndex) => {
        points.forEach((d, i) => {
          const x = actualXAccessor(d, i)
          const y = actualYAccessor(d, i)
          const projectedPoint = { x, y, data: d, xIndex, yIndex }
          if (Array.isArray(y)) {
            projectedPoint[projectedYBottom] = Math.min(...y)
            projectedPoint[projectedYTop] = Math.max(...y)
            projectedPoint[projectedYMiddle] =
              (projectedPoint[projectedYBottom] +
                projectedPoint[projectedYTop]) /
              2
          }
          if (Array.isArray(x)) {
            projectedPoint[projectedXBottom] = Math.min(...x)
            projectedPoint[projectedXTop] = Math.max(...x)
            projectedPoint[projectedXMiddle] =
              (projectedPoint[projectedXBottom] +
                projectedPoint[projectedXTop]) /
              2
          }
          projectedPoints.push(projectedPoint)
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
      yPropBottom: projectedYBottom,
      xPropMiddle: projectedXMiddle,
      xPropTop: projectedXTop,
      xPropBottom: projectedXBottom
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
          multi
            .map((p, q) =>
              Object.assign({ parentArea: d }, baseData[q], {
                [projectedX]: p[0],
                [projectedY]: p[1]
              })
            )
            .forEach(e => fullDataset.push(e))
        })
      } else {
        d._xyfCoordinates
          .map((p, q) =>
            Object.assign({ parentArea: d }, baseData[q], {
              [projectedX]: p[0],
              [projectedY]: p[1]
            })
          )
          .forEach(e => fullDataset.push(e))
      }
    })
  }

  if (showLinePoints) {
    projectedPoints = fullDataset.map(d => ({
      ...d,
      [projectedY]: d[projectedYTop] || d[projectedYBottom] || d.y
    }))
  }

  const calculatedXExtent = [
    min(
      fullDataset.map(
        d =>
          d[projectedXBottom] === undefined
            ? d[projectedX]
            : Math.min(d[projectedXTop], d[projectedXBottom])
      )
    ),

    max(
      fullDataset.map(
        d =>
          d[projectedXTop] === undefined
            ? d[projectedX]
            : Math.max(d[projectedXBottom], d[projectedXTop])
      )
    )
  ]

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

  const actualXExtent: ?(number[]) = extentValue(xExtent)
  const actualYExtent: ?(number[]) = extentValue(yExtent)

  const xMin =
    actualXExtent && actualXExtent[0] !== undefined
      ? actualXExtent[0]
      : calculatedXExtent[0]
  const xMax =
    actualXExtent && actualXExtent[1] !== undefined
      ? actualXExtent[1]
      : calculatedXExtent[1]

  const yMin =
    actualYExtent && actualYExtent[0] !== undefined
      ? actualYExtent[0]
      : calculatedYExtent[0]
  const yMax =
    actualYExtent && actualYExtent[1] !== undefined
      ? actualYExtent[1]
      : calculatedYExtent[1]

  let finalYExtent = [yMin, yMax]
  let finalXExtent = [xMin, xMax]

  if (invertX && !(actualXExtent && actualXExtent.length === 2)) {
    finalXExtent = [finalXExtent[1], finalXExtent[0]]
  }

  if (
    (lineType.type === "bumpline" || invertY) &&
    !(actualYExtent && actualYExtent.length === 2)
  ) {
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
      processedData: areas && !!areas[0].processedData,
      preprocess: false,
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
      processedData: areas && !!areas[0].processedData,
      preprocess: false,
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
  }

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
