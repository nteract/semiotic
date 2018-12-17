// @flow

import React from "react"

import { nest } from "d3-collection"

import { scaleBand, scaleOrdinal, scaleLinear, scaleIdentity } from "d3-scale"

import { sum, max, min, extent } from "d3-array"

import { arc } from "d3-shape"

import {
  orFrameChangeProps,
  xyframeproptypes,
  ordinalframeproptypes,
  networkframeproptypes
} from "./constants/frame_props"
import {
  svgORRule,
  svgHighlightRule,
  svgOrdinalLine,
  basicReactAnnotationRule,
  svgEncloseRule,
  svgRectEncloseRule,
  svgRRule,
  svgCategoryRule,
  htmlFrameHoverRule,
  htmlColumnHoverRule,
  screenProject,
  findIDPiece
} from "./annotationRules/orframeRules"

import { desaturationLayer } from "./annotationRules/baseRules"

import { findFirstAccessorValue } from "./data/multiAccessorUtils"

import Frame from "./Frame"

import DownloadButton from "./DownloadButton"

import { orDownloadMapping } from "./downloadDataMapping"

import {
  calculateMargin,
  objectifyType,
  keyAndObjectifyBarData,
  //  generateOrdinalFrameEventListeners,
  adjustedPositionSize,
  orFrameConnectionRenderer,
  orFrameAxisGenerator
} from "./svg/frameFunctions"
import { pointOnArcAtAngle, renderLaidOutPieces } from "./svg/pieceDrawing"
import {
  clusterBarLayout,
  barLayout,
  pointLayout,
  swarmLayout,
  timelineLayout
} from "./svg/pieceLayouts"

import { drawSummaries, renderLaidOutSummaries } from "./svg/summaryLayouts"
import { stringToFn, stringToArrayFn } from "./data/dataFunctions"

import { genericFunction } from "./untyped_utilities/functions"

import type { Node } from "react"

import type {
  AnnotationHandling,
  CustomHoverType
} from "./types/annotationTypes"

import type {
  MarginType,
  CanvasPostProcessTypes,
  ExtentSettingsType,
  ProjectionTypes,
  accessorType
} from "./types/generalTypes"

import type { AxisType } from "./types/annotationTypes"

const xScale = scaleIdentity()
const yScale = scaleIdentity()

const midMod = d => (d.middle ? d.middle : 0)
const zeroFunction = genericFunction(0)
const twoPI = Math.PI * 2

const naturalLanguageTypes = {
  bar: { items: "bar", chart: "bar chart" },
  clusterbar: { items: "bar", chart: "grouped bar chart" },
  swarm: { items: "point", chart: "swarm plot" },
  point: { items: "point", chart: "point plot" },
  timeline: { items: "bar", chart: "timeline" }
}

const projectedCoordinatesObject = { y: "y", x: "x" }

const defaultOverflow = { top: 0, bottom: 0, left: 0, right: 0 }

const layoutHash = {
  clusterbar: clusterBarLayout,
  bar: barLayout,
  point: pointLayout,
  swarm: swarmLayout,
  timeline: timelineLayout
}

type SummaryTypes =
  | "none"
  | "histogram"
  | "heatmap"
  | "violin"
  | "joy"
  | "ridgeline"
  | "boxplot"
  | "contour"

type OExtentObject = { extent?: Array<string>, onChange?: Function }

type OExtentSettingsType = Array<string> | OExtentObject

type SummaryTypeSettings = { type: SummaryTypes, amplitude?: number }

type PieceTypes = "none" | "bar" | "clusterbar" | "point" | "swarm" | "timeline"

type PieceTypeSettings = { type: PieceTypes }

export type OrdinalFrameProps = {
  type: PieceTypeSettings,
  summaryType: SummaryTypeSettings,
  connectorType?: Function,
  className?: string,
  annotationSettings?: AnnotationHandling,
  size: Array<number>,
  downloadFields: Array<string>,
  rAccessor?: accessorType,
  oAccessor?: accessorType,
  oExtent?: OExtentSettingsType,
  rExtent?: ExtentSettingsType | Array<number>,
  name?: string,
  download: boolean,
  annotations: Array<Object>,
  matte?: Node,
  renderKey?: Function,
  interaction?: Object,
  customClickBehavior?: Function,
  customHoverBehavior?: Function,
  customDoubleClickBehavior?: Function,
  invertR: boolean,
  projection: ProjectionTypes,
  backgroundGraphics?: Node | Function,
  foregroundGraphics?: Node | Function,
  afterElements?: Node,
  beforeElements?: Node,
  disableContext?: boolean,
  summaryHoverAnnotation?: CustomHoverType,
  pieceHoverAnnotation?: CustomHoverType,
  hoverAnnotation?: CustomHoverType,
  canvasPostProcess?: CanvasPostProcessTypes,
  baseMarkProps?: Object,
  useSpans: boolean,
  canvasPieces?: boolean | Function,
  canvasSummaries?: boolean | Function,
  connectorClass?: string | Function,
  pieceClass?: string | Function,
  summaryClass?: string | Function,
  connectorRenderMode?: string | Function,
  connectorStyle?: Object | Function,
  canvasConnectors?: boolean | Function,
  summaryStyle?: Object | Function,
  style?: Object | Function,
  sortO?: Function,
  dynamicColumnWidth?: string | Function,
  pieceIDAccessor?: string | Function,
  ordinalAlign?: string,
  oLabel?: boolean | Function,
  margin?:
    | number
    | { top?: number, left?: number, right?: number, bottom?: number },
  renderMode?: boolean | Function,
  summaryRenderMode?: boolean | Function,
  dataVersion?: string,
  svgAnnotationRules?: Function,
  htmlAnnotationRules?: Function,
  pixelColumnWidth?: number,
  title?: Node,
  oScaleType: Function,
  rScaleType: Function,
  legend?: Object,
  data: Array<Object | number>,
  oPadding?: number,
  axis?: Object | Array<Object>,
  summaryPosition?: Function,
  additionalDefs?: Node,
  tooltipContent?: Function,
  renderOrder?: $ReadOnlyArray<"pieces" | "summaries" | "connectors">
}

type State = {
  dataVersion?: string,
  pieceDataXY: Array<Object>,
  adjustedPosition: Array<number>,
  adjustedSize: Array<number>,
  backgroundGraphics: Node,
  foregroundGraphics: Node,
  axisData?: Array<Object>,
  axes?: Array<AxisType>,
  axesTickLines?: ?Array<Object>,
  oLabels: Node,
  title: Object,
  columnOverlays: Array<Object>,
  renderNumber: number,
  oAccessor: Array<Function>,
  rAccessor: Array<Function>,
  oScaleType: Function,
  rScaleType: Function,
  oExtent: Array<string>,
  rExtent: Array<number>,
  oScale: Function,
  rScale: Function,
  calculatedOExtent: Array<string>,
  calculatedRExtent: Array<number>,
  projectedColumns: Object,
  margin: MarginType,
  legendSettings: Object,
  orFrameRender: Object,
  pieceIDAccessor: Function,
  type: Object,
  summaryType: Object
}

class OrdinalFrame extends React.Component<OrdinalFrameProps, State> {
  static defaultProps = {
    annotations: [],
    foregroundGraphics: [],
    annotationSettings: {},
    projection: "vertical",
    size: [500, 500],
    className: "",
    data: [],
    oScaleType: scaleBand,
    rScaleType: scaleLinear,
    type: "none",
    summaryType: "none",
    useSpans: false
  }

  static displayName = "OrdinalFrame"

  constructor(props: OrdinalFrameProps) {
    super(props)

    this.state = {
      adjustedPosition: [],
      adjustedSize: [],
      backgroundGraphics: undefined,
      foregroundGraphics: undefined,
      axisData: undefined,
      axis: undefined,
      renderNumber: 0,
      oLabels: [],
      oAccessor: stringToArrayFn("renderKey"),
      rAccessor: stringToArrayFn("value"),
      oScale: xScale,
      rScale: xScale,
      axes: undefined,
      calculatedOExtent: [],
      calculatedRExtent: [0, 1],
      columnOverlays: [],
      dataVersion: undefined,
      legendSettings: {},
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      oExtent: [],
      oScaleType: scaleBand,
      orFrameRender: {},
      pieceDataXY: [],
      pieceIDAccessor: stringToFn("semioticPieceID"),
      projectedColumns: {},
      rExtent: [],
      rScaleType: scaleLinear(),
      summaryType: { type: "none" },
      title: {},
      type: { type: "none" }
    }
  }

  calculateOrdinalFrame = (currentProps: OrdinalFrameProps) => {
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
      sortO,
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
      axis: baseAxis,
      pieceIDAccessor: basePieceIDAccessor,
      summaryPosition: baseSummaryPosition,
      multiAxis
    } = currentProps

    const summaryType = objectifyType(baseSummaryType)
    const pieceType = objectifyType(baseType)
    const connectorType = objectifyType(baseConnectorType)
    const oAccessor = stringToArrayFn(baseOAccessor, d => d.renderKey)
    const rAccessor = stringToArrayFn(baseRAccessor, d => d.value || 1)
    const renderKey = stringToFn(baseRenderKey, (d, i) => i)

    /*    const eventListenersGenerator = generateOrdinalFrameEventListeners(
      customHoverBehavior,
      customClickBehavior,
      customDoubleClickBehavior
    ) */
    const eventListenersGenerator = () => ({})

    const connectorStyle = stringToFn(baseConnectorStyle, () => ({}), true)
    const summaryStyle = stringToFn(baseSummaryStyle, () => ({}), true)
    const pieceStyle = stringToFn(baseStyle, () => ({}), true)
    const pieceClass = stringToFn(basePieceClass, () => "", true)
    const summaryClass = stringToFn(baseSummaryClass, () => "", true)
    const summaryPosition = baseSummaryPosition || (position => position)
    const title =
      typeof baseTitle === "object" &&
      !React.isValidElement(baseTitle) &&
      baseTitle !== null
        ? baseTitle
        : { title: baseTitle, orient: "top" }

    const pieceIDAccessor = stringToFn(basePieceIDAccessor, () => "")

    const { allData, multiExtents } = keyAndObjectifyBarData({
      data,
      renderKey,
      oAccessor,
      rAccessor,
      multiAxis
    })

    const arrayWrappedAxis =
      baseAxis && !Array.isArray(baseAxis) ? [baseAxis] : baseAxis

    if (multiExtents) {
      arrayWrappedAxis.forEach((d, i) => {
        d.extentOverride = multiExtents[i]
      })
    }

    const margin = calculateMargin({
      margin: baseMargin,
      axes: arrayWrappedAxis,
      title,
      oLabel,
      projection
    })
    const { adjustedPosition, adjustedSize } = adjustedPositionSize({
      size,
      margin,
      projection
    })

    const oExtentSettings: OExtentObject =
      baseOExtent === undefined || Array.isArray(baseOExtent)
        ? { extent: baseOExtent }
        : baseOExtent

    const calculatedOExtent = allData.reduce((p, c) => {
      const baseOValue = c.column
      const oValue = baseOValue !== undefined ? String(baseOValue) : baseOValue

      if (p.indexOf(oValue) === -1) {
        p.push(oValue)
      }
      return p
    }, [])

    let oExtent = oExtentSettings.extent || calculatedOExtent

    if (pieceType.type === "barpercent") {
      const oExtentSums = oExtent
        .map(d =>
          allData
            .filter(p => String(p.column) === d)
            .reduce((p, c) => p + c.value, 0)
        )
        .reduce((p, c, i) => {
          p[oExtent[i]] = c
          return p
        }, {})

      allData.forEach(d => {
        d.value =
          (oExtentSums[d.column] && d.value / oExtentSums[d.column]) || 0
      })

      pieceType.type = "bar"
    }

    if (pixelColumnWidth) {
      if (projection === "radial") {
        console.error("pixelColumnWidth is not honored in radial mode")
      } else if (projection === "vertical") {
        const sizeOffset = size[0] - adjustedSize[0]
        adjustedSize[0] = oExtent.length * pixelColumnWidth
        size[0] = adjustedSize[0] + sizeOffset
      } else {
        const sizeOffset = size[1] - adjustedSize[1]
        adjustedSize[1] = oExtent.length * pixelColumnWidth
        size[1] = adjustedSize[1] + sizeOffset
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

    const oScale = dynamicColumnWidth ? scaleOrdinal() : oScaleType()

    oScale.domain(oExtent)

    if (dynamicColumnWidth) {
      let columnValueCreator
      if (typeof dynamicColumnWidth === "string") {
        columnValueCreator = d => sum(d.map(p => p.data[dynamicColumnWidth]))
      } else {
        columnValueCreator = d => dynamicColumnWidth(d.map(p => p.data))
      }
      const thresholdDomain = [0]
      let maxColumnValues = 0
      const columnValues = []

      oExtent.forEach(d => {
        const oValues = allData.filter(p => p.column === d)
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

    const baseRExtent = currentProps.rExtent
    const rExtentSettings =
      baseRExtent === undefined || Array.isArray(baseRExtent)
        ? { extent: baseRExtent }
        : baseRExtent

    let rExtent = rExtentSettings.extent
    let subZeroRExtent = [0, 0]

    if (
      pieceType.type === "bar" &&
      summaryType.type &&
      summaryType.type !== "none"
    ) {
      pieceType.type = "none"
    }

    if (pieceType.type === "timeline") {
      const rData = allData.map(d => d.value)
      const leftExtent = extent(rData.map(d => d[0]))
      const rightExtent = extent(rData.map(d => d[1]))
      rExtent = extent([...leftExtent, ...rightExtent])
    } else if (pieceType.type !== "bar") {
      rExtent = extent(allData, d => d.value)
    } else {
      const positiveData = allData.filter(d => d.value >= 0)
      const negativeData = allData.filter(d => d.value < 0)

      const nestedPositiveData = nest()
        .key(d => d.column)
        .rollup(leaves => sum(leaves.map(d => d.value)))
        .entries(positiveData)

      const nestedNegativeData = nest()
        .key(d => d.column)
        .rollup(leaves => sum(leaves.map(d => d.value)))
        .entries(negativeData)

      rExtent = [
        0,
        nestedPositiveData.length === 0
          ? 0
          : Math.max(max(nestedPositiveData, d => d.value), 0)
      ]

      subZeroRExtent = [
        0,
        nestedNegativeData.length === 0
          ? 0
          : Math.min(min(nestedNegativeData, d => d.value), 0)
      ]
      rExtent = [subZeroRExtent[1], rExtent[1]]
    }

    if (pieceType.type === "clusterbar" || multiAxis) {
      rExtent[0] = 0
    }

    const calculatedRExtent = rExtent

    if (
      rExtentSettings.extent &&
      rExtentSettings.extent[0] !== undefined &&
      rExtentSettings.extent[1] !== undefined
    ) {
      rExtent = rExtentSettings.extent
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
      .key(d => d.column)
      .entries(allData)
      .forEach(d => {
        nestedPieces[d.key] = d.values
      })

    if (sortO !== undefined) {
      oExtent = oExtent.sort((a, b) =>
        sortO(
          a,
          b,
          nestedPieces[a].map(d => d.data),
          nestedPieces[b].map(d => d.data)
        )
      )

      oScale.domain(oExtent)
    }

    const rDomain = (projection === "vertical" && [0, adjustedSize[1]]) || [
      0,
      adjustedSize[0]
    ]

    const instantiatedRScaleType = rScaleType.domain ? rScaleType : rScaleType()

    const rScale = instantiatedRScaleType
      .copy()
      .domain(rExtent)
      .range(rDomain)

    const rScaleReverse = instantiatedRScaleType
      .copy()
      .domain(rDomain)
      .range(rDomain.reverse())

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
    const mappedMiddles = this.mappedMiddles(oScale, mappedMiddleSize, padding)

    pieceData = oExtent.map(d => (nestedPieces[d] ? nestedPieces[d] : []))

    const zeroValue =
      projection === "vertical" ? rScaleReverse(rScale(0)) : rScale(0)

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

      projectedColumns[o].pieceData.forEach(piece => {
        let valPosition

        if (pieceType.type === "timeline") {
          piece.scaledValue = rScale(piece.value[0])
          piece.scaledEndValue = rScale(piece.value[1])
          piece.scaledVerticalValue = rScaleVertical(piece.value[0])
        } else if (
          pieceType.type !== "bar" &&
          pieceType.type !== "clusterbar"
        ) {
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
                ? negativeOffset -
                  rScaleReverse(rScale(negativeBaseValue - piece.value))
                : rScale(negativeBaseValue - piece.value) - negativeOffset

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

    const labelSettings =
      typeof oLabel === "object"
        ? Object.assign({ label: true, padding: 5 }, oLabel)
        : { orient: "default", label: oLabel, padding: 5 }

    if (oLabel || hoverAnnotation) {
      const offsetPct =
        (pieceType.offsetAngle && pieceType.offsetAngle / 360) || 0

      const rangePct = (pieceType.angleRange &&
        pieceType.angleRange.map(d => d / 360)) || [0, 1]
      const rangeMod = rangePct[1] - rangePct[0]

      const adjustedPct =
        rangeMod < 1
          ? scaleLinear()
              .domain([0, 1])
              .range(rangePct)
          : d => d

      oExtent.forEach(d => {
        const arcGenerator = arc()
          .innerRadius(0)
          .outerRadius(rScale.range()[1] / 2)

        const angle = projectedColumns[d].pct * rangeMod
        const startAngle = adjustedPct(
          projectedColumns[d].pct_start + offsetPct
        )

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

        pieArcs.push({
          startAngle,
          endAngle,
          midAngle,
          markD,
          translate,
          centroid,
          outerPoint
        })
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
          const additionalStyle = {}
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
          } else if (
            projection === "radial" &&
            labelSettings.orient === "stem"
          ) {
            additionalStyle.textAnchor = "start"
          }
          return (
            <text
              transform={transformRotate}
              style={{ ...labelStyle, ...additionalStyle }}
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

        const label = labelingFn(
          d,
          projectedColumns[d].pieceData.map(d => d.data),
          i
          //          ,{ arc: pieArcs[i], data: projectedColumns[d] }
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
            transform={`translate(${margin.left},${labelY + margin.top})`}
          >
            {labelArray}
          </g>
        )
      } else if (projection === "horizontal") {
        oLabels = (
          <g
            key="ordinalframe-labels-container"
            className="ordinal-labels"
            transform={`translate(${margin.left},${margin.top})`}
          >
            {labelArray}
          </g>
        )
      } else if (projection === "radial") {
        oLabels = (
          <g
            key="ordinalframe-labels-container"
            className="ordinal-labels"
            transform={`translate(${margin.left},${margin.top})`}
          >
            {labelArray}
          </g>
        )
      }
    }

    let columnOverlays

    if (currentProps.hoverAnnotation) {
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
            style: { opacity: 0, fill: "pink" },
            overlayData: radialMousePackage,
            onDoubleClick:
              customDoubleClickBehavior &&
              (() => {
                customDoubleClickBehavior(radialMousePackage)
              }),
            onClick:
              customClickBehavior &&
              (() => {
                customClickBehavior(radialMousePackage)
              }),
            onMouseEnter:
              customHoverBehavior &&
              (() => {
                customHoverBehavior(radialMousePackage)
              }),
            onMouseLeave:
              customHoverBehavior &&
              (() => {
                customHoverBehavior()
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
          style: { opacity: 0, stroke: "black", fill: "pink" },
          onDoubleClick:
            customDoubleClickBehavior &&
            (() => {
              customDoubleClickBehavior(baseMousePackage)
            }),
          onClick:
            customClickBehavior &&
            (() => {
              customClickBehavior(baseMousePackage)
            }),
          onMouseEnter:
            customHoverBehavior &&
            (() => {
              customHoverBehavior(baseMousePackage)
            }),
          onMouseLeave: () => ({}),
          overlayData: baseMousePackage
        }
      })
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
      rExtent
    })

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
    const pieceRenderMode = stringToFn(renderMode, undefined, true)
    const pieceCanvasRender = stringToFn(canvasPieces, undefined, true)
    const summaryCanvasRender = stringToFn(canvasSummaries, undefined, true)
    const connectorCanvasRender = stringToFn(canvasConnectors, undefined, true)

    const pieceTypeForXY =
      pieceType.type && pieceType.type !== "none" ? pieceType.type : "point"
    const pieceTypeLayout =
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
      rScale
    })

    const keyedData = calculatedPieceData.reduce((p, c) => {
      if (!p[c.o]) {
        p[c.o] = []
      }
      p[c.o].push(c)
      return p
    }, {})

    Object.keys(projectedColumns).forEach(d => {
      projectedColumns[d].xyData = keyedData[d] || []
    })
    let calculatedSummaries = {}

    if (summaryType.type && summaryType.type !== "none") {
      calculatedSummaries = drawSummaries({
        data: projectedColumns,
        type: summaryType,
        renderMode: stringToFn(summaryRenderMode, undefined, true),
        styleFn: stringToFn(summaryStyle, () => ({}), true),
        classFn: stringToFn(summaryClass, () => "", true),
        canvasRender: stringToFn(canvasSummaries, undefined, true),
        positionFn: summaryPosition,
        projection,
        eventListenersGenerator,
        adjustedSize,
        baseMarkProps: currentProps.baseMarkProps || {}
      })

      calculatedSummaries.originalData = projectedColumns
    }

    if (
      (pieceHoverAnnotation &&
        ["bar", "clusterbar", "timeline"].indexOf(pieceType.type) === -1) ||
      summaryHoverAnnotation
    ) {
      const yMod = projection === "horizontal" ? midMod : zeroFunction
      const xMod = projection === "vertical" ? midMod : zeroFunction

      if (summaryHoverAnnotation && calculatedSummaries.xyPoints) {
        pieceDataXY = calculatedSummaries.xyPoints.map(d =>
          Object.assign({}, d, {
            type: "frame-hover",
            isSummaryData: true,
            x: d.x,
            y: d.y
          })
        )
      } else if (pieceHoverAnnotation && calculatedPieceData) {
        pieceDataXY = calculatedPieceData.map(d =>
          Object.assign({}, d.piece, {
            type: "frame-hover",
            x: d.xy.x + xMod(d.xy),
            y: d.xy.y + yMod(d.xy)
          })
        )
      }
    }

    if (
      pieceHoverAnnotation &&
      ["bar", "clusterbar", "timeline"].indexOf(pieceType.type) !== -1
    ) {
      const yMod = projection === "horizontal" ? midMod : zeroFunction
      const xMod = projection === "vertical" ? midMod : zeroFunction

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
          style: { opacity: 0, stroke: "black", fill: "pink" },
          overlayData: mousePackage,
          onClick:
            customClickBehavior &&
            (() => {
              customClickBehavior(mousePackage.data)
            }),
          onDoubleClick:
            customDoubleClickBehavior &&
            (() => {
              customDoubleClickBehavior(mousePackage.data)
            }),
          onMouseEnter:
            customHoverBehavior &&
            (() => {
              customHoverBehavior(mousePackage.data)
            }),
          onMouseLeave:
            customHoverBehavior &&
            (() => {
              customHoverBehavior()
            })
        }
      })
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
        data: keyedData,
        styleFn: stringToFn(connectorStyle, () => ({}), true),
        classFn: stringToFn(connectorClass, () => "", true),
        renderMode: stringToFn(connectorRenderMode, undefined, true),
        canvasRender: connectorCanvasRender,
        behavior: orFrameConnectionRenderer,
        type: connectorType,
        eventListenersGenerator
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
        data: calculatedSummaries,
        behavior: renderLaidOutSummaries,
        canvasRender: summaryCanvasRender,
        styleFn: stringToFn(summaryStyle, () => ({}), true),
        classFn: stringToFn(summaryClass, () => "", true)
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
        styleFn: stringToFn(pieceStyle, () => ({}), true),
        classFn: stringToFn(pieceClass, () => "", true),
        axis: arrayWrappedAxis,
        ariaLabel: typeAriaLabel
      }
    }

    if (
      rExtentSettings.onChange &&
      (this.state.calculatedRExtent || []).join(",") !==
        (calculatedRExtent || []).join(",")
    ) {
      rExtentSettings.onChange(calculatedRExtent)
    }

    if (
      oExtentSettings.onChange &&
      (this.state.calculatedOExtent || []).join(",") !==
        (calculatedOExtent || []).join(",")
    ) {
      oExtentSettings.onChange(calculatedOExtent)
    }

    this.setState({
      pieceDataXY,
      adjustedPosition,
      adjustedSize,
      backgroundGraphics,
      foregroundGraphics,
      axisData: arrayWrappedAxis,
      axes: axis,
      axesTickLines,
      oLabels,
      title,
      columnOverlays,
      renderNumber: this.state.renderNumber + 1,
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
      legendSettings: legend,
      orFrameRender,
      summaryType,
      type: pieceType,
      pieceIDAccessor
    })
  }

  componentWillMount() {
    Object.keys(this.props).forEach(d => {
      if (!ordinalframeproptypes[d]) {
        if (xyframeproptypes[d]) {
          console.error(
            `${d} is an XYFrame prop are you sure you're using the right frame?`
          )
        } else if (networkframeproptypes[d]) {
          console.error(
            `${d} is a NetworkFrame prop are you sure you're using the right frame?`
          )
        } else {
          console.error(`${d} is not a valid OrdinalFrame prop`)
        }
      }
    })

    this.calculateOrdinalFrame(this.props)
  }

  componentWillReceiveProps(nextProps: OrdinalFrameProps) {
    if (
      (this.state.dataVersion &&
        this.state.dataVersion !== nextProps.dataVersion) ||
      !this.state.projectedColumns
    ) {
      this.calculateOrdinalFrame(nextProps)
    } else if (
      this.props.size[0] !== nextProps.size[0] ||
      this.props.size[1] !== nextProps.size[1] ||
      (!this.state.dataVersion &&
        orFrameChangeProps.find(d => {
          return this.props[d] !== nextProps[d]
        }))
    ) {
      this.calculateOrdinalFrame(nextProps)
    }
  }

  defaultORSVGRule = ({
    d,
    i,
    annotationLayer
  }: {
    d: Object,
    i: number,
    annotationLayer: Object
  }) => {
    const { projection } = this.props

    const {
      adjustedPosition,
      adjustedSize,
      oAccessor,
      rAccessor,
      oScale,
      rScale,
      projectedColumns,
      orFrameRender,
      pieceIDAccessor,
      rScaleType
    } = this.state

    let screenCoordinates = [0, 0]

    //TODO: Support radial??
    if (d.coordinates || (d.type === "enclose" && d.neighbors)) {
      screenCoordinates = (d.coordinates || d.neighbors).map(p => {
        const pO = findFirstAccessorValue(oAccessor, p) || p.column
        const oColumn = projectedColumns[pO]
        const idPiece = findIDPiece(pieceIDAccessor, oColumn, p)

        return screenProject({
          p,
          projectedColumns,
          adjustedSize,
          rScale,
          oAccessor,
          rAccessor,
          idPiece,
          projection,
          oColumn,
          rScaleType
        })
      })
    } else {
      const pO = findFirstAccessorValue(oAccessor, d) || d.column
      const oColumn = projectedColumns[pO]
      const idPiece = findIDPiece(pieceIDAccessor, oColumn, d)

      screenCoordinates = screenProject({
        p: d,
        projectedColumns,
        adjustedSize,
        rScale,
        oAccessor,
        rAccessor,
        idPiece,
        projection,
        oColumn,
        rScaleType
      })
    }

    const { voronoiHover } = annotationLayer

    //TODO: Process your rules first
    const customAnnotation =
      this.props.svgAnnotationRules &&
      this.props.svgAnnotationRules({
        d,
        i,
        oScale,
        rScale,
        oAccessor,
        rAccessor,
        orFrameProps: this.props,
        screenCoordinates,
        adjustedPosition,
        adjustedSize,
        annotationLayer,
        orFrameState: this.state,
        categories: this.state.projectedColumns,
        voronoiHover
      })
    if (this.props.svgAnnotationRules && customAnnotation !== null) {
      return customAnnotation
    } else if (d.type === "desaturation-layer") {
      return desaturationLayer({ style: d.style, size: adjustedSize, i, key: d.key })
    } else if (d.type === "ordinal-line") {
      return svgOrdinalLine({ d, i, screenCoordinates, voronoiHover })
    } else if (d.type === "or") {
      return svgORRule({ d, i, screenCoordinates, projection })
    } else if (d.type === "highlight") {
      return svgHighlightRule({
        d,
        i,
        screenCoordinates,
        projection,
        categories: projectedColumns,
        pieceIDAccessor,
        orFrameRender,
        oAccessor
      })
    } else if (d.type === "react-annotation" || typeof d.type === "function") {
      return basicReactAnnotationRule({ d, i, screenCoordinates })
    } else if (d.type === "enclose") {
      return svgEncloseRule({ d, i, screenCoordinates })
    } else if (d.type === "enclose-rect") {
      return svgRectEncloseRule({ d, screenCoordinates, i })
    } else if (d.type === "r") {
      return svgRRule({
        d,
        i,
        screenCoordinates,
        rScale,
        rAccessor,
        projection,
        adjustedSize,
        adjustedPosition
      })
    } else if (d.type === "category") {
      return svgCategoryRule({
        projection,
        d,
        i,
        categories: this.state.projectedColumns,
        adjustedSize
      })
    }
    return null
  }

  defaultORHTMLRule = ({ d, i }: { d: Object, i: number }) => {
    const {
      adjustedPosition,
      adjustedSize,
      oAccessor,
      rAccessor,
      oScale,
      rScale,
      projectedColumns,
      summaryType,
      type,
      pieceIDAccessor,
      rScaleType
    } = this.state
    const {
      htmlAnnotationRules,
      tooltipContent,
      projection,
      size,
      useSpans
    } = this.props

    //TODO: Process your rules first
    if (
      htmlAnnotationRules &&
      htmlAnnotationRules({
        d,
        i,
        oScale,
        rScale,
        oAccessor,
        rAccessor,
        orFrameProps: this.props,
        orFrameState: this.state,
        categories: this.state.projectedColumns,
        useSpans
      }) !== null
    ) {
      return htmlAnnotationRules({
        d,
        i,
        oScale,
        rScale,
        oAccessor,
        rAccessor,
        orFrameProps: this.props,
        categories: this.state.projectedColumns,
        useSpans
      })
    }

    if (d.type === "frame-hover") {
      return htmlFrameHoverRule({
        d,
        i,
        rAccessor,
        oAccessor,
        size,
        projection,
        tooltipContent,
        projectedColumns,
        useSpans,
        pieceIDAccessor,
        projectedColumns,
        adjustedSize,
        rScale,
        type,
        rScaleType
      })
    } else if (d.type === "column-hover") {
      return htmlColumnHoverRule({
        d,
        i,
        summaryType,
        oAccessor,
        rAccessor,
        projectedColumns,
        type,
        adjustedPosition,
        adjustedSize,
        projection,
        tooltipContent,
        useSpans
      })
    }
    return null
  }

  mappedMiddles(oScale: Function, middleMax: number, padding: number) {
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

  render() {
    const {
      className,
      annotationSettings,
      size,
      downloadFields,
      rAccessor,
      oAccessor,
      name,
      download,
      annotations,
      matte,
      renderKey,
      interaction,
      customClickBehavior,
      customHoverBehavior,
      customDoubleClickBehavior,
      projection,
      backgroundGraphics,
      foregroundGraphics,
      afterElements,
      beforeElements,
      disableContext,
      summaryType,
      summaryHoverAnnotation,
      pieceHoverAnnotation,
      hoverAnnotation,
      canvasPostProcess,
      baseMarkProps,
      useSpans,
      canvasPieces,
      canvasSummaries,
      renderOrder,
      additionalDefs
    } = this.props

    const {
      orFrameRender,
      projectedColumns,
      adjustedPosition,
      adjustedSize,
      legendSettings,
      columnOverlays,
      axesTickLines,
      axes,
      margin,
      pieceDataXY,
      oLabels,
      title
    } = this.state

    let downloadButton

    if (download) {
      downloadButton = (
        <DownloadButton
          csvName={`${name || "orframe"}-${new Date().toJSON()}`}
          width={size[0]}
          data={orDownloadMapping({
            data: projectedColumns,
            rAccessor: stringToArrayFn(rAccessor),
            oAccessor: stringToArrayFn(oAccessor),
            fields: downloadFields
          })}
        />
      )
    }

    let interactionOverflow

    if (summaryType && summaryType.amplitude) {
      if (projection === "horizontal") {
        interactionOverflow = {
          top: summaryType.amplitude,
          bottom: 0,
          left: 0,
          right: 0
        }
      } else if (projection === "radial") {
        interactionOverflow = defaultOverflow
      } else {
        interactionOverflow = {
          top: 0,
          bottom: 0,
          left: summaryType.amplitude,
          right: 0
        }
      }
    }

    const renderedForegroundGraphics =
      typeof foregroundGraphics === "function"
        ? foregroundGraphics({ size, margin })
        : foregroundGraphics

    return (
      <Frame
        name="ordinalframe"
        renderPipeline={orFrameRender}
        adjustedPosition={adjustedPosition}
        adjustedSize={adjustedSize}
        size={size}
        xScale={xScale}
        yScale={yScale}
        axes={axes}
        useSpans={useSpans}
        axesTickLines={axesTickLines}
        title={title}
        matte={matte}
        additionalDefs={additionalDefs}
        className={className}
        frameKey={"none"}
        renderKeyFn={renderKey}
        projectedCoordinateNames={projectedCoordinatesObject}
        defaultSVGRule={this.defaultORSVGRule.bind(this)}
        defaultHTMLRule={this.defaultORHTMLRule.bind(this)}
        hoverAnnotation={
          summaryHoverAnnotation || pieceHoverAnnotation || hoverAnnotation
        }
        annotations={annotations}
        annotationSettings={annotationSettings}
        legendSettings={legendSettings}
        interaction={
          interaction && {
            ...interaction,
            brush: interaction.columnsBrush !== true && "oBrush",
            projection,
            projectedColumns
          }
        }
        customClickBehavior={customClickBehavior}
        customHoverBehavior={customHoverBehavior}
        customDoubleClickBehavior={customDoubleClickBehavior}
        points={pieceDataXY}
        margin={margin}
        columns={projectedColumns}
        backgroundGraphics={backgroundGraphics}
        foregroundGraphics={[renderedForegroundGraphics, oLabels]}
        beforeElements={beforeElements}
        afterElements={afterElements}
        downloadButton={downloadButton}
        overlay={columnOverlays}
        rScale={this.state.rScale}
        projection={projection}
        disableContext={disableContext}
        interactionOverflow={interactionOverflow}
        canvasPostProcess={canvasPostProcess}
        baseMarkProps={baseMarkProps}
        canvasRendering={!!(canvasPieces || canvasSummaries)}
        renderOrder={renderOrder}
        disableCanvasInteraction={true}
      />
    )
  }
}

export default OrdinalFrame
