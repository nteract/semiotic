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

export const stringToFn = (accessor, defaultAccessor, raw) => {
  if (!accessor) {
    return defaultAccessor
  } else if (typeof accessor !== "function" && raw) {
    return () => accessor
  }
  return typeof accessor !== "function" ? d => d[accessor] : accessor
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
  projection,
  areaType,
  adjustedSize: size,
  xScaleType,
  yScaleType,
  defined = () => true
}) => {
  lineDataAccessor = stringToFn(
    lineDataAccessor,
    d => (Array.isArray(d) ? d : d.coordinates)
  )

  xAccessor = stringToFn(xAccessor, d => d[0])
  yAccessor = stringToFn(yAccessor, d => d[1])
  areaDataAccessor = stringToFn(
    areaDataAccessor,
    d => (Array.isArray(d) ? d : d.coordinates)
  )

  let fullDataset = []
  let initialProjectedLines = []

  let projectedPoints = [],
    projectedLines = [],
    projectedAreas = []
  if (points) {
    projectedPoints = points.map((d, i) => {
      const x = xAccessor(d, i)
      const y = yAccessor(d, i)
      return { [projectedX]: x, [projectedY]: y, data: d }
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
      xAccessor: xAccessor,
      yAccessor: yAccessor
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
            const mappedP = {
              parentLine: d,
              [projectedY]: p[projectedY],
              [projectedX]: p[projectedX],
              [projectedYTop]: p[projectedYTop],
              [projectedYMiddle]: p[projectedYMiddle],
              [projectedYBottom]: p[projectedYBottom],
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
      projection,
      xProp: projectedX,
      yProp: projectedY,
      yPropTop: projectedYTop,
      yPropBottom: projectedYBottom,
      xAccessor: xAccessor,
      yAccessor: yAccessor
    })
    projectedAreas.forEach(d => {
      const baseData = areaDataAccessor(d)
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

  if (
    areaType &&
    (areaType === "contour" || (areaType.type && areaType.type === "contour"))
  ) {
    projectedAreas = contouring({
      areaType,
      data: projectedAreas,
      projectedX,
      projectedY,
      finalXExtent,
      finalYExtent
    })
  } else if (
    areaType &&
    (areaType === "hexbin" || (areaType.type && areaType.type === "hexbin"))
  ) {
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
  } else if (
    areaType &&
    (areaType === "heatmap" || (areaType.type && areaType.type === "heatmap"))
  ) {
    projectedAreas = heatmapping({
      areaType,
      data: projectedAreas,
      projectedX,
      projectedY,
      finalXExtent,
      finalYExtent,
      size
    })
    console.log("projectedAreas", projectedAreas)
    fullDataset = [
      ...projectedAreas.map(d => ({ ...d })),
      ...fullDataset.filter(d => !d.parentArea)
    ]
  } else if (
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

function lineTransformation(lineType = { type: "line" }, options) {
  const differenceCatch = (olineType, data) =>
    (lineType === "difference" ||
      (lineType.type && lineType.type === "difference")) &&
    data.length !== 2
      ? "line"
      : olineType
  if (builtInTransformations[lineType]) {
    return data =>
      builtInTransformations[differenceCatch(lineType, data)]({
        type: lineType,
        ...options,
        data
      })
  }

  if (builtInTransformations[lineType.type]) {
    return data =>
      builtInTransformations[differenceCatch(lineType.type, data)]({
        ...lineType,
        ...options,
        data
      })
  }

  //otherwise assume a function
  return data => lineType({ ...options, data })
}
