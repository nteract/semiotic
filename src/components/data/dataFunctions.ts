import { projectLineData, projectSummaryData } from "../svg/lineDrawing"
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

import {
  contouring,
  hexbinning,
  heatmapping,
  trendlining
} from "../svg/areaDrawing"
import { max, min } from "d3-array"

import { extentValue } from "./unflowedFunctions"

import {
  ProjectedPoint,
  ProjectedLine,
  ProjectedSummary,
  ProjectedBin,
  RawSummary,
  RawPoint,
  RawLine,
  LineTypeSettings,
  SummaryTypeSettings,
  AccessorFnType,
  GenericObject
} from "../types/generalTypes"

const whichPointsHash = {
  top: projectedYTop,
  bottom: projectedYBottom
}

const builtInTransformations = {
  stackedarea: stackedArea,
  "stackedarea-invert": stackedArea,
  stackedpercent: stackedArea,
  "stackedpercent-invert": stackedArea,
  linepercent: stackedArea,
  difference: differenceLine,
  bumparea: bumpChart,
  bumpline: bumpChart,
  "bumparea-invert": bumpChart,
  line: lineChart,
  area: lineChart,
  cumulative: cumulativeLine,
  "cumulative-reverse": cumulativeLine
}

type validStrFnTypes =
  | boolean
  | string
  | number
  | GenericObject
  | GenericObject[]
  | RawPoint
  | RawPoint[]

export function stringToFn<StrFnType extends validStrFnTypes>(
  accessor?:
    | ((args?: GenericObject, index?: number) => StrFnType)
    | string
    | StrFnType,
  defaultAccessor?: (arg?: GenericObject, i?: number) => StrFnType,
  raw?: boolean
): (d?: GenericObject, i?: number) => StrFnType {
  if (!accessor && defaultAccessor) {
    return defaultAccessor
  } else if (typeof accessor === "object") {
    return () => accessor
  } else if (accessor instanceof Function) {
    return accessor
  } else if (raw === true) {
    const castAccessor = (accessor as unknown) as StrFnType
    return () => castAccessor
  } else if (typeof accessor === "string") {
    return (d: GenericObject) => d[accessor]
  }

  return () => undefined
}

export function stringToArrayFn<StrFnType extends validStrFnTypes>(
  accessor?:
    | ((arg?: GenericObject, index?: number) => StrFnType)
    | string
    | StrFnType
    | Array<
        | ((arg?: GenericObject, index?: number) => StrFnType)
        | string
        | StrFnType
      >,
  defaultAccessor?: (arg?: GenericObject, index?: number) => StrFnType,
  raw?: boolean
): Array<(arg?: GenericObject, index?: number) => StrFnType> {
  if (accessor === undefined) {
    return [stringToFn<StrFnType>(undefined, defaultAccessor, raw)]
  }
  let arrayOfAccessors = []
  if (Array.isArray(accessor)) {
    arrayOfAccessors = accessor
  } else {
    arrayOfAccessors = [accessor]
  }

  return arrayOfAccessors.map(a =>
    stringToFn<StrFnType>(a, defaultAccessor, raw)
  )
}

type CalculateDataTypes = {
  lineDataAccessor: Array<Function>
  summaryDataAccessor: Array<Function>
  summaryStyleFn: Function
  summaryClassFn: Function
  summaryRenderModeFn: Function
  xAccessor: Array<Function>
  yAccessor: Array<Function>
  summaries?: Array<RawSummary>
  points?: Array<RawPoint>
  lines?: Array<RawLine>
  lineType: LineTypeSettings
  showLinePoints?: boolean | string
  showSummaryPoints?: boolean
  xExtent?: Array<number> | object
  yExtent?: Array<number> | object
  invertX?: boolean
  invertY?: boolean
  summaryType: SummaryTypeSettings
  adjustedSize: Array<number>
  chartSize: Array<number>
  xScaleType: Function
  yScaleType: Function
  baseMarkProps?: object
  margin: object
  defined?: Function
}

export const calculateDataExtent = ({
  lineDataAccessor,
  xAccessor,
  yAccessor,
  summaries,
  points,
  lines,
  lineType,
  showLinePoints,
  showSummaryPoints,
  xExtent,
  yExtent,
  invertX,
  invertY,
  summaryDataAccessor,
  summaryType,
  adjustedSize: size,
  margin,
  baseMarkProps,
  summaryStyleFn,
  summaryClassFn,
  summaryRenderModeFn,
  chartSize,
  defined = () => true
}: CalculateDataTypes) => {
  let fullDataset: Array<ProjectedPoint | ProjectedBin | ProjectedSummary> = []
  let initialProjectedLines = []

  let projectedPoints: Array<ProjectedPoint> = [],
    projectedLines: Array<ProjectedLine> = [],
    projectedSummaries: Array<ProjectedSummary> = []
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

    fullDataset = [
      ...projectedPoints.map(d => ({
        ...d,
        [projectedY]: d[projectedYTop] || d[projectedYBottom] || d.y
      }))
    ]
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

    projectedLines.forEach((d: ProjectedLine) => {
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
    if (showLinePoints) {
      const whichPoints =
        showLinePoints === true
          ? projectedYMiddle
          : whichPointsHash[showLinePoints]
      projectedPoints = fullDataset.map(d => {
        return {
          ...d,
          [projectedY]:
            d[whichPoints] !== undefined
              ? d[whichPoints]
              : d[projectedYMiddle] !== undefined
              ? d[projectedYMiddle]
              : d[projectedYBottom] !== undefined
              ? d[projectedYBottom]
              : d.y
        }
      })
    }
  }

  if (summaries) {
    projectedSummaries = projectSummaryData({
      data: summaries,
      summaryDataAccessor,
      xAccessor,
      yAccessor
    })

    projectedSummaries.forEach(d => {
      const baseData = d._baseData
      if (d._xyfCoordinates[0][0][0]) {
        d._xyfCoordinates[0].forEach(multi => {
          if (Array.isArray(multi)) {
            multi
              .map((p, q) =>
                Object.assign({ parentSummary: d }, baseData[q], {
                  [projectedX]: p[0],
                  [projectedY]: p[1]
                })
              )
              .forEach(e => {
                if (showSummaryPoints) {
                  projectedPoints.push({
                    x: 0,
                    ...e,
                    [projectedY]:
                      e[projectedYTop] || e[projectedYBottom] || e[projectedY]
                  })
                }
                fullDataset.push({ x: 0, y: 0, ...e })
              })
          }
        })
      } else {
        if (Array.isArray(d._xyfCoordinates)) {
          const coordArray: number[][] = d._xyfCoordinates as number[][]
          coordArray
            .map((p, q) => ({
              parentSummary: d,
              ...baseData[q],
              [projectedX]: p[0],
              [projectedY]: p[1]
            }))
            .forEach(e => {
              if (showSummaryPoints) {
                projectedPoints.push({
                  x: 0,
                  ...e,
                  [projectedY]:
                    e[projectedYTop] || e[projectedYBottom] || e[projectedY]
                })
              }
              fullDataset.push({ x: 0, y: 0, ...e })
            })
        }
      }
    })
  }

  const calculatedXExtent = [
    min(
      fullDataset.map(d =>
        d[projectedXBottom] === undefined
          ? d[projectedX]
          : Math.min(d[projectedXTop], d[projectedXBottom])
      )
    ),

    max(
      fullDataset.map(d =>
        d[projectedXTop] === undefined
          ? d[projectedX]
          : Math.max(d[projectedXBottom], d[projectedXTop])
      )
    )
  ]

  const calculatedYExtent = [
    min(
      fullDataset.map(d =>
        d[projectedYBottom] === undefined
          ? d[projectedY]
          : Math.min(d[projectedYTop], d[projectedYBottom])
      )
    ),

    max(
      fullDataset.map(d =>
        d[projectedYTop] === undefined
          ? d[projectedY]
          : Math.max(d[projectedYBottom], d[projectedYTop])
      )
    )
  ]

  const actualXExtent: number[] = extentValue(xExtent)
  const actualYExtent: number[] = extentValue(yExtent)

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

  if (summaryType.type && summaryType.type === "contour") {
    projectedSummaries = contouring({
      summaryType,
      data: projectedSummaries,
      finalXExtent,
      finalYExtent
    })
  } else if (summaryType.type && summaryType.type === "hexbin") {
    projectedSummaries = hexbinning({
      summaryType,
      data: projectedSummaries,
      processedData: summaries && !!summaries[0].processedData,
      preprocess: false,
      finalXExtent,
      finalYExtent,
      size,
      margin,
      baseMarkProps,
      styleFn: summaryStyleFn,
      classFn: summaryClassFn,
      renderFn: summaryRenderModeFn,
      chartSize
    })
    fullDataset = [
      ...projectedSummaries.map(d => ({ ...d })),
      ...fullDataset.filter(d => !d.parentSummary)
    ]
  } else if (summaryType.type && summaryType.type === "heatmap") {
    projectedSummaries = heatmapping({
      summaryType,
      data: projectedSummaries,
      processedData: summaries && !!summaries[0].processedData,
      preprocess: false,
      finalXExtent,
      finalYExtent,
      size,
      margin,
      baseMarkProps,
      styleFn: summaryStyleFn,
      classFn: summaryClassFn,
      renderFn: summaryRenderModeFn,
      chartSize
    })

    fullDataset = [
      ...projectedSummaries.map(d => ({ ...d })),
      ...fullDataset.filter(d => !d.parentSummary)
    ]
  } else if (summaryType.type && summaryType.type === "trendline") {
    projectedSummaries = trendlining({
      summaryType,
      data: projectedSummaries,
      processedData: summaries && !!summaries[0].processedData,
      preprocess: false,
      finalXExtent,
      finalYExtent,
      size,
      margin,
      baseMarkProps,
      styleFn: summaryStyleFn,
      classFn: summaryClassFn,
      renderFn: summaryRenderModeFn,
      chartSize
    })

    fullDataset = [
      ...projectedSummaries.map(d => ({ ...d })),
      ...fullDataset.filter(d => !d.parentSummary)
    ]
  }

  return {
    xExtent: finalXExtent,
    yExtent: finalYExtent,
    projectedLines,
    projectedPoints,
    projectedSummaries,
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
