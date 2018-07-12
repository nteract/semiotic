// @flow

import React from "react"

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
  svgRectEncloseRule,
  svgXAnnotation,
  svgYAnnotation,
  svgBoundsAnnotation,
  svgLineAnnotation,
  svgAreaAnnotation,
  svgHorizontalPointsAnnotation,
  svgVerticalPointsAnnotation,
  htmlTooltipAnnotation
} from "./annotationRules/xyframeRules"

import {
  createPoints,
  createLines,
  createAreas
} from "./visualizationLayerBehavior/general"

import { relativeY } from "./svg/lineDrawing"
import AnnotationCallout from "react-annotation/lib/Types/AnnotationCallout"

import {
  calculateMargin,
  drawMarginPath,
  adjustedPositionSize,
  objectifyType
} from "./svg/frameFunctions"
import { xyDownloadMapping } from "./downloadDataMapping"
import {
  projectedX,
  projectedY,
  projectedYTop,
  projectedYMiddle,
  projectedYBottom
} from "./constants/coordinateNames"
import {
  calculateDataExtent,
  stringToFn,
  stringToArrayFn
} from "./data/dataFunctions"
import { findFirstAccessorValue } from "./data/multiAccessorUtils"

import { filterDefs } from "./constants/jsx"
import {
  xyFrameChangeProps,
  xyFrameDataProps,
  xyframeproptypes,
  ordinalframeproptypes,
  networkframeproptypes
} from "./constants/frame_props"

import SpanOrDiv from "./SpanOrDiv"

import type { Node } from "React"

import type {
  ProjectedPoint,
  MarginType,
  CanvasPostProcessTypes
} from "./types/generalTypes"

import type {
  AnnotationHandling,
  CustomHoverType
} from "./types/annotationTypes"

import type { AxisType } from "./types/annotationTypes"

type Props = {
  useSpans: boolean,
  title?: ?string | Object,
  margin?:
    | number
    | { top?: number, bottom?: number, left?: number, right?: number },
  name: string,
  dataVersion?: string,
  frameKey?: string,
  size: Array<number>,
  canvasPostProcess?: CanvasPostProcessTypes,
  additionalDefs?: Node,
  className?: string,
  customHoverBehavior?: Function,
  customClickBehavior?: Function,
  customDoubleClickBehavior?: Function,
  hoverAnnotation?: CustomHoverType,
  disableContext?: boolean,
  interaction?: Object,
  svgAnnotationRules?: Function,
  htmlAnnotationRules?: Function,
  tooltipContent?: Function,
  annotations: Array<Object>,
  interaction?: Object,
  baseMarkProps?: Object,
  backgroundGraphics?: Node,
  foregroundGraphics?: Node,
  beforeElements?: Node,
  afterElements?: Node,
  download?: boolean | string,
  downloadFields?: Array<string>,
  annotationSettings?: AnnotationHandling,
  renderKey?: string | Function,
  legend?: Object | boolean,
  lines?: Array<Object> | Object,
  points?: Array<Object>,
  areas?: Array<Object> | Object,
  axes?: Array<Object>,
  matte?: Object,
  xScaleType?: Function,
  yScaleType?: Function,
  xExtent?: Array<number> | Object,
  yExtent?: Array<number> | Object,
  invertX?: boolean,
  invertY?: boolean,
  xAccessor?: Function | string,
  yAccessor?: Function | string,
  lineDataAccessor?: Function | string,
  areaDataAccessor?: Function | string,
  lineType: string | Object,
  areaType: string | Object,
  lineRenderMode?: string | Object | Function,
  pointRenderMode?: string | Object | Function,
  areaRenderMode?: string | Object | Function,
  showLinePoints?: boolean,
  defined?: Function,
  lineStyle?: Function | Object,
  pointStyle?: Function | Object,
  areaStyle?: Function | Object,
  lineClass?: Function | string,
  pointClass?: Function | string,
  areaClass?: Function | string,
  canvasPoints?: Function | boolean,
  canvasLines?: Function | boolean,
  canvasAreas?: Function | boolean,
  customPointMark?: Function | Object,
  customLineMark?: Function,
  customAreaMark?: Function,
  lineIDAccessor?: Function | string,
  minimap?: Object,
  fullDataset?: Array<ProjectedPoint>,
  projectedLines?: Array<Object>,
  projectedAreas?: Array<Object>,
  projectedPoints?: Array<Object>
}

type State = {
  dataVersion?: string,
  lineData?: Array<Object> | Object,
  pointData?: Array<Object> | Object,
  areaData?: Array<Object> | Object,
  projectedLines?: Array<Object>,
  projectedPoints?: Array<ProjectedPoint>,
  projectedAreas?: Array<Object>,
  fullDataset: Array<Object>,
  adjustedPosition: Array<number>,
  adjustedSize: Array<number>,
  backgroundGraphics?: Node,
  foregroundGraphics?: Node,
  axesData?: Array<Object>,
  axes?: Array<AxisType>,
  axesTickLines?: Array<Object>,
  renderNumber: number,
  margin: MarginType,
  matte?: Object,
  calculatedXExtent: Array<number>,
  calculatedYExtent: Array<number>,
  xAccessor: Function,
  yAccessor: Function,
  xScale: Function,
  yScale: Function,
  xExtent: Array<number>,
  yExtent: Array<number>,
  areaAnnotations: Array<Object>,
  legendSettings?: Object,
  xyFrameRender: Object,
  canvasDrawing: Array<Object>,
  size: Array<number>,
  annotatedSettings: Object
}

const naturalLanguageLineType = {
  "line": { items: "line", chart: "line chart" },
  "linepercent": { items: "line", chart: "line chart" },
  "stackedarea": { items: "stacked area", chart: "stacked area chart" },
  "stackedarea-invert": { items: "stacked area", chart: "stacked area chart" },
  "stackedpercent": { items: "stacked area", chart: "stacked area chart" },
  "stackedpercent-invert": {
    items: "stacked area",
    chart: "stacked area chart"
  },
  "bumparea": { items: "ranked area", chart: "ranked area chart" },
  "bumparea-invert": { items: "ranked area", chart: "ranked area chart" },
  "bumpline": { items: "ranked line", chart: "ranked line chart" },
  "difference": {
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
  yBottom: projectedYBottom
}

function mapParentsToPoints(fullDataset: Array<Object>) {
  return fullDataset.map((d: Object) => {
    if (d.parentLine) {
      return Object.assign({}, d.parentLine, d)
    }
    if (d.parentArea) {
      return Object.assign({}, d.parentArea, d)
    }
    return d
  })
}

class XYFrame extends React.Component<Props, State> {
  static defaultProps = {
    annotations: [],
    foregroundGraphics: undefined,
    size: [500, 500],
    className: "",
    lineType: "line",
    name: "xyframe",
    dataVersion: undefined
  }

  state = {
    size: [500, 500],
    dataVersion: undefined,
    lineData: undefined,
    pointData: undefined,
    areaData: undefined,
    projectedLines: undefined,
    projectedPoints: undefined,
    projectedAreas: undefined,
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
    xAccessor: (d: Object) => d.x,
    yAccessor: (d: Object) => d.y,
    xExtent: [0, 0],
    yExtent: [0, 0],
    areaAnnotations: [],
    xScale: (d: number) => d,
    yScale: (d: number) => d,
    title: null,
    matte: undefined,
    legendSettings: undefined,
    xyFrameRender: {},
    canvasDrawing: [],
    annotatedSettings: {}
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

  componentWillReceiveProps(nextProps: Props) {
    if (
      (this.state.dataVersion &&
        this.state.dataVersion !== nextProps.dataVersion) ||
      !this.state.fullDataset
    ) {
      this.calculateXYFrame(nextProps, true)
    } else if (
      this.state.size[0] !== nextProps.size[0] ||
      this.state.size[1] !== nextProps.size[1] ||
      (!this.state.dataVersion &&
        xyFrameChangeProps.find(d => this.props[d] !== nextProps[d]))
    ) {
      const dataChanged = xyFrameDataProps.find(
        d => this.props[d] !== nextProps[d]
      )
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
    xExtent: Array<number>,
    yExtent: Array<number>,
    adjustedSize: Array<number>,
    xScaleType: Function,
    yScaleType: Function
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

  calculateXYFrame = (currentProps: Props, updateData: boolean) => {
    const {
      legend,
      lines,
      lineClass,
      pointStyle,
      pointRenderMode,
      pointClass,
      areaClass,
      canvasLines,
      canvasPoints,
      canvasAreas,
      defined,
      size,
      renderKey,
      lineType = { type: "line" },
      areaType = { type: "basic" },
      customLineMark,
      customPointMark,
      customAreaMark,
      areaStyle,
      areaRenderMode,
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
      points,
      areas,
      lineDataAccessor,
      areaDataAccessor,
      yAccessor,
      xAccessor
    } = currentProps
    let {
      projectedLines,
      projectedPoints,
      projectedAreas,
      fullDataset
    } = currentProps

    const annotatedSettings = {
      xAccessor: stringToArrayFn(xAccessor, (d: Array<number>) => d[0]),
      yAccessor: stringToArrayFn(yAccessor, (d: Array<number>) => d[1]),
      areaDataAccessor: stringToArrayFn(
        areaDataAccessor,
        (d: Object | Array<number>) => (Array.isArray(d) ? d : d.coordinates)
      ),
      lineDataAccessor: stringToArrayFn(
        lineDataAccessor,
        (d: Object | Array<number>) => (Array.isArray(d) ? d : d.coordinates)
      ),
      lineType: objectifyType(lineType),
      areaType: objectifyType(areaType),
      lineIDAccessor: stringToFn(lineIDAccessor, l => l.semioticLineID),
      areas: !areas || Array.isArray(areas) ? areas : [areas],
      lines: !lines || Array.isArray(lines) ? lines : [lines],
      title:
        typeof title === "object" &&
        !React.isValidElement(title) &&
        title !== null
          ? title
          : { title, orient: "top" }
    }

    annotatedSettings.lineType.simpleLine =
      annotatedSettings.lineType.type === "line" &&
      !annotatedSettings.lineType.y1 &&
      annotatedSettings.lineType.simpleLine !== false

    const margin = calculateMargin({
      margin: currentProps.margin,
      axes: currentProps.axes,
      title: annotatedSettings.title
    })
    const { adjustedPosition, adjustedSize } = adjustedPositionSize({
      size: currentProps.size,
      margin,
      axes: currentProps.axes
    })

    let calculatedXExtent = [],
      calculatedYExtent = [],
      yExtent,
      xExtent

    const xExtentSettings =
      baseXExtent === undefined || Array.isArray(baseXExtent)
        ? { extent: baseXExtent }
        : baseXExtent
    const yExtentSettings =
      baseYExtent === undefined || Array.isArray(baseYExtent)
        ? { extent: baseYExtent }
        : baseYExtent

    let xScale, yScale

    if (
      updateData ||
      (currentProps.dataVersion &&
        currentProps.dataVersion !== this.state.dataVersion)
    ) {
      if (
        !xExtent ||
        !yExtent ||
        !fullDataset ||
        (!projectedLines && !projectedPoints && !projectedAreas)
      ) {
        ;({
          xExtent,
          yExtent,
          projectedLines,
          projectedPoints,
          projectedAreas,
          fullDataset,
          calculatedXExtent,
          calculatedYExtent
        } = calculateDataExtent({
          lineDataAccessor: annotatedSettings.lineDataAccessor,
          areaDataAccessor: annotatedSettings.areaDataAccessor,
          xAccessor: annotatedSettings.xAccessor,
          yAccessor: annotatedSettings.yAccessor,
          lineType: annotatedSettings.lineType,
          areaType: annotatedSettings.areaType,
          areas: annotatedSettings.areas,
          points,
          lines: annotatedSettings.lines,
          showLinePoints,
          xExtent: baseXExtent,
          yExtent: baseYExtent,
          invertX,
          invertY,
          adjustedSize: size,
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
        projectedAreas,
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

    xExtent = xExtentSettings.extent || xExtent
    yExtent = yExtentSettings.extent || yExtent

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
          margin,
          footer: d.footer,
          tickSize: d.tickSize
        })
        const axisTickLines = (
          <g key={`axes-tick-lines-${i}`} className={`axis ${axisClassname}`}>
            {axisLines({
              axisParts,
              orient: d.orient,
              tickLineGenerator: d.tickLineGenerator
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
            format={d.format}
            scale={axisScale}
            className={axisClassname}
            name={d.name}
            padding={d.padding}
            rotate={d.rotate}
            annotationFunction={d.axisAnnotationFunction}
            glyphFunction={d.glyphFunction}
            baseline={d.baseline}
          />
        )
      })
    }

    let marginGraphic
    if (currentProps.matte) {
      marginGraphic = (
        <path
          fill="white"
          transform={`translate(${-margin.left},${-margin.top})`}
          d={drawMarginPath({
            margin,
            size: size,
            inset: currentProps.matte.inset
          })}
          className="xyframe-matte"
        />
      )
    }

    let legendSettings

    if (legend) {
      legendSettings = legend === true ? {} : legend
      if (projectedLines && !legendSettings.legendGroups) {
        const typeString = annotatedSettings.lineType.type
        const type =
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

    if (annotatedSettings.areaType.label && projectedAreas) {
      projectedAreas.forEach((d, i) => {
        if (d.bounds) {
          const bounds = Array.isArray(d.bounds) ? d.bounds : [d.bounds]
          bounds.forEach(labelBounds => {
            const label =
              typeof annotatedSettings.areaType.label === "function"
                ? annotatedSettings.areaType.label(d)
                : annotatedSettings.areaType.label
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
      typeof annotatedSettings.lineType.type !== "function" &&
      naturalLanguageLineType[annotatedSettings.lineType.type]

    const xyFrameRender = {
      lines: {
        accessibleTransform: (data, i) => ({
          ...data[i].data[data[i].data.length - 1],
          type: "frame-hover"
        }),
        data: projectedLines,
        styleFn: stringToFn(lineStyle, emptyObjectReturnFunction, true),
        classFn: stringToFn(lineClass, emptyStringReturnFunction, true),
        renderMode: stringToFn(lineRenderMode, undefined, true),
        canvasRender: stringToFn(canvasLines, undefined, true),
        customMark: customLineMark,
        type: annotatedSettings.lineType,
        defined: defined,
        renderKeyFn: stringToFn(renderKey, (d, i) => `line-${i}`, true),
        ariaLabel: lineAriaLabel,
        axesData: currentProps.axes,
        behavior: createLines
      },
      areas: {
        accessibleTransform: (data, i) => ({ ...data[i], type: "frame-hover" }),
        data: projectedAreas,
        styleFn: stringToFn(areaStyle, emptyObjectReturnFunction, true),
        classFn: stringToFn(areaClass, emptyStringReturnFunction, true),
        renderMode: stringToFn(areaRenderMode, undefined, true),
        canvasRender: stringToFn(canvasAreas, undefined, true),
        customMark: customAreaMark,
        type: annotatedSettings.areaType,
        renderKeyFn: stringToFn(renderKey, (d, i) => `area-${i}`, true),
        behavior: createAreas
      },
      points: {
        accessibleTransform: (data, i) => ({
          type: "frame-hover",
          ...(data[i].data || data[i])
        }),
        data: projectedPoints,
        styleFn: stringToFn(pointStyle, emptyObjectReturnFunction, true),
        classFn: stringToFn(pointClass, emptyStringReturnFunction, true),
        renderMode: stringToFn(pointRenderMode, undefined, true),
        canvasRender: stringToFn(canvasPoints, undefined, true),
        customMark: customPointMark,
        renderKeyFn: stringToFn(renderKey, (d, i) => `point-${i}`, true),
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

    this.setState({
      lineData: currentProps.lines,
      pointData: currentProps.points,
      areaData: currentProps.areas,
      dataVersion: currentProps.dataVersion,
      projectedLines,
      projectedPoints,
      projectedAreas,
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
      matte: marginGraphic,
      areaAnnotations,
      xyFrameRender,
      size,
      annotatedSettings
    })
  }

  defaultXYSVGRule = ({
    d,
    i,
    annotationLayer,
    lines,
    areas,
    points
  }: {
    d: Object,
    i: number,
    annotationLayer: Node,
    lines: Object,
    areas: Object,
    points: Object
  }) => {
    const xAccessor = this.state.xAccessor
    const yAccessor = this.state.yAccessor

    const xScale = this.state.xScale
    const yScale = this.state.yScale

    let screenCoordinates = []
    const idAccessor = this.state.annotatedSettings.lineIDAccessor

    if (lines.data.length !== 0) {
      const thisLine = lines.data.find(l => idAccessor(l) === idAccessor(d))
      if (thisLine && !d.parentLine) d.parentLine = thisLine
    }

    const margin = calculateMargin({
      margin: this.props.margin,
      axes: this.props.axes,
      title: this.state.annotatedSettings.title
    })
    const { adjustedPosition, adjustedSize } = adjustedPositionSize({
      size: this.props.size,
      margin,
      axes: this.props.axes,
      title: this.props.title
    })

    if (!d.coordinates) {
      const xCoord = d[projectedX] || findFirstAccessorValue(xAccessor, d)
      screenCoordinates = [
        xScale(xCoord),
        relativeY({
          point: d,
          lines,
          projectedYMiddle,
          projectedY,
          projectedX,
          xAccessor,
          yAccessor,
          yScale,
          xScale,
          idAccessor
        })
      ]

      if (
        d.type !== "highlight" &&
        (screenCoordinates[0] === undefined ||
          screenCoordinates[1] === undefined ||
          screenCoordinates[0] === null ||
          screenCoordinates[1] === null)
      ) {
        //NO ANNOTATION IF INVALID SCREEN COORDINATES
        return null
      }
    } else if (!d.bounds) {
      screenCoordinates = d.coordinates.map(p => [
        xScale(findFirstAccessorValue(xAccessor, p)) + adjustedPosition[0],
        relativeY({
          point: p,
          lines,
          projectedYMiddle,
          projectedY,
          projectedX,
          xAccessor,
          yAccessor,
          yScale,
          xScale,
          idAccessor
        }) + adjustedPosition[1]
      ])
    }

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
        areas,
        points,
        lines
      })
    if (this.props.svgAnnotationRules !== undefined && customSVG !== null) {
      return customSVG
    } else if (d.type === "xy" || d.type === "frame-hover") {
      return svgXYAnnotation({ d, i, screenCoordinates })
    } else if (d.type === "highlight") {
      return svgHighlight({
        d,
        screenCoordinates,
        i,
        idAccessor,
        lines,
        areas,
        points,
        xScale,
        yScale
      })
    } else if (d.type === "react-annotation" || typeof d.type === "function") {
      return basicReactAnnotation({ d, screenCoordinates, i })
    } else if (d.type === "enclose") {
      return svgEncloseAnnotation({ d, screenCoordinates, i })
    } else if (d.type === "enclose-rect") {
      return svgRectEncloseRule({ d, screenCoordinates, i })
    } else if (d.type === "x") {
      return svgXAnnotation({
        d,
        screenCoordinates,
        i,
        annotationLayer,
        adjustedSize,
        margin
      })
    } else if (d.type === "y") {
      return svgYAnnotation({
        d,
        screenCoordinates,
        i,
        annotationLayer,
        adjustedSize,
        adjustedPosition,
        margin
      })
    } else if (d.type === "bounds") {
      return svgBoundsAnnotation({
        screenCoordinates,
        d,
        i,
        adjustedSize,
        adjustedPosition,
        xAccessor,
        yAccessor,
        xScale,
        yScale,
        margin
      })
    } else if (d.type === "line") {
      return svgLineAnnotation({ d, i, screenCoordinates })
    } else if (d.type === "area") {
      return svgAreaAnnotation({
        d,
        i,
        screenCoordinates,
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
    d,
    i,
    lines,
    areas,
    points
  }: {
    d: Object,
    i: number,
    lines: Object,
    areas: Object,
    points: Object
  }) => {
    const xAccessor = this.state.xAccessor
    const yAccessor = this.state.yAccessor

    const xScale = this.state.xScale
    const yScale = this.state.yScale

    let screenCoordinates = []

    const { size, useSpans } = this.props

    const idAccessor = this.state.annotatedSettings.lineIDAccessor

    if (lines.data.length !== 0) {
      const thisLine = lines.data.find(l => idAccessor(l) === idAccessor(d))
      if (thisLine && !d.parentLine) d.parentLine = thisLine
    }

    const xCoord = d[projectedX] || findFirstAccessorValue(xAccessor, d)
    const yCoord = d[projectedY] || findFirstAccessorValue(yAccessor, d)

    const xString = xCoord && xCoord.toString ? xCoord.toString() : xCoord
    const yString = yCoord && yCoord.toString ? yCoord.toString() : yCoord

    const margin = calculateMargin({
      margin: this.props.margin,
      axes: this.props.axes,
      title: this.state.annotatedSettings.title
    })
    const { adjustedPosition } = adjustedPositionSize({
      size: this.props.size,
      margin,
      axes: this.props.axes,
      title: this.props.title
    })
    if (!d.coordinates) {
      screenCoordinates = [
        xScale(xCoord),
        relativeY({
          point: d,
          lines,
          projectedYMiddle,
          projectedY,
          projectedX,
          xAccessor,
          yAccessor,
          yScale,
          xScale,
          idAccessor
        })
      ]
      if (
        screenCoordinates[0] === undefined ||
        screenCoordinates[1] === undefined ||
        screenCoordinates[0] === null ||
        screenCoordinates[1] === null
      ) {
        //NO ANNOTATION IF INVALID SCREEN COORDINATES
        return null
      }
    } else {
      screenCoordinates = d.coordinates.map(p => [
        xScale(findFirstAccessorValue(xAccessor, d)) + adjustedPosition[0],
        relativeY({
          point: p,
          lines,
          projectedYMiddle,
          projectedY,
          projectedX,
          xAccessor,
          yAccessor,
          yScale,
          xScale,
          idAccessor
        }) + adjustedPosition[1]
      ])
    }

    if (
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
        areas,
        points,
        lines
      }) !== null
    ) {
      return this.props.htmlAnnotationRules({
        d,
        i,
        screenCoordinates,
        xScale,
        yScale,
        xAccessor,
        yAccessor,
        xyFrameProps: this.props,
        xyFrameState: this.state,
        areas,
        points,
        lines
      })
    }
    if (d.type === "frame-hover") {
      let content = (
        <SpanOrDiv span={useSpans} className="tooltip-content">
          <p key="html-annotation-content-1">{xString}</p>
          <p key="html-annotation-content-2">{yString}</p>
          {d.percent ? (
            <p key="html-annotation-content-3">
              {parseInt(d.percent * 1000, 10) / 10}%
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
        size,
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
      canvasPoints,
      canvasLines,
      afterElements,
      beforeElements
    } = this.props

    const {
      backgroundGraphics,
      foregroundGraphics,
      adjustedPosition,
      adjustedSize,
      margin,
      matte,
      axes,
      axesTickLines,
      xScale,
      yScale,
      dataVersion,
      fullDataset,
      areaAnnotations,
      legendSettings,
      xyFrameRender,
      annotatedSettings
    } = this.state

    let downloadButton
    if (download && (points || lines)) {
      const downloadData =
        download === "points"
          ? mapParentsToPoints(fullDataset)
          : points || lines || areas
      downloadButton = (
        <DownloadButton
          csvName={`${name}-${new Date().toJSON()}`}
          width={parseInt(size[0], 10)}
          data={xyDownloadMapping({
            data: downloadData,
            xAccessor:
              download === "points" || points
                ? stringToArrayFn(xAccessor)
                : undefined,
            yAccessor:
              download === "points" || points
                ? stringToArrayFn(yAccessor)
                : undefined,
            fields: downloadFields
          })}
        />
      )
    }

    const finalFilterDefs = filterDefs({
      matte: matte,
      key: matte && (this.props.frameKey || xyframeKey),
      additionalDefs: additionalDefs
    })

    // foreground and background graphics should handle either JSX or a function that passes size & margin and returns JSX

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
        finalFilterDefs={finalFilterDefs}
        frameKey={xyframeKey}
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
        canvasRendering={!!(canvasAreas || canvasPoints || canvasLines)}
      />
    )
  }
}

XYFrame.propTypes = {
  ...xyframeproptypes
}

export default XYFrame
