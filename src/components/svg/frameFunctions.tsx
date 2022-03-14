import * as React from "react"

import { drawAreaConnector } from "../svg/SvgHelper"
import { Mark } from "semiotic-mark"
import Axis from "../Axis"
import { AxisProps } from "../types/annotationTypes"

import {
  boxplotRenderFn,
  contourRenderFn,
  bucketizedRenderingFn
} from "./summaryLayouts"
import {
  axisPieces,
  axisLines,
  baselineGenerator
} from "../visualizationLayerBehavior/axis"

import {
  MarginType,
  ProjectionTypes,
  accessorType
} from "../types/generalTypes"

import { scaleLinear, ScaleLinear } from "d3-scale"

const extent = (inputArray) =>
  inputArray.reduce(
    (p, c) => {
      return [Math.min(c, p[0]), Math.max(c, p[1])]
    },
    [Infinity, -Infinity]
  )

export type TitleType =
  | string
  | Element
  | { title?: string | Element; orient?: string }

type PieceType = { type: string; innerRadius?: number }

type SummaryType = { type: string }

type CalculateMarginTypes = {
  margin?: number | object
  axes?: Array<AxisProps>
  title: TitleType
  oLabel?: boolean | accessorType<string | Element>
  projection?: ProjectionTypes
  size?: number[]
}

type AdjustedPositionSizeTypes = {
  size: Array<number>
  position?: Array<number>
  margin: MarginType
  projection?: ProjectionTypes
}

type ORFrameConnectionRendererTypes = {
  type: { type: Function }
  data: any
  renderMode: Function
  eventListenersGenerator: Function
  styleFn: Function
  classFn: Function
  projection: ProjectionTypes
  canvasRender: Function
  canvasDrawing: Array<object>
  baseMarkProps: object
  pieceType: PieceType
}

type ORFrameSummaryRendererTypes = {
  data: Array<object>
  type: SummaryType
  renderMode: Function
  eventListenersGenerator: Function
  styleFn: Function
  classFn: Function
  projection: ProjectionTypes
  adjustedSize: Array<number>
  chartSize: number
  baseMarkProps: object
  margin: object
}

type ORFrameAxisGeneratorTypes = {
  projection: ProjectionTypes
  axis?: Array<AxisProps>
  adjustedSize: Array<number>
  size: Array<number>
  rScale: ScaleLinear<number, number>
  rScaleType: ScaleLinear<number, number>
  pieceType: PieceType
  rExtent: Array<number>
  data: Array<object>
  maxColumnValues?: number
  xyData: Array<{ value: number; data: object }>
  margin: MarginType
  thresholds?: number[]
}

const findActualTitle = (rawTitle) => {
  let title = null
  let orient = "top"
  if (typeof rawTitle === "string") {
    title = rawTitle
  } else if ("title" in rawTitle) {
    title = rawTitle.title
    orient = rawTitle.orient || "top"
  } else {
    title = rawTitle
  }

  return { orient, title }
}

function roundToTenth(number: number) {
  return Math.round(number * 10) / 10
}

export const circlePath = (cx: number, cy: number, r: number) =>
  `${[
    "M",
    roundToTenth(cx - r),
    roundToTenth(cy),
    "a",
    r,
    r,
    0,
    1,
    0,
    r * 2,
    0,
    "a",
    r,
    r,
    0,
    1,
    0,
    -(r * 2),
    0
  ].join(" ")}Z`

export const drawMarginPath = ({
  margin,
  size,
  inset = 0
}: {
  margin: MarginType
  size: Array<number>
  inset: number
}) => {
  const iSize = [size[0] - inset, size[1] - inset]
  return `M0,0 h${size[0]} v${size[1]} h-${size[0]}Z M${margin.left - inset},${
    margin.top - inset
  } v${size[1] + inset * 2 - margin.top - margin.bottom} h${
    iSize[0] + inset * 3 - margin.left - margin.right
  } v-${iSize[1] + inset * 3 - margin.top - margin.bottom}Z`
}

export const calculateMargin = ({
  margin,
  axes,
  title: rawTitle,
  oLabel,
  projection,
  size
}: CalculateMarginTypes): MarginType => {
  if (margin !== undefined) {
    if (typeof margin === "function") {
      margin = margin({ size })
    }
    if (typeof margin !== "object") {
      return { top: margin, bottom: margin, left: margin, right: margin }
    } else if (typeof margin === "object") {
      return Object.assign({ top: 0, bottom: 0, left: 0, right: 0 }, margin)
    }
  }
  const finalMargin = { top: 0, bottom: 0, left: 0, right: 0 }

  let orient = "left"

  if (axes && projection !== "radial") {
    axes.forEach((axisObj) => {
      const axisObjAdditionMargin = axisObj.label ? 60 : 50
      orient = axisObj.orient
      finalMargin[orient] = axisObjAdditionMargin
    })
  }

  const { title, orient: titleOrient } = findActualTitle(rawTitle)

  if (title && !(typeof title === "string" && title.length === 0)) {
    finalMargin[titleOrient] += 40
  }

  if (oLabel && projection !== "radial") {
    if (orient === "bottom" || orient === "top") {
      finalMargin.left += 50
    } else {
      finalMargin.bottom += 50
    }
  }
  return finalMargin
}

type ObjectifyType = {
  type?: string | Function
}

export function objectifyType(
  type?: string | Function | ObjectifyType
): ObjectifyType {
  if (type instanceof Function || typeof type === "string") {
    return { type: type }
  } else if (type === undefined) {
    return {}
  }
  return type
}

export function generateOrdinalFrameEventListeners(
  customHoverBehavior: Function,
  customClickBehavior: Function
) {
  let eventListenersGenerator: (
    d?: object,
    i?: number
  ) => {
    onMouseEnter?: (e) => void
    onMouseLeave?: (e) => void
    onClick?: (e) => void
  } = () => ({})

  if (customHoverBehavior || customClickBehavior) {
    eventListenersGenerator = (d: object, i: number) => ({
      onMouseEnter: customHoverBehavior
        ? (e): void => customHoverBehavior(d, i, e)
        : undefined,
      onMouseLeave: customHoverBehavior
        ? (e): void => customHoverBehavior(undefined, undefined, e)
        : undefined,
      onClick: customClickBehavior
        ? (e): void => customClickBehavior(d, i, e)
        : undefined
    })
  }
  return eventListenersGenerator
}

export function keyAndObjectifyBarData({
  data,
  renderKey = (d?: object | number, i?: number) => i,
  oAccessor,
  rAccessor: baseRAccessor,
  originalRAccessor,
  originalOAccessor,
  multiAxis = false
}: {
  data: Array<object | number>
  renderKey: Function
  oAccessor: Array<Function>
  rAccessor: Array<(d: number | object, i?: number) => number>
  multiAxis?: boolean
  originalOAccessor: Array<string | Function>
  originalRAccessor: Array<string | Function>
}): { allData: Array<object>; multiExtents?: Array<Array<number>> } {
  let rAccessor
  let multiExtents
  if (multiAxis && baseRAccessor.length > 1) {
    let minNegative = Infinity
    multiExtents = baseRAccessor.map((accessor) => {
      const basicExtent = extent(data.map(accessor))
      minNegative = Math.min(basicExtent[0] / basicExtent[1], minNegative)
      return basicExtent
    })
    const rScales = multiExtents.map((ext) => {
      let range = [0, 1]
      let adjustedExtent = ext

      if (ext[0] < 0 && ext[1] > 0) {
        range[0] = minNegative
        adjustedExtent[0] = adjustedExtent[1] * minNegative
      } else if (ext[0] < 0 && ext[1] < 0) {
        adjustedExtent[1] = 0
        range = [-1, 0]
      } else {
        adjustedExtent[0] = 0
      }
      return scaleLinear().domain(ext).range(range)
    })
    rAccessor = rScales.map((scale, i) => (d) => {
      return scale(baseRAccessor[i](d))
    })
  } else {
    rAccessor = baseRAccessor
  }
  const decoratedData = []
  oAccessor.forEach((actualOAccessor, oIndex) => {
    rAccessor.forEach((actualRAccessor, rIndex) => {
      ;(data || []).forEach((d) => {
        const baseAppliedKey = renderKey(d, decoratedData.length)
        const appliedKey =
          (baseAppliedKey !== undefined &&
            baseAppliedKey.toString &&
            baseAppliedKey.toString()) ||
          baseAppliedKey

        const originalR = originalRAccessor[rIndex]
        const originalO = originalOAccessor[oIndex]
        const rName =
          typeof originalR === "string" ? originalR : `function-${rIndex}`
        const oName =
          typeof originalO === "string" ? originalO : `function-${oIndex}`

        if (typeof d !== "object") {
          const expandedData = { value: d, renderKey: appliedKey }
          const value = actualRAccessor(expandedData)
          decoratedData.push({
            data: expandedData,
            value,
            rIndex,
            rName,
            oIndex,
            oName,
            column: appliedKey,
            renderKey: appliedKey
          })
        } else {
          const value = actualRAccessor(d)
          const column = actualOAccessor(d)
          decoratedData.push({
            renderKey: appliedKey,
            data: d,
            rIndex,
            rName,
            oIndex,
            oName,
            value,
            column: column && column.toString ? column.toString() : column
          })
        }
      })
    })
  })
  return { allData: decoratedData, multiExtents }
}

export function adjustedPositionSize({
  size = [500, 500],
  position = [0, 0],
  margin,
  projection
}: AdjustedPositionSizeTypes) {
  const heightAdjust = margin.top + margin.bottom
  const widthAdjust = margin.left + margin.right

  const adjustedPosition = [position[0], position[1]]
  let adjustedSize = [size[0] - widthAdjust, size[1] - heightAdjust]
  if (projection === "radial") {
    const minSize = Math.min(adjustedSize[0], adjustedSize[1])
    adjustedSize = [minSize, minSize]
  }

  return { adjustedPosition, adjustedSize }
}

export function generateFrameTitle({
  title: rawTitle = { title: "", orient: "top" },
  size
}: {
  title: TitleType
  size: Array<number>
}) {
  let finalTitle = null

  const { title, orient } = findActualTitle(rawTitle)

  let x = 0,
    y = 0,
    transform
  switch (orient) {
    case "top":
      x = size[0] / 2
      y = 25
      break
    case "bottom":
      x = size[0] / 2
      y = size[1] - 25
      break
    case "left":
      x = 25
      y = size[1] / 2
      transform = "rotate(-90)"
      break
    case "right":
      x = size[0] - 25
      y = size[1] / 2
      transform = "rotate(90)"

      break
  }
  const gTransform = `translate(${x},${y})`
  if (typeof title === "string" && title.length > 0) {
    finalTitle = (
      <g transform={gTransform}>
        <text
          className={"frame-title"}
          transform={transform}
          style={{ textAnchor: "middle", pointerEvents: "none" }}
        >
          {title}
        </text>
      </g>
    )
  } else if (title) {
    //assume if defined then its an svg mark of some sort
    finalTitle = <g transform={gTransform}>{title}</g>
  }
  return finalTitle
}

export function orFrameConnectionRenderer({
  type,
  data,
  renderMode,
  eventListenersGenerator,
  styleFn,
  classFn,
  projection,
  canvasRender,
  canvasDrawing,
  baseMarkProps,
  pieceType
}: ORFrameConnectionRendererTypes) {
  if (!type.type) {
    return null
  }
  const renderedConnectorMarks = []
  const radarHash = new Map()

  const { keyedData, oExtent } = data

  if (typeof type.type === "function") {
    const connectionRule = type.type
    const keys = oExtent

    oExtent.forEach((key, pieceArrayI) => {
      const pieceArray = keyedData[key]
      const nextColumn = keyedData[keys[pieceArrayI + 1]]
      if (nextColumn) {
        const matchArray = nextColumn.map((d, i) =>
          connectionRule({ ...d.piece, ...d.piece.data }, i)
        )
        pieceArray.forEach((piece, pieceI) => {
          const thisConnectionPiece = connectionRule(
            { ...piece.piece, ...piece.piece.data },
            pieceI
          )
          const targetMatch = connectionRule(
            { ...piece.piece, ...piece.piece.data },
            pieceI
          )

          const matchingPieceIndex =
            targetMatch !== undefined &&
            targetMatch !== false &&
            matchArray.indexOf(targetMatch)
          if (
            thisConnectionPiece !== undefined &&
            thisConnectionPiece !== null &&
            matchingPieceIndex !== false &&
            matchingPieceIndex !== -1
          ) {
            const matchingPiece = nextColumn[matchingPieceIndex]
            let markD
            if (projection === "radial" && pieceType.type === "point") {
              if (!radarHash.get(piece)) {
                radarHash.set(piece, [piece])
              }
              const thisRadar = radarHash.get(piece)
              if (thisRadar) {
                thisRadar.push(matchingPiece)
                radarHash.set(matchingPiece, thisRadar)
                radarHash.delete(piece)
              }
            } else {
              const { xy } = piece
              const { xy: mxy } = matchingPiece
              const { x, y, height = 1, width = 1 } = xy
              const {
                x: mx,
                y: my,
                height: mheight = 1,
                width: mwidth = 1
              } = mxy
              if (projection === "vertical") {
                markD = drawAreaConnector({
                  x1: x + width,
                  x2: mx,
                  y1: y,
                  y2: my,
                  sizeX1: 0,
                  sizeX2: 0,
                  sizeY1: height,
                  sizeY2: mheight
                })
              } else if (projection === "horizontal") {
                markD = drawAreaConnector({
                  x1: x,
                  x2: mx,
                  y1: y + height,
                  y2: my,
                  sizeX1: width,
                  sizeX2: mwidth,
                  sizeY1: 0,
                  sizeY2: 0
                })
              } else if (projection === "radial") {
                markD = drawAreaConnector({
                  x1: x,
                  x2: mx,
                  y1: y + height,
                  y2: my,
                  sizeX1: width,
                  sizeX2: mwidth,
                  sizeY1: 0,
                  sizeY2: 0
                })
              }
              const renderValue = renderMode && renderMode(piece.piece, pieceI)
              const source = { ...piece.piece.data, ...piece.piece.data }
              const target = {
                ...matchingPiece.piece,
                ...matchingPiece.piece.data
              }
              const calculatedStyle = styleFn({
                source,
                target
              })

              const eventListeners = eventListenersGenerator(
                { source, target },
                pieceI
              )
              if (canvasRender && canvasRender(piece.piece) === true) {
                const canvasConnector = {
                  baseClass: "xyframe-line",
                  tx: 0,
                  ty: 0,
                  d: {
                    source,
                    target
                  },
                  markProps: { d: markD, markType: "path" },
                  styleFn: styleFn,
                  renderFn: renderMode,
                  classFn
                }
                canvasDrawing.push(canvasConnector)
              } else {
                renderedConnectorMarks.push(
                  <Mark
                    {...baseMarkProps}
                    {...eventListeners}
                    renderMode={renderValue}
                    markType="path"
                    d={markD}
                    className={classFn ? classFn(piece.piece.data, pieceI) : ""}
                    key={`connector${piece.piece.renderKey}`}
                    style={calculatedStyle}
                  />
                )
              }
            }
          }
        })
      }
    })

    if (radarHash.size > 0) {
      for (const ring of radarHash.values()) {
        const ringPiece = { ...ring[0].piece, ...ring[0].piece.data }
        const markD = `M${ring.map((d) => `${d.xy.x},${d.xy.y}`).join("L")}Z`
        if (canvasRender && canvasRender(ringPiece)) {
          const canvasRadar = {
            baseClass: "ordinal-radar",
            tx: 0,
            ty: 0,
            d: {
              source: ringPiece
            },
            markProps: { d: markD, markType: "path" },
            styleFn: styleFn,
            renderFn: renderMode,
            classFn
          }
          canvasDrawing.push(canvasRadar)
        } else {
          renderedConnectorMarks.push(
            <Mark
              {...baseMarkProps}
              renderMode={renderMode && renderMode(ringPiece)}
              markType="path"
              d={markD}
              className={classFn ? classFn(ringPiece) : ""}
              key={`ordinal-ring-${ringPiece.renderKey}`}
              style={styleFn({
                source: ringPiece
              })}
            />
          )
        }
      }
    }
  } else if (type.type) {
    console.error(
      `Invalid connectorType - Must be a function that takes a data point and determines if it is connected to a data point in the next column`
    )
  }
  return renderedConnectorMarks
}

const summaryRenderHash = {
  contour: contourRenderFn,
  boxplot: boxplotRenderFn,
  violin: bucketizedRenderingFn,
  heatmap: bucketizedRenderingFn,
  ridgeline: bucketizedRenderingFn,
  histogram: bucketizedRenderingFn,
  horizon: bucketizedRenderingFn
}

export function orFrameSummaryRenderer({
  data,
  type,
  renderMode,
  eventListenersGenerator,
  styleFn,
  classFn,
  projection,
  adjustedSize,
  chartSize,
  baseMarkProps,
  margin
}: ORFrameSummaryRendererTypes) {
  let summaryRenderFn
  if (typeof type.type === "function") {
    summaryRenderFn = type.type
  } else if (summaryRenderHash[type.type]) {
    summaryRenderFn = summaryRenderHash[type.type]
  } else {
    console.error(
      `Invalid summary type: ${
        type.type
      } - Must be a function or one of the following strings: ${Object.keys(
        summaryRenderHash
      ).join(", ")}`
    )
    return {}
  }
  return summaryRenderFn({
    data,
    type,
    renderMode,
    eventListenersGenerator,
    styleFn,
    classFn,
    projection,
    adjustedSize,
    chartSize,
    baseMarkProps,
    margin
  })
}

export const orFrameAxisGenerator = ({
  projection,
  axis,
  adjustedSize,
  size,
  rScale,
  rScaleType,
  pieceType,
  rExtent,
  data,
  maxColumnValues = 1,
  xyData,
  margin,
  thresholds
}: ORFrameAxisGeneratorTypes) => {
  if (!axis) return { axis: undefined, axesTickLines: undefined }
  let generatedAxis: Array<JSX.Element>, axesTickLines: Array<Object>
  if (projection !== "radial" && axis) {
    axesTickLines = []
    const axisPosition = [0, 0]

    generatedAxis = axis.map((d, i) => {
      let axisClassname = d.className || ""
      let tickValues
      const axisDomain = d.extentOverride ? d.extentOverride : rScale.domain()

      const leftRight = ["left", "right"]

      const axisScale =
        (leftRight.indexOf(d.orient) === -1 && projection !== "vertical") ||
        (leftRight.indexOf(d.orient) !== -1 && projection !== "horizontal")
          ? rScaleType.domain(axisDomain)
          : rScaleType.domain([0, maxColumnValues])

      const orient = d.orient
      const axisRange =
        (leftRight.indexOf(d.orient) === -1 && projection !== "vertical") ||
        (leftRight.indexOf(d.orient) !== -1 && projection !== "horizontal")
          ? rScale.range()
          : [0, projection === "vertical" ? adjustedSize[0] : adjustedSize[1]]

      if (orient === "right") {
        axisScale.range(axisRange.reverse())
        axisClassname += " right y"
      } else if (orient === "left") {
        axisClassname += " left y"
        axisScale.range(axisRange.reverse())
      } else if (orient === "top") {
        axisClassname += " top x"
        axisScale.range(axisRange)
      } else if (orient === "bottom") {
        axisClassname += " bottom x"
        axisScale.range(axisRange)
      }

      if (d.tickValues && Array.isArray(d.tickValues)) {
        tickValues = d.tickValues
      } else if (d.tickValues instanceof Function) {
        //otherwise assume a function
        tickValues = d.tickValues(data, size, rScale)
      } else if (!d.tickValues && thresholds) {
        tickValues = thresholds.map((d) => rScale.invert(d))
      }
      const axisParts = axisPieces({
        padding: d.padding,
        tickValues,
        scale: axisScale,
        ticks: d.ticks,
        orient,
        size: adjustedSize,
        footer: d.footer,
        tickSize: d.tickSize,
        jaggedBase: d.jaggedBase
      })
      const axisTickLines = axisLines({
        className: d.className,
        axisParts,
        orient,
        baseMarkProps: {},
        tickLineGenerator: d.tickLineGenerator,
        jaggedBase: d.jaggedBase,
        scale: axisScale
      })

      axesTickLines.push(axisTickLines)
      if (d.baseline === "under") {
        axesTickLines.push(
          baselineGenerator(d.orient, adjustedSize, d.className)
        )
      }

      const marginalSummaryType =
        typeof d.marginalSummaryType === "string"
          ? { type: d.marginalSummaryType }
          : d.marginalSummaryType

      return (
        <Axis
          {...d}
          key={d.key || `orframe-axis-${i}`}
          axisParts={axisParts}
          orient={orient}
          size={adjustedSize}
          position={axisPosition}
          tickValues={tickValues}
          scale={axisScale}
          className={axisClassname}
          marginalSummaryType={marginalSummaryType}
          margin={margin}
          xyPoints={xyData.map((d) => ({
            x: projection === "vertical" ? 0 : d.value,
            y: projection === "vertical" ? d.value : 0,
            data: d.data
          }))}
        />
      )
    })
  } else if (projection === "radial" && axis) {
    const { innerRadius = 0 } = pieceType

    const ticks = []
    axis.forEach((axisObj) => {
      const {
        tickValues: baseTickValues = rScale.ticks(
          Math.max(2, (adjustedSize[0] / 2 - innerRadius) / 50)
        ),
        label,
        tickFormat = (d) => d
      } = axisObj

      const tickScale = rScaleType
        .domain(rExtent)
        .range([innerRadius, adjustedSize[0] / 2])

      const tickValues =
        baseTickValues instanceof Function
          ? baseTickValues({
              orient: axisObj.orient
            })
          : baseTickValues
      tickValues.forEach((t, i) => {
        const tickSize = tickScale(t)
        if (!(innerRadius === 0 && t === 0)) {
          let axisLabel
          let ref = ""
          if (label && i === tickValues.length - 1) {
            const labelSettings =
              typeof label === "string"
                ? { name: label, locationDistance: 15 }
                : label
            const { locationDistance = 15 } = labelSettings
            ref = `${Math.random().toString()} `
            axisLabel = (
              <g
                className="axis-label radial"
                transform={`translate(0,${locationDistance})`}
              >
                <text textAnchor="middle">
                  <textPath
                    startOffset={tickSize * Math.PI * 0.5}
                    xlinkHref={`#${ref}`}
                  >
                    {label.name}
                  </textPath>
                </text>
              </g>
            )
          }
          ticks.push(
            <g
              key={`orframe-radial-axis-element-${t}`}
              className="axis axis-label axis-tick radial"
              transform={`translate(0,0)`}
            >
              <path
                id={ref}
                d={circlePath(0, 0, tickSize)}
                r={tickSize}
                stroke="gray"
                fill="none"
              />
              <text y={-tickSize + 5} textAnchor="middle">
                {tickFormat(t)}
              </text>
              {axisLabel}
            </g>
          )
        }
        return undefined
      })
    })

    generatedAxis = [
      <g
        key={axis[0].key || `orframe-radial-axis-container`}
        className="axis-labels"
        transform={`translate(${adjustedSize[0] / 2},${adjustedSize[1] / 2})`}
      >
        {ticks}
      </g>
    ]
  }

  return { axis: generatedAxis, axesTickLines }
}

export const canvasEvent = (canvasContext, overlayRegions, canvasMap, e) => {
  const interactionContext = canvasContext.getContext("2d")
  const hoverPoint = interactionContext.getImageData(e.offsetX, e.offsetY, 1, 1)

  const mostCommonRGB = `rgba(${hoverPoint.data[0]},${hoverPoint.data[1]},${hoverPoint.data[2]},255)`

  let overlay: React.ReactElement = overlayRegions[canvasMap.get(mostCommonRGB)]

  if (!overlay) {
    const hoverArea = interactionContext.getImageData(
      e.offsetX - 2,
      e.offsetY - 2,
      5,
      5
    )
    let x = 0

    while (!overlay && x < 100) {
      overlay =
        overlayRegions[
          canvasMap.get(
            `rgba(${hoverArea.data[x]},${hoverArea.data[x + 1]},${
              hoverArea.data[x + 2]
            },255)`
          )
        ]
      x += 4
    }
  }

  return overlay
}
