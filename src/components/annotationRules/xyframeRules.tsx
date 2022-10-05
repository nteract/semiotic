import * as React from "react"
import { Mark } from "semiotic-mark"
import Annotation from "../Annotation"
import { AnnotationCalloutRect, AnnotationXYThreshold } from "react-annotation"

import { line, area } from "d3-shape"
import { packEnclose } from "d3-hierarchy"
import { extent } from "d3-array"
import { circleEnclosure, rectangleEnclosure, hullEnclosure } from "./baseRules"
import SpanOrDiv from "../SpanOrDiv"
import { findFirstAccessorValue } from "../data/multiAccessorUtils"
import { curveHash } from "../visualizationLayerBehavior/general"
import { ScaleLinear } from "d3-scale"
import { ProjectedPoint, RenderPipelineType } from "../types/generalTypes"

export const pointsAlong = along => ({
  d,
  lines,
  points,
  xScale,
  yScale,
  pointStyle
}) => {
  const alongScale = along === "x" ? xScale : yScale
  along = along === "yTop" && d.yMiddle ? "yMiddle" : along
  if (d && d[along]) {
    const { threshold = 1, r = () => 4, styleFn = pointStyle } = d
    const foundPoints = []

    const halfThreshold = threshold / 2

    if (lines && lines.length > 0) {
      lines.forEach(linedata => {
        const linePoints = linedata.data.filter(p => {
          const pAlong = alongScale(p[along])
          const dAlong = alongScale(d[along])

          return (
            pAlong <= dAlong + halfThreshold && pAlong >= dAlong - halfThreshold
          )
        })
        foundPoints.push(...linePoints)
      })
    }

    if (points && points.length > 0) {
      const pointPoints = points.filter(p => {
        const pAlong = alongScale(p[along])
        const dAlong = alongScale(d[along])

        return (
          pAlong <= dAlong + halfThreshold && pAlong >= dAlong - halfThreshold
        )
      })
      foundPoints.push(...pointPoints)
    }

    return foundPoints.map((p, i) => (
      <circle
        key={`found-circle-${i}`}
        r={r(p, i)}
        style={styleFn(p, i)}
        cx={xScale(p.xMiddle || p.x)}
        cy={yScale(p.yMiddle || p.yTop)}
      />
    ))
  }
  return null
}

export const svgHorizontalPointsAnnotation = pointsAlong("yTop")
export const svgVerticalPointsAnnotation = pointsAlong("x")

export const svgHighlight = ({
  d,
  i,
  points = { data: [] },
  lines = { data: [], type: {} },
  summaries = { data: [] },
  idAccessor,
  xScale,
  yScale,
  xyFrameRender,
  defined
}: {
  d: ProjectedPoint
  i?: number
  points: { data: [] }
  lines: {
    data: []
    type?: { interpolator?: string | Function; curve?: string | Function }
  }
  summaries: { data: [] }
  idAccessor: Function
  xScale: ScaleLinear<number, number>
  yScale: ScaleLinear<number, number>
  xyFrameRender: RenderPipelineType
  defined: Function
}) => {
  let dID
  const baseID = idAccessor({ ...d, ...d.data }, i)
  if (baseID !== undefined) {
    dID = baseID
  } else if (d.parentLine && idAccessor(d.parentLine, i) !== undefined) {
    dID = idAccessor(d.parentLine, i)
  } else if (d.parentSummary && idAccessor(d.parentSummary, i) !== undefined) {
    dID = idAccessor(d.parentSummary, i)
  }

  const foundPoints = points.data
    .filter(
      (p: ProjectedPoint, q) => idAccessor({ ...p, ...p.data }, q) === dID
    )
    .map((p: ProjectedPoint, q) => {
      const baseStyle = xyFrameRender.points.styleFn({ ...p, ...p.data })

      const highlightStyle =
        typeof d.style === "function"
          ? d.style({ ...p, ...p.data }, q)
          : d.style || {}

      return (
        <circle
          key={`highlight-point-${q}`}
          cx={xScale(p.x)}
          cy={yScale(p.y)}
          r={5}
          fill="none"
          stroke="black"
          strokeWidth={2}
          style={{ ...baseStyle, ...highlightStyle }}
          className={`highlight-annotation ${(d.class &&
            typeof d.class === "function" &&
            d.class({ ...p, ...p.data }, q)) ||
            (d.class && d.class) ||
            ""}`}
        />
      )
    })

  const lineGenerator = area()
    .x(p => xScale(p.x))
    .y0(p => yScale(p.yBottom))
    .y1(p => yScale(p.yTop))

  const interpolatorSetting = lines.type.interpolator || lines.type.curve

  const actualInterpolator =
    typeof interpolatorSetting === "string"
      ? curveHash[interpolatorSetting]
      : interpolatorSetting

  if (actualInterpolator) {
    lineGenerator.curve(actualInterpolator)
  }

  if (defined) {
    lineGenerator.defined((p, q) => defined(p.data, q))
  }

  const foundLines = lines.data
    .filter((p, q) => idAccessor(p, q) === dID)
    .map((p: ProjectedPoint, q) => {
      const baseStyle = xyFrameRender.lines.styleFn(p, q)

      const highlightStyle =
        typeof d.style === "function" ? d.style(p, q) : d.style || {}

      return (
        <path
          className={`highlight-annotation ${(d.class &&
            typeof d.class === "function" &&
            d.class(p, q)) ||
            (d.class && d.class) ||
            ""}`}
          key={`highlight-summary-${q}`}
          d={lineGenerator(p.data)}
          fill="none"
          stroke="black"
          strokeWidth={1}
          style={{ ...baseStyle, ...highlightStyle }}
        />
      )
    })

  const foundSummaries = summaries.data
    .filter((p, q) => idAccessor(p, q) === dID)
    .map((p: ProjectedPoint, q) => {
      const baseStyle = xyFrameRender.summaries.styleFn(p, q)

      const highlightStyle =
        typeof d.style === "function" ? d.style(p, q) : d.style || {}

      return (
        <path
          className={`highlight-annotation ${(d.class &&
            typeof d.class === "function" &&
            d.class(p, q)) ||
            (d.class && d.class) ||
            ""}`}
          key={`highlight-summary-${q}`}
          d={`M${p.coordinates.join("L")}`}
          fill="none"
          stroke="black"
          strokeWidth={1}
          style={{ ...baseStyle, ...highlightStyle }}
        />
      )
    })

  return [...foundSummaries, ...foundLines, ...foundPoints]
}

export const svgXYAnnotation = ({ screenCoordinates, i, d }) => {
  let inlineStyle
  if (d.color) inlineStyle = { fill: d.color }

  const laLine = (
    <Mark
      className={`annotation ${d.type} ${d.className || ""} `}
      key={`annotationpoint${i}`}
      markType="circle"
      cx={screenCoordinates[0]}
      cy={screenCoordinates[1]}
      forceUpdate={true}
      style={inlineStyle}
      fill="none"
      stroke="black"
      r={5}
    />
  )
  let laLabel
  if (d.type === "xy") {
    laLabel = (
      <Mark
        markType="text"
        key={`${d.label}annotationtext${i}`}
        forceUpdate={true}
        x={screenCoordinates[0]}
        y={10 + screenCoordinates[1]}
        className={`annotation annotation-xy-label ${d.className || ""} `}
      >
        {d.label}
      </Mark>
    )
  }

  return [laLine, laLabel]
}

export const basicReactAnnotation = ({ screenCoordinates, d, i }) => {
  const noteData = Object.assign(
    {
      dx: 0,
      dy: 0,
      note: { label: d.label, orientation: d.orientation, align: d.align },
      connector: { end: "arrow" }
    },
    d,
    {
      type: d.type,
      screenCoordinates,
      i
    }
  )

  noteData.x = noteData.fixedX ? noteData.fixedX : screenCoordinates[0]
  noteData.y = noteData.fixedY ? noteData.fixedY : screenCoordinates[1]

  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
}

export const svgXAnnotation = ({ screenCoordinates, d, i, adjustedSize }) => {
  const noteData = Object.assign(
    {
      dx: 50,
      dy: 20,
      y: 0,
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    {
      type: AnnotationXYThreshold,
      x: screenCoordinates[0],
      subject: {
        x: screenCoordinates[0],
        y1: 0,
        y2: adjustedSize[1]
      },
      i
    }
  )
  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
}

export const svgYAnnotation = ({
  screenCoordinates,
  d,
  i,
  adjustedSize,
  adjustedPosition
}) => {
  const xPosition = i * 25

  const noteData = Object.assign(
    {
      dx: 50,
      dy: -20,
      x: xPosition,
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    {
      type: AnnotationXYThreshold,
      y: screenCoordinates[1],
      subject: {
        y: screenCoordinates[1],
        x1: 0,
        x2: adjustedSize[0] + adjustedPosition[0]
      },
      i
    }
  )
  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
}

export const svgBoundsAnnotation = ({
  d,
  i,
  adjustedSize,
  xAccessor,
  yAccessor,
  xScale,
  yScale
}) => {
  const startXValue = findFirstAccessorValue(xAccessor, d.bounds[0])
  const startYValue = findFirstAccessorValue(yAccessor, d.bounds[0])
  const endXValue = findFirstAccessorValue(xAccessor, d.bounds[1])
  const endYValue = findFirstAccessorValue(yAccessor, d.bounds[1])

  const x0Position = startXValue ? xScale(startXValue) : 0
  const y0Position = startYValue ? yScale(startYValue) : adjustedSize[1]
  const x1Position = endXValue ? xScale(endXValue) : adjustedSize[0]
  const y1Position = endYValue ? yScale(endYValue) : 0

  const noteData = Object.assign(
    {
      dx: 250,
      dy: -20,
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    {
      type: AnnotationCalloutRect,
      x: Math.min(x0Position, x1Position),
      y: Math.min(y0Position, y1Position),
      subject: {
        width: Math.abs(x1Position - x0Position),
        height: Math.abs(y0Position - y1Position)
      },
      i
    }
  )
  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
}

export const svgLineAnnotation = ({ d, i, screenCoordinates }) => {
  const lineGenerator = line()
    .x(p => p[0])
    .y(p => p[1])
  const lineD = lineGenerator(screenCoordinates)
  const laLine = (
    <Mark
      key={`${d.label}annotationline${i}`}
      markType="path"
      d={lineD}
      className={`annotation annotation-line ${d.className || ""} `}
    />
  )

  const laLabel = (
    <Mark
      markType="text"
      key={`${d.label}annotationlinetext${i}`}
      x={(screenCoordinates[0][0] + screenCoordinates[1][0]) / 2}
      y={(screenCoordinates[0][1] + screenCoordinates[1][1]) / 2}
      className={`annotation annotation-line-label ${d.className || ""} `}
    >
      {d.label}
    </Mark>
  )

  return [laLine, laLabel]
}

export const svgAreaAnnotation = ({
  d,
  i,
  xScale,
  xAccessor,
  yScale,
  yAccessor,
  annotationLayer
}) => {
  const mappedCoordinates = `M${d.coordinates
    .map(p => [
      xScale(findFirstAccessorValue(xAccessor, p)),
      yScale(findFirstAccessorValue(yAccessor, p))
    ])
    .join("L")}Z`
  const xBounds = extent(
    d.coordinates.map(p => xScale(findFirstAccessorValue(xAccessor, p)))
  )
  const yBounds = extent(
    d.coordinates.map(p => yScale(findFirstAccessorValue(yAccessor, p)))
  )
  const xCenter = (xBounds[0] + xBounds[1]) / 2
  const yCenter = (yBounds[0] + yBounds[1]) / 2

  const laLine = (
    <Mark
      key={`${d.label}-annotation-area-${i}`}
      markType="path"
      d={mappedCoordinates}
      className={`annotation annotation-area ${d.className || ""} `}
    />
  )

  const laLabel = (
    <Mark
      markType="text"
      key={`${d.label}-annotationtext-${i}`}
      forceUpdate={true}
      x={xCenter}
      y={yCenter}
      transform={`translate(${annotationLayer.position})`}
      className={`annotation annotation-area-label ${d.className || ""} `}
      style={{ textAnchor: "middle" }}
    >
      {d.label}
    </Mark>
  )

  return [laLine, laLabel]
}

export const htmlTooltipAnnotation = ({
  content,
  screenCoordinates,
  i,
  d,
  useSpans
}) => {
  //To string because React gives a DOM error if it gets a date

  return (
    <SpanOrDiv
      span={useSpans}
      key={`xylabel-${i}`}
      className={`annotation annotation-xy-label ${d.className || ""} `}
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

export const svgRectEncloseAnnotation = ({ d, i, screenCoordinates }) => {
  const bboxNodes = screenCoordinates.map(p => {
    return {
      x0: p.x0 = p[0],
      x1: p.x1 = p[0],
      y0: p.y0 = p[1],
      y1: p.y1 = p[1]
    }
  })

  return rectangleEnclosure({ bboxNodes, d, i })
}

export const svgEncloseAnnotation = ({ screenCoordinates, d, i }) => {
  const circle = packEnclose(
    screenCoordinates.map(p => ({ x: p[0], y: p[1], r: 2 }))
  )

  return circleEnclosure({ d, circle, i })
}

export const svgHullEncloseAnnotation = ({ screenCoordinates, d, i }) => {
  return hullEnclosure({ points: screenCoordinates, d, i })
}
