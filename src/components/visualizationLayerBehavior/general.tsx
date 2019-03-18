import * as React from "react"

import { Mark } from "semiotic-mark"
import {
  line,
  area,
  curveStep,
  curveStepBefore,
  curveStepAfter,
  curveCardinal,
  curveBasis,
  curveLinear,
  curveCatmullRom,
  curveMonotoneX,
  curveMonotoneY,
  curveNatural
} from "d3-shape"

import { shapeBounds } from "../svg/areaDrawing"
import { GenericObject, ProjectedSummary } from "../types/generalTypes"
import { ScaleLinear } from "d3-scale"

export const curveHash = {
  step: curveStep,
  stepbefore: curveStepBefore,
  stepafter: curveStepAfter,
  cardinal: curveCardinal,
  basis: curveBasis,
  linear: curveLinear,
  catmullrom: curveCatmullRom,
  monotone: curveMonotoneY,
  monotonex: curveMonotoneX,
  monotoney: curveMonotoneY,
  natural: curveNatural
}

export function lineGeneratorDecorator({
  generator,
  projectedCoordinateNames,
  defined,
  xScale,
  yScale,
  interpolator,
  simpleLine
}) {
  const { x, y, yTop, yBottom } = projectedCoordinateNames

  generator.x(d => xScale(d[x])).curve(interpolator)

  if (simpleLine) {
    generator.y(d => yScale(d[y]))
  } else {
    generator.y0(d => yScale(d[yBottom])).y1(d => yScale(d[yTop]))
  }

  if (defined) {
    generator.defined((p, q) => defined(p, q))
  } else {
    generator.defined(p => !p._xyFrameUndefined)
  }
}

export function createPoints({
  xScale,
  yScale,
  canvasDrawing,
  data,
  projectedCoordinateNames,
  customMark,
  canvasRender,
  styleFn,
  classFn,
  renderKeyFn,
  renderMode,
  baseMarkProps,
  showLinePoints: baseShowLinePoints
}) {
  const { y, x, xMiddle, yMiddle, yTop, yBottom } = projectedCoordinateNames

  const showLinePoints: string =
    baseShowLinePoints === true ? undefined : baseShowLinePoints

  const whichPoints: {
    top: string
    bottom: string
  } = {
    top: yTop,
    bottom: yBottom
  }
  const whichWay = whichPoints[showLinePoints]
  const mappedPoints = []
  data.forEach((d, i) => {
    const dX = xScale(d[xMiddle] !== undefined ? d[xMiddle] : d[x])
    const dY = yScale(
      d[whichWay] !== undefined
        ? d[whichWay]
        : d[yMiddle] !== undefined
        ? d[yMiddle]
        : d[y]
    )

    const pointAriaLabel = `Point at x ${d.x} and y ${d.y}`

    // CUSTOM MARK IMPLEMENTATION
    const renderedCustomMark = !customMark
      ? undefined
      : React.isValidElement(customMark)
      ? customMark
      : customMark({ d: d.data, xy: d, i, xScale, yScale })
    const markProps = customMark
      ? Object.assign(baseMarkProps, renderedCustomMark.props, {
          "aria-label": pointAriaLabel
        })
      : {
          ...baseMarkProps,
          key: `piece-${i}`,
          markType: "circle",
          r: 2,
          "aria-label": pointAriaLabel
        }

    if (
      renderedCustomMark &&
      renderedCustomMark.props &&
      !renderedCustomMark.props.markType &&
      (!canvasRender || canvasRender(d.data, i) !== true)
    ) {
      mappedPoints.push(
        <g
          transform={`translate(${dX},${dY})`}
          key={renderKeyFn ? renderKeyFn(d.data, i) : `custom-point-mark-${i}`}
          style={styleFn ? styleFn(d.data, i) : {}}
          className={classFn ? classFn(d.data, i) : ""}
        >
          {renderedCustomMark}
        </g>
      )
    } else {
      if (canvasRender && canvasRender(d.data, i) === true) {
        const canvasPoint = {
          type: "point",
          baseClass: "frame-piece",
          tx: dX,
          ty: dY,
          d,
          i,
          markProps,
          styleFn,
          renderFn: renderMode,
          classFn
        }
        canvasDrawing.push(canvasPoint)
      } else {
        const yCoordinates = Array.isArray(d[y])
          ? d[y].map(p => yScale(p))
          : [dY]
        yCoordinates.forEach((yc, yi) => {
          const xCoordinates = Array.isArray(d[x])
            ? d[x].map(p => xScale(p))
            : [dX]
          xCoordinates.forEach((xc, xi) => {
            mappedPoints.push(
              clonedAppliedElement({
                baseClass: "frame-piece",
                tx: xc,
                ty: yc,
                d: (d.data && { ...d, ...d.data }) || d,
                i: yi === 0 && xi === 0 ? i : `${i}-${yi}-${xi}`,
                markProps,
                styleFn,
                renderFn: renderMode,
                renderKeyFn,
                classFn,
                yi
              })
            )
          })
        })
      }
    }
  })
  return mappedPoints
}

export function createLines({
  xScale,
  yScale,
  canvasDrawing,
  data,
  projectedCoordinateNames,
  customMark,
  canvasRender,
  styleFn,
  classFn,
  renderMode,
  renderKeyFn,
  type,
  defined,
  baseMarkProps,
  ariaLabel,
  axesData = []
}) {
  const xAxis = axesData.find(d => d.orient === "bottom" || d.orient === "top")
  const yAxis = axesData.find(d => d.orient === "left" || d.orient === "right")

  const xAxisFormatter = (xAxis && xAxis.tickFormat) || (d => d)
  const yAxisFormatter = (yAxis && yAxis.tickFormat) || (d => d)

  const customLine = typeof type === "object" ? type : { type }

  const interpolator =
    typeof customLine.interpolator === "string"
      ? curveHash[customLine.interpolator]
      : customLine.interpolator || curveLinear

  const lineGenerator = customLine.simpleLine ? line() : area()

  lineGeneratorDecorator({
    projectedCoordinateNames,
    defined,
    interpolator,
    generator: lineGenerator,
    xScale,
    yScale,
    simpleLine: customLine.simpleLine
  })

  const dynamicLineGenerator =
    (interpolator.dynamicInterpolator &&
      ((d, i) => {
        const dynLineGenerator = area()

        lineGeneratorDecorator({
          projectedCoordinateNames,
          defined,
          interpolator: interpolator.dynamicInterpolator(d, i),
          generator: dynLineGenerator,
          xScale,
          yScale,
          simpleLine: customLine.simpleLine
        })
        return dynLineGenerator
      })) ||
    (() => lineGenerator)

  const mappedLines = []
  data.forEach((d, i) => {
    if (customMark && typeof customMark === "function") {
      //shim to make customLineMark work until Semiotic 2
      const compatibleData = {
        ...d,
        data: d.data.map(p => ({ ...p.data, ...p }))
      }
      mappedLines.push(
        customMark({ d: compatibleData, i, xScale, yScale, canvasDrawing })
      )
    } else {
      const builtInDisplayProps: { fill?: string; stroke?: string } = {}
      if (customLine.simpleLine) {
        builtInDisplayProps.fill = "none"
        builtInDisplayProps.stroke = "black"
      }

      const pathString = dynamicLineGenerator(d, i)(
        d.data.map(p => Object.assign({}, p.data, p))
      )

      const markProps = {
        ...builtInDisplayProps,
        ...baseMarkProps,
        markType: "path",
        d: pathString,
        "aria-label":
          d.data &&
          d.data.length > 0 &&
          `${d.data.length} point ${
            ariaLabel.items
          } starting value ${yAxisFormatter(d.data[0].y)} at ${xAxisFormatter(
            d.data[0].x
          )} ending value ${yAxisFormatter(
            d.data[d.data.length - 1].y
          )} at ${xAxisFormatter(d.data[d.data.length - 1].x)}`
      }

      if (canvasRender && canvasRender(d, i) === true) {
        const canvasLine = {
          type: "line",
          baseClass: "xyframe-line",
          tx: 0,
          ty: 0,
          d,
          i,
          markProps,
          styleFn,
          renderFn: renderMode,
          classFn
        }
        canvasDrawing.push(canvasLine)
      } else {
        mappedLines.push(
          clonedAppliedElement({
            baseClass: "xyframe-line",
            d,
            i,
            markProps,
            styleFn,
            renderFn: renderMode,
            renderKeyFn,
            classFn
          })
        )
      }
    }
  })

  if (customLine.type === "difference" && data.length === 2) {
    //Create the overlay line for the difference chart

    const diffdataA = data[0].data.map((basedata, baseI) => {
      const linePoint =
        basedata.yTop > data[1].data[baseI].yTop
          ? basedata.yTop
          : basedata.yBottom
      return {
        x: basedata.x,
        y: linePoint,
        yBottom: linePoint,
        yTop: linePoint
      }
    })

    const diffdataB = data[0].data.map((basedata, baseI) => {
      const linePoint =
        data[1].data[baseI].yTop > basedata.yTop
          ? data[1].data[baseI].yTop
          : data[1].data[baseI].yBottom
      return {
        x: basedata.x,
        y: linePoint,
        yBottom: linePoint,
        yTop: linePoint
      }
    })

    const doClassname = classFn
      ? `xyframe-line ${classFn(diffdataA)}`
      : "xyframe-line"

    const overLine = line()

    lineGeneratorDecorator({
      projectedCoordinateNames,
      defined,
      interpolator,
      generator: overLine,
      xScale,
      yScale,
      simpleLine: true
    })

    //      let baseStyle = props.lineStyle ? props.lineStyle(diffdata, 0) : {}
    const diffOverlayA = (
      <Mark
        key={"xyline-diff-a"}
        className={`${doClassname} difference-overlay-a`}
        markType="path"
        d={overLine(diffdataA)}
        style={{ fill: "none", pointerEvents: "none" }}
      />
    )
    mappedLines.push(diffOverlayA)

    const diffOverlayB = (
      <Mark
        key={"xyline-diff-b"}
        className={`${doClassname} difference-overlay-b`}
        markType="path"
        d={overLine(diffdataB)}
        style={{ fill: "none", pointerEvents: "none" }}
      />
    )
    mappedLines.push(diffOverlayB)
  }

  return mappedLines
}

export function createSummaries({
  xScale,
  yScale,
  canvasDrawing,
  data,
  canvasRender,
  styleFn,
  classFn,
  renderKeyFn,
  renderMode,
  baseMarkProps,
  customMark
}: {
  xScale: ScaleLinear<number, number>
  yScale: ScaleLinear<number, number>
  canvasDrawing?: object[]
  data: ProjectedSummary[]
  canvasRender?: Function
  styleFn?: Function
  classFn?: Function
  renderKeyFn?: Function
  renderMode?: Function
  baseMarkProps?: GenericObject
  customMark?: Function
}) {
  const summaryClass = classFn || (() => "")
  const summaryStyle = styleFn || (() => ({}))

  const renderFn = renderMode

  if (!Array.isArray(data)) {
    data = [data]
  }

  const renderedSummaries = []

  data.forEach((d, i) => {
    let className = "xyframe-summary"
    if (summaryClass) {
      className = `xyframe-summary ${summaryClass(d)}`
    }
    let drawD: string | React.ReactNode = ""
    let shouldBeValid = false
    if (
      typeof d.customMark === "string" ||
      React.isValidElement(d.customMark)
    ) {
      drawD = d.customMark
      shouldBeValid = true
    } else if (d.type === "MultiPolygon") {
      const polycoords = d.coordinates
      polycoords.forEach((coord: number[][]) => {
        coord.forEach(c => {
          drawD += `M${c
            .map(p => `${xScale(p[0])},${yScale(p[1])}`)
            .join("L")}Z `
        })
      })
    } else if (customMark) {
      const xyfCoords = d._xyfCoordinates as number[][]
      const projectedCoordinates = xyfCoords.map(p => [
        xScale(p[0]),
        yScale(p[1])
      ])
      // CUSTOM MARK IMPLEMENTATION
      drawD = customMark({
        d,
        i,
        classFn: summaryClass,
        styleFn: summaryStyle,
        renderFn,
        projectedCoordinates,
        xScale,
        yScale,
        bounds: shapeBounds(projectedCoordinates)
      })
      shouldBeValid = true
    } else {
      const xyfCoords = d._xyfCoordinates as number[][]
      drawD = `M${xyfCoords
        .map(p => `${xScale(p[0])},${yScale(p[1])}`)
        .join("L")}Z`
    }

    const renderKey = renderKeyFn ? renderKeyFn(d, i) : `summary-${i}`

    if (shouldBeValid && React.isValidElement(drawD)) {
      renderedSummaries.push(drawD)
    } else if (canvasRender && canvasRender(d, i) === true) {
      const canvasSummary = {
        type: "summary",
        baseClass: "xyframe-summary",
        tx: 0,
        ty: 0,
        d,
        i,
        markProps: { markType: "path", d: drawD },
        styleFn: summaryStyle,
        renderFn,
        classFn: () => className
      }
      canvasDrawing.push(canvasSummary)
    } else {
      renderedSummaries.push(
        <Mark
          {...baseMarkProps}
          key={renderKey}
          forceUpdate={true}
          renderMode={renderFn ? renderFn(d, i) : undefined}
          className={className}
          markType="path"
          d={drawD}
          style={summaryStyle(d, i)}
        />
      )
    }
  })
  return renderedSummaries
}

export function clonedAppliedElement({
  tx,
  ty,
  d,
  i,
  markProps,
  styleFn,
  renderFn,
  classFn,
  renderKeyFn,
  baseClass,
  yi
}: {
  tx?: number
  ty?: number
  d: GenericObject
  i: number
  markProps: GenericObject
  styleFn: Function
  renderFn: Function
  classFn: Function
  renderKeyFn: Function
  baseClass: string
  yi?: number
}) {
  markProps.style = styleFn ? styleFn(d, i, yi) : {}

  markProps.className = baseClass

  markProps.key = renderKeyFn
    ? renderKeyFn(d, i, yi)
    : `${baseClass}-${d.key === undefined ? i : d.key}`

  if (tx || ty) {
    markProps.transform = `translate(${tx || 0},${ty || 0})`
  }

  if (classFn) {
    markProps.className = `${baseClass} ${classFn(d, i, yi)}`
  }

  if (!markProps.markType) {
    const RenderableMark = markProps as React.ComponentClass
    return React.createElement(RenderableMark)
  }

  markProps.renderMode = renderFn ? renderFn(d, i, yi) : undefined

  return <Mark {...markProps} />
}
