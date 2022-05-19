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
  trendlining,
  lineBounding
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
  GenericObject,
  ExtentType,
  MarginType
} from "../types/generalTypes"

const baseDefinedFunction = () => true

const whichPointsHashY = {
  top: projectedYTop,
  bottom: projectedYBottom,
  orphan: projectedY
}

const whichPointsHashX = {
  top: projectedXTop,
  bottom: projectedXBottom,
  orphan: projectedX
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
    const castAccessor = accessor as unknown as StrFnType
    return () => castAccessor
  } else if (typeof accessor === "string") {
    return (d: GenericObject) => (d ? d[accessor] : undefined)
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

  return arrayOfAccessors.map((a) =>
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
  xExtent?: ExtentType
  yExtent?: ExtentType
  invertX?: boolean
  invertY?: boolean
  summaryType: SummaryTypeSettings
  adjustedSize: Array<number>
  chartSize: Array<number>
  xScaleType: Function
  yScaleType: Function
  baseMarkProps?: object
  margin: MarginType
  defined?: Function
  annotations: object[]
  filterRenderedLines: (
    value: ProjectedLine,
    index: number,
    array: ProjectedLine[]
  ) => any
  filterRenderedSummaries: (
    value: ProjectedSummary,
    index: number,
    array: ProjectedSummary[]
  ) => any
  filterRenderedPoints: (
    value: ProjectedPoint | ProjectedBin | ProjectedSummary,
    index: number,
    array: (ProjectedPoint | ProjectedBin | ProjectedSummary)[]
  ) => any
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
  filterRenderedLines,
  filterRenderedSummaries,
  filterRenderedPoints,
  defined = baseDefinedFunction,
  annotations = []
}: CalculateDataTypes) => {
  let fullDataset: Array<ProjectedPoint | ProjectedBin | ProjectedSummary> = []
  let initialProjectedLines = []

  let projectedPoints: Array<ProjectedPoint> = [],
    projectedLines: Array<ProjectedLine> = [],
    projectedSummaries: Array<ProjectedSummary> = []
  if (points) {
    xAccessor.forEach((actualXAccessor, xIndex) => {
      yAccessor.forEach((actualYAccessor, yIndex) => {
        let i = 0
        for (const d of points) {
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
          i++
        }
      })
    })

    fullDataset = [
      ...projectedPoints.map((d) => ({
        ...d,
        [projectedX]: d[projectedXTop] || d[projectedXBottom] || d.x,
        [projectedY]: d[projectedYTop] || d[projectedYBottom] || d.y
      }))
    ]
  }
  if (lines) {
    initialProjectedLines = projectLineData({
      data: lines,
      lineDataAccessor,
      xProp: projectedX,
      xPropTop: projectedXTop,
      xPropBottom: projectedXBottom,
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

    projectedLines = lineTransformation(
      lineType,
      optionsObject
    )(initialProjectedLines)

    projectedLines.forEach((d: ProjectedLine) => {
      fullDataset = [
        ...fullDataset,
        ...d.data
          .filter((p, q) => defined(Object.assign({}, p.data, p), q))
          .map((p) => {
            const mappedP: ProjectedPoint = {
              parentLine: d,
              y: p.y,
              x: p.x,
              xTop: p.xTop,
              xMiddle: p.xMiddle,
              xBottom: p.xBottom,
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
      const whichPointsX =
        showLinePoints === true
          ? projectedXMiddle
          : whichPointsHashX[showLinePoints]

      const whichPointsY =
        showLinePoints === true
          ? projectedYMiddle
          : whichPointsHashY[showLinePoints]

      projectedLines.forEach((d: ProjectedLine) => {
        d.data
          .filter((p, q) => {
            const isDefined = defined(Object.assign({}, p.data, p))
            if (isDefined) {
              if (showLinePoints === "orphan") {
                const prePoint = d.data[q - 1]
                const postPoint = d.data[q + 1]

                if (
                  (!prePoint ||
                    !defined(Object.assign({}, prePoint.data, prePoint))) &&
                  (!postPoint ||
                    !defined(Object.assign({}, postPoint.data, postPoint)))
                ) {
                  return true
                } else {
                  return false
                }
              } else {
                return true
              }
            } else {
              return false
            }
          })
          .forEach((p) => {
            projectedPoints.push({
              ...p,
              parentLine: d,
              [projectedY]:
                p[whichPointsY] !== undefined
                  ? p[whichPointsY]
                  : p[projectedYMiddle] !== undefined
                  ? p[projectedYMiddle]
                  : p[projectedYBottom] !== undefined
                  ? p[projectedYBottom]
                  : p.y,
              [projectedX]:
                p[whichPointsX] !== undefined
                  ? p[whichPointsX]
                  : p[projectedXMiddle] !== undefined
                  ? p[projectedXMiddle]
                  : p[projectedXBottom] !== undefined
                  ? p[projectedXBottom]
                  : p.y
            })
          })
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

    projectedSummaries.forEach((d) => {
      const baseData = d._baseData

      if (d._xyfCoordinates.length > 0 && d._xyfCoordinates[0][0][0]) {
        d._xyfCoordinates[0].forEach((multi) => {
          if (Array.isArray(multi)) {
            multi
              .map((p, q) =>
                Object.assign({ parentSummary: d }, baseData[q], {
                  [projectedX]: p[0],
                  [projectedY]: p[1]
                })
              )
              .forEach((e) => {
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
      } else if (d._xyfCoordinates.length > 0) {
        if (Array.isArray(d._xyfCoordinates)) {
          const coordArray: [number, number][] = d._xyfCoordinates as [
            number,
            number
          ][]
          coordArray
            .map((p, q) => ({
              parentSummary: d,
              ...baseData[q],
              [projectedX]: p[0],
              [projectedY]: p[1]
            }))
            .forEach((e) => {
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

  let suitableXAnnotations = []
  let suitableYAnnotations = []

  if (
    xExtent &&
    !Array.isArray(xExtent) &&
    xExtent.includeAnnotations === true
  ) {
    xAccessor.forEach((actualXAccessor) => {
      annotations.forEach((annotation, annotationIndex) => {
        const x = actualXAccessor(annotation, annotationIndex)
        if (isFinite(x)) {
          suitableXAnnotations.push({
            [projectedX]: x
          })
        }
      })
    })
  }

  if (
    yExtent &&
    !Array.isArray(yExtent) &&
    yExtent.includeAnnotations === true
  ) {
    yAccessor.forEach((actualYAccessor) => {
      annotations.forEach((annotation, annotationIndex) => {
        const y = actualYAccessor(annotation, annotationIndex)
        if (isFinite(y)) {
          suitableYAnnotations.push({
            [projectedY]: y
          })
        }
      })
    })
  }

  const dataForXExtent = [...fullDataset, ...suitableXAnnotations]
  const dataForYExtent = [...fullDataset, ...suitableYAnnotations]

  const calculatedXExtent = [
    min(
      dataForXExtent.map((d) =>
        d[projectedXBottom] === undefined
          ? d[projectedX]
          : Math.min(d[projectedXTop], d[projectedXBottom])
      )
    ),

    max(
      dataForXExtent.map((d) =>
        d[projectedXTop] === undefined
          ? d[projectedX]
          : Math.max(d[projectedXBottom], d[projectedXTop])
      )
    )
  ]

  const calculatedYExtent = [
    min(
      dataForYExtent.map((d) =>
        d[projectedYBottom] === undefined
          ? d[projectedY]
          : Math.min(d[projectedYTop], d[projectedYBottom])
      )
    ),

    max(
      dataForYExtent.map((d) =>
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
  } else if (summaryType.type && summaryType.type === "linebounds") {
    projectedSummaries = lineBounding({
      summaryType,
      data: projectedSummaries,
      defined
    })
  } else if (summaryType.type && summaryType.type === "hexbin") {
    projectedSummaries = hexbinning({
      summaryType,
      data: projectedSummaries[0],
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
    }) as unknown as ProjectedSummary[]

    fullDataset = [
      ...projectedSummaries.map((d) => ({ ...d })),
      ...fullDataset.filter((d) => !d.parentSummary)
    ]
  } else if (summaryType.type && summaryType.type === "heatmap") {
    projectedSummaries = heatmapping({
      summaryType,
      data: projectedSummaries[0],
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
    }) as unknown as ProjectedSummary[]

    fullDataset = [
      ...projectedSummaries.map((d) => ({ ...d })),
      ...fullDataset.filter((d) => !d.parentSummary)
    ]
  } else if (summaryType.type && summaryType.type === "trendline") {
    projectedSummaries = trendlining({
      summaryType,
      data: projectedSummaries[0],
      preprocess: summaries && !!summaries[0].processedData,
      finalXExtent
    })

    fullDataset = [
      ...projectedSummaries.map((d) => ({ ...d })),
      ...fullDataset.filter((d) => !d.parentSummary)
    ]
  }

  if (filterRenderedLines) {
    projectedLines = projectedLines.filter(filterRenderedLines)
    fullDataset = fullDataset.filter((d: ProjectedPoint, i) => {
      return !d.parentLine || filterRenderedLines(d.parentLine, i, [])
    })
  }
  if (filterRenderedPoints) {
    fullDataset = fullDataset.filter(filterRenderedPoints)
  }
  if (filterRenderedSummaries) {
    projectedSummaries = projectedSummaries.filter(filterRenderedSummaries)
    fullDataset = fullDataset.filter((d: ProjectedPoint, i) => {
      return !d.parentSummary || filterRenderedSummaries(d.parentSummary, i, [])
    })
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

const differenceCatch = (olineType, data) => {
  if (
    !builtInTransformations[olineType] ||
    (olineType === "difference" && data.length !== 2)
  ) {
    return "line"
  }
  return olineType
}

function lineTransformation(lineType, options) {
  return (data) =>
    builtInTransformations[differenceCatch(lineType.type, data)]({
      ...lineType,
      ...options,
      data
    })
}
