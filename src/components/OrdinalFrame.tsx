import * as React from "react"

import { nest } from "d3-collection"

import {
  scaleBand,
  scaleOrdinal,
  scaleLinear,
  ScaleLinear,
  ScaleBand
} from "d3-scale"

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
  findIDPiece,
  getColumnScreenCoordinates
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

import {
  AnnotationHandling,
  CustomHoverType,
  AnnotationType
} from "./types/annotationTypes"

import {
  MarginType,
  CanvasPostProcessTypes,
  PieceLayoutType,
  ProjectionTypes,
  accessorType,
  GenericObject,
  GenericAccessor,
  RenderPipelineType,
  OrdinalSummaryTypeSettings
} from "./types/generalTypes"

import { AxisProps } from "./types/annotationTypes"
import { AnnotationLayerProps } from "./AnnotationLayer"
import { Interactivity } from "./types/interactionTypes"

const xScale = scaleLinear()
const yScale = scaleLinear()

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

type OExtentObject = { extent?: Array<string>; onChange?: Function }

type OExtentSettingsType = Array<string> | OExtentObject

interface RExtentObject {
  extent?: Array<number>
  onChange?: Function
}

type PieceTypes =
  | "none"
  | "bar"
  | "clusterbar"
  | "point"
  | "swarm"
  | "timeline"
  | "barpercent"

type PieceTypeSettings = {
  type: PieceTypes
  offsetAngle?: number
  angleRange?: number[]
}

type ProjectedOrdinalSummary = {
  originalData?: { x?: number; y?: number }
  xyPoints?: object[]
  marks?: object[]
}

export type OrdinalFrameProps = {
  type: PieceTypeSettings
  summaryType: OrdinalSummaryTypeSettings
  connectorType?: Function
  className?: string
  annotationSettings?: AnnotationHandling
  size: Array<number>
  downloadFields: Array<string>
  rAccessor?: accessorType<number>
  oAccessor?: accessorType<string | number>
  oExtent?: OExtentSettingsType
  rExtent?: RExtentObject | number[]
  name?: string
  download: boolean
  annotations: Array<object>
  matte?: boolean | object | Element | Function
  renderKey?: accessorType<string | number>
  interaction?: Interactivity
  customClickBehavior?: Function
  customHoverBehavior?: Function
  customDoubleClickBehavior?: Function
  invertR: boolean
  projection: ProjectionTypes
  backgroundGraphics?: React.ReactNode | Function
  foregroundGraphics?: React.ReactNode | Function
  afterElements?: React.ReactNode
  beforeElements?: React.ReactNode
  disableContext?: boolean
  summaryHoverAnnotation?: CustomHoverType
  pieceHoverAnnotation?: CustomHoverType
  hoverAnnotation?: CustomHoverType
  canvasPostProcess?: CanvasPostProcessTypes
  baseMarkProps?: object
  useSpans: boolean
  canvasPieces?: boolean | accessorType<boolean>
  canvasSummaries?: boolean | accessorType<boolean>
  connectorClass?: string | accessorType<string>
  pieceClass?: string | accessorType<string>
  summaryClass?: string | accessorType<string>
  connectorRenderMode?: string | accessorType<string | GenericObject>
  connectorStyle?: object | accessorType<GenericObject>
  canvasConnectors?: boolean | accessorType<boolean>
  summaryStyle?: object | accessorType<object>
  style?: object | accessorType<object>
  sortO?: (a: any, b: any, c: object[], d: object[]) => number
  oSort?: (a: any, b: any, c: object[], d: object[]) => number
  dynamicColumnWidth?: string | accessorType<number>
  pieceIDAccessor?: string | accessorType<string>
  ordinalAlign?: string
  oLabel?: boolean | accessorType<string | Element>
  margin?:
    | number
    | { top?: number; left?: number; right?: number; bottom?: number }
  renderMode?: object | string | accessorType<string | object>
  summaryRenderMode?: object | string | accessorType<string | object>
  dataVersion?: string
  svgAnnotationRules?: Function
  htmlAnnotationRules?: Function
  pixelColumnWidth?: number
  title?: React.ReactNode
  oScaleType: ScaleBand<string>
  rScaleType: ScaleLinear<number, number>
  legend?: object
  data: Array<object | number>
  oPadding?: number
  axis?: AxisProps | Array<AxisProps>
  axes?: AxisProps | Array<AxisProps>
  summaryPosition?: Function
  additionalDefs?: React.ReactNode
  tooltipContent?: Function
  renderOrder?: ReadonlyArray<"pieces" | "summaries" | "connectors">
  multiAxis?: boolean
  onUnmount?: Function
}

type State = {
  dataVersion?: string
  pieceDataXY: Array<object>
  adjustedPosition: Array<number>
  adjustedSize: Array<number>
  backgroundGraphics: React.ReactNode
  foregroundGraphics: React.ReactNode
  axisData?: AxisProps[]
  axes?: React.ReactNode[]
  axesTickLines?: React.ReactNode
  oLabels: React.ReactNode
  title: object
  columnOverlays: Array<object>
  renderNumber: number
  oAccessor: Array<Function>
  rAccessor: Array<Function>
  oScaleType: ScaleBand<string>
  rScaleType: ScaleLinear<number, number>
  oExtent: Array<string>
  rExtent: Array<number>
  oScale: ScaleBand<string>
  rScale: ScaleLinear<number, number>
  calculatedOExtent: Array<string>
  calculatedRExtent: Array<number>
  projectedColumns: object
  margin: MarginType
  legendSettings: object
  orFrameRender: RenderPipelineType
  pieceIDAccessor: GenericAccessor<string>
  type: object
  summaryType: object
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
      renderNumber: 0,
      oLabels: [],
      oAccessor: stringToArrayFn<string>("renderKey"),
      rAccessor: stringToArrayFn<number>("value"),
      oScale: scaleBand(),
      rScale: scaleLinear(),
      axes: undefined,
      calculatedOExtent: [],
      calculatedRExtent: [0, 1],
      columnOverlays: [],
      dataVersion: undefined,
      legendSettings: {},
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      oExtent: [],
      oScaleType: scaleBand(),
      orFrameRender: {},
      pieceDataXY: [],
      pieceIDAccessor: stringToFn<string>("semioticPieceID"),
      projectedColumns: {},
      rExtent: [],
      rScaleType: scaleLinear(),
      summaryType: { type: "none" },
      title: {},
      type: { type: "none" }
    }
  }

  componentWillUnmount() {
    if (this.props.onUnmount) {
      this.props.onUnmount(this.props, this.state)
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
      rExtent: baseRExtent,
      oSort,
      sortO = oSort,
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
      axes,
      axis: baseAxis = axes,
      pieceIDAccessor: basePieceIDAccessor,
      summaryPosition: baseSummaryPosition,
      multiAxis,
      baseMarkProps = {}
    } = currentProps

    const summaryType = objectifyType(baseSummaryType)
    const pieceType = objectifyType(baseType) as PieceTypeSettings
    const connectorType = objectifyType(baseConnectorType)
    const oAccessor = stringToArrayFn<string | number>(
      baseOAccessor,
      d => d.renderKey
    )
    const rAccessor = stringToArrayFn<number>(baseRAccessor, d => d.value || 1)
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
    const summaryPosition = baseSummaryPosition || (position => position)
    const title =
      typeof baseTitle === "object" &&
      !React.isValidElement(baseTitle) &&
      baseTitle !== null
        ? baseTitle
        : { title: baseTitle, orient: "top" }

    const pieceIDAccessor = stringToFn<string>(basePieceIDAccessor, () => "")

    const { allData, multiExtents } = keyAndObjectifyBarData({
      data,
      renderKey,
      oAccessor,
      rAccessor,
      multiAxis
    })

    let arrayWrappedAxis: AxisProps[] | undefined

    if (Array.isArray(baseAxis)) {
      arrayWrappedAxis = baseAxis
    } else if (baseAxis) {
      arrayWrappedAxis = [baseAxis]
    }

    if (multiExtents && baseAxis) {
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
        ? { extent: baseOExtent as string[] }
        : baseOExtent

    const calculatedOExtent = allData.reduce(
      (p: Array<string | number>, c: { column: string | number }) => {
        const baseOValue = c.column
        const oValue =
          baseOValue !== undefined ? String(baseOValue) : baseOValue

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
        .map(d =>
          allData
            .filter((p: { column: string }) => String(p.column) === d)
            .reduce((p, c: { value: number }) => p + c.value, 0)
        )
        .reduce((p, c, i) => {
          p[oExtent[i]] = c
          return p
        }, {})

      allData.forEach((d: { value?: number; column: string }) => {
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

    const castOScaleType = (oScaleType as unknown) as Function

    const oScale = dynamicColumnWidth ? scaleOrdinal() : castOScaleType()

    oScale.domain(oExtent)

    let maxColumnValues

    if (dynamicColumnWidth) {
      let columnValueCreator
      if (typeof dynamicColumnWidth === "string") {
        columnValueCreator = d => sum(d.map(p => p.data[dynamicColumnWidth]))
      } else {
        columnValueCreator = d => dynamicColumnWidth(d.map(p => p.data))
      }
      const thresholdDomain = [0]
      maxColumnValues = 0
      const columnValues = []

      oExtent.forEach(d => {
        const oValues = allData.filter(
          (p: { column: string }) => p.column === d
        )
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

    const rExtentSettings =
      baseRExtent === undefined || Array.isArray(baseRExtent)
        ? { extent: baseRExtent, onChange: undefined }
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

    if (pieceType.type === "timeline") {
      const rData = allData.map((d: { value: number }) => d.value)
      const leftExtent = extent(rData.map(d => d[0]))
      const rightExtent = extent(rData.map(d => d[1]))
      rExtent = extent([...leftExtent, ...rightExtent])
    } else if (pieceType.type !== "bar") {
      rExtent = extent(allData, d => d.value)
    } else {
      const positiveData = allData.filter(
        (d: { value: number }) => d.value >= 0
      )
      const negativeData = allData.filter((d: { value: number }) => d.value < 0)

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

    const castRScaleType = (rScaleType as unknown) as Function

    const instantiatedRScaleType = rScaleType.domain
      ? rScaleType
      : castRScaleType()

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
          } else if (
            projection === "radial" &&
            labelSettings.orient === "stem"
          ) {
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
      rExtent,
      maxColumnValues
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
      baseMarkProps
    }) as any[]

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
        positionFn: summaryPosition,
        projection,
        eventListenersGenerator,
        adjustedSize,
        baseMarkProps,
        //        chartSize: size,
        margin
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
    d: AnnotationType
    i: number
    annotationLayer: AnnotationLayerProps
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

    let screenCoordinates: number[] | number[][] = [0, 0]

    //TODO: Support radial??
    if (d.coordinates || (d.type === "enclose" && d.neighbors)) {
      screenCoordinates = (d.coordinates || d.neighbors).map(
        (p: { column?: string }) => {
          const pO = findFirstAccessorValue(oAccessor, p) || p.column
          const oColumn = projectedColumns[pO]
          const idPiece = findIDPiece(pieceIDAccessor, oColumn, p)

          return screenProject({
            p,
            adjustedSize,
            rScale,
            rAccessor,
            idPiece,
            projection,
            oColumn,
            rScaleType
          })
        }
      )
    } else {
      const pO = findFirstAccessorValue(oAccessor, d) || d.column
      const oColumn = projectedColumns[pO]
      const idPiece = findIDPiece(pieceIDAccessor, oColumn, d)

      screenCoordinates = screenProject({
        p: d,
        adjustedSize,
        rScale,
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
        orFrameState: this.state,
        screenCoordinates,
        adjustedPosition,
        adjustedSize,
        annotationLayer,
        categories: this.state.projectedColumns,
        voronoiHover
      })
    if (this.props.svgAnnotationRules && customAnnotation !== null) {
      return customAnnotation
    } else if (d.type === "desaturation-layer") {
      return desaturationLayer({
        style: d.style instanceof Function ? d.style(d, i) : d.style,
        size: adjustedSize,
        i,
        key: d.key
      })
    } else if (d.type === "ordinal-line") {
      return svgOrdinalLine({ d, screenCoordinates, voronoiHover })
    } else if (d.type === "or") {
      return svgORRule({ d, i, screenCoordinates, projection })
    } else if (d.type === "highlight") {
      return svgHighlightRule({
        d,
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

  defaultORHTMLRule = ({
    d,
    i,
    annotationLayer
  }: {
    d: AnnotationType
    i: number
    annotationLayer: AnnotationLayerProps
  }) => {
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
    let screenCoordinates: number[] | number[][] = [0, 0]

    const { voronoiHover } = annotationLayer

    if (d.coordinates || (d.type === "enclose" && d.neighbors)) {
      screenCoordinates = (d.coordinates || d.neighbors).map(
        (p: { column?: string }) => {
          const pO = findFirstAccessorValue(oAccessor, p) || p.column
          const oColumn = projectedColumns[pO]
          const idPiece = findIDPiece(pieceIDAccessor, oColumn, p)

          return screenProject({
            p,
            adjustedSize,
            rScale,
            rAccessor,
            idPiece,
            projection,
            oColumn,
            rScaleType
          })
        }
      )
    } else if (d.type === "column-hover") {
      const {
        coordinates: [xPosition, yPosition]
      } = getColumnScreenCoordinates({
        d,
        projectedColumns,
        oAccessor,
        summaryType,
        type,
        projection,
        adjustedPosition,
        adjustedSize
      })
      screenCoordinates = [xPosition, yPosition]
    } else {
      const pO = findFirstAccessorValue(oAccessor, d) || d.column
      const oColumn = projectedColumns[pO]
      const idPiece = findIDPiece(pieceIDAccessor, oColumn, d)

      screenCoordinates = screenProject({
        p: d,
        adjustedSize,
        rScale,
        rAccessor,
        idPiece,
        projection,
        oColumn,
        rScaleType
      })
    }

    const flippedRScale =
      projection === "vertical"
        ? rScaleType.domain(rScale.domain()).range(rScale.range().reverse())
        : rScale
    //TODO: Process your rules first
    const customAnnotation =
      htmlAnnotationRules &&
      htmlAnnotationRules({
        d,
        i,
        oScale,
        rScale: flippedRScale,
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

    if (htmlAnnotationRules && customAnnotation !== null) {
      return customAnnotation
    }

    if (d.type === "frame-hover") {
      return htmlFrameHoverRule({
        d,
        i,
        rAccessor,
        oAccessor,
        projection,
        tooltipContent,
        projectedColumns,
        useSpans,
        pieceIDAccessor,
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

  mappedMiddles(oScale: ScaleBand<string>, middleMax: number, padding: number) {
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
      canvasConnectors,
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
      axisData,
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
        renderFn={renderKey}
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
        canvasRendering={
          !!(canvasPieces || canvasSummaries || canvasConnectors)
        }
        renderOrder={renderOrder}
        disableCanvasInteraction={true}
      />
    )
  }
}

export default OrdinalFrame
