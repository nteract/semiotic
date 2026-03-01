import * as React from "react"
import { hexbin } from "d3-hexbin"
import { scaleLinear } from "d3-scale"
import { ProjectedPoint } from "../types/generalTypes"
import { SummaryLayoutType } from "../types/xyTypes"

interface BinArray {
  [position: number]: number
  x?: number
  y?: number
}

export function hexbinning({
  preprocess = true,
  processedData = false,
  summaryType: baseSummaryType,
  data: baseData,
  finalXExtent: baseXExtent,
  finalYExtent: baseYExtent,
  size,
  xScaleType = scaleLinear(),
  yScaleType = scaleLinear(),
  margin,
  styleFn,
  classFn,
  renderFn,
  chartSize
}: SummaryLayoutType) {
  let finalXExtent = baseXExtent
  let finalYExtent = baseYExtent

  if (!finalXExtent) {
    const xData = baseData.coordinates.map((p) => p.x)
    finalXExtent = [Math.min(...xData), Math.max(...xData)]
  }

  if (!finalYExtent) {
    const yData = baseData.coordinates.map((p) => p.y)
    finalYExtent = [Math.min(...yData), Math.max(...yData)]
  }

  if (processedData && baseData) {
    return baseData.coordinates
  }

  let projectedSummaries = []
  let summaryType: Record<string, any>
  if (!baseSummaryType.type) {
    summaryType = { type: summaryType }
  } else {
    summaryType = baseSummaryType
  }

  const {
    bins = 0.05,
    cellPx,
    binValue = (d) => d.length,
    binMax,
    customMark
  } = summaryType

  if (baseData.coordinates && !baseData._xyfCoordinates) {
    baseData._xyfCoordinates = baseData.coordinates.map((d) => [d.x, d.y])
  }

  const data = Array.isArray(baseData) ? baseData : [baseData]

  const hexBinXScale = xScaleType.domain(finalXExtent).range([0, size[0]])
  const hexBinYScale = yScaleType.domain(finalYExtent).range([0, size[1]])

  const actualResolution =
    (cellPx && cellPx / 2) || ((bins > 1 ? 1 / bins : bins) * size[0]) / 2

  const hexbinner = hexbin()
    .x((d) => hexBinXScale(d._xyfPoint[0]))
    .y((d) => hexBinYScale(d._xyfPoint[1]))
    .radius(actualResolution)
    .size(size)

  let hexMax
  const allHexes: ProjectedPoint[] = hexbinner.centers()

  data.forEach((hexbinData) => {
    hexMax = 0
    const hexes = hexbinner(
      hexbinData._xyfCoordinates.map((d, i) => ({
        _xyfPoint: d,
        ...hexbinData.coordinates[i]
      }))
    )

    const centerHash = {}

    hexes.forEach((d) => {
      centerHash[`${parseInt(d.x)}-${parseInt(d.y)}`] = true
    })

    allHexes.forEach((hexCenter) => {
      if (!centerHash[`${parseInt(hexCenter[0])}-${parseInt(hexCenter[1])}`]) {
        const newHex: BinArray = []
        newHex.x = hexCenter[0]
        newHex.y = hexCenter[1]
        hexes.push(newHex)
      }
    })

    hexMax = Math.max(...hexes.map((d) => binValue(d)))

    if (binMax) {
      binMax(hexMax)
    }

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

    const hexacoordinates = hexBase.map((d) => [
      d[0] * hexWidth,
      d[1] * hexHeight
    ])

    const hexbinProjectedSummaries = hexes.map((d: Record<string, any>) => {
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
                hexCoordinates: hexBase.map((d) => [
                  d[0] * actualResolution,
                  d[1] * actualResolution
                ])
              },
              margin,
              styleFn,
              classFn,
              renderFn,
              chartSize,
              adjustedSize: size
            })}
          </g>
        ),
        _xyfCoordinates: hexacoordinates.map((p) => [p[0] + d.x, p[1] + d.y]),
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
    projectedSummaries.forEach((d) => {
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
