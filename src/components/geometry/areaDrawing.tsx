import * as React from "react"
import { scaleLinear } from "d3-scale"
import regression from "regression"
import { curveCardinal } from "d3-shape"

import { ProjectedPoint } from "../types/generalTypes"
import { SummaryLayoutType } from "../types/xyTypes"
import { ProjectedSummary } from "../types/generalTypes"

// Re-export from new locations for backwards compatibility
export { contouring } from "./contourLayout"
export { hexbinning } from "./hexbinLayout"

const generateLineBounds = (
  xydata,
  basedata,
  topBoundingAccessor,
  bottomBoundingAccessor
) => {
  const tops = xydata.map((d, i) => [
    d[0],
    d[1] + topBoundingAccessor(basedata[i])
  ])
  const bottoms = xydata.map((d, i) => [
    d[0],
    d[1] - bottomBoundingAccessor(basedata[i])
  ])
  return [...tops, ...bottoms.reverse()]
}

export function lineBounding({ summaryType, data, defined }) {
  let projectedSummaries = []
  if (!summaryType.type) {
    summaryType = { type: summaryType }
  }

  const {
    boundingAccessor,
    topBoundingAccessor = boundingAccessor,
    bottomBoundingAccessor = boundingAccessor
  } = summaryType

  data.forEach((lineData) => {
    const definedData = lineData._baseData.map(defined)
    let currentBaseData = []
    let currentXYFC = []
    const boundingPieces = [
      {
        xyf: currentXYFC,
        base: currentBaseData
      }
    ]
    definedData.forEach((d, i) => {
      if (d === true) {
        currentBaseData.push(lineData._baseData[i])
        currentXYFC.push(lineData._xyfCoordinates[i])
      } else if (definedData[i + 1]) {
        currentBaseData = []
        currentXYFC = []
        boundingPieces.push({
          xyf: currentXYFC,
          base: currentBaseData
        })
      }
    })

    boundingPieces.forEach(({ xyf, base }) => {
      const boundingProjectedSummary = {
        data: lineData,
        parentSummary: lineData,
        _xyfCoordinates: generateLineBounds(
          xyf,
          base,
          topBoundingAccessor,
          bottomBoundingAccessor
        )
      }

      projectedSummaries = [...projectedSummaries, boundingProjectedSummary]
    })
  })

  return projectedSummaries
}

export function heatmapping({
  preprocess = true,
  processedData = false,
  summaryType: baseSummaryType,
  data: baseData,
  finalXExtent = [
    Math.min(...baseData.coordinates.map((d) => d.x)),
    Math.max(...baseData.coordinates.map((d) => d.x))
  ],
  finalYExtent = [
    Math.min(...baseData.coordinates.map((d) => d.y)),
    Math.max(...baseData.coordinates.map((d) => d.y))
  ],
  size,
  xScaleType = scaleLinear(),
  yScaleType = scaleLinear(),
  margin,
  styleFn,
  classFn,
  renderFn,
  chartSize
}: SummaryLayoutType) {
  if (processedData && baseData) {
    return baseData.coordinates
  }

  if (baseData.coordinates && !baseData._xyfCoordinates) {
    baseData._xyfCoordinates = baseData.coordinates.map((d) => [d.x, d.y])
  }

  const data = Array.isArray(baseData) ? baseData : [baseData]

  let projectedSummaries: ProjectedSummary[] = []

  let summaryType: Record<string, any>
  if (!baseSummaryType.type) {
    summaryType = { type: summaryType }
  } else {
    summaryType = baseSummaryType
  }

  const {
    //    binGraphic = "square",
    binValue = (d) => d.length,
    xBins = summaryType.yBins || 0.05,
    yBins = xBins,
    xCellPx = !summaryType.xBins && summaryType.xCellPx,
    yCellPx = !summaryType.yBins && summaryType.yCellPx,
    customMark,
    binMax
  } = summaryType
  const xBinPercent = xBins < 1 ? xBins : 1 / xBins
  const yBinPercent = yBins < 1 ? yBins : 1 / yBins

  const heatmapBinXScale = xScaleType.domain(finalXExtent).range([0, size[0]])
  const heatmapBinYScale = yScaleType.domain(finalYExtent).range([size[1], 0])

  const actualResolution = [
    Math.ceil(((xCellPx && xCellPx / size[0]) || xBinPercent) * size[0] * 10) /
      10,
    Math.ceil(((yCellPx && yCellPx / size[1]) || yBinPercent) * size[1] * 10) /
      10
  ]
  let maxValue = -Infinity

  data.forEach((heatmapData) => {
    const grid = []
    const flatGrid = []

    let cell
    let gridColumn

    for (let i = 0; Math.ceil(i) < size[0]; i += actualResolution[0]) {
      const x = heatmapBinXScale.invert(i)
      const x1 = heatmapBinXScale.invert(i + actualResolution[0])

      gridColumn = []
      grid.push(gridColumn)
      for (let j = 0; Math.ceil(j) < size[1]; j += actualResolution[1]) {
        const y = heatmapBinYScale.invert(j)
        const y1 = heatmapBinYScale.invert(j + actualResolution[1])
        cell = {
          gx: i,
          gy: j,
          gw: actualResolution[0],
          gh: actualResolution[1],
          x: (x + x1) / 2,
          y: (y + y1) / 2,
          binItems: [],
          value: 0,
          _xyfCoordinates: [
            [x, y],
            [x1, y],
            [x1, y1],
            [x, y1]
          ],
          parentSummary: heatmapData
        }
        gridColumn.push(cell)
        flatGrid.push(cell)
      }
      gridColumn.push(cell)
    }
    grid.push(gridColumn)

    heatmapData._xyfCoordinates.forEach((d: [number, number], di: number) => {
      const baseX = heatmapBinXScale(d[0]) as number
      const baseY = heatmapBinYScale(d[1]) as number

      const xCoordinate = Math.floor(baseX / actualResolution[0])
      const yCoordinate = Math.floor(baseY / actualResolution[1])

      if (grid[xCoordinate][yCoordinate]) {
        grid[xCoordinate][yCoordinate].binItems.push(
          heatmapData.coordinates[di]
        )
      }
    })

    flatGrid.forEach((d) => {
      d.value = binValue(d.binItems)
      maxValue = Math.max(maxValue, d.value)
    })

    flatGrid.forEach((d) => {
      d.percent = d.value / maxValue
      d.customMark = customMark && (
        <g transform={`translate(${d.gx},${d.gy})`}>
          {customMark({
            d,
            margin,
            styleFn,
            classFn,
            renderFn,
            chartSize,
            adjustedSize: size
          })}
        </g>
      )
    })

    projectedSummaries = [...projectedSummaries, ...flatGrid]
  })
  if (binMax) {
    binMax(maxValue)
  }
  if (preprocess) {
    const preprocessedSummary: ProjectedSummary = {
      type: "heatmap",
      processedData: true,
      _baseData: [],
      _xyfCoordinates: [],
      data: [],
      bounds: [],
      x: 0,
      y: 0,
      coordinates: projectedSummaries,
      binMax: maxValue
    }
    return preprocessedSummary
  }

  return projectedSummaries
}

export function trendlining({
  preprocess = false,
  summaryType: baseSummaryType,
  data: baseData,
  finalXExtent = [
    Math.min(...baseData.coordinates.map((d) => d.x)),
    Math.max(...baseData.coordinates.map((d) => d.x))
  ],
  xScaleType = scaleLinear()
}: SummaryLayoutType) {
  if (preprocess) {
    return baseData[0].coordinates
  }

  let projectedSummaries = []

  let summaryType: Record<string, any>
  if (!baseSummaryType.type) {
    summaryType = { type: summaryType }
  } else {
    summaryType = baseSummaryType
  }

  const {
    regressionType: baseRegressionType = "linear",
    order = 2,
    precision = 4,
    controlPoints = 20,
    curve = curveCardinal
  } = summaryType

  let regressionType = baseRegressionType

  if (
    finalXExtent[0] < 0 &&
    (baseRegressionType === "logarithmic" ||
      baseRegressionType === "power" ||
      baseRegressionType === "exponential")
  ) {
    console.error(
      `Cannot use this ${baseRegressionType} regressionType type with value range that goes below 0, defaulting to linear`
    )
    regressionType = "linear"
  }

  if (baseData.coordinates && !baseData._xyfCoordinates) {
    baseData._xyfCoordinates = baseData.coordinates.map((d) => [d.x, d.y])
  }

  const data = Array.isArray(baseData) ? baseData : [baseData]

  const xScale = xScaleType.domain([0, 1]).range(finalXExtent)

  projectedSummaries = []
  data.forEach((bdata) => {
    const regressionLine = regression[regressionType](
      bdata._xyfCoordinates.map((d) => {
        let x = d[0]
        let y = d[1]

        if (typeof x !== "number") {
          x = x.getTime()
        }
        if (typeof y !== "number") {
          y = y.getTime()
        }

        return [x, y]
      }),
      {
        order,
        precision
      }
    )
    const controlStep = 1 / controlPoints

    let steps = [0, 1]

    if (regressionType !== "linear") {
      steps = []
      for (let step = 0; step < 1 + controlStep; step += controlStep) {
        steps.push(step)
      }
    }

    const controlPointArray = []

    steps.forEach((controlPoint) => {
      controlPointArray.push(regressionLine.predict(xScale(controlPoint)))
    })

    projectedSummaries.push({
      centroid: false,
      customMark: undefined,
      data: bdata,
      parentSummary: bdata,
      value: regressionLine.string,
      r2: regressionLine.r2,
      curve,
      _xyfCoordinates: controlPointArray
    })
  })

  return projectedSummaries
}

export function shapeBounds(coordinates) {
  let left = [Infinity, 0]
  let right = [-Infinity, 0]
  let top = [0, Infinity]
  let bottom = [0, -Infinity]
  coordinates.forEach((d) => {
    left = d[0] < left[0] ? d : left
    right = d[0] > right[0] ? d : right
    bottom = d[1] > bottom[1] ? d : bottom
    top = d[1] < top[1] ? d : top
  })

  return {
    center: [(left[0] + right[0]) / 2, (top[1] + bottom[1]) / 2],
    top,
    left,
    right,
    bottom
  }
}
