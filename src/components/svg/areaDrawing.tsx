import * as React from "react"
import { contourDensity } from "d3-contour"
import { scaleLinear } from "d3-scale"
import { hexbin } from "d3-hexbin"
import regression from "regression"
import { curveCardinal } from "d3-shape"

import { ProjectedPoint, GenericObject } from "../types/generalTypes"

interface BinArray {
  [position: number]: number
  x?: number
  y?: number
}

export function contouring({ summaryType, data, finalXExtent, finalYExtent }) {
  let projectedSummaries = []
  if (!summaryType.type) {
    summaryType = { type: summaryType }
  }

  const {
    resolution = 500,
    thresholds = 10,
    bandwidth = 20,
    neighborhood
  } = summaryType

  const xScale = scaleLinear()
    .domain(finalXExtent)
    .rangeRound([0, resolution])
    .nice()
  const yScale = scaleLinear()
    .domain(finalYExtent)
    .rangeRound([resolution, 0])
    .nice()

  data.forEach(contourData => {
    let contourProjectedSummaries = contourDensity()
      .size([resolution, resolution])
      .x(d => xScale(d[0]))
      .y(d => yScale(d[1]))
      .thresholds(thresholds)
      .bandwidth(bandwidth)(contourData._xyfCoordinates)

    if (neighborhood) {
      contourProjectedSummaries = [contourProjectedSummaries[0]]
    }

    const max = Math.max(...contourProjectedSummaries.map(d => d.value))

    contourProjectedSummaries.forEach(summary => {
      summary.parentSummary = contourData
      summary.bounds = []
      summary.percent = summary.value / max
      summary.coordinates.forEach(poly => {
        poly.forEach((subpoly, i) => {
          poly[i] = subpoly.map(coordpair => {
            coordpair = [
              xScale.invert(coordpair[0]),
              yScale.invert(coordpair[1])
            ]
            return coordpair
          })
          //Only push bounds for the main poly, not its interior rings, otherwise you end up labeling interior cutouts
          if (i === 0) {
            summary.bounds.push(shapeBounds(poly[i]))
          }
        })
      })
    })
    projectedSummaries = [...projectedSummaries, ...contourProjectedSummaries]
  })

  return projectedSummaries
}

export function hexbinning({
  preprocess = true,
  processedData = false,
  summaryType,
  data: baseData,
  finalXExtent = [
    Math.min(...baseData.coordinates.map(d => d.x)),
    Math.max(...baseData.coordinates.map(d => d.x))
  ],
  finalYExtent = [
    Math.min(...baseData.coordinates.map(d => d.y)),
    Math.max(...baseData.coordinates.map(d => d.y))
  ],
  size,
  xScaleType = scaleLinear(),
  yScaleType = scaleLinear(),
  margin,
  baseMarkProps,
  styleFn,
  classFn,
  renderFn,
  chartSize
}) {
  if (processedData) {
    return baseData[0].coordinates
  }

  let projectedSummaries = []
  if (!summaryType.type) {
    summaryType = { type: summaryType }
  }

  const {
    //    binGraphic = "hex",
    bins = 0.05,
    cellPx,
    binValue = d => d.length,
    binMax,
    customMark
  } = summaryType

  if (baseData.coordinates && !baseData._xyfCoordinates) {
    baseData._xyfCoordinates = baseData.coordinates.map(d => [d.x, d.y])
  }

  const data = Array.isArray(baseData) ? baseData : [baseData]

  const hexBinXScale = xScaleType.domain(finalXExtent).range([0, size[0]])
  const hexBinYScale = yScaleType.domain(finalYExtent).range([0, size[1]])

  const actualResolution =
    (cellPx && cellPx / 2) || ((bins > 1 ? 1 / bins : bins) * size[0]) / 2

  const hexbinner = hexbin()
    .x(d => hexBinXScale(d._xyfPoint[0]))
    .y(d => hexBinYScale(d._xyfPoint[1]))
    .radius(actualResolution)
    .size(size)

  let hexMax
  const allHexes: ProjectedPoint[] = hexbinner.centers()

  data.forEach(hexbinData => {
    hexMax = 0
    const hexes = hexbinner(
      hexbinData._xyfCoordinates.map((d, i) => ({
        _xyfPoint: d,
        ...hexbinData.coordinates[i]
      }))
    )

    const centerHash = {}

    hexes.forEach(d => {
      centerHash[`${parseInt(d.x)}-${parseInt(d.y)}`] = true
    })

    allHexes.forEach(hexCenter => {
      if (!centerHash[`${parseInt(hexCenter[0])}-${parseInt(hexCenter[1])}`]) {
        const newHex: BinArray = []
        newHex.x = hexCenter[0]
        newHex.y = hexCenter[1]
        hexes.push(newHex)
      }
    })

    hexMax = Math.max(...hexes.map(d => binValue(d)))

    if (binMax) {
      binMax(hexMax)
    }

    //Option for blank hexe
    const hexBase = [
      [0, -1],
      [0.866, -0.5],
      [0.866, 0.5],
      [0, 1],
      [-0.866, 0.5],
      [-0.866, -0.5]
    ]

    const hexWidth = hexBinXScale.invert(actualResolution) - finalXExtent[0]
    const hexHeight = hexBinYScale.invert(actualResolution) - finalYExtent[0]

    const hexacoordinates = hexBase.map(d => [
      d[0] * hexWidth,
      d[1] * hexHeight
    ])

    const hexbinProjectedSummaries = hexes.map((d: GenericObject) => {
      const hexValue = binValue(d)
      const gx = d.x
      const gy = d.y
      d.x = hexBinXScale.invert(d.x)
      d.y = hexBinYScale.invert(d.y)
      const percent = hexValue / hexMax
      return {
        customMark: customMark && (
          <g transform={`translate(${gx},${size[1] - gy})`}>
            {customMark({
              d: {
                ...d,
                binItems: d,
                percent,
                value: hexValue,
                radius: actualResolution,
                hexCoordinates: hexBase.map(d => [
                  d[0] * actualResolution,
                  d[1] * actualResolution
                ])
              },
              baseMarkProps,
              margin,
              styleFn,
              classFn,
              renderFn,
              chartSize,
              adjustedSize: size
            })}
          </g>
        ),
        _xyfCoordinates: hexacoordinates.map(p => [p[0] + d.x, p[1] + d.y]),
        value: hexValue,
        percent,
        data: d,
        parentSummary: hexbinData,
        centroid: true
      }
    })
    projectedSummaries = [...projectedSummaries, ...hexbinProjectedSummaries]
  })

  if (preprocess) {
    projectedSummaries.forEach(d => {
      d.x = d.data.x
      d.y = d.data.y
    })
    return {
      type: "hexbin",
      processedData: true,
      coordinates: projectedSummaries,
      binMax: hexMax
    }
  }

  return projectedSummaries
}
// ADD PRECALC AND EXPOSE PRECALC FUNCTION

export function heatmapping({
  preprocess = true,
  processedData = false,
  summaryType,
  data: baseData,
  finalXExtent = [
    Math.min(...baseData.coordinates.map(d => d.x)),
    Math.max(...baseData.coordinates.map(d => d.x))
  ],
  finalYExtent = [
    Math.min(...baseData.coordinates.map(d => d.y)),
    Math.max(...baseData.coordinates.map(d => d.y))
  ],
  size,
  xScaleType = scaleLinear(),
  yScaleType = scaleLinear(),
  margin,
  baseMarkProps,
  styleFn,
  classFn,
  renderFn,
  chartSize
}) {
  if (processedData) {
    return baseData[0].coordinates
  }

  if (baseData.coordinates && !baseData._xyfCoordinates) {
    baseData._xyfCoordinates = baseData.coordinates.map(d => [d.x, d.y])
  }

  const data = Array.isArray(baseData) ? baseData : [baseData]

  let projectedSummaries = []
  if (!summaryType.type) {
    summaryType = { type: summaryType }
  }

  const {
    //    binGraphic = "square",
    binValue = d => d.length,
    xBins = summaryType.yBins || 0.05,
    yBins = xBins,
    xCellPx = !summaryType.xBins && summaryType.yCellPx,
    yCellPx = !summaryType.yBins && xCellPx,
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

  data.forEach(heatmapData => {
    const grid = []
    const flatGrid = []

    let cell
    let gridColumn

    for (let i = 0; i < size[0]; i += actualResolution[0]) {
      const x = heatmapBinXScale.invert(i)
      const x1 = heatmapBinXScale.invert(i + actualResolution[0])

      gridColumn = []
      grid.push(gridColumn)
      for (let j = 0; j < size[1]; j += actualResolution[1]) {
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
          _xyfCoordinates: [[x, y], [x1, y], [x1, y1], [x, y1]],
          parentSummary: heatmapData
        }
        gridColumn.push(cell)
        flatGrid.push(cell)
      }
      gridColumn.push(cell)
    }
    grid.push(gridColumn)

    heatmapData._xyfCoordinates.forEach((d: number[], di: number) => {
      const xCoordinate = Math.floor(
        heatmapBinXScale(d[0]) / actualResolution[0]
      )
      const yCoordinate = Math.floor(
        heatmapBinYScale(d[1]) / actualResolution[1]
      )
      grid[xCoordinate][yCoordinate].binItems.push(heatmapData.coordinates[di])
    })

    flatGrid.forEach(d => {
      d.value = binValue(d.binItems)
      maxValue = Math.max(maxValue, d.value)
    })

    flatGrid.forEach(d => {
      d.percent = d.value / maxValue
      d.customMark = customMark && (
        <g transform={`translate(${d.gx},${d.gy})`}>
          {customMark({
            d,
            baseMarkProps,
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
    return {
      type: "heatmap",
      processedData: true,
      coordinates: projectedSummaries,
      binMax: maxValue
    }
  }

  return projectedSummaries
}

export function trendlining({
  preprocess = true,
  processedData = false,
  summaryType,
  data: baseData,
  finalXExtent = [
    Math.min(...baseData.coordinates.map(d => d.x)),
    Math.max(...baseData.coordinates.map(d => d.x))
  ],
  finalYExtent = [
    Math.min(...baseData.coordinates.map(d => d.y)),
    Math.max(...baseData.coordinates.map(d => d.y))
  ],
  size,
  xScaleType = scaleLinear(),
  yScaleType = scaleLinear(),
  margin,
  baseMarkProps,
  styleFn,
  classFn,
  renderFn,
  chartSize
}) {
  if (processedData) {
    return baseData[0].coordinates
  }

  let projectedSummaries = []
  if (!summaryType.type) {
    summaryType = { type: summaryType }
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
    baseData._xyfCoordinates = baseData.coordinates.map(d => [d.x, d.y])
  }

  const data = Array.isArray(baseData) ? baseData : [baseData]

  const xScale = xScaleType.domain([0, 1]).range(finalXExtent)

  projectedSummaries = []
  data.forEach(bdata => {
    const regressionLine = regression[regressionType](
      bdata._xyfCoordinates.map(d => [
        d[0].getTime ? d[0].getTime() : d[0],
        d[1].getTime ? d[1].getTime() : d[1]
      ]),
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

    steps.forEach(controlPoint => {
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
  coordinates.forEach(d => {
    left = d[0] < left[0] ? d : left
    right = d[0] > right[0] ? d : right
    bottom = d[1] > bottom[1] ? d : bottom
    top = d[1] < top[1] ? d : top
  })

  return { center: [(left[0] + right[0]) / 2, (top[1] + bottom[1]) / 2], top, left, right, bottom }
}
