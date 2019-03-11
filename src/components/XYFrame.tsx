import * as React from "react"

import { scaleLinear } from "d3-scale"

import { axisPieces, axisLines } from "./visualizationLayerBehavior/axis"

// components

import Axis from "./Axis"
import DownloadButton from "./DownloadButton"
import Frame from "./Frame"
import {
  svgXYAnnotation,
  svgHighlight,
  basicReactAnnotation,
  svgEncloseAnnotation,
  svgRectEncloseAnnotation,
  svgHullEncloseAnnotation,
  svgXAnnotation,
  svgYAnnotation,
  svgBoundsAnnotation,
  svgLineAnnotation,
  svgAreaAnnotation,
  svgHorizontalPointsAnnotation,
  svgVerticalPointsAnnotation,
  htmlTooltipAnnotation
} from "./annotationRules/xyframeRules"

import { ScaleLinear } from "d3-scale"

import { desaturationLayer } from "./annotationRules/baseRules"

import {
  createPoints,
  createLines,
  createSummaries
} from "./visualizationLayerBehavior/general"

import { relativeY, relativeX, findPointByID } from "./svg/lineDrawing"
import AnnotationCallout from "react-annotation/lib/Types/AnnotationCallout"

import {
  calculateMargin,
  adjustedPositionSize,
  objectifyType
} from "./svg/frameFunctions"
import { xyDownloadMapping } from "./downloadDataMapping"
import {
  projectedX,
  projectedY,
  projectedYTop,
  projectedYMiddle,
  projectedYBottom,
  projectedXMiddle,
  projectedXTop,
  projectedXBottom
} from "./constants/coordinateNames"
import {
  calculateDataExtent,
  stringToFn,
  stringToArrayFn
} from "./data/dataFunctions"

import { extentValue } from "./data/unflowedFunctions"
import { findFirstAccessorValue } from "./data/multiAccessorUtils"

import {
  xyFrameChangeProps,
  xyFrameDataProps,
  xyframeproptypes,
  ordinalframeproptypes,
  networkframeproptypes
} from "./constants/frame_props"

import SpanOrDiv from "./SpanOrDiv"

import {
  ProjectedPoint,
  MarginType,
  CanvasPostProcessTypes,
  accessorType,
  ProjectedSummary,
  ProjectedLine,
  GenericObject,
  LineTypeSettings,
  SummaryTypeSettings,
  RawLine,
  RawSummary,
  RawPoint,
  GenericAccessor
} from "./types/generalTypes"

import {
  AnnotationHandling,
  CustomHoverType,
  AnnotationType
} from "./types/annotationTypes"

import { AxisType } from "./types/annotationTypes"
import { Interactivity } from "./types/interactionTypes"

import { AnnotationLayerProps } from "./AnnotationLayer"

type ExtentType = {
  extent?: number[]
  onChange?: Function
}

export type XYFrameProps = {
  useSpans: boolean
  title?: string | object
  margin?:
    | number
    | { top?: number; bottom?: number; left?: number; right?: number }
  name: string
  dataVersion?: string
  frameKey?: string
  size: number[]
  canvasPostProcess?: CanvasPostProcessTypes
  additionalDefs?: React.ReactNode
  className?: string
  customHoverBehavior?: Function
  customClickBehavior?: Function
  customDoubleClickBehavior?: Function
  hoverAnnotation?: CustomHoverType
  disableContext?: boolean
  interaction?: Interactivity
  svgAnnotationRules?: Function
  htmlAnnotationRules?: Function
  tooltipContent?: Function
  annotations: object[]
  baseMarkProps?: object
  backgroundGraphics?: React.ReactNode | Function
  foregroundGraphics?: React.ReactNode | Function
  beforeElements?: React.ReactNode
  afterElements?: React.ReactNode
  download?: boolean | string
  downloadFields?: Array<string>
  annotationSettings?: AnnotationHandling
  renderKey?: string | GenericAccessor<string>
  legend?: object | boolean
  lines?: RawLine[] | RawLine
  points?: RawPoint[]
  areas?: RawSummary[] | RawSummary
  summaries?: RawSummary[] | RawSummary
  axes?: AxisType[]
  matte?: object
  xScaleType?: ScaleLinear<number, number>
  yScaleType?: ScaleLinear<number, number>
  xExtent?: number[] | { extent?: number[]; onChange?: Function }
  yExtent?: number[] | { extent?: number[]; onChange?: Function }
  invertX?: boolean
  invertY?: boolean
  xAccessor?: accessorType<number>
  yAccessor?: accessorType<number>
  lineDataAccessor?: accessorType<RawPoint[]>
  areaDataAccessor?: accessorType<RawPoint[]>
  summaryDataAccessor?: accessorType<RawPoint[]>
  lineType: LineTypeSettings
  areaType: SummaryTypeSettings
  summaryType: SummaryTypeSettings
  lineRenderMode?: string | object | Function
  pointRenderMode?: string | object | Function
  areaRenderMode?: string | object | Function
  summaryRenderMode?: string | object | Function
  showLinePoints?: boolean | string
  showSummaryPoints?: boolean
  defined?: Function
  lineStyle?: GenericAccessor<object> | object
  pointStyle?: GenericAccessor<object> | object
  areaStyle?: GenericAccessor<object> | object
  summaryStyle?: GenericAccessor<object> | object
  lineClass?: GenericAccessor<string> | string
  pointClass?: GenericAccessor<string> | string
  areaClass?: GenericAccessor<string> | string
  summaryClass?: GenericAccessor<string> | string
  canvasPoints?: GenericAccessor<boolean> | boolean
  canvasLines?: GenericAccessor<boolean> | boolean
  canvasAreas?: GenericAccessor<boolean> | boolean
  canvasSummaries?: GenericAccessor<boolean> | boolean
  customPointMark?: Function | object
  customLineMark?: Function
  customAreaMark?: Function
  customSummaryMark?: Function
  lineIDAccessor?: GenericAccessor<string> | string
  minimap?: object
  fullDataset?: ProjectedPoint[]
  projectedLines?: ProjectedLine[]
  projectedAreas?: Array<ProjectedSummary>
  projectedSummaries?: Array<ProjectedSummary>
  projectedPoints?: ProjectedPoint[]
  renderOrder?: ReadonlyArray<"lines" | "points" | "summaries">
  useAreasAsInteractionLayer?: boolean
  useSummariesAsInteractionLayer?: boolean
  onUnmount?: Function
}

type AnnotatedSettingsProps = {
  xAccessor?: GenericAccessor<number>[]
  yAccessor?: GenericAccessor<number>[]
  summaryDataAccessor?: GenericAccessor<RawPoint[]>[]
  lineDataAccessor?: GenericAccessor<RawPoint[]>[]
  renderKeyFn?: GenericAccessor<string>
  lineType?: LineTypeSettings
  summaryType?: SummaryTypeSettings
  lineIDAccessor?: GenericAccessor<string>
  summaries?: object[]
  lines?: object[]
  title?: React.ReactNode | object
  xExtent?: number[]
  yExtent?: number[]
}

export type XYFrameState = {
  dataVersion?: string
  lineData?: RawLine[] | RawLine
  pointData?: RawPoint[] | RawPoint
  summaryData?: RawSummary[] | RawSummary
  projectedLines?: ProjectedLine[]
  projectedPoints?: ProjectedPoint[]
  projectedSummaries?: ProjectedPoint[]
  fullDataset: ProjectedPoint[]
  adjustedPosition: number[]
  adjustedSize: number[]
  backgroundGraphics?: React.ReactNode
  foregroundGraphics?: React.ReactNode
  axesData?: object[]
  axes?: AxisType[]
  axesTickLines?: object[]
  renderNumber: number
  margin: MarginType
  matte?: object
  calculatedXExtent: number[]
  calculatedYExtent: number[]
  xAccessor: GenericAccessor<number>[]
  yAccessor: GenericAccessor<number>[]
  xScale: ScaleLinear<number, number>
  yScale: ScaleLinear<number, number>
  xExtent: number[]
  yExtent: number[]
  areaAnnotations: object[]
  legendSettings?: object
  xyFrameRender: object
  canvasDrawing: object[]
  size: number[]
  annotatedSettings: AnnotatedSettingsProps
  overlay?: object[]
}

const naturalLanguageLineType = {
  line: { items: "line", chart: "line chart" },
  area: { items: "summary", chart: "summary chart" },
  summary: { items: "summary", chart: "summary chart" },
  cumulative: { items: "line", chart: "cumulative chart" },
  "cumulative-reverse": { items: "line", chart: "cumulative chart" },
  linepercent: { items: "line", chart: "line chart" },
  stackedarea: { items: "stacked area", chart: "stacked area chart" },
  "stackedarea-invert": { items: "stacked area", chart: "stacked area chart" },
  stackedpercent: { items: "stacked area", chart: "stacked area chart" },
  "stackedpercent-invert": {
    items: "stacked area",
    chart: "stacked area chart"
  },
  bumparea: { items: "ranked area", chart: "ranked area chart" },
  "bumparea-invert": { items: "ranked area", chart: "ranked area chart" },
  bumpline: { items: "ranked line", chart: "ranked line chart" },
  difference: {
    items: "line",
    chart: "difference chart"
  }
}

const emptyObjectReturnFunction = () => ({})
const emptyStringReturnFunction = () => ""

let xyframeKey = ""
const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
for (let i = 32; i > 0; --i)
  xyframeKey += chars[Math.floor(Math.random() * chars.length)]

const projectedCoordinateNames = {
  y: projectedY,
  x: projectedX,
  yMiddle: projectedYMiddle,
  yTop: projectedYTop,
  yBottom: projectedYBottom,
  xMiddle: projectedXMiddle,
  xTop: projectedXTop,
  xBottom: projectedXBottom
}

function mapParentsToPoints(fullDataset: ProjectedPoint[]) {
  return fullDataset.map((d: ProjectedPoint) => {
    if (d.parentLine) {
      return Object.assign({}, d.parentLine, d)
    }
    if (d.parentSummary) {
      return Object.assign({}, d.parentSummary, d)
    }
    return d
  })
}

class XYFrame extends React.Component<XYFrameProps, XYFrameState> {
  static defaultProps = {
    annotations: [],
    foregroundGraphics: undefined,
    size: [500, 500],
    className: "",
    lineType: "line",
    name: "xyframe",
    dataVersion: undefined
  }

  static displayName = "XYFrame"

  state = {
    size: [500, 500],
    dataVersion: undefined,
    lineData: undefined,
    pointData: undefined,
    summaryData: undefined,
    projectedLines: undefined,
    projectedPoints: undefined,
    projectedSummaries: undefined,
    fullDataset: [],
    adjustedPosition: [0, 0],
    adjustedSize: [500, 500],
    backgroundGraphics: null,
    foregroundGraphics: null,
    axesData: undefined,
    axes: undefined,
    axesTickLines: undefined,
    renderNumber: 0,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    calculatedXExtent: [0, 0],
    calculatedYExtent: [0, 0],
    xAccessor: [(d: { x: number }) => d.x],
    yAccessor: [(d: { y: number }) => d.y],
    xExtent: [0, 0],
    yExtent: [0, 0],
    areaAnnotations: [],
    xScale: scaleLinear(),
    yScale: scaleLinear(),
    title: null,
    legendSettings: undefined,
    xyFrameRender: {},
    canvasDrawing: [],
    annotatedSettings: {
      xAccessor: undefined,
      yAccessor: undefined,
      summaryDataAccessor: undefined,
      lineDataAccessor: undefined,
      renderKeyFn: undefined,
      lineType: undefined,
      summaryType: undefined,
      lineIDAccessor: undefined,
      summaries: undefined,
      lines: undefined,
      title: undefined,
      xExtent: undefined,
      yExtent: undefined
    },
    overlay: undefined
  }

  componentWillUnmount() {
    if (this.props.onUnmount) {
      this.props.onUnmount(this.props, this.state)
    }
  }

  componentWillMount() {
    Object.keys(this.props).forEach((d: string) => {
      if (!xyframeproptypes[d]) {
        if (ordinalframeproptypes[d]) {
          console.error(
            `${d} is an OrdinalFrame prop are you sure you're using the right frame?`
          )
        } else if (networkframeproptypes[d]) {
          console.error(
            `${d} is a NetworkFrame prop are you sure you're using the right frame?`
          )
        } else {
          console.error(`${d} is not a valid XYFrame prop`)
        }
      }
    })
    this.calculateXYFrame(this.props, true)
  }

  componentWillReceiveProps(nextProps: XYFrameProps) {
    const {
      xExtent: oldXExtent = [],
      yExtent: oldYExtent = [],
      size: oldSize,
      dataVersion: oldDataVersion,
      lineData,
      summaryData,
      pointData
    } = this.state
    const {
      xExtent: baseNewXExtent,
      yExtent: baseNewYExtent,
      size: newSize,
      dataVersion: newDataVersion,
      lines: newLines,
      areas,
      summaries: newSummaries = areas,
      points: newPoints
    } = nextProps

    const newXExtent: number[] = extentValue(baseNewXExtent)

    const newYExtent: number[] = extentValue(baseNewYExtent)

    const extentChange =
      (oldXExtent[0] !== newXExtent[0] && newXExtent[0] !== undefined) ||
      (oldYExtent[0] !== newYExtent[0] && newYExtent[0] !== undefined) ||
      (oldXExtent[1] !== newXExtent[1] && newXExtent[1] !== undefined) ||
      (oldYExtent[1] !== newYExtent[1] && newYExtent[1] !== undefined)

    const lineChange =
      lineData !== newLines ||
      (Array.isArray(lineData) &&
        Array.isArray(newLines) &&
        !!lineData.find(p => newLines.indexOf(p) === -1))

    const summaryChange =
      summaryData !== newSummaries ||
      (Array.isArray(summaryData) &&
        Array.isArray(newSummaries) &&
        !!summaryData.find(p => newSummaries.indexOf(p) === -1))

    const pointChange =
      pointData !== newPoints ||
      (Array.isArray(pointData) &&
        Array.isArray(newPoints) &&
        !!pointData.find(p => newPoints.indexOf(p) === -1))

    if (
      (oldDataVersion && oldDataVersion !== newDataVersion) ||
      !this.state.fullDataset
    ) {
      this.calculateXYFrame(nextProps, true)
    } else if (
      lineChange ||
      summaryChange ||
      pointChange ||
      oldSize[0] !== newSize[0] ||
      oldSize[1] !== newSize[1] ||
      extentChange ||
      (!oldDataVersion &&
        xyFrameChangeProps.find(d => this.props[d] !== nextProps[d]))
    ) {
      const dataChanged =
        lineChange ||
        summaryChange ||
        pointChange ||
        extentChange ||
        !!xyFrameDataProps.find(d => this.props[d] !== nextProps[d])
      this.calculateXYFrame(nextProps, dataChanged)
    }
  }

  screenScales({
    xExtent,
    yExtent,
    adjustedSize,
    xScaleType,
    yScaleType
  }: {
    xExtent: number[]
    yExtent: number[]
    adjustedSize: number[]
    xScaleType: ScaleLinear<number, number>
    yScaleType: ScaleLinear<number, number>
  }) {
    const xDomain = [0, adjustedSize[0]]
    const yDomain = [adjustedSize[1], 0]

    const xScale = xScaleType
    const yScale = yScaleType

    if (xScaleType.domain) {
      xScaleType.domain(xExtent)
    }
    if (yScaleType.domain) {
      yScaleType.domain(yExtent)
    }
    xScaleType.range(xDomain)
    yScaleType.range(yDomain)

    return { xScale, yScale }
  }

  calculateXYFrame = (currentProps: XYFrameProps, updateData: boolean) => {
    const {
      legend,
      lines,
      lineClass,
      pointStyle,
      pointRenderMode,
      pointClass,
      areaClass,
      summaryClass = areaClass,
      canvasLines,
      canvasPoints,
      canvasAreas,
      canvasSummaries = canvasAreas,
      defined,
      size,
      renderKey,
      lineType,
      areaType,
      summaryType = areaType,
      customLineMark,
      customPointMark,
      customAreaMark,
      customSummaryMark = customAreaMark,
      areaStyle,
      summaryStyle = areaStyle,
      areaRenderMode,
      summaryRenderMode = areaRenderMode,
      lineStyle,
      lineRenderMode,
      xExtent: baseXExtent,
      yExtent: baseYExtent,
      title,
      xScaleType = scaleLinear(),
      yScaleType = scaleLinear(),
      lineIDAccessor,
      invertX,
      invertY,
      showLinePoints,
      showSummaryPoints,
      points,
      areas,
      lineDataAccessor,
      areaDataAccessor,
      summaryDataAccessor = areaDataAccessor,
      yAccessor,
      xAccessor,
      useSummariesAsInteractionLayer,
      useAreasAsInteractionLayer = useSummariesAsInteractionLayer,
      baseMarkProps
    } = currentProps
    let {
      projectedLines,
      projectedPoints,
      projectedSummaries = currentProps.projectedAreas,
      summaries = areas,
      fullDataset
    } = currentProps

    if (summaryType && points && !summaries) {
      summaries = [{ coordinates: points }]
    }

    const annotatedSettings = {
      xAccessor: stringToArrayFn<number>(xAccessor, (d: number[]) => d[0]),
      yAccessor: stringToArrayFn<number>(yAccessor, (d: number[]) => d[1]),
      summaryDataAccessor: stringToArrayFn<RawPoint[]>(
        summaryDataAccessor,
        (d: RawSummary | number[]) => (Array.isArray(d) ? d : d.coordinates)
      ),
      lineDataAccessor: stringToArrayFn<RawPoint[]>(
        lineDataAccessor,
        (d: ProjectedLine | number[]) => (Array.isArray(d) ? d : d.coordinates)
      ),
      renderKeyFn: stringToFn<string>(
        renderKey,
        (d: GenericObject, i: number) => `line-${i}`,
        true
      ),
      lineType: objectifyType<LineTypeSettings>(lineType),
      summaryType: objectifyType<SummaryTypeSettings>(summaryType),
      lineIDAccessor: stringToFn<string>(lineIDAccessor, l => l.semioticLineID),
      summaries:
        !summaries || (Array.isArray(summaries) && summaries.length === 0)
          ? undefined
          : !Array.isArray(summaries)
          ? [summaries]
          : !summaryDataAccessor && !summaries[0].coordinates
          ? [{ coordinates: summaries }]
          : summaries,
      lines:
        !lines || (Array.isArray(lines) && lines.length === 0)
          ? undefined
          : !Array.isArray(lines)
          ? [lines]
          : !lineDataAccessor && !lines[0].coordinates
          ? [{ coordinates: lines }]
          : lines,
      title:
        typeof title === "object" &&
        !React.isValidElement(title) &&
        title !== null
          ? title
          : { title, orient: "top" },
      xExtent: Array.isArray(baseXExtent) ? baseXExtent : baseXExtent.extent,
      yExtent: Array.isArray(baseYExtent) ? baseYExtent : baseYExtent.extent
    }

    annotatedSettings.lineType.simpleLine =
      annotatedSettings.lineType.type === "line" &&
      !annotatedSettings.lineType.y1 &&
      annotatedSettings.lineType.simpleLine !== false

    if (annotatedSettings.lineType.type === "area") {
      annotatedSettings.lineType.y1 = () => 0
    }

    const summaryStyleFn = stringToFn<GenericObject>(
      summaryStyle,
      emptyObjectReturnFunction,
      true
    )
    const summaryClassFn = stringToFn<string>(
      summaryClass,
      emptyStringReturnFunction,
      true
    )
    const summaryRenderModeFn = stringToFn<GenericObject | string>(
      summaryRenderMode,
      undefined,
      true
    )

    const margin = calculateMargin({
      margin: currentProps.margin,
      axes: currentProps.axes,
      title: annotatedSettings.title
    })
    const { adjustedPosition, adjustedSize } = adjustedPositionSize({
      size: currentProps.size,
      margin
    })

    let calculatedXExtent = [],
      calculatedYExtent = [],
      yExtent,
      xExtent,
      xExtentSettings,
      yExtentSettings

    if (typeof baseXExtent === "object") {
      xExtentSettings = baseXExtent
    } else {
      xExtentSettings = { extent: baseXExtent }
    }

    if (typeof baseXExtent === "object") {
      yExtentSettings = baseYExtent
    } else {
      yExtentSettings = { extent: baseYExtent }
    }

    let xScale, yScale

    if (
      updateData ||
      (currentProps.dataVersion &&
        currentProps.dataVersion !== this.state.dataVersion)
    ) {
      //This will always fire at this point because xExtent/yExtent are just defined up there so revisit this logic
      if (
        !xExtent ||
        !yExtent ||
        !fullDataset ||
        (!projectedLines && !projectedPoints && !projectedSummaries)
      ) {
        ;({
          xExtent,
          yExtent,
          projectedLines,
          projectedPoints,
          projectedSummaries,
          fullDataset,
          calculatedXExtent,
          calculatedYExtent
        } = calculateDataExtent({
          lineDataAccessor: annotatedSettings.lineDataAccessor,
          summaryDataAccessor: annotatedSettings.summaryDataAccessor,
          xAccessor: annotatedSettings.xAccessor,
          yAccessor: annotatedSettings.yAccessor,
          lineType: annotatedSettings.lineType,
          summaryType: annotatedSettings.summaryType,
          summaries: annotatedSettings.summaries,
          points,
          lines: annotatedSettings.lines,
          showLinePoints,
          showSummaryPoints,
          xExtent: baseXExtent,
          yExtent: baseYExtent,
          invertX,
          invertY,
          adjustedSize,
          margin,
          baseMarkProps,
          summaryStyleFn,
          summaryClassFn,
          summaryRenderModeFn,
          chartSize: size,
          xScaleType,
          yScaleType,
          defined
        }))
      }

      ;({ xScale, yScale } = this.screenScales({
        xExtent,
        yExtent,
        adjustedSize,
        xScaleType,
        yScaleType
      }))
    } else {
      ;({
        xExtent,
        yExtent,
        projectedLines,
        projectedPoints,
        projectedSummaries,
        fullDataset,
        calculatedXExtent,
        calculatedYExtent
      } = this.state)
      if (
        adjustedSize[0] === this.state.adjustedSize[0] &&
        adjustedSize[1] === this.state.adjustedSize[1]
      ) {
        xScale = this.state.xScale
        yScale = this.state.yScale
      } else {
        ;({ xScale, yScale } = this.screenScales({
          xExtent,
          yExtent,
          adjustedSize,
          xScaleType,
          yScaleType
        }))
      }
    }

    xExtent =
      Array.isArray(xExtentSettings.extent) &&
      xExtentSettings.extent.length === 2
        ? xExtentSettings.extent
        : xExtent
    yExtent =
      Array.isArray(yExtentSettings.extent) &&
      yExtentSettings.extent.length === 2
        ? yExtentSettings.extent
        : yExtent

    const canvasDrawing = []

    let axes
    let axesTickLines

    const existingBaselines = {}

    if (currentProps.axes) {
      axesTickLines = []
      axes = currentProps.axes.map((d, i) => {
        let axisClassname = d.className || ""
        axisClassname += " axis"
        let axisScale = yScale
        if (existingBaselines[d.orient]) {
          d.baseline = d.baseline || false
        }
        existingBaselines[d.orient] = true
        if (d.orient === "top" || d.orient === "bottom") {
          axisClassname += " x"
          axisScale = xScale
        } else {
          axisClassname += " y"
        }
        axisClassname += ` ${d.orient}`

        let tickValues
        if (d.tickValues && Array.isArray(d.tickValues)) {
          tickValues = d.tickValues
        } else if (d.tickValues) {
          //otherwise assume a function
          tickValues = d.tickValues(fullDataset, currentProps.size, axisScale)
        }
        const axisSize = [adjustedSize[0], adjustedSize[1]]

        const axisParts = axisPieces({
          padding: d.padding,
          tickValues,
          scale: axisScale,
          ticks: d.ticks,
          orient: d.orient,
          size: axisSize,
          footer: d.footer,
          tickSize: d.tickSize
        })
        const axisTickLines = (
          <g key={`axes-tick-lines-${i}`} className={`axis ${axisClassname}`}>
            {axisLines({
              axisParts,
              orient: d.orient,
              tickLineGenerator: d.tickLineGenerator,
              baseMarkProps,
              className: axisClassname
            })}
          </g>
        )
        axesTickLines.push(axisTickLines)
        return (
          <Axis
            label={d.label}
            axisParts={axisParts}
            key={d.key || `axis-${i}`}
            orient={d.orient}
            size={axisSize}
            margin={margin}
            ticks={d.ticks}
            tickSize={d.tickSize}
            tickFormat={d.tickFormat}
            tickValues={tickValues}
            scale={axisScale}
            className={axisClassname}
            padding={d.padding}
            rotate={d.rotate}
            annotationFunction={d.axisAnnotationFunction}
            glyphFunction={d.glyphFunction}
            baseline={d.baseline}
            dynamicLabelPosition={d.dynamicLabelPosition}
            center={d.center}
          />
        )
      })
    }
    let legendSettings

    if (legend) {
      legendSettings = legend === true ? {} : legend
      if (projectedLines && !legendSettings.legendGroups) {
        const typeString = annotatedSettings.lineType.type
        const type =
          typeof typeString === "string" &&
          ["stackedarea", "stackedpercent", "bumparea"].indexOf(typeString) ===
            -1
            ? "line"
            : "fill"
        const legendGroups = [
          {
            styleFn: currentProps.lineStyle,
            type,
            items: projectedLines.map(d =>
              Object.assign({ label: annotatedSettings.lineIDAccessor(d) }, d)
            )
          }
        ]
        legendSettings.legendGroups = legendGroups
      }
    }
    const areaAnnotations = []

    if (annotatedSettings.summaryType.label && projectedSummaries) {
      projectedSummaries.forEach((d, i) => {
        if (d.bounds) {
          const bounds = Array.isArray(d.bounds) ? d.bounds : [d.bounds]
          bounds.forEach(labelBounds => {
            const label =
              typeof annotatedSettings.summaryType.label === "function"
                ? annotatedSettings.summaryType.label(d)
                : annotatedSettings.summaryType.label
            if (label && label !== null) {
              const labelPosition = label.position || "center"
              const labelCenter = [
                xScale(labelBounds[labelPosition][0]),
                yScale(labelBounds[labelPosition][1])
              ] || [xScale(d._xyfCoordinates[0]), yScale(d._xyfCoordinates[1])]
              const labelContent = label.content || (p => p.value || p.id || i)

              areaAnnotations.push({
                x: labelCenter[0],
                y: labelCenter[1],
                dx: label.dx,
                dy: label.dy,
                className: label.className,
                type: label.type || AnnotationCallout,
                note: label.note || { title: labelContent(d) },
                subject: label.subject || { text: labelContent(d) },
                connector: label.connector
              })
            }
          })
        }
      })
    }

    const lineAriaLabel =
      annotatedSettings.lineType.type !== undefined &&
      typeof annotatedSettings.lineType.type === "string" &&
      naturalLanguageLineType[annotatedSettings.lineType.type]

    const xyFrameRender = {
      lines: {
        accessibleTransform: (data, i) => ({
          ...data[i].data[data[i].data.length - 1],
          type: "frame-hover"
        }),
        data: projectedLines,
        styleFn: stringToFn<GenericObject>(
          lineStyle,
          emptyObjectReturnFunction,
          true
        ),
        classFn: stringToFn<string>(lineClass, emptyStringReturnFunction, true),
        renderMode: stringToFn<GenericObject | string>(
          lineRenderMode,
          undefined,
          true
        ),
        canvasRender: stringToFn<boolean>(canvasLines, undefined, true),
        customMark: customLineMark,
        type: annotatedSettings.lineType,
        defined: defined,
        renderKeyFn: annotatedSettings.renderKeyFn,
        ariaLabel: lineAriaLabel,
        axesData: currentProps.axes,
        behavior: createLines
      },
      summaries: {
        accessibleTransform: (data, i) => ({ ...data[i], type: "frame-hover" }),
        data: projectedSummaries,
        styleFn: summaryStyleFn,
        classFn: summaryClassFn,
        renderMode: summaryRenderModeFn,
        canvasRender: stringToFn<boolean>(canvasSummaries, undefined, true),
        customMark: customSummaryMark,
        type: annotatedSettings.summaryType,
        renderKeyFn: annotatedSettings.renderKeyFn,
        behavior: createSummaries
      },
      points: {
        accessibleTransform: (data, i) => ({
          type: "frame-hover",
          ...(data[i].data || data[i])
        }),
        data: projectedPoints,
        styleFn: stringToFn<GenericObject>(
          pointStyle,
          emptyObjectReturnFunction,
          true
        ),
        classFn: stringToFn<string>(
          pointClass,
          emptyStringReturnFunction,
          true
        ),
        renderMode: stringToFn<GenericObject | string>(
          pointRenderMode,
          undefined,
          true
        ),
        canvasRender: stringToFn<boolean>(canvasPoints, undefined, true),
        customMark: customPointMark,
        renderKeyFn: annotatedSettings.renderKeyFn,
        showLinePoints,
        behavior: createPoints
      }
    }

    if (
      xExtentSettings.onChange &&
      this.state.calculatedXExtent.join(",") !== calculatedXExtent.join(",")
    ) {
      xExtentSettings.onChange(calculatedXExtent)
    }
    if (
      yExtentSettings.onChange &&
      this.state.calculatedYExtent.join(",") !== calculatedYExtent.join(",")
    ) {
      yExtentSettings.onChange(calculatedYExtent)
    }

    let overlay = undefined
    if (useAreasAsInteractionLayer && projectedSummaries) {
      overlay = createSummaries({
        xScale,
        yScale,
        data: projectedSummaries
      }).map((m, i) => ({
        ...m.props,
        style: { fillOpacity: 0 },
        overlayData: projectedSummaries && projectedSummaries[i] // luckily createSummaries is a map fn
      }))
    }

    this.setState({
      lineData: currentProps.lines,
      pointData: currentProps.points,
      summaryData: currentProps.summaries || currentProps.areas,
      dataVersion: currentProps.dataVersion,
      projectedLines,
      projectedPoints,
      projectedSummaries,
      canvasDrawing,
      fullDataset,
      adjustedPosition,
      adjustedSize,
      backgroundGraphics: currentProps.backgroundGraphics,
      foregroundGraphics: currentProps.foregroundGraphics,
      axesData: currentProps.axes,
      axes,
      axesTickLines,
      renderNumber: this.state.renderNumber + 1,
      xScale,
      yScale,
      xAccessor: annotatedSettings.xAccessor,
      yAccessor: annotatedSettings.yAccessor,
      xExtent: [
        xExtent[0] === undefined ? calculatedXExtent[0] : xExtent[0],
        xExtent[1] === undefined ? calculatedXExtent[1] : xExtent[1]
      ],
      yExtent: [
        yExtent[0] === undefined ? calculatedYExtent[0] : yExtent[0],
        yExtent[1] === undefined ? calculatedYExtent[1] : yExtent[1]
      ],
      calculatedXExtent,
      calculatedYExtent,
      margin,
      legendSettings,
      areaAnnotations,
      xyFrameRender,
      size,
      annotatedSettings,
      overlay
    })
  }

  defaultXYSVGRule = ({
    d: baseD,
    i,
    annotationLayer,
    lines,
    summaries,
    points
  }: {
    d: AnnotationType
    i: number
    annotationLayer: AnnotationLayerProps
    lines: { data: ProjectedLine[] }
    summaries: { data: ProjectedSummary[] }
    points: {
      data: ProjectedPoint[]
      styleFn: (args?: GenericObject, index?: number) => GenericObject
    }
  }) => {
    const showLinePoints = this.props.showLinePoints

    const { xyFrameRender, xScale, yScale, xAccessor, yAccessor } = this.state

    let screenCoordinates: number[] | number[][] = []
    const idAccessor = this.state.annotatedSettings.lineIDAccessor

    if (baseD.type === "highlight") {
      return svgHighlight({
        d: baseD,
        i,
        idAccessor,
        lines,
        summaries,
        points,
        xScale,
        yScale,
        xyFrameRender
      })
    }

    const d: AnnotationType = baseD.coordinates
      ? baseD
      : findPointByID({
          point: { x: 0, y: 0, ...baseD },
          idAccessor,
          lines,
          xScale,
          projectedX,
          xAccessor
        })

    if (!d) return null

    const margin = calculateMargin({
      margin: this.props.margin,
      axes: this.props.axes,
      title: this.state.annotatedSettings.title
    })
    const { adjustedPosition, adjustedSize } = adjustedPositionSize({
      size: this.props.size,
      margin
    })

    if (!d.coordinates && !d.bounds) {
      screenCoordinates = [
        relativeX({
          point: d,
          projectedXMiddle,
          projectedX,
          xAccessor,
          xScale
        }) || 0,
        relativeY({
          point: d,
          projectedYMiddle,
          projectedY,
          yAccessor,
          yScale,
          showLinePoints
        }) || 0
      ]
    } else if (!d.bounds) {
      screenCoordinates = d.coordinates.reduce(
        (coords: number[], p: AnnotationType | ProjectedPoint) => {
          const xCoordinate = relativeX({
            point: p,
            projectedXMiddle,
            projectedX,
            xAccessor,
            xScale
          })

          const yCoordinate = relativeY({
            point: p,
            projectedYMiddle,
            projectedY,
            yAccessor,
            yScale
          })
          if (Array.isArray(yCoordinate)) {
            return [
              ...coords,
              [xCoordinate, Math.min(...yCoordinate)],
              [xCoordinate, Math.max(...yCoordinate)]
            ]
          } else if (Array.isArray(xCoordinate)) {
            return [
              ...coords,
              [Math.min(...xCoordinate), yCoordinate],
              [Math.max(...xCoordinate), yCoordinate]
            ]
          } else {
            return [...coords, [xCoordinate, yCoordinate]]
          }
        },
        [] as number[]
      )
    }

    const { voronoiHover } = annotationLayer

    const customSVG =
      this.props.svgAnnotationRules &&
      this.props.svgAnnotationRules({
        d,
        i,
        screenCoordinates,
        xScale,
        yScale,
        xAccessor,
        yAccessor,
        xyFrameProps: this.props,
        xyFrameState: this.state,
        summaries,
        points,
        lines,
        voronoiHover,
        adjustedPosition,
        adjustedSize,
        annotationLayer
      })
    if (this.props.svgAnnotationRules !== undefined && customSVG !== null) {
      return customSVG
    } else if (d.type === "desaturation-layer") {
      return desaturationLayer({
        style: d.style instanceof Function ? d.style(d, i) : d.style,
        size: adjustedSize,
        i,
        key: d.key
      })
    } else if (d.type === "xy" || d.type === "frame-hover") {
      return svgXYAnnotation({ d, i, screenCoordinates })
    } else if (d.type === "react-annotation" || typeof d.type === "function") {
      return basicReactAnnotation({ d, screenCoordinates, i })
    } else if (d.type === "enclose") {
      return svgEncloseAnnotation({ d, screenCoordinates, i })
    } else if (d.type === "enclose-rect") {
      return svgRectEncloseAnnotation({ d, screenCoordinates, i })
    } else if (d.type === "enclose-hull") {
      return svgHullEncloseAnnotation({ d, screenCoordinates, i })
    } else if (d.type === "x") {
      return svgXAnnotation({
        d,
        screenCoordinates,
        i,
        adjustedSize
      })
    } else if (d.type === "y") {
      return svgYAnnotation({
        d,
        screenCoordinates,
        i,
        adjustedSize,
        adjustedPosition
      })
    } else if (d.type === "bounds") {
      return svgBoundsAnnotation({
        d,
        i,
        adjustedSize,
        xAccessor,
        yAccessor,
        xScale,
        yScale
      })
    } else if (d.type === "line") {
      return svgLineAnnotation({ d, i, screenCoordinates })
    } else if (d.type === "area") {
      return svgAreaAnnotation({
        d,
        i,
        xScale,
        xAccessor,
        yScale,
        yAccessor,
        annotationLayer
      })
    } else if (d.type === "horizontal-points") {
      return svgHorizontalPointsAnnotation({
        d,
        lines: lines.data,
        points: points.data,
        xScale,
        yScale,
        pointStyle: points.styleFn
      })
    } else if (d.type === "vertical-points") {
      return svgVerticalPointsAnnotation({
        d,
        lines: lines.data,
        points: points.data,
        xScale,
        yScale,
        pointStyle: points.styleFn
      })
    }
    return null
  }

  defaultXYHTMLRule = ({
    d: baseD,
    i,
    lines,
    summaries,
    points,
    annotationLayer
  }: {
    d: AnnotationType
    i: number
    annotationLayer: AnnotationLayerProps
    lines: { data: ProjectedLine[] }
    summaries: { data: ProjectedSummary[] }
    points: {
      data: ProjectedPoint[]
      styleFn: (args?: GenericObject, index?: number) => GenericObject
    }
  }) => {
    const xAccessor = this.state.xAccessor
    const yAccessor = this.state.yAccessor
    const showLinePoints = this.props.showLinePoints

    const xScale = this.state.xScale
    const yScale = this.state.yScale

    const { voronoiHover } = annotationLayer

    let screenCoordinates = []

    const { size, useSpans } = this.props

    const idAccessor = this.state.annotatedSettings.lineIDAccessor
    const d: AnnotationType = findPointByID({
      point: { x: 0, y: 0, ...baseD },
      idAccessor,
      lines,
      xScale,
      projectedX,
      xAccessor
    })

    if (!d) {
      return null
    }

    const xCoord =
      d[projectedXMiddle] ||
      d[projectedX] ||
      findFirstAccessorValue(xAccessor, d)
    const yCoord =
      d[projectedYMiddle] ||
      d[projectedY] ||
      findFirstAccessorValue(yAccessor, d)

    const xString = xCoord && xCoord.toString ? xCoord.toString() : xCoord
    const yString = yCoord && yCoord.toString ? yCoord.toString() : yCoord

    const margin = calculateMargin({
      margin: this.props.margin,
      axes: this.props.axes,
      title: this.state.annotatedSettings.title
    })
    const { adjustedPosition, adjustedSize } = adjustedPositionSize({
      size: this.props.size,
      margin
    })
    if (!d.coordinates) {
      screenCoordinates = [
        xScale(xCoord) || 0,
        relativeY({
          point: d,
          projectedYMiddle,
          projectedY,
          showLinePoints,
          yAccessor,
          yScale
        }) || 0
      ]
    } else {
      screenCoordinates = d.coordinates.map(p => {
        const foundP = findPointByID({
          point: { x: 0, y: 0, ...p },
          idAccessor,
          lines,
          xScale,
          projectedX,
          xAccessor
        })
        return [
          (xScale(findFirstAccessorValue(xAccessor, d)) || 0) +
            adjustedPosition[0],
          (relativeY({
            point: foundP,
            projectedYMiddle,
            projectedY,
            yAccessor,
            yScale
          }) || 0) + adjustedPosition[1]
        ]
      })
    }

    const customAnnotation =
      this.props.htmlAnnotationRules &&
      this.props.htmlAnnotationRules({
        d,
        i,
        screenCoordinates,
        xScale,
        yScale,
        xAccessor,
        yAccessor,
        xyFrameProps: this.props,
        xyFrameState: this.state,
        summaries,
        points,
        lines,
        voronoiHover,
        adjustedPosition,
        adjustedSize,
        annotationLayer
      })

    if (this.props.htmlAnnotationRules && customAnnotation !== null) {
      return customAnnotation
    }
    if (d.type === "frame-hover") {
      let content = (
        <SpanOrDiv span={useSpans} className="tooltip-content">
          <p key="html-annotation-content-1">{xString}</p>
          <p key="html-annotation-content-2">{yString}</p>
          {d.percent ? (
            <p key="html-annotation-content-3">
              {Math.floor(d.percent * 1000) / 10}%
            </p>
          ) : null}
        </SpanOrDiv>
      )

      if (d.type === "frame-hover" && this.props.tooltipContent) {
        content = this.props.tooltipContent(d)
      }
      return htmlTooltipAnnotation({
        content,
        screenCoordinates,
        i,
        d,
        useSpans
      })
    }
    return null
  }

  render() {
    const {
      downloadFields,
      xAccessor,
      yAccessor,
      lines,
      points,
      areas,
      summaries = areas,
      name,
      download,
      size,
      className,
      annotationSettings,
      annotations,
      additionalDefs,
      hoverAnnotation,
      interaction,
      customClickBehavior,
      customHoverBehavior,
      customDoubleClickBehavior,
      canvasPostProcess,
      baseMarkProps,
      useSpans,
      canvasAreas,
      canvasSummaries = canvasAreas,
      canvasPoints,
      canvasLines,
      afterElements,
      beforeElements,
      renderOrder,
      matte,
      frameKey,
      showLinePoints
    } = this.props

    const {
      backgroundGraphics,
      foregroundGraphics,
      adjustedPosition,
      adjustedSize,
      margin,
      axes,
      axesTickLines,
      xScale,
      yScale,
      dataVersion,
      fullDataset,
      areaAnnotations,
      legendSettings,
      xyFrameRender,
      annotatedSettings,
      overlay
    } = this.state

    let downloadButton
    if (download && (points || lines)) {
      const downloadData =
        download === "points"
          ? mapParentsToPoints(fullDataset)
          : points || lines || summaries || areas
      downloadButton = (
        <DownloadButton
          csvName={`${name}-${new Date().toJSON()}`}
          width={Math.floor(size[0])}
          data={xyDownloadMapping({
            data: downloadData,
            xAccessor:
              download === "points" || points
                ? stringToArrayFn<number>(xAccessor)
                : undefined,
            yAccessor:
              download === "points" || points
                ? stringToArrayFn<number>(yAccessor)
                : undefined,
            fields: downloadFields
          })}
        />
      )
    }

    return (
      <Frame
        name="xyframe"
        renderPipeline={xyFrameRender}
        adjustedPosition={adjustedPosition}
        size={size}
        projectedCoordinateNames={projectedCoordinateNames}
        xScale={xScale}
        yScale={yScale}
        axes={axes}
        axesTickLines={axesTickLines}
        title={annotatedSettings.title}
        dataVersion={dataVersion}
        matte={matte}
        className={className}
        adjustedSize={adjustedSize}
        frameKey={frameKey || xyframeKey}
        additionalDefs={additionalDefs}
        hoverAnnotation={hoverAnnotation}
        defaultSVGRule={this.defaultXYSVGRule}
        defaultHTMLRule={this.defaultXYHTMLRule}
        annotations={
          areaAnnotations.length > 0
            ? [...annotations, ...areaAnnotations]
            : annotations
        }
        annotationSettings={annotationSettings}
        legendSettings={legendSettings}
        projectedYMiddle={projectedYMiddle}
        interaction={interaction}
        customClickBehavior={customClickBehavior}
        customHoverBehavior={customHoverBehavior}
        customDoubleClickBehavior={customDoubleClickBehavior}
        points={fullDataset}
        showLinePoints={
          typeof showLinePoints === "string" ? showLinePoints : undefined
        }
        margin={margin}
        backgroundGraphics={backgroundGraphics}
        foregroundGraphics={foregroundGraphics}
        beforeElements={beforeElements}
        afterElements={afterElements}
        downloadButton={downloadButton}
        disableContext={this.props.disableContext}
        canvasPostProcess={canvasPostProcess}
        baseMarkProps={baseMarkProps}
        useSpans={useSpans}
        canvasRendering={!!(canvasSummaries || canvasPoints || canvasLines)}
        renderOrder={renderOrder}
        overlay={overlay}
      />
    )
  }
}

export default XYFrame
