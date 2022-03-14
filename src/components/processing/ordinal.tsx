import * as React from "react"

import { nest } from "d3-collection"
import { sum, max, min, extent } from "d3-array"

import { arc } from "d3-shape"
import {
  calculateMargin,
  objectifyType,
  keyAndObjectifyBarData,
  //  generateOrdinalFrameEventListeners,
  adjustedPositionSize,
  orFrameConnectionRenderer,
  orFrameAxisGenerator
} from "../svg/frameFunctions"
import { pointOnArcAtAngle, renderLaidOutPieces } from "../svg/pieceDrawing"
import { drawSummaries, renderLaidOutSummaries } from "../svg/summaryLayouts"

import {
  clusterBarLayout,
  barLayout,
  pointLayout,
  swarmLayout,
  timelineLayout
} from "../svg/pieceLayouts"

import { stringToFn, stringToArrayFn } from "../data/dataFunctions"

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

import { genericFunction } from "../generic_utilities/functions"

import { scaleOrdinal, scaleLinear, ScaleBand } from "d3-scale"

const layoutHash = {
  clusterbar: clusterBarLayout,
  bar: barLayout,
  point: pointLayout,
  swarm: swarmLayout,
  timeline: timelineLayout
}

const midMod = (d) => (d.middle ? d.middle : 0)

const zeroFunction = genericFunction(0)
const twoPI = Math.PI * 2

const naturalLanguageTypes = {
  bar: { items: "bar", chart: "bar chart" },
  clusterbar: { items: "bar", chart: "grouped bar chart" },
  swarm: { items: "point", chart: "swarm plot" },
  point: { items: "point", chart: "point plot" },
  timeline: { items: "bar", chart: "timeline" }
}

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
  currentState: OrdinalFrameState
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
    baseMarkProps = {},
    annotations,
    sketchyRenderingEngine
  } = currentProps

  const summaryType = objectifyType(baseSummaryType)
  const pieceType = objectifyType(baseType) as PieceTypeSettings
  const connectorType = objectifyType(baseConnectorType)
  const oAccessor = stringToArrayFn<string | number>(
    baseOAccessor,
    (d) => d.renderKey
  )
  const rAccessor = stringToArrayFn<number>(baseRAccessor, (d) => d.value || 1)
  const renderKey = stringToFn<string | number>(baseRenderKey, (d, i) => i)

  const eventListenersGenerator = () => ({})

  const connectorStyle = stringToFn<GenericObject>(
    baseConnectorStyle,
    () => ({}),
    true
  )
  const summaryStyle = stringToFn<GenericObject>(
    baseSummaryStyle,
    () => ({}),
    true
  )

  const pieceStyle = stringToFn<GenericObject>(baseStyle, () => ({}), true)
  const pieceClass = stringToFn<string>(basePieceClass, () => "", true)
  const summaryClass = stringToFn<string>(baseSummaryClass, () => "", true)
  const title =
    typeof baseTitle === "object" &&
    !React.isValidElement(baseTitle) &&
    baseTitle !== null
      ? baseTitle
      : { title: baseTitle, orient: "top" }

  const pieceIDAccessor = stringToFn<string>(basePieceIDAccessor, () => "")

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

  const margin = calculateMargin({
    margin: baseMargin,
    axes: arrayWrappedAxis,
    title,
    oLabel,
    projection,
    size
  })

  const { adjustedPosition, adjustedSize } = adjustedPositionSize({
    size,
    margin,
    projection
  })

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

  const castOScaleType = oScaleType as unknown as any

  const oScale = dynamicColumnWidth
    ? scaleOrdinal()
    : castOScaleType?.domain
    ? castOScaleType
    : castOScaleType()

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
    const positiveData = allData.filter((d: { value: number }) => d.value >= 0)
    const negativeData = allData.filter((d: { value: number }) => d.value < 0)

    const nestedPositiveData = nest()
      .key((d) => d.column)
      .rollup((leaves) => sum(leaves, (d) => d.value))
      .entries(positiveData)

    const nestedNegativeData = nest()
      .key((d) => d.column)
      .rollup((leaves) => sum(leaves, (d) => d.value))
      .entries(negativeData)

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

  nest()
    .key((d) => d.column)
    .entries(allData)
    .forEach((d) => {
      nestedPieces[d.key] = d.values
    })

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

  const castRScaleType = rScaleType as unknown as any

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
    if (labelSettings.label === true) {
      const labelStyle = {
        textAnchor: "middle"
      }
      if (projection === "horizontal" && labelSettings.orient === "right") {
        labelStyle.textAnchor = "start"
      } else if (projection === "horizontal") {
        labelStyle.textAnchor = "end"
      }

      labelingFn = (d, p, i) => {
        const additionalStyle: {
          textAnchor?: string | null
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
    } else if (typeof labelSettings.label === "function") {
      labelingFn = labelSettings.label
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
        if (labelSettings.orient === "center") {
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

  if (
    !currentProps.pieceHoverAnnotation &&
    !currentProps.summaryHoverAnnotation &&
    (currentProps.hoverAnnotation ||
      currentProps.customClickBehavior ||
      currentProps.customDoubleClickBehavior ||
      currentProps.customHoverBehavior)
  ) {
    if (shouldRecalculateOverlay) {
      columnOverlays = oExtent.map((d, i) => {
        const barColumnWidth = projectedColumns[d].width
        let xPosition = projectedColumns[d].x
        let yPosition = 0
        let height = rScale.range()[1]
        let width = barColumnWidth + padding
        if (projection === "horizontal") {
          yPosition = projectedColumns[d].x
          xPosition = 0
          width = rScale.range()[1]
          height = barColumnWidth
        }

        if (projection === "radial") {
          const { markD, centroid, translate, midAngle } = pieArcs[i]
          const radialMousePackage = {
            type: "column-hover",
            column: projectedColumns[d],
            pieces: projectedColumns[d].pieceData,
            summary: projectedColumns[d].pieceData,
            arcAngles: {
              centroid,
              translate,
              midAngle,
              length: rScale.range()[1] / 2
            }
          }
          return {
            markType: "path",
            key: `hover${d}`,
            d: markD,
            transform: `translate(${translate.join(",")})`,
            style: { opacity: 0 },
            overlayData: radialMousePackage,
            onDoubleClick:
              customDoubleClickBehavior &&
              ((e) => {
                customDoubleClickBehavior(radialMousePackage, e)
              }),
            onClick:
              customClickBehavior &&
              ((e) => {
                customClickBehavior(radialMousePackage, e)
              }),
            onMouseEnter:
              customHoverBehavior &&
              ((e) => {
                customHoverBehavior(radialMousePackage, e)
              }),
            onMouseLeave:
              customHoverBehavior &&
              ((e) => {
                customHoverBehavior(e)
              })
          }
        }

        const baseMousePackage = {
          type: "column-hover",
          column: projectedColumns[d],
          pieces: projectedColumns[d].pieceData,
          summary: projectedColumns[d].pieceData
        }
        return {
          markType: "rect",
          key: `hover-${d}`,
          x: xPosition,
          y: yPosition,
          height: height,
          width: width,
          style: { opacity: 0 },
          onDoubleClick:
            customDoubleClickBehavior &&
            ((e) => {
              customDoubleClickBehavior(baseMousePackage, e)
            }),
          onClick:
            customClickBehavior &&
            ((e) => {
              customClickBehavior(baseMousePackage, e)
            }),
          onMouseEnter:
            customHoverBehavior &&
            ((e) => {
              customHoverBehavior(baseMousePackage, e)
            }),
          onMouseLeave: (e) => {
            customHoverBehavior(undefined, e)
          },
          overlayData: baseMousePackage
        }
      })
    } else {
      columnOverlays = currentState.columnOverlays
    }
  }

  const {
    renderMode,
    canvasSummaries,
    summaryRenderMode,
    connectorClass,
    connectorRenderMode,
    canvasConnectors,
    canvasPieces
  } = currentProps

  let pieceDataXY
  const pieceRenderMode = stringToFn<GenericObject | string>(
    renderMode,
    undefined,
    true
  )
  const pieceCanvasRender = stringToFn<boolean>(canvasPieces, undefined, true)
  const summaryCanvasRender = stringToFn<boolean>(
    canvasSummaries,
    undefined,
    true
  )
  const connectorCanvasRender = stringToFn<boolean>(
    canvasConnectors,
    undefined,
    true
  )

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
    rScale,
    baseMarkProps: {
      ...baseMarkProps,
      sketchyGenerator:
        sketchyRenderingEngine && sketchyRenderingEngine.generator
    }
  }) as any[]

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
      renderMode: stringToFn<GenericObject | string>(
        summaryRenderMode,
        undefined,
        true
      ),
      styleFn: stringToFn<GenericObject>(summaryStyle, () => ({}), true),
      classFn: stringToFn<string>(summaryClass, () => "", true),
      //        canvasRender: stringToFn<boolean>(canvasSummaries, undefined, true),
      projection,
      eventListenersGenerator,
      adjustedSize,
      baseMarkProps: {
        ...baseMarkProps,
        sketchyGenerator:
          sketchyRenderingEngine && sketchyRenderingEngine.generator
      },
      //        chartSize: size,
      margin
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
    (pieceHoverAnnotation &&
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
    } else if (pieceHoverAnnotation && calculatedPieceData) {
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

  if (
    pieceHoverAnnotation &&
    ["bar", "clusterbar", "timeline"].indexOf(pieceType.type) !== -1
  ) {
    const yMod = projection === "horizontal" ? midMod : zeroFunction
    const xMod = projection === "vertical" ? midMod : zeroFunction
    if (shouldRecalculateOverlay) {
      columnOverlays = calculatedPieceData.map((d, i) => {
        const mousePackage = {
          ...d.piece,
          x: d.xy.x + xMod(d.xy),
          y: d.xy.y + yMod(d.xy)
        }
        if (React.isValidElement(d.renderElement)) {
          return {
            renderElement: d.renderElement,
            overlayData: mousePackage
          }
        }
        return {
          ...d.renderElement,
          key: `hover-${i}`,
          type: "frame-hover",
          style: { opacity: 0 },
          overlayData: mousePackage,
          onClick:
            customClickBehavior &&
            ((e) => {
              customClickBehavior(mousePackage.data, e)
            }),
          onDoubleClick:
            customDoubleClickBehavior &&
            ((e) => {
              customDoubleClickBehavior(mousePackage.data, e)
            }),
          onMouseEnter:
            customHoverBehavior &&
            ((e) => {
              customHoverBehavior(mousePackage.data, e)
            }),
          onMouseLeave:
            customHoverBehavior &&
            ((e) => {
              customHoverBehavior(undefined, e)
            })
        }
      })
    } else {
      columnOverlays = currentState.columnOverlays
    }
  }

  const typeAriaLabel = (pieceType.type !== undefined &&
    typeof pieceType.type !== "function" &&
    naturalLanguageTypes[pieceType.type]) || {
    items: "piece",
    chart: "ordinal chart"
  }

  const orFrameRender = {
    connectors: {
      accessibleTransform: (data, i) => data[i],
      projection,
      data: { keyedData, oExtent },
      styleFn: stringToFn<GenericObject>(connectorStyle, () => ({}), true),
      classFn: stringToFn<string>(connectorClass, () => "", true),
      renderMode: stringToFn<GenericObject | string>(
        connectorRenderMode,
        undefined,
        true
      ),
      canvasRender: connectorCanvasRender,
      behavior: orFrameConnectionRenderer,
      type: connectorType,
      eventListenersGenerator,
      pieceType
    },
    summaries: {
      accessibleTransform: (data, i) => {
        const columnName = oExtent[i]

        const summaryPackage = {
          type: "column-hover",
          column: projectedColumns[columnName],
          pieces: projectedColumns[columnName].pieceData,
          summary: projectedColumns[columnName].pieceData,
          oAccessor
        }
        return summaryPackage
      },
      data: calculatedSummaries.marks,
      behavior: renderLaidOutSummaries,
      canvasRender: summaryCanvasRender,
      styleFn: stringToFn<GenericObject>(summaryStyle, () => ({}), true),
      classFn: stringToFn<string>(summaryClass, () => "", true)
    },
    pieces: {
      accessibleTransform: (data, i) => ({
        ...(data[i].piece ? { ...data[i].piece, ...data[i].xy } : data[i]),
        type: "frame-hover"
      }),
      shouldRender: pieceType.type && pieceType.type !== "none",
      data: calculatedPieceData,
      behavior: renderLaidOutPieces,
      canvasRender: pieceCanvasRender,
      styleFn: stringToFn<GenericObject>(pieceStyle, () => ({}), true),
      classFn: stringToFn<string>(pieceClass, () => "", true),
      axis: arrayWrappedAxis,
      ariaLabel: typeAriaLabel
    }
  }

  if (
    rExtentSettings.onChange &&
    (currentState.calculatedRExtent || []).join(",") !==
      (calculatedRExtent || []).join(",")
  ) {
    rExtentSettings.onChange(calculatedRExtent)
  }

  if (
    oExtentSettings.onChange &&
    (currentState.calculatedOExtent || []).join(",") !==
      (calculatedOExtent || []).join(",")
  ) {
    oExtentSettings.onChange(calculatedOExtent)
  }

  let legendSettings

  if (legend) {
    legendSettings = legend === true ? {} : legend
  }

  return {
    pieceDataXY,
    adjustedPosition,
    adjustedSize,
    backgroundGraphics,
    foregroundGraphics,
    axisData: arrayWrappedAxis,
    axes: axis,
    axesTickLines,
    oLabels: { labels: oLabels },
    title,
    columnOverlays,
    renderNumber: currentState.renderNumber + 1,
    oAccessor,
    rAccessor,
    oScaleType,
    rScaleType: instantiatedRScaleType,
    oExtent,
    rExtent,
    oScale,
    rScale,
    calculatedOExtent,
    calculatedRExtent,
    projectedColumns,
    margin,
    legendSettings,
    orFrameRender,
    summaryType,
    type: pieceType,
    pieceIDAccessor,
    props: currentProps
  }
}
