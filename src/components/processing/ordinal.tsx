import * as React from "react"

import { sum, max, min, extent } from "d3-array"

import { arc } from "d3-shape"
import {
  objectifyType,
  keyAndObjectifyBarData,
  orFrameAxisGenerator
} from "../svg/frameFunctions"
import { pointOnArcAtAngle } from "../svg/pieceDrawing"
import { drawSummaries } from "../svg/summaryLayouts"
import { axisGenerator } from "../svg/summaryAxis"


import { OrdinalPipelineCache } from "../data/ordinalPipelineCache"

import {
  OrdinalFrameProps,
  OrdinalFrameState,
  PieceTypeSettings,
  OExtentObject,
  ProjectedOrdinalSummary,
  LabelSettingsType
} from "../types/ordinalTypes"

import { AxisProps } from "../types/annotationTypes"

import { PieceLayoutType, GenericObject } from "../types/generalTypes"

import { scaleOrdinal, scaleLinear, ScaleBand, ScaleLinear } from "d3-scale"

import {
  layoutHash,
  midMod,
  zeroFunction,
  twoPI,
  naturalLanguageTypes
} from "./ordinalConstants"

import { generateColumnOverlays } from "./ordinalOverlays"
import { assembleRenderPipeline } from "./ordinalRenderPipeline"

export { layoutHash, midMod, zeroFunction, twoPI, naturalLanguageTypes } from "./ordinalConstants"
export { generateColumnOverlays } from "./ordinalOverlays"
export type { GenerateColumnOverlaysArgs } from "./ordinalOverlays"
export { assembleRenderPipeline } from "./ordinalRenderPipeline"
export type { AssembleRenderPipelineArgs } from "./ordinalRenderPipeline"

export const calculateMappedMiddles = (
  oScale: ScaleBand<string>,
  middleMax: number,
  padding: number
) => {
  const oScaleDomainValues = oScale.domain()

  const mappedMiddles = {}
  oScaleDomainValues.forEach((p, q) => {
    const base = oScale(p) - padding
    const next = oScaleDomainValues[q + 1]
      ? oScale(oScaleDomainValues[q + 1])
      : middleMax
    const diff = (next - base) / 2
    mappedMiddles[p] = base + diff
  })

  return mappedMiddles
}

export const calculateOrdinalFrame = (
  currentProps: OrdinalFrameProps,
  currentState: OrdinalFrameState,
  cache: OrdinalPipelineCache
) => {
  let oLabels
  const projectedColumns = {}

  const {
    oPadding: padding = 0,
    summaryType: baseSummaryType,
    type: baseType,
    connectorType: baseConnectorType,
    oAccessor: baseOAccessor,
    rAccessor: baseRAccessor,
    connectorStyle: baseConnectorStyle,
    style: baseStyle,
    rExtent: baseRExtent,
    oSort,
    pieceClass: basePieceClass,
    summaryStyle: baseSummaryStyle,
    summaryClass: baseSummaryClass,
    dynamicColumnWidth,
    projection,
    customHoverBehavior,
    customClickBehavior,
    customDoubleClickBehavior,
    size,
    pixelColumnWidth,
    title: baseTitle,
    oLabel,
    hoverAnnotation,
    pieceHoverAnnotation,
    summaryHoverAnnotation,
    backgroundGraphics,
    foregroundGraphics,
    oScaleType,
    rScaleType,
    legend,
    renderKey: baseRenderKey,
    data,
    margin: baseMargin,
    oExtent: baseOExtent,
    axes: baseAxes,
    pieceIDAccessor: basePieceIDAccessor,
    multiAxis,
    annotations,
    sketchyRenderingEngine
  } = currentProps

  const summaryType = objectifyType(baseSummaryType)
  const pieceType = objectifyType(baseType) as PieceTypeSettings
  const connectorType = objectifyType(baseConnectorType)

  const cachedAccessors = cache.accessorConversions(baseOAccessor, baseRAccessor, baseRenderKey, basePieceIDAccessor)

  const oAccessor = cachedAccessors.oAccessor
  const rAccessor = cachedAccessors.rAccessor
  const renderKey = cachedAccessors.renderKey

  const eventListenersGenerator = () => ({})

  const {
    connectorStyle, summaryStyle, pieceStyle, pieceClass, summaryClass,
    connectorClass: connectorClassFn, pieceRenderMode, summaryRenderMode,
    connectorRenderMode: connectorRenderModeFn,
    pieceCanvasRender, summaryCanvasRender, connectorCanvasRender
  } = cache.styleFns(
    baseConnectorStyle, baseSummaryStyle, baseStyle, basePieceClass, baseSummaryClass,
    currentProps.connectorClass, currentProps.renderMode, currentProps.summaryRenderMode,
    currentProps.connectorRenderMode,
    currentProps.canvasPieces, currentProps.canvasSummaries, currentProps.canvasConnectors
  )
  const title =
    typeof baseTitle === "object" &&
    !React.isValidElement(baseTitle) &&
    baseTitle !== null
      ? baseTitle
      : { title: baseTitle, orient: "top" }

  const pieceIDAccessor = cachedAccessors.pieceIDAccessor

  const originalRAccessor = Array.isArray(baseRAccessor)
    ? baseRAccessor
    : [baseRAccessor]

  const originalOAccessor = Array.isArray(baseOAccessor)
    ? baseOAccessor
    : [baseOAccessor]

  const { allData, multiExtents } = keyAndObjectifyBarData({
    data,
    renderKey,
    oAccessor,
    rAccessor,
    originalRAccessor,
    originalOAccessor,
    multiAxis
  })

  let columnOverlays

  const prevProps = currentState.props
  const shouldRecalculateOverlay =
    currentProps.data !== prevProps.data ||
    currentProps.size[0] !== prevProps.size[0] ||
    currentProps.size[1] !== prevProps.size[1] ||
    currentProps.margin !== prevProps.margin ||
    !currentState.columnOverlays ||
    currentState.columnOverlays.length === 0 ||
    currentProps.customClickBehavior !== prevProps.customClickBehavior ||
    currentProps.customDoubleClickBehavior !==
      prevProps.customDoubleClickBehavior ||
    currentProps.customHoverBehavior !== prevProps.customHoverBehavior

  let arrayWrappedAxis: AxisProps[] | undefined

  if (Array.isArray(baseAxes)) {
    arrayWrappedAxis = baseAxes.map((axisFnOrObject) =>
      typeof axisFnOrObject === "function"
        ? axisFnOrObject({ size: currentProps.size })
        : axisFnOrObject
    )
  } else if (baseAxes) {
    arrayWrappedAxis = [baseAxes].map((axisFnOrObject) =>
      typeof axisFnOrObject === "function"
        ? axisFnOrObject({ size: currentProps.size })
        : axisFnOrObject
    )
  }

  if (multiExtents && baseAxes) {
    arrayWrappedAxis.forEach((d, i) => {
      d.extentOverride = multiExtents[i]
    })
  }

  const { margin, adjustedPosition, adjustedSize } = cache.marginCalc(
    baseMargin, arrayWrappedAxis, title, oLabel, projection, size
  )

  const oExtentSettings: OExtentObject =
    baseOExtent === undefined || Array.isArray(baseOExtent)
      ? { extent: baseOExtent as string[] }
      : baseOExtent

  const calculatedOExtent = allData.reduce(
    (p: Array<string | number>, c: { column: string | number }) => {
      const baseOValue = c.column
      const oValue = baseOValue !== undefined ? String(baseOValue) : baseOValue

      if (p.indexOf(oValue) === -1) {
        p.push(oValue)
      }
      return p
    },
    []
  ) as string[]

  let oExtent: string[] =
    (oExtentSettings.extent as string[]) || (calculatedOExtent as string[])

  if (pieceType.type === "barpercent") {
    const oExtentSums = oExtent
      .map((d) =>
        allData
          .filter((p: { column: string }) => String(p.column) === d)
          .reduce((p, c: { value: number }) => p + c.value, 0)
      )
      .reduce((p, c, i) => {
        p[oExtent[i]] = c
        return p
      }, {})

    allData.forEach((d: { value?: number; column: string }) => {
      d.value = (oExtentSums[d.column] && d.value / oExtentSums[d.column]) || 0
    })

    pieceType.type = "bar"
  }

  if (pixelColumnWidth) {
    if (projection === "radial") {
      console.error("pixelColumnWidth is not honored in radial mode")
    } else if (projection === "vertical") {
      adjustedSize[0] = oExtent.length * pixelColumnWidth
    } else {
      adjustedSize[1] = oExtent.length * pixelColumnWidth
    }
  }

  const oDomain = (projection === "vertical" && [0, adjustedSize[0]]) || [
    0,
    adjustedSize[1]
  ]

  const cwHash = oExtent.reduce(
    (p, c) => {
      p[c] = (1 / oExtent.length) * oDomain[1]
      p.total += p[c]
      return p
    },
    { total: 0 }
  )

  const castOScaleType = oScaleType as unknown as (ScaleBand<string> & (() => ScaleBand<string>))

  const oScale = (dynamicColumnWidth
    ? scaleOrdinal()
    : castOScaleType?.domain
    ? castOScaleType
    : castOScaleType()) as ScaleBand<string>

  oScale.domain(oExtent)

  let maxColumnValues

  const rExtentSettings =
    baseRExtent === undefined || Array.isArray(baseRExtent)
      ? { extent: baseRExtent, onChange: undefined, includeAnnotations: false }
      : baseRExtent

  let rExtent = rExtentSettings.extent as number[]
  let subZeroRExtent = [0, 0]

  if (
    pieceType.type === "bar" &&
    summaryType.type &&
    summaryType.type !== "none"
  ) {
    pieceType.type = "none"
  }

  const annotationsForExtent = []

  if (rExtentSettings.includeAnnotations && annotations) {
    rAccessor.forEach((actualRAccessor) => {
      annotations.forEach((annotation, annotationIndex) => {
        const r = actualRAccessor(annotation, annotationIndex)
        if (isFinite(r)) {
          annotationsForExtent.push(r)
        }
      })
    })
  }

  if (pieceType.type === "timeline") {
    const rData = allData.map((d: { value: number }) => d.value)
    const leftExtent = extent(rData.map((d) => d[0]))
    const rightExtent = extent(rData.map((d) => d[1]))
    rExtent = extent([...leftExtent, ...rightExtent, ...annotationsForExtent])
  } else if (pieceType.type !== "bar") {
    rExtent = extent([
      ...allData.map((d: { value: number }) => d.value),
      ...annotationsForExtent
    ])
  } else {
    const nestedPositiveData = []
    const nestedNegativeData = []

    const positiveDataKeys = {}
    const negativeDataKeys = {}
    for (const datum of allData as { column: string; value: number }[]) {
      if (datum.value >= 0) {
        if (!positiveDataKeys[datum.column]) {
          positiveDataKeys[datum.column] = {
            column: datum.column,
            value: 0
          }
          nestedPositiveData.push(positiveDataKeys[datum.column])
        }
        positiveDataKeys[datum.column].value += datum.value
      } else {
        if (!negativeDataKeys[datum.column]) {
          negativeDataKeys[datum.column] = {
            column: datum.column,
            value: 0
          }
          nestedNegativeData.push(negativeDataKeys[datum.column])
        }
        negativeDataKeys[datum.column].value += datum.value
      }
    }

    const positiveAnnotations = annotationsForExtent.filter((d) => d > 0)

    rExtent = [
      0,
      nestedPositiveData.length === 0 && positiveAnnotations.length === 0
        ? 0
        : Math.max(
            max([
              ...nestedPositiveData.map((d: { value: number }) => d.value),
              ...positiveAnnotations
            ]),
            0
          )
    ]

    const negativeAnnotations = annotationsForExtent.filter((d) => d < 0)

    subZeroRExtent = [
      0,
      nestedNegativeData.length === 0
        ? 0
        : Math.min(
            min([
              ...nestedNegativeData.map((d: { value: number }) => d.value),
              ...negativeAnnotations
            ]),
            0
          )
    ]
    rExtent = [subZeroRExtent[1], rExtent[1]]
  }

  if ((pieceType.type === "clusterbar" || multiAxis) && rExtent[0] > 0) {
    rExtent[0] = 0
  }

  const calculatedRExtent = rExtent

  if (
    rExtentSettings.extent &&
    rExtentSettings.extent[0] !== undefined &&
    rExtentSettings.extent[1] !== undefined
  ) {
    rExtent = rExtentSettings.extent as number[]
  } else {
    if (
      rExtentSettings.extent &&
      rExtentSettings.extent[1] !== undefined &&
      rExtentSettings.extent[0] === undefined
    ) {
      rExtent[1] = rExtentSettings.extent[1]
    }

    if (
      rExtentSettings.extent &&
      rExtentSettings.extent[0] !== undefined &&
      rExtentSettings.extent[1] === undefined
    ) {
      rExtent[0] = rExtentSettings.extent[0]
    }
  }

  if (
    currentProps.invertR ||
    (rExtentSettings.extent &&
      rExtentSettings.extent[0] > rExtentSettings.extent[1])
  ) {
    rExtent = [rExtent[1], rExtent[0]]
  }

  const nestedPieces = {}

  for (const datum of allData as { column: string; value: number }[]) {
    if (!nestedPieces[datum.column]) {
      nestedPieces[datum.column] = []
    }
    nestedPieces[datum.column].push(datum)
  }

  if (oSort !== undefined) {
    oExtent = oExtent.sort((a, b) =>
      oSort(
        a,
        b,
        nestedPieces[a].map((d) => d.data),
        nestedPieces[b].map((d) => d.data)
      )
    )

    oScale.domain(oExtent)
  }

  if (dynamicColumnWidth) {
    let columnValueCreator
    if (typeof dynamicColumnWidth === "string") {
      columnValueCreator = (d) => sum(d, (p) => p.data[dynamicColumnWidth])
    } else {
      columnValueCreator = (d) => dynamicColumnWidth(d.map((p) => p.data))
    }
    const thresholdDomain = [0]
    const columnValues = []
    maxColumnValues = 0

    oExtent.forEach((d) => {
      const oValues = allData.filter((p: { column: string }) => p.column === d)
      const columnValue = columnValueCreator(oValues)

      columnValues.push(columnValue)
      maxColumnValues += columnValue
    })

    cwHash.total = 0
    oExtent.forEach((d, i) => {
      const oValue = columnValues[i]
      const stepValue = (oValue / maxColumnValues) * (oDomain[1] - oDomain[0])
      cwHash[d] = stepValue
      cwHash.total += stepValue
      if (i !== oExtent.length - 1) {
        thresholdDomain.push(stepValue + thresholdDomain[i])
      }
    })
    oScale.range(thresholdDomain)
  } else {
    oScale.range(oDomain)
  }

  const rDomain = (projection === "vertical" && [0, adjustedSize[1]]) || [
    0,
    adjustedSize[0]
  ]

  const castRScaleType = rScaleType as unknown as (ScaleLinear<number, number> & { (): ScaleLinear<number, number> })

  // if rScaleType has a domain that means it's instantiated, otherwise, it needs to be instantiated
  const instantiatedRScaleType = castRScaleType.domain
    ? castRScaleType
    : castRScaleType()

  const zeroCheck = instantiatedRScaleType(0)

  if (
    rExtentSettings.extent &&
    rExtentSettings.extent[0] !== undefined &&
    (isNaN(zeroCheck) || zeroCheck === -Infinity || zeroCheck === Infinity)
  ) {
    rExtent[0] = rExtentSettings.extent[0]
  }

  const rScale = instantiatedRScaleType.copy().domain(rExtent).range(rDomain)

  const rScaleReverse = scaleLinear().domain(rDomain).range(rDomain.reverse())

  const rScaleVertical = instantiatedRScaleType
    .copy()
    .domain(rExtent)
    .range(rDomain)

  const columnWidth = cwHash ? 0 : oScale.bandwidth()

  let pieceData = []

  let mappedMiddleSize = adjustedSize[1]
  if (projection === "vertical") {
    mappedMiddleSize = adjustedSize[0]
  }
  const mappedMiddles = calculateMappedMiddles(
    oScale,
    mappedMiddleSize,
    padding
  )

  pieceData = oExtent.map((d) => (nestedPieces[d] ? nestedPieces[d] : []))

  let zeroValue =
    projection === "vertical" ? rScaleReverse(rScale(0)) : rScale(0)

  if (
    (isNaN(zeroValue) || zeroValue === -Infinity || zeroValue === Infinity) &&
    rExtentSettings.extent &&
    rExtentSettings.extent[0] !== undefined &&
    (zeroCheck === -Infinity || zeroCheck === Infinity)
  ) {
    zeroValue =
      projection === "vertical"
        ? rScaleReverse(rScale(rExtentSettings.extent[0]))
        : rScale(rExtentSettings.extent[0])
  }

  oExtent.forEach((o, i) => {
    projectedColumns[o] = {
      name: o,
      padding,
      pieceData: pieceData[i],
      pieces: pieceData[i]
    }
    projectedColumns[o].x = oScale(o) + padding / 2
    projectedColumns[o].y = 0
    projectedColumns[o].middle = mappedMiddles[o] + padding / 2

    let negativeOffset = zeroValue
    let positiveOffset = zeroValue

    let negativeBaseValue = 0
    let positiveBaseValue = 0

    projectedColumns[o].pieceData.forEach((piece) => {
      let valPosition

      if (pieceType.type === "timeline") {
        piece.scaledValue = rScale(piece.value[0])
        piece.scaledEndValue = rScale(piece.value[1])
        piece.scaledVerticalValue = rScaleVertical(piece.value[0])
      } else if (pieceType.type !== "bar" && pieceType.type !== "clusterbar") {
        piece.scaledValue = rScale(piece.value)
        piece.scaledVerticalValue = rScaleVertical(piece.value)
      } else if (pieceType.type === "clusterbar") {
        valPosition =
          projection === "vertical"
            ? rScaleReverse(rScale(piece.value))
            : rScale(piece.value)
        piece.scaledValue = Math.abs(zeroValue - valPosition)
      }

      piece.x = projectedColumns[o].x
      if (piece.value >= 0) {
        if (pieceType.type === "bar") {
          piece.scaledValue =
            projection === "vertical"
              ? positiveOffset -
                rScaleReverse(rScale(positiveBaseValue + piece.value))
              : rScale(positiveBaseValue + piece.value) - positiveOffset

          positiveBaseValue += piece.value
        }
        piece.base = zeroValue
        piece.bottom = pieceType.type === "bar" ? positiveOffset : 0
        piece.middle = piece.scaledValue / 2 + positiveOffset
        positiveOffset =
          projection === "vertical"
            ? positiveOffset - piece.scaledValue
            : positiveOffset + piece.scaledValue
        piece.negative = false
      } else {
        if (pieceType.type === "bar") {
          piece.scaledValue =
            projection === "vertical"
              ? Math.abs(rScale(piece.value) - rScale(0))
              : Math.abs(rScale(piece.value) - zeroValue)

          negativeBaseValue += piece.value
        }
        piece.base = zeroValue
        piece.bottom = pieceType.type === "bar" ? negativeOffset : 0
        piece.middle = negativeOffset - piece.scaledValue / 2
        negativeOffset =
          projection === "vertical"
            ? negativeOffset + piece.scaledValue
            : negativeOffset - piece.scaledValue
        piece.negative = true
      }
    })

    if (cwHash) {
      projectedColumns[o].width = cwHash[o] - padding

      if (currentProps.ordinalAlign === "center") {
        if (i === 0) {
          projectedColumns[o].x =
            projectedColumns[o].x - projectedColumns[o].width / 2
          projectedColumns[o].middle =
            projectedColumns[o].middle - projectedColumns[o].width / 2
        } else {
          projectedColumns[o].x =
            projectedColumns[oExtent[i - 1]].x +
            projectedColumns[oExtent[i - 1]].width
          projectedColumns[o].middle =
            projectedColumns[o].x + projectedColumns[o].width / 2
        }
      }

      projectedColumns[o].pct = cwHash[o] / cwHash.total
      projectedColumns[o].pct_start =
        (projectedColumns[o].x - oDomain[0]) / cwHash.total
      projectedColumns[o].pct_padding = padding / cwHash.total
      projectedColumns[o].pct_middle =
        (projectedColumns[o].middle - oDomain[0]) / cwHash.total
    } else {
      projectedColumns[o].width = columnWidth - padding
      if (currentProps.ordinalAlign === "center") {
        projectedColumns[o].x =
          projectedColumns[o].x - projectedColumns[o].width / 2
        projectedColumns[o].middle =
          projectedColumns[o].middle - projectedColumns[o].width / 2
      }

      projectedColumns[o].pct = columnWidth / adjustedSize[1]
      projectedColumns[o].pct_start =
        (projectedColumns[o].x - oDomain[0]) / adjustedSize[1]
      projectedColumns[o].pct_padding = padding / adjustedSize[1]
      projectedColumns[o].pct_middle =
        (projectedColumns[o].middle - oDomain[0]) / adjustedSize[1]
    }
  })

  const labelArray = []

  const pieArcs = []

  const labelSettings: LabelSettingsType =
    typeof oLabel === "object"
      ? Object.assign({ label: true, padding: 5 }, oLabel)
      : { orient: "default", label: oLabel, padding: 5 }

  if (oLabel || hoverAnnotation) {
    const offsetPct =
      (pieceType.offsetAngle && pieceType.offsetAngle / 360) || 0

    const rangePct = (pieceType.angleRange &&
      pieceType.angleRange.map((d) => d / 360)) || [0, 1]
    const rangeMod = rangePct[1] - rangePct[0]

    const adjustedPct =
      rangeMod < 1 ? scaleLinear().domain([0, 1]).range(rangePct) : (d) => d

    oExtent.forEach((d) => {
      const arcGenerator = arc()
        .innerRadius(0)
        .outerRadius(rScale.range()[1] / 2)

      const angle = projectedColumns[d].pct * rangeMod
      const startAngle = adjustedPct(projectedColumns[d].pct_start + offsetPct)

      const endAngle = startAngle + angle
      const midAngle = startAngle + angle / 2

      const markD = arcGenerator({
        startAngle: startAngle * twoPI,
        endAngle: endAngle * twoPI
      })
      const translate = [adjustedSize[0] / 2, adjustedSize[1] / 2]
      const centroid = arcGenerator.centroid({
        startAngle: startAngle * twoPI,
        endAngle: endAngle * twoPI
      })

      const addedPadding =
        centroid[1] > 0 &&
        (!labelSettings.orient ||
          labelSettings.orient === "default" ||
          labelSettings.orient === "edge")
          ? 8
          : 0

      const outerPoint = pointOnArcAtAngle(
        [0, 0],
        midAngle,
        rScale.range()[1] / 2 + labelSettings.padding + addedPadding
      )

      const pieArc = {
        startAngle,
        endAngle,
        midAngle,
        markD,
        translate,
        centroid,
        outerPoint
      }

      projectedColumns[d].pieArc = pieArc

      pieArcs.push(pieArc)
    })
  }

  if (currentProps.oLabel) {
    let labelingFn
    if (typeof labelSettings.label === "function") {
      labelingFn = labelSettings.label
    } else {
      const labelStyle: {
        textAnchor: "inherit" | "middle" | "end" | "start"
      } = {
        textAnchor: "middle"
      }
      if (projection === "horizontal" && labelSettings.orient === "right") {
        labelStyle.textAnchor = "start"
      } else if (projection === "horizontal") {
        labelStyle.textAnchor = "end"
      }

      labelingFn = (d, p, i) => {
        const additionalStyle: {
          textAnchor?: "inherit" | "middle" | "end" | "start" | null
        } = {}
        let transformRotate

        if (projection === "radial" && labelSettings.orient === "stem") {
          transformRotate = `rotate(${
            pieArcs[i].outerPoint[0] < 0
              ? pieArcs[i].midAngle * 360 + 90
              : pieArcs[i].midAngle * 360 - 90
          })`
        } else if (
          projection === "radial" &&
          labelSettings.orient === "annotation"
        ) {
          const { centroid } = pieArcs[i]

          const labelIndex = pieArcs.filter(
            (p, q) =>
              q < i &&
              centroid[0] < 0 === pieArcs[q].centroid[0] < 0 &&
              centroid[1] < 0 === pieArcs[q].centroid[1] < 0
          ).length
          const labelMod = labelIndex * 15
          let labelLength = d.length * 7
          let textAnchor: "inherit" | "middle" | "end" | "start" = "start"

          let positionProps = { dx: 0, dy: 0 }
          if (centroid[0] < 0) {
            textAnchor = "end"
            labelLength = -labelLength
            positionProps.dx = -35
          } else {
            positionProps.dx = 35
          }

          if (centroid[1] < 0) {
            positionProps.dy = -35 - labelMod
          } else {
            positionProps.dy = 35 + labelMod
          }
          return (
            <g>
              <path
                fill="none"
                stroke="black"
                strokeWidth={2}
                d={`M0,0L${positionProps.dx},${positionProps.dy}L${
                  positionProps.dx + labelLength
                },${positionProps.dy}`}
              />
              <text
                textAnchor={textAnchor}
                x={positionProps.dx}
                y={positionProps.dy - 2}
              >
                {d}
              </text>
            </g>
          )
        } else if (
          projection === "radial" &&
          labelSettings.orient !== "center"
        ) {
          transformRotate = `rotate(${
            pieArcs[i].outerPoint[1] < 0
              ? pieArcs[i].midAngle * 360
              : pieArcs[i].midAngle * 360 + 180
          })`
        }
        if (
          projection === "radial" &&
          labelSettings.orient === "stem" &&
          ((pieArcs[i].outerPoint[0] > 0 && labelSettings.padding < 0) ||
            (pieArcs[i].outerPoint[0] < 0 && labelSettings.padding >= 0))
        ) {
          additionalStyle.textAnchor = "end"
        } else if (projection === "radial" && labelSettings.orient === "stem") {
          additionalStyle.textAnchor = "start"
        }
        return (
          <text
            {...labelStyle}
            {...additionalStyle}
            transform={transformRotate}
          >
            {d}
          </text>
        )
      }
    }

    oExtent.forEach((d, i) => {
      let xPosition = projectedColumns[d].middle
      let yPosition = 0

      if (projection === "horizontal") {
        yPosition = projectedColumns[d].middle
        if (labelSettings.orient === "right") {
          xPosition = adjustedSize[0] + 3
        } else {
          xPosition = -3
        }
      } else if (projection === "radial") {
        if (labelSettings.orient === "annotation") {
          xPosition =
            pieArcs[i].centroid[0] * 0.25 +
            pieArcs[i].outerPoint[0] * 0.75 +
            pieArcs[i].translate[0]
          yPosition =
            pieArcs[i].centroid[1] * 0.25 +
            pieArcs[i].outerPoint[1] * 0.75 +
            pieArcs[i].translate[1]
        } else if (labelSettings.orient === "center") {
          xPosition = pieArcs[i].centroid[0] + pieArcs[i].translate[0]
          yPosition = pieArcs[i].centroid[1] + pieArcs[i].translate[1]
        } else {
          xPosition = pieArcs[i].outerPoint[0] + pieArcs[i].translate[0]
          yPosition = pieArcs[i].outerPoint[1] + pieArcs[i].translate[1]
        }
      }

      const labelValue = labelSettings.labelFormatter
        ? labelSettings.labelFormatter(d)
        : d

      const label = labelingFn(
        labelValue,
        projectedColumns[d].pieceData.map((d) => d.data),
        i,
        projectedColumns[d]
      )
      labelArray.push(
        <g
          key={`olabel-${i}`}
          transform={`translate(${xPosition},${yPosition})`}
        >
          {label}
        </g>
      )
    })

    if (projection === "vertical") {
      let labelY
      if (labelSettings.orient === "top") {
        labelY = -15
      } else {
        labelY = 15 + rScale.range()[1]
      }
      oLabels = (
        <g
          key="ordinalframe-labels-container"
          className="ordinal-labels"
          transform={`translate(0,${labelY})`}
        >
          {labelArray}
        </g>
      )
    } else if (projection === "horizontal") {
      oLabels = (
        <g key="ordinalframe-labels-container" className="ordinal-labels">
          {labelArray}
        </g>
      )
    } else if (projection === "radial") {
      oLabels = (
        <g key="ordinalframe-labels-container" className="ordinal-labels">
          {labelArray}
        </g>
      )
    }
  }

  const isBarType = ["bar", "clusterbar", "timeline"].indexOf(pieceType.type) !== -1
  const usesPieceOverlays = (currentProps.hoverAnnotation || currentProps.pieceHoverAnnotation) && isBarType

  if (
    !usesPieceOverlays &&
    !currentProps.summaryHoverAnnotation &&
    (currentProps.hoverAnnotation ||
      currentProps.customClickBehavior ||
      currentProps.customDoubleClickBehavior ||
      currentProps.customHoverBehavior)
  ) {
    if (shouldRecalculateOverlay) {
      columnOverlays = generateColumnOverlays({
        oExtent,
        projectedColumns,
        rScale,
        pieArcs,
        padding,
        projection,
        customDoubleClickBehavior,
        customClickBehavior,
        customHoverBehavior
      })
    } else {
      columnOverlays = currentState.columnOverlays
    }
  }

  let pieceDataXY

  const pieceTypeForXY =
    pieceType.type && pieceType.type !== "none" ? pieceType.type : "point"
  const pieceTypeLayout: PieceLayoutType =
    typeof pieceTypeForXY === "function"
      ? pieceTypeForXY
      : layoutHash[pieceTypeForXY]

  const calculatedPieceData = pieceTypeLayout({
    type: pieceType,
    data: projectedColumns,
    renderMode: pieceRenderMode,
    eventListenersGenerator,
    styleFn: pieceStyle,
    projection,
    classFn: pieceClass,
    adjustedSize,
    chartSize: size,
    margin,
    rScale
  }) as GenericObject[]

  const keyedData = calculatedPieceData.reduce((p, c) => {
    if (c.o) {
      if (!p[c.o]) {
        p[c.o] = []
      }
      p[c.o].push(c)
    }
    return p
  }, {})

  Object.keys(projectedColumns).forEach((d) => {
    projectedColumns[d].xyData = keyedData[d] || []
  })
  let calculatedSummaries: ProjectedOrdinalSummary = {}

  if (summaryType.type && summaryType.type !== "none") {
    calculatedSummaries = drawSummaries({
      data: projectedColumns,
      type: summaryType,
      renderMode: summaryRenderMode,
      styleFn: summaryStyle,
      classFn: summaryClass,
      projection,
      eventListenersGenerator,
      adjustedSize,
      //        chartSize: size,
      margin,
      axisCreator: axisGenerator
    })

    calculatedSummaries.originalData = projectedColumns
  }

  const yMod = projection === "horizontal" ? midMod : zeroFunction
  const xMod = projection === "vertical" ? midMod : zeroFunction
  const basePieceData = calculatedPieceData
    .map((d) => {
      if (d.piece && d.xy) {
        return {
          ...d.piece,
          type: "frame-hover",
          x: d.xy.x + xMod(d.xy),
          y: d.xy.y + yMod(d.xy)
        }
      }
      return null
    })
    .filter((d) => d)

  if (
    ((hoverAnnotation || pieceHoverAnnotation) &&
      ["bar", "clusterbar", "timeline"].indexOf(pieceType.type) === -1) ||
    summaryHoverAnnotation
  ) {
    if (summaryHoverAnnotation && calculatedSummaries.xyPoints) {
      pieceDataXY = calculatedSummaries.xyPoints.map(
        (d: { x: number; y: number }) =>
          Object.assign({}, d, {
            type: "frame-hover",
            isSummaryData: true,
            x: d.x,
            y: d.y
          })
      )
    } else if ((hoverAnnotation || pieceHoverAnnotation) && calculatedPieceData) {
      //Check interaction layer rendering when only one point per column
      pieceDataXY = basePieceData
    }
  }

  const { axis, axesTickLines } = orFrameAxisGenerator({
    axis: arrayWrappedAxis,
    data: allData,
    projection,
    adjustedSize,
    size,
    rScale,
    rScaleType: instantiatedRScaleType.copy(),
    pieceType,
    rExtent,
    maxColumnValues,
    xyData: basePieceData,
    margin,
    thresholds: calculatedSummaries.thresholds
  })

  return {
    pieceDataXY,
    oAccessor,
    rAccessor,
    summaryType,
    type: pieceType,
    ...assembleRenderPipeline({
      usesPieceOverlays,
      shouldRecalculateOverlay,
      calculatedPieceData,
      projection,
      customClickBehavior,
      customDoubleClickBehavior,
      customHoverBehavior,
      currentState,

      connectorStyle,
      connectorClass: connectorClassFn,
      connectorRenderMode: connectorRenderModeFn,
      connectorCanvasRender,
      summaryCanvasRender,
      pieceCanvasRender,
      connectorType,
      eventListenersGenerator,
      pieceType,
      summaryStyle,
      summaryClass,
      pieceStyle,
      pieceClass,

      keyedData,
      oExtent,
      projectedColumns,
      calculatedSummaries,
      oAccessor,

      rScale,

      calculatedRExtent,
      calculatedOExtent,
      rExtentSettings,
      oExtentSettings,

      adjustedPosition,
      adjustedSize,
      margin,

      backgroundGraphics,
      foregroundGraphics,
      arrayWrappedAxis,
      axis,
      axesTickLines,
      oLabels,
      title,
      columnOverlays,
      oScaleType,
      instantiatedRScaleType,
      oScale,
      rExtent,
      legend,
      pieceIDAccessor,
      currentProps
    })
  }
}
