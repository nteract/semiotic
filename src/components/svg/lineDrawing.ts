import { sum } from "d3-array"

import { findFirstAccessorValue } from "../data/multiAccessorUtils"

import {
  ProjectedLine,
  ProjectedPoint,
  RawLine,
  RawSummary
} from "../types/generalTypes"
import { AnnotationType } from "../types/annotationTypes"

const datesForUnique = (d) => (d instanceof Date ? d.getTime() : d)

type SummaryProjectionTypes = {
  data: Array<RawSummary>
  summaryDataAccessor: Array<Function>
  xAccessor: Array<Function>
  yAccessor: Array<Function>
}

type LineProjectionTypes = {
  data: Array<RawLine>
  lineDataAccessor: Array<Function>
  xProp: string
  xPropTop?: string
  xPropBottom?: string
  yProp: string
  yPropTop?: string
  yPropBottom?: string
  xAccessor: Array<Function>
  yAccessor: Array<Function>
}

type DifferenceLineProps = {
  data: Array<ProjectedLine>
  yProp: string
  yPropTop: string
  yPropBottom: string
}

type StackedAreaTypes = {
  type: string
  data: Array<ProjectedLine>
  xProp: string
  yProp: string
  yPropMiddle: string
  sort?: (a: ProjectedLine, b: ProjectedLine) => number
  yPropTop: string
  yPropBottom: string
}

type CumulativeLineTypes = {
  type: string
  data: Array<ProjectedLine>
  yPropMiddle: string
  yPropTop: string
  yPropBottom: string
  y1?: Function
}

type LineChartTypes = {
  data: Array<ProjectedLine>
  y1?: Function
  x1?: Function
  yPropTop: string
  yPropMiddle: string
  yPropBottom: string
  xPropTop: string
  xPropMiddle: string
  xPropBottom: string
}

type RelativeYTypes = {
  point?: ProjectedPoint | AnnotationType
  projectedYMiddle: string
  projectedY: string
  yAccessor: Array<Function>
  yScale: Function
  showLinePoints?: boolean | string
}

type RelativeXTypes = {
  point?: ProjectedPoint | AnnotationType
  projectedXMiddle: string
  projectedX: string
  xAccessor: Array<Function>
  xScale: Function
}

export const projectSummaryData = ({
  data,
  summaryDataAccessor,
  xAccessor,
  yAccessor
}: SummaryProjectionTypes) => {
  const projectedData = []
  summaryDataAccessor.forEach((actualSummaryAccessor) => {
    xAccessor.forEach((actualXAccessor) => {
      yAccessor.forEach((actualYAccessor) => {
        const projection = (d: Object) =>
          actualSummaryAccessor(d).map((p, q) => [
            actualXAccessor(p, q),
            actualYAccessor(p, q)
          ])

        data.forEach((d) => {
          projectedData.push({
            ...d,
            _baseData: actualSummaryAccessor(d),
            _xyfCoordinates: projection(d)
          })
        })
      })
    })
  })

  return projectedData
}

export const projectLineData = ({
  data,
  lineDataAccessor,
  xProp,
  xPropTop,
  xPropBottom,
  yProp,
  yPropTop,
  yPropBottom,
  xAccessor,
  yAccessor
}: LineProjectionTypes) => {
  if (!Array.isArray(data)) {
    data = [data]
  }
  const projectedLine: Array<ProjectedLine> = []

  lineDataAccessor.forEach((actualLineAccessor, lineIndex) => {
    xAccessor.forEach((actualXAccessor, xIndex) => {
      yAccessor.forEach((actualYAccessor, yIndex) => {
        data.forEach((d: ProjectedLine) => {
          const originalLineData = { ...d, xIndex, yIndex, lineIndex }

          originalLineData.data = actualLineAccessor(d).map((p, q) => {
            const originalCoords = { data: p }

            originalCoords[xProp] = actualXAccessor(p, q)
            originalCoords[xPropTop] = originalCoords[xProp]
            originalCoords[xPropBottom] = originalCoords[xProp]
            originalCoords[yProp] = actualYAccessor(p, q)
            originalCoords[yPropTop] = originalCoords[yProp]
            originalCoords[yPropBottom] = originalCoords[yProp]

            return originalCoords
          })
          originalLineData.key = originalLineData.key || projectedLine.length
          projectedLine.push(originalLineData)
        })
      })
    })
  })

  return projectedLine
}

export const differenceLine = ({
  data,
  yProp,
  yPropTop,
  yPropBottom
}: DifferenceLineProps) => {
  data.forEach((l, i) => {
    l.data.forEach((point, q) => {
      const otherLine = i === 0 ? 1 : 0
      if (point[yProp] > data[otherLine].data[q][yProp]) {
        point[yPropBottom] = data[otherLine].data[q][yProp]
        point[yPropTop] = point[yProp]
      } else {
        point[yPropTop] = point[yProp]
        point[yPropBottom] = point[yProp]
      }
    })
  })

  return data
}

export const stackedArea = ({
  type = "stackedarea",
  data,
  xProp,
  yProp,
  yPropMiddle,
  sort,
  yPropTop,
  yPropBottom
}: StackedAreaTypes) => {
  const a = performance.now()
  const valueMap = new Map()
  const lineSums = data.map(() => 0)

  let lineIndex = 0
  for (const line of data) {
    line.__lineIndex = lineIndex
    for (const coord of line.data) {
      const coordX = datesForUnique(coord[xProp])
      lineSums[lineIndex] += coord[yProp]
      if (!valueMap.has(coordX)) {
        valueMap.set(coordX, [])
      }
      valueMap.get(coordX).push(coord)
    }
    lineIndex++
  }

  let stackSort = (a, b) => lineSums[b.key] - lineSums[a.key]
  if (type === "stackedpercent-invert" || type === "stackedarea-invert") {
    stackSort = (a, b) => lineSums[a.key] - lineSums[b.key]
  }
  sort = sort === undefined ? stackSort : sort

  if (sort !== null) {
    data = data.sort(sort)
  }

  const lineIndexSortLookup = data.map((line) => line.__lineIndex)

  for (const [, coordsAtX] of valueMap) {
    let negativeOffset = 0
    let positiveOffset = 0

    const positiveStepTotal = sum(coordsAtX, (d) =>
      d[yProp] > 0 ? d[yProp] : 0
    )
    const negativeStepTotal = sum(coordsAtX, (d) =>
      d[yProp] < 0 ? d[yProp] : 0
    )

    for (const newIndex of lineIndexSortLookup) {
      const l = coordsAtX[newIndex]
      if (l[yProp] < 0) {
        if (
          type === "linepercent" ||
          type === "stackedpercent" ||
          type === "stackedpercent-invert"
        ) {
          const percent = l[yProp] / negativeStepTotal
          l.percent = percent
          if (type === "linepercent") {
            l[yPropBottom] =
              l[yPropBottom] =
              l[yPropTop] =
              l[yPropMiddle] =
                percent
          } else {
            const adjustment = negativeStepTotal >= 0 ? 0 : percent
            l[yPropBottom] =
              negativeStepTotal === 0
                ? 0
                : -(negativeOffset / negativeStepTotal)
            l[yPropTop] = l[yPropBottom] - adjustment
            l[yPropMiddle] = l[yPropBottom] - adjustment / 2
          }
        } else {
          l[yPropBottom] = negativeOffset
          l[yPropTop] = negativeOffset + l[yProp]
          l[yPropMiddle] = negativeOffset + l[yProp] / 2
        }
        negativeOffset += l[yProp]
      } else {
        if (
          type === "linepercent" ||
          type === "stackedpercent" ||
          type === "stackedpercent-invert"
        ) {
          const percent = l[yProp] / positiveStepTotal
          l.percent = percent

          if (type === "linepercent") {
            l[yPropBottom] = l[yPropTop] = l[yPropMiddle] = percent
          } else {
            const adjustment = positiveStepTotal <= 0 ? 0 : percent
            l[yPropBottom] =
              positiveStepTotal === 0 ? 0 : positiveOffset / positiveStepTotal
            l[yPropTop] = l[yPropBottom] + adjustment
            l[yPropMiddle] = l[yPropBottom] + adjustment / 2
          }
        } else {
          l[yPropBottom] = positiveOffset
          l[yPropTop] = positiveOffset + l[yProp]
          l[yPropMiddle] = positiveOffset + l[yProp] / 2
        }
        positiveOffset += l[yProp]
      }
    }
  }

  return data
}

export const lineChart = ({
  data,
  y1,
  x1,
  yPropTop,
  yPropMiddle,
  yPropBottom,
  xPropTop,
  xPropMiddle,
  xPropBottom
}: LineChartTypes) => {
  if (y1) {
    data.forEach((d) => {
      d.data.forEach((p) => {
        p[yPropBottom] = y1(p)
        p[yPropMiddle] = (p[yPropBottom] + p[yPropTop]) / 2
      })
    })
  }

  if (x1) {
    data.forEach((d) => {
      d.data.forEach((p) => {
        p[xPropBottom] = x1(p)
        p[xPropMiddle] = (p[xPropBottom] + p[xPropTop]) / 2
      })
    })
  }

  return data
}

export const cumulativeLine = ({
  data,
  y1,
  yPropTop,
  yPropMiddle,
  yPropBottom,
  type = "cumulative"
}: CumulativeLineTypes) => {
  data.forEach((d) => {
    let cumulativeValue = 0
    const dataArray = type === "cumulative-reverse" ? d.data.reverse() : d.data
    dataArray.forEach((p) => {
      cumulativeValue += p[yPropTop]
      p[yPropBottom] = p[yPropTop] = p[yPropMiddle] = cumulativeValue
      if (y1) {
        p[yPropBottom] = y1(p)
        p[yPropMiddle] = p[yPropBottom] + p[yPropTop] / 2
      }
    })
  })

  return data
}

export const bumpChart = ({
  type = "bumpline",
  data,
  xProp,
  yProp,
  yPropMiddle,
  yPropTop,
  yPropBottom
}: StackedAreaTypes) => {
  const uniqXValues = data
    .map((d) => d.data.map((p) => datesForUnique(p[xProp])))
    .reduce((a, b) => a.concat(b), [])
    .reduce((p, c) => {
      if (p.indexOf(c) === -1) {
        p.push(c)
      }
      return p
    }, [])

  let bumpSort = (a, b) => {
    if (a[yProp] > b[yProp]) {
      return 1
    }
    if (a[yProp] < b[yProp]) {
      return -1
    }
    return -1
  }
  if (type === "bumparea-invert" || type === "bumpline-invert") {
    bumpSort = (a, b) => {
      if (a[yProp] < b[yProp]) {
        return 1
      }
      if (a[yProp] > b[yProp]) {
        return -1
      }
      return -1
    }
  }

  uniqXValues.forEach((xValue) => {
    let negativeOffset = 0
    let positiveOffset = 0

    data
      .map((d) => d.data.filter((p) => datesForUnique(p[xProp]) === xValue))
      .reduce((a, b) => a.concat(b), [])
      .sort(bumpSort)
      .forEach((l, rank) => {
        //determine ranking and offset by the number of less than this one at each step
        l._XYFrameRank = rank + 1
        if (type === "bumparea" || type === "bumparea-invert") {
          if (l[yProp] < 0) {
            l[yPropTop] = negativeOffset + l[yProp]
            l[yPropMiddle] = negativeOffset + l[yProp] / 2
            l[yPropBottom] = negativeOffset
            negativeOffset += l[yProp]
          } else {
            l[yPropTop] = positiveOffset + l[yProp]
            l[yPropMiddle] = positiveOffset + l[yProp] / 2
            l[yPropBottom] = positiveOffset
            positiveOffset += l[yProp]
          }
        } else {
          l[yProp] = rank + 1
          l[yPropTop] = rank + 1
          l[yPropBottom] = rank + 1
        }
      })
  })

  return data
}

export const dividedLine = (
  parameters: Function,
  points: Array<Object>,
  searchIterations: number = 10
) => {
  let currentParameters = parameters(points[0], 0)
  let currentPointsArray = []
  const dividedLinesData = [
    { key: currentParameters, points: currentPointsArray }
  ]
  points.forEach((point, pointI) => {
    const newParameters = parameters(point, pointI)

    let matchingParams = newParameters === currentParameters
    const stringNewParams = JSON.stringify(newParameters)
    const stringCurrentParams = JSON.stringify(currentParameters)

    if (typeof currentParameters === "object") {
      matchingParams = stringNewParams === stringCurrentParams
    }

    if (matchingParams) {
      currentPointsArray.push(point)
    } else {
      const lastPoint = currentPointsArray[currentPointsArray.length - 1]
      let pointA = lastPoint
      let pointB = point
      let stringBParams = stringNewParams

      let x = 0
      while (x < searchIterations && stringNewParams === stringBParams) {
        const keys = Object.keys(pointA)
        const findPoints = simpleSearchFunction({
          pointA,
          pointB,
          currentParameters,
          parameters,
          keys
        })
        pointA = findPoints[0]
        pointB = findPoints[1]
        stringBParams = JSON.stringify(parameters(pointB))
        x++
      }
      currentPointsArray.push(pointB)
      currentPointsArray = [pointB, point]
      dividedLinesData.push({ key: newParameters, points: currentPointsArray })
      currentParameters = newParameters
    }
  })
  return dividedLinesData
}

function simpleSearchFunction({
  pointA,
  pointB,
  currentParameters,
  parameters,
  keys
}: {
  pointA: Object
  pointB: Object
  currentParameters: Object
  parameters: Function
  keys: Array<string>
}) {
  const betweenPoint = {}
  keys.forEach((key) => {
    betweenPoint[key] =
      typeof pointA[key] === "number"
        ? (pointA[key] + pointB[key]) / 2
        : undefined
  })
  const stringBetween = JSON.stringify(parameters(betweenPoint))
  const stringCurrent = JSON.stringify(currentParameters)

  if (stringBetween === stringCurrent) {
    return [betweenPoint, pointB]
  }
  return [pointA, betweenPoint]
}

export function funnelize({
  data,
  steps,
  key
}: {
  data: Array<Object>
  steps: Array<string>
  key: string
}) {
  const funnelData = []
  if (!Array.isArray(data)) {
    data = [data]
  }
  if (!steps) {
    steps = data.map((d) => Object.keys(d)).reduce((a, b) => a.concat(b), [])
  }

  data.forEach((datum, i) => {
    const datumKey = key ? datum[key] : i
    steps.forEach((step) => {
      const funnelDatum = { funnelKey: datumKey, stepName: "", stepValue: 0 }
      funnelDatum.stepName = step
      funnelDatum.stepValue = datum[step] ? datum[step] : 0
      funnelData.push(funnelDatum)
    })
  })

  return funnelData
}

const whichPoint = {
  bottom: "yBottom",
  top: "yTop"
}

export function relativeY({
  point,
  projectedY,
  yAccessor,
  yScale,
  showLinePoints
}: RelativeYTypes) {
  const baseData =
    point &&
    (showLinePoints &&
    showLinePoints !== true &&
    point[whichPoint[showLinePoints]] !== undefined
      ? point[whichPoint[showLinePoints]]
      : point.yMiddle !== undefined
      ? point.yMiddle
      : point[projectedY] !== undefined
      ? point[projectedY]
      : findFirstAccessorValue(yAccessor, point))

  if (Array.isArray(baseData)) {
    return baseData.map((d) => yScale(d))
  }
  return baseData !== undefined ? yScale(baseData) : 0
}

export function relativeX({
  point,
  projectedXMiddle,
  projectedX,
  xAccessor,
  xScale
}: RelativeXTypes) {
  const baseData =
    point &&
    (point[projectedXMiddle] !== undefined
      ? point[projectedXMiddle]
      : point[projectedX] !== undefined
      ? point[projectedX]
      : findFirstAccessorValue(xAccessor, point))

  if (Array.isArray(baseData)) {
    return baseData.map((d) => xScale(d))
  }
  return baseData !== undefined ? xScale(baseData) : 0
}

export function findPointByID({
  point,
  idAccessor,
  lines,
  xScale,
  projectedX,
  xAccessor
}: {
  point: ProjectedPoint
  idAccessor: Function
  lines: { data: ProjectedLine[] }
  xScale: Function
  projectedX: string
  xAccessor: Array<Function>
}) {
  const pointID = idAccessor(point.parentLine || point)

  if (pointID) {
    const thisLine = lines.data.find((l) => idAccessor(l) === pointID)

    if (!thisLine) {
      return null
    }
    const pointX = xScale(findFirstAccessorValue(xAccessor, point))
    const thisPoint = thisLine.data.find(
      (p) => xScale(p[projectedX]) === pointX
    )

    if (!thisPoint) {
      return null
    }

    const newPoint = {
      ...point,
      ...thisPoint,
      ...thisPoint.data,
      parentLine: thisLine
    }
    const reactAnnotationProps = [
      "type",
      "label",
      "note",
      "connector",
      "disabled",
      "color",
      "subject"
    ]

    reactAnnotationProps.forEach((prop) => {
      if (point[prop]) newPoint[prop] = point[prop]
    })
    return newPoint
  }
  return point
}
