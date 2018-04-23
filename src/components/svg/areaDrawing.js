import { contourDensity } from "d3-contour"
import { scaleLinear } from "d3-scale"
import polylabel from "@mapbox/polylabel"
import { hexbin } from "d3-hexbin"
import { circlePath } from "./frameFunctions"

export function contouring({ areaType, data, finalXExtent, finalYExtent }) {
  let projectedAreas = []
  if (!areaType.type) {
    areaType = { type: areaType }
  }

  const {
    resolution = 500,
    thresholds = 10,
    bandwidth = 20,
    neighborhood
  } = areaType

  const xScale = scaleLinear()
    .domain(finalXExtent)
    .rangeRound([0, resolution])
    .nice()
  const yScale = scaleLinear()
    .domain(finalYExtent)
    .rangeRound([resolution, 0])
    .nice()

  data.forEach(contourData => {
    let contourProjectedAreas = contourDensity()
      .size([resolution, resolution])
      .x(d => xScale(d[0]))
      .y(d => yScale(d[1]))
      .thresholds(thresholds)
      .bandwidth(bandwidth)(contourData._xyfCoordinates)

    if (neighborhood) {
      contourProjectedAreas = [contourProjectedAreas[0]]
    }

    contourProjectedAreas.forEach(area => {
      area.parentArea = contourData
      area.bounds = []
      area.coordinates.forEach(poly => {
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
            area.bounds.push(shapeBounds(poly[i]))
          }
        })
      })
    })
    projectedAreas = [...projectedAreas, ...contourProjectedAreas]
  })

  return projectedAreas
}

export function hexbinning({
  areaType,
  data,
  finalXExtent,
  finalYExtent,
  size,
  xScaleType,
  yScaleType
}) {
  let projectedAreas = []
  if (!areaType.type) {
    areaType = { type: areaType }
  }

  const {
    binGraphic = "hex",
    bins = 0.05,
    cellPx,
    binValue = d => d.length
  } = areaType

  const hexBinXScale = xScaleType.domain(finalXExtent).range([0, size[0]])
  const hexBinYScale = yScaleType.domain(finalYExtent).range([0, size[1]])

  const actualResolution =
    (cellPx && cellPx / 2) || (bins > 1 ? 1 / bins : bins) * size[0] / 2

  const hexbinner = hexbin()
    .x(d => hexBinXScale(d._xyfPoint[0]))
    .y(d => hexBinYScale(d._xyfPoint[1]))
    .radius(actualResolution)
    .size(size)

  data.forEach(hexbinData => {
    const hexes = hexbinner(
      hexbinData._xyfCoordinates.map((d, i) => ({
        _xyfPoint: d,
        ...hexbinData.coordinates[i]
      }))
    )

    const hexMax = Math.max(...hexes.map(d => binValue(d)))

    //Option for blank hexes?
    const hexastring = hexbinner.hexagon()
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

    const hexbinProjectedAreas = hexes.map((d, i) => {
      const hexValue = binValue(d)
      d.x = hexBinXScale.invert(d.x)
      d.y = hexBinYScale.invert(d.y)
      d.binItems = d
      return {
        _xyfCoordinates: hexacoordinates.map(p => [p[0] + d.x, p[1] + d.y]),
        value: hexValue,
        percent: hexValue / hexMax,
        data: d,
        parentArea: hexbinData,
        centroid: true
      }
    })
    projectedAreas = [...projectedAreas, ...hexbinProjectedAreas]
  })

  return projectedAreas
}

export function heatmapping({
  areaType,
  data,
  finalXExtent,
  finalYExtent,
  size,
  xScale,
  yScale
}) {
  let projectedAreas = []
  if (!areaType.type) {
    areaType = { type: areaType }
  }

  const {
    binGraphic = "square",
    resolution = 0.05,
    binValue = d => d.length,
    xBins = areaType.yBins || 0.05,
    yBins = xBins,
    xCellPx = !areaType.xBins && areaType.yCellPx,
    yCellPx = !areaType.yBins && xCellPx
  } = areaType
  const xBinPercent = xBins < 1 ? xBins : 1 / xBins
  const yBinPercent = yBins < 1 ? yBins : 1 / yBins

  const actualResolution = [
    (xCellPx &&
      Math.abs(finalXExtent[1] - finalXExtent[0]) * (xCellPx / size[0])) ||
      Math.abs(finalXExtent[1] - finalXExtent[0]) * xBinPercent,
    (yCellPx &&
      Math.abs(finalYExtent[1] - finalYExtent[0]) * (yCellPx / size[1])) ||
      Math.abs(finalYExtent[1] - finalYExtent[0]) * yBinPercent
  ]

  const gridSize = [(xCellPx && size[0]) || 1000, (yCellPx && size[1]) || 1000]
  const stepSize = [
    xCellPx || parseInt(xBinPercent * 1000),
    yCellPx || parseInt(yBinPercent * 1000)
  ]

  const halfResolution = [actualResolution[0] / 2, actualResolution[1] / 2]

  data.forEach(heatmapData => {
    const grid = []
    const flatGrid = []

    let cell
    let gridColumn
    let x = finalXExtent[0]
    for (let i = 0; i < gridSize[0]; i += stepSize[0]) {
      gridColumn = []
      grid.push(gridColumn)
      let y = finalYExtent[0]
      for (let j = 0; j < gridSize[1]; j += stepSize[1]) {
        cell = {
          x: x + halfResolution[0],
          y: y + halfResolution[1],
          binItems: [],
          value: 0,
          _xyfCoordinates: [
            [x, y],
            [x + actualResolution[0], y],
            [x + actualResolution[0], y + actualResolution[1]],
            [x, y + actualResolution[1]]
          ],
          parentArea: heatmapData
        }
        gridColumn.push(cell)
        flatGrid.push(cell)
        y += actualResolution[1]
      }
      gridColumn.push(cell)
      x += actualResolution[0]
    }
    grid.push(gridColumn)

    heatmapData._xyfCoordinates.forEach((d, di) => {
      const xCoordinate = parseInt(
        (d[0] - finalXExtent[0]) / actualResolution[0]
      )
      const yCoordinate = parseInt(
        (d[1] - finalYExtent[0]) / actualResolution[1]
      )

      grid[xCoordinate][yCoordinate].binItems.push(heatmapData.coordinates[di])
    })

    let maxValue = -Infinity

    flatGrid.forEach(d => {
      d.value = binValue(d.binItems)
      maxValue = Math.max(maxValue, d.value)
    })

    flatGrid.forEach(d => {
      d.percent = d.value / maxValue
    })

    projectedAreas = [...projectedAreas, ...flatGrid]
  })

  return projectedAreas
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

  return { center: polylabel([coordinates]), top, left, right, bottom }
}
