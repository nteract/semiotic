import * as React from "react"
import { Mark } from "semiotic-mark"
import Annotation from "../Annotation"

import {
  AnnotationCalloutCircle,
  AnnotationBracket,
  AnnotationXYThreshold
} from "react-annotation"

import { packEnclose } from "d3-hierarchy"
import { max, min, sum, extent } from "d3-array"
import { pointOnArcAtAngle } from "../svg/pieceDrawing"
import { circleEnclosure, rectangleEnclosure } from "./baseRules"
import SpanOrDiv from "../SpanOrDiv"
import { findFirstAccessorValue } from "../data/multiAccessorUtils"
import { line } from "d3-shape"
import { curveHash } from "../visualizationLayerBehavior/general"
import TooltipPositioner from "../TooltipPositioner"

const derivePieceValue = (accessor, piece) => {
  const pieceVal = accessor(piece)
  return (pieceVal && pieceVal.toString && pieceVal.toString()) || pieceVal
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  }
}

function pieContentGenerator({ column, useSpans }) {
  return (
    <SpanOrDiv span={useSpans} className="tooltip-content">
      <p key="or-annotation-1">{column.name}</p>
      <p key="or-annotation-2">{`${(column.pct * 100).toFixed(0)}%`}</p>
    </SpanOrDiv>
  )
}

function arcBracket({
  x,
  y,
  radius,
  startAngle,
  endAngle,
  inset,
  outset,
  curly = true
}) {
  const start = polarToCartesian(x, y, radius + outset, endAngle)
  const end = polarToCartesian(x, y, radius + outset, startAngle)

  const innerStart = polarToCartesian(x, y, radius + outset - inset, endAngle)
  const innerEnd = polarToCartesian(x, y, radius + outset - inset, startAngle)

  const angleSize = endAngle - startAngle
  const largeArcFlag = angleSize <= 180 ? "0" : "1"
  let d
  if (curly) {
    const curlyOffset = Math.min(10, angleSize / 4)

    const middleLeft = polarToCartesian(
      x,
      y,
      radius + outset,
      (startAngle + endAngle) / 2 + curlyOffset
    )

    const middle = polarToCartesian(
      x,
      y,
      radius + outset + 10,
      (startAngle + endAngle) / 2
    )
    const middleRight = polarToCartesian(
      x,
      y,
      radius + outset,
      (startAngle + endAngle) / 2 - curlyOffset
    )

    d = [
      "M",
      innerStart.x,
      innerStart.y,
      "L",
      start.x,
      start.y,
      "A",
      radius + outset,
      radius + outset,
      0,
      0,
      0,
      middleLeft.x,
      middleLeft.y,
      "A",
      radius + outset,
      radius + outset,
      1,
      0,
      1,
      middle.x,
      middle.y,
      "A",
      radius + outset,
      radius + outset,
      1,
      0,
      1,
      middleRight.x,
      middleRight.y,

      "A",
      radius + outset,
      radius + outset,
      0,
      0,
      0,
      end.x,
      end.y,
      "L",
      innerEnd.x,
      innerEnd.y
    ].join(" ")
  } else {
    d = [
      "M",
      innerStart.x,
      innerStart.y,
      "L",
      start.x,
      start.y,
      "A",
      radius + outset,
      radius + outset,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
      "L",
      innerEnd.x,
      innerEnd.y
    ].join(" ")
  }

  const midAngle = (startAngle + endAngle) / 2
  let textOffset, largeTextArcFlag, finalTextEnd, finalTextStart, arcFlip
  const lowerArc = midAngle > 90 && midAngle < 270
  if (lowerArc) {
    textOffset = 12
    largeTextArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
    arcFlip = 0
  } else {
    largeTextArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
    textOffset = 5
    arcFlip = 1
  }
  textOffset += curly ? 10 : 0
  const textStart = polarToCartesian(
    x,
    y,
    radius + outset + textOffset,
    endAngle
  )
  const textEnd = polarToCartesian(
    x,
    y,
    radius + outset + textOffset,
    startAngle
  )
  if (lowerArc) {
    finalTextStart = textStart
    finalTextEnd = textEnd
  } else {
    finalTextStart = textEnd
    finalTextEnd = textStart
  }

  const textD = [
    "M",
    finalTextStart.x,
    finalTextStart.y,
    "A",
    radius + outset + textOffset,
    radius + outset + textOffset,
    arcFlip,
    largeTextArcFlag,
    arcFlip,
    finalTextEnd.x,
    finalTextEnd.y
  ].join(" ")

  return { arcPath: d, textArcPath: textD }
}

export const getColumnScreenCoordinates = ({
  d,
  projectedColumns,
  oAccessor,
  summaryType,
  type,
  projection,
  adjustedPosition,
  adjustedSize
}) => {
  const column =
    typeof d.column === "object"
      ? d.column
      : projectedColumns[d.facetColumn] ||
        projectedColumns[findFirstAccessorValue(oAccessor, d)]

  if (!column) {
    return { coordinates: [0, 0], pieces: undefined, column: undefined }
  }
  const pieces = column.pieceData || column.pieces

  const positionValue =
    (summaryType.type && summaryType.type !== "none") ||
    ["swarm", "point", "clusterbar", "timeline"].find((p) => p === type.type)
      ? max(pieces.map((p) => p.scaledValue))
      : projection === "horizontal"
      ? max(
          pieces.map((p) =>
            p.value >= 0 ? p.scaledValue + p.bottom : p.bottom
          )
        )
      : min(
          pieces.map((p) =>
            p.value >= 0 ? p.bottom - p.scaledValue : p.bottom
          )
        )

  let xPosition = column.middle + adjustedPosition[0]
  let yPosition =
    (summaryType.type && summaryType.type !== "none") ||
    ["swarm", "point", "clusterbar", "timeline"].find((p) => p === type.type)
      ? adjustedSize[1] - positionValue
      : positionValue
  yPosition += 10

  if (projection === "horizontal") {
    yPosition = column.middle
    xPosition = positionValue + adjustedPosition[0]
  } else if (projection === "radial") {
    const { pieArc } = column

    const { translate, outerPoint, centroid } = pieArc

    xPosition = (centroid[0] + outerPoint[0]) / 2 + translate[0]
    yPosition = (centroid[1] + outerPoint[1]) / 2 + translate[1]
  }
  return { coordinates: [xPosition, yPosition], pieces, column }
}

export const svgHighlightRule = ({
  d,
  pieceIDAccessor,
  orFrameRender,
  oAccessor
}) => {
  const thisID = pieceIDAccessor(d)
  const thisO = findFirstAccessorValue(oAccessor, d)

  const { pieces } = orFrameRender
  const { styleFn } = pieces

  const foundPieces =
    (pieces &&
      pieces.data
        .filter((p) => {
          return (
            (thisID === undefined ||
              pieceIDAccessor({ ...p.piece, ...p.piece.data }) === thisID) &&
            (thisO === undefined ||
              findFirstAccessorValue(oAccessor, p.piece.data) === thisO)
          )
        })
        .map((p, q) => {
          let styleObject = {
            style: styleFn({ ...p.piece, ...p.piece.data })
          }
          if (d.style && typeof d.style === "function") {
            styleObject = {
              style: {
                ...styleObject,
                ...d.style({ ...p.piece, ...p.piece.data })
              }
            }
          } else if (d.style) {
            styleObject = { style: { ...styleObject, ...d.style } }
          }
          const styledD = { ...p.renderElement, ...styleObject }
          const className = `highlight-annotation ${
            (d.class &&
              typeof d.class === "function" &&
              d.class(p.piece.data, q)) ||
            (d.class && d.class) ||
            ""
          }`

          if (React.isValidElement(p.renderElement)) {
            return React.cloneElement(p.renderElement, {
              ...styleObject,
              className
            })
          }

          return (
            <Mark
              fill="none"
              stroke="black"
              strokeWidth="2px"
              key={`highlight-piece-${q}`}
              {...styledD}
              className={className}
            />
          )
        })) ||
    []

  return [...foundPieces]
}

export const findIDPiece = (pieceIDAccessor, oColumn, d) => {
  const foundIDValue = pieceIDAccessor(d)

  const pieceID = foundIDValue === "" && d.rName ? d.rName : foundIDValue

  const basePieces =
    oColumn &&
    oColumn.pieceData.filter(
      (r) => r.rName === pieceID || pieceIDAccessor(r.data) === pieceID
    )

  if (
    pieceID === "" ||
    basePieces === undefined ||
    basePieces === false ||
    basePieces.length !== 1
  )
    return d

  const basePiece = basePieces[0]

  const reactAnnotationProps = [
    "type",
    "label",
    "note",
    "connector",
    "disabled",
    "color",
    "subject"
  ]

  if (basePiece) {
    reactAnnotationProps.forEach((prop) => {
      if (d[prop]) basePiece[prop] = d[prop]
    })
  }

  return basePiece
}

export const screenProject = ({
  p,
  adjustedSize,
  rScale,
  oColumn,
  rAccessor,
  idPiece,
  projection,
  rScaleType
}) => {
  const basePValue = findFirstAccessorValue(rAccessor, p) || p.value
  const pValue = Array.isArray(basePValue)
    ? Math.max(...basePValue)
    : basePValue

  let o
  if (oColumn) {
    o = oColumn.middle
  } else {
    o = 0
  }

  if (oColumn && projection === "radial") {
    return pointOnArcAtAngle(
      [adjustedSize[0] / 2, adjustedSize[1] / 2],
      oColumn.pct_middle,
      idPiece && (idPiece.x === undefined ? idPiece.scaledValue : idPiece.x)
        ? idPiece.x / 2 || (idPiece.bottom + idPiece.scaledValue / 2) / 2
        : pValue / 2
    )
  }
  if (projection === "horizontal") {
    return [
      idPiece && idPiece.scaledEndValue
        ? idPiece.scaledEndValue
        : idPiece && idPiece.scaledValue
        ? idPiece.value >= 0
          ? idPiece.bottom + idPiece.scaledValue
          : idPiece.bottom
        : rScale(pValue),
      o
    ]
  }
  const newScale = rScaleType
    .copy()
    .domain(rScale.domain())
    .range(rScale.range().reverse())

  return [
    o,
    idPiece && (idPiece.x === undefined ? idPiece.scaledValue : idPiece.x)
      ? idPiece.y === undefined
        ? idPiece.value >= 0
          ? idPiece.bottom - idPiece.scaledValue
          : idPiece.bottom
        : idPiece.y
      : newScale(pValue)
  ]
}

export const svgORRule = ({ d, i, screenCoordinates, projection }) => {
  return (
    <Mark
      markType="text"
      key={`${d.label}annotationtext${i}`}
      forceUpdate={true}
      x={screenCoordinates[0] + (projection === "horizontal" ? 10 : 0)}
      y={screenCoordinates[1] + (projection === "vertical" ? 10 : 0)}
      className={`annotation annotation-or-label ${d.className || ""}`}
      textAnchor="middle"
    >
      {d.label}
    </Mark>
  )
}

export const basicReactAnnotationRule = ({ d, i, screenCoordinates }) => {
  const noteData = Object.assign(
    {
      dx: 0,
      dy: 0,
      note: { label: d.label, orientation: d.orientation, align: d.align },
      connector: { end: "arrow" }
    },
    d,
    {
      x: screenCoordinates[0],
      y: screenCoordinates[1],
      type: typeof d.type === "function" ? d.type : undefined,
      screenCoordinates
    }
  )
  if (d.fixedX) noteData.x = d.fixedX
  if (d.fixedY) noteData.y = d.fixedY
  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
}

export const svgEncloseRule = ({ d, i, screenCoordinates }) => {
  const circle = packEnclose(
    screenCoordinates.map((p) => ({ x: p[0], y: p[1], r: 2 }))
  )

  return circleEnclosure({ d, i, circle })
}

export const svgRRule = ({
  d,
  i,
  screenCoordinates,
  rScale,
  rAccessor,
  adjustedSize,
  adjustedPosition,
  projection
}) => {
  let x, y, xPosition, yPosition, subject, dx, dy
  if (projection === "radial") {
    return (
      <Annotation
        key={d.key || `annotation-${i}`}
        noteData={Object.assign(
          {
            dx: 50,
            dy: 50,
            note: { label: d.label },
            connector: { end: "arrow" }
          },
          d,
          {
            type: AnnotationCalloutCircle,
            subject: {
              radius: rScale(findFirstAccessorValue(rAccessor, d)) / 2,
              radiusPadding: 0
            },
            x: adjustedSize[0] / 2,
            y: adjustedSize[1] / 2
          }
        )}
      />
    )
  } else if (projection === "horizontal") {
    dx = 50
    dy = 50
    yPosition = d.offset || i * 25
    x = screenCoordinates[0]
    y = yPosition
    subject = {
      x,
      y1: 0,
      y2: adjustedSize[1] + adjustedPosition[1]
    }
  } else {
    dx = 50
    dy = -20
    xPosition = d.offset || i * 25
    y = screenCoordinates[1]
    x = xPosition
    subject = {
      y,
      x1: 0,
      x2: adjustedSize[0] + adjustedPosition[0]
    }
  }

  const noteData = Object.assign(
    {
      dx,
      dy,
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    {
      type: AnnotationXYThreshold,
      x,
      y,
      subject
    }
  )
  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
}

export const svgCategoryRule = ({
  projection,
  d,
  i,
  categories,
  adjustedSize
}) => {
  const {
    bracketType = "curly",
    position = projection === "vertical" ? "top" : "left",
    depth = 30,
    offset = 0,
    padding = 0
  } = d
  const actualCategories = Array.isArray(d.categories)
    ? d.categories
    : [d.categories]

  const cats = actualCategories.map((c) => categories[c])

  if (projection === "radial") {
    const arcPadding = padding / adjustedSize[1]
    const leftX = min(
      cats.map((p) => p.pct_start + p.pct_padding / 2 + arcPadding / 2)
    )
    const rightX = max(
      cats.map((p) => p.pct_start + p.pct - p.pct_padding / 2 - arcPadding / 2)
    )

    const chartSize = Math.min(adjustedSize[0], adjustedSize[1]) / 2
    const centerX = adjustedSize[0] / 2
    const centerY = adjustedSize[1] / 2

    const { arcPath, textArcPath } = arcBracket({
      x: 0,
      y: 0,
      radius: chartSize,
      startAngle: leftX * 360,
      endAngle: rightX * 360,
      inset: depth,
      outset: offset,
      curly: bracketType === "curly"
    })

    const textPathID = `text-path-${i}-${Math.random()}`
    return (
      <g
        className="category-annotation annotation"
        transform={`translate(${centerX},${centerY})`}
      >
        <path d={arcPath} fill="none" stroke="black" />
        <path id={textPathID} d={textArcPath} style={{ display: "none" }} />
        <text font-size="12.5">
          <textPath
            startOffset={"50%"}
            textAnchor={"middle"}
            xlinkHref={`#${textPathID}`}
          >
            {d.label}
          </textPath>
        </text>
      </g>
    )
  } else {
    const leftX = min(cats.map((p) => p.x))
    const rightX = max(cats.map((p) => p.x + p.width))

    if (projection === "vertical") {
      let yPosition = position === "top" ? 0 : adjustedSize[1]
      yPosition += position === "top" ? -offset : offset
      const noteData = {
        type: AnnotationBracket,
        y: yPosition,
        x: leftX - padding,
        note: {
          title: d.title || d.label,
          label: d.title ? d.label : undefined
        },
        subject: {
          type: bracketType,
          width: rightX - leftX + padding * 2,
          depth: position === "top" ? -depth : depth
        }
      }
      return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
    } else if (projection === "horizontal") {
      let yPosition = position === "left" ? 0 : adjustedSize[0]
      yPosition += position === "left" ? -offset : offset
      const noteData = {
        type: AnnotationBracket,
        x: yPosition,
        y: leftX - padding,
        note: {
          title: d.title || d.label,
          label: d.title ? d.label : undefined
        },
        subject: {
          type: bracketType,
          height: rightX - leftX + padding * 2,
          depth: position === "left" ? -depth : depth
        }
      }
      return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
    }
  }
}

export const htmlFrameHoverRule = ({
  d,
  i,
  rAccessor,
  oAccessor,
  projection,
  tooltipContent,
  optimizeCustomTooltipPosition,
  useSpans,
  pieceIDAccessor,
  projectedColumns,
  adjustedSize,
  rScale,
  type,
  rScaleType
}) => {
  tooltipContent =
    tooltipContent === "pie"
      ? () =>
          pieContentGenerator({
            column: d.column,
            useSpans
          })
      : tooltipContent
  //To string because React gives a DOM error if it gets a date
  let contentFill
  const pO = findFirstAccessorValue(oAccessor, d) || d.column
  const oColumn = projectedColumns[pO]

  const idPiece = findIDPiece(pieceIDAccessor, oColumn, d)

  if (!idPiece) {
    return null
  }

  const screenCoordinates =
    ((type.type === "clusterbar" ||
      type.type === "point" ||
      type.type === "swarm") &&
      d.x !== undefined &&
      d.y !== undefined) ||
    d.isSummaryData
      ? [d.x, d.y]
      : screenProject({
          p: d,
          adjustedSize,
          rScale,
          oColumn,
          rAccessor,
          idPiece,
          projection,
          rScaleType
        })

  if (d.isSummaryData) {
    let summaryContent = d.label

    if (d.pieces && d.pieces.length !== 0) {
      if (d.pieces.length === 1) {
        summaryContent = []
        rAccessor.forEach((actualRAccessor) => {
          summaryContent.push(actualRAccessor(d.pieces[0].data))
        })
      } else {
        summaryContent = []
        rAccessor.forEach((actualRAccessor) => {
          const pieceData = extent(
            d.pieces.map((p) => p.data).map(actualRAccessor)
          )
          summaryContent.push(`From ${pieceData[0]} to ${pieceData[1]}`)
        })
      }
    }
    const summaryLabel = <p key="html-annotation-content-2">{summaryContent}</p>
    contentFill = [
      <p key="html-annotation-content-1">{d.key}</p>,
      summaryLabel,
      <p key="html-annotation-content-3">{d.value}</p>
    ]
  } else if (d.data) {
    contentFill = []

    oAccessor.forEach((actualOAccessor, i) => {
      if (idPiece.data) {
        const pieceOVal = derivePieceValue(actualOAccessor, idPiece.data)
        contentFill.push(
          <p key={`html-annotation-content-o-${i}`}>{pieceOVal}</p>
        )
      }
    })

    rAccessor.forEach((actualRAccessor, i) => {
      if (idPiece.data) {
        const pieceRVal = derivePieceValue(actualRAccessor, idPiece.data)
        contentFill.push(
          <p key={`html-annotation-content-r-${i}`}>{pieceRVal}</p>
        )
      }
    })
  } else if (d.label) {
    contentFill = d.label
  }
  let content = (
    <SpanOrDiv span={useSpans} className="tooltip-content">
      {contentFill}
    </SpanOrDiv>
  )

  if (d.type === "frame-hover" && tooltipContent && idPiece) {
    const tooltipContentArgs = { ...idPiece, ...idPiece.data }
    content = optimizeCustomTooltipPosition ? (
      <TooltipPositioner
        tooltipContent={tooltipContent}
        tooltipContentArgs={tooltipContentArgs}
      />
    ) : (
      tooltipContent(tooltipContentArgs)
    )
  }

  return (
    <SpanOrDiv
      span={useSpans}
      key={`xylabel-${i}`}
      className={`annotation annotation-or-label ${projection} ${
        d.className || ""
      }`}
      style={{
        position: "absolute",
        top: `${screenCoordinates[1]}px`,
        left: `${screenCoordinates[0]}px`
      }}
    >
      {content}
    </SpanOrDiv>
  )
}

export const htmlColumnHoverRule = ({
  d,
  i,
  summaryType,
  oAccessor,
  type,
  adjustedPosition,
  adjustedSize,
  projection,
  tooltipContent,
  optimizeCustomTooltipPosition,
  useSpans,
  projectedColumns
}) => {
  //we need to ignore negative pieces to make sure the hover behavior populates on top of the positive bar
  const {
    coordinates: [xPosition, yPosition],
    pieces,
    column
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

  if (column === undefined) {
    return null
  }
  //To string because React gives a DOM error if it gets a date
  const oContent = []
  oAccessor.forEach((actualOAccessor, i) => {
    if (pieces[0].data) {
      const pieceOVal = derivePieceValue(actualOAccessor, pieces[0].data)
      oContent.push(<p key={`or-annotation-o-${i}`}>{pieceOVal}</p>)
    }
  })

  let content = (
    <SpanOrDiv span={useSpans} className="tooltip-content">
      {oContent}
      <p key="or-annotation-2">
        {sum(pieces.map((p) => p.value).filter((p) => p > 0))}
      </p>
    </SpanOrDiv>
  )

  if (d.type === "column-hover" && tooltipContent) {
    if (tooltipContent === "pie") {
      tooltipContent = pieContentGenerator
    }
    const tooltipContentArgs = {
      ...d,
      pieces: pieces.map((p) => p.data),
      column,
      oAccessor
    }
    content = optimizeCustomTooltipPosition ? (
      <TooltipPositioner
        tooltipContent={tooltipContent}
        tooltipContentArgs={tooltipContentArgs}
      />
    ) : (
      tooltipContent(tooltipContentArgs)
    )
  } else if (d.label) {
    content = (
      <SpanOrDiv span={useSpans} className="tooltip-content">
        {d.label}
      </SpanOrDiv>
    )
  }

  return (
    <SpanOrDiv
      span={useSpans}
      key={`orlabel-${i}`}
      className={`annotation annotation-or-label ${projection} ${
        d.className || ""
      }`}
      style={{
        position: "absolute",
        top: `${yPosition}px`,
        left: `${xPosition}px`
      }}
    >
      {content}
    </SpanOrDiv>
  )
}

export const svgRectEncloseRule = ({ d, i, screenCoordinates }) => {
  const bboxNodes = screenCoordinates.map((p) => {
    return {
      x0: (p.x0 = p[0]),
      x1: (p.x1 = p[0]),
      y0: (p.y0 = p[1]),
      y1: (p.y1 = p[1])
    }
  })

  return rectangleEnclosure({ bboxNodes, d, i })
}

export const svgOrdinalLine = ({ screenCoordinates, d, voronoiHover }) => {
  const lineGenerator = line()
    .x((d) => d[0])
    .y((d) => d[1])
  if (d.curve) {
    const interpolator = curveHash[d.curve] || d.curve
    lineGenerator.curve(interpolator)
  }

  const lineStyle =
    typeof d.lineStyle === "function" ? d.lineStyle(d) : d.lineStyle || {}

  return (
    <g key="ordinal-line-annotation">
      <path
        stroke="black"
        fill="none"
        style={lineStyle}
        d={lineGenerator(screenCoordinates)}
      />
      {(d.points || d.interactive) &&
        screenCoordinates.map((p, q) => {
          const pointStyle =
            typeof d.pointStyle === "function"
              ? d.pointStyle(d.coordinates[q], q)
              : d.pointStyle || {}

          return (
            <g
              transform={`translate(${p[0]},${p[1]})`}
              key={`ordinal-line-point-${q}`}
            >
              {d.points && (
                <circle style={pointStyle} r={d.radius || 5} fill="black" />
              )}
              {d.interactive && (
                <circle
                  style={{ pointerEvents: "all" }}
                  r={d.hoverRadius || 15}
                  opacity={0}
                  onMouseEnter={() =>
                    voronoiHover({
                      type: "frame-hover",
                      ...d.coordinates[q],
                      data: d.coordinates[q]
                    })
                  }
                  onMouseOut={() => voronoiHover()}
                />
              )}
            </g>
          )
        })}
    </g>
  )
}
