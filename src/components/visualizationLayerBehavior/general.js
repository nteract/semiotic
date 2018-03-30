import React from "react"

import { Mark } from "semiotic-mark"
import { line, area, curveLinear } from "d3-shape"

import { shapeBounds } from "../svg/areaDrawing"

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
  baseMarkProps
}) {
  const { y, x } = projectedCoordinateNames
  const mappedPoints = []
  data.forEach((d, i) => {
    const dX = xScale(d[x])
    const dY = yScale(d[y])
    const pointAriaLabel = `Point at x ${d.x} and y ${d.y}`
    const renderedCustomMark =
      customMark && customMark({ d: d.data, i, xScale, yScale })
    const markProps = customMark
      ? Object.assign(baseMarkProps, renderedCustomMark.props, {
          "aria-label": pointAriaLabel
        })
      : {
          ...baseMarkProps,
          "key": `piece-${i}`,
          "markType": "circle",
          "r": 2,
          "aria-label": pointAriaLabel
        }

    if (
      renderedCustomMark &&
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
        mappedPoints.push(
          clonedAppliedElement({
            baseClass: "frame-piece",
            tx: dX,
            ty: dY,
            d: d.data || d,
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
  axesData
}) {
  const xAxis = axesData.find(d => d.orient === "bottom" || d.orient === "top")
  const yAxis = axesData.find(d => d.orient === "left" || d.orient === "right")

  const xAxisFormatter = (xAxis && xAxis.tickFormat) || (d => d)
  const yAxisFormatter = (yAxis && yAxis.tickFormat) || (d => d)

  const customLine = typeof type === "object" ? type : { type }
  const interpolator = customLine.interpolator
    ? customLine.interpolator
    : curveLinear
  const lineGenerator = area()

  lineGeneratorDecorator({
    projectedCoordinateNames,
    defined,
    interpolator,
    generator: lineGenerator,
    xScale,
    yScale,
    simpleLine: customLine.simpleLine
  })

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
      const markProps = {
        ...baseMarkProps,
        "markType": "path",
        "d": lineGenerator(d.data.map(p => Object.assign({}, p.data, p))),
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

export function createAreas({
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
}) {
  const areaClass = classFn || (() => "")
  const areaStyle = styleFn || (() => ({}))

  const renderFn = renderMode

  if (!Array.isArray(data)) {
    data = [data]
  }

  const renderedAreas = []

  data.forEach((d, i) => {
    let className = "xyframe-area"
    if (areaClass) {
      className = `xyframe-area ${areaClass(d)}`
    }
    let drawD = ""
    if (d.type === "MultiPolygon") {
      d.coordinates.forEach(coord => {
        coord.forEach(c => {
          drawD += `M${c
            .map(p => `${xScale(p[0])},${yScale(p[1])}`)
            .join("L")}Z `
        })
      })
    } else if (customMark) {
      const projectedCoordinates = d._xyfCoordinates.map(p => [
        xScale(p[0]),
        yScale(p[1])
      ])
      drawD = customMark({
        d,
        projectedCoordinates,
        xScale,
        yScale,
        bounds: shapeBounds(projectedCoordinates)
      })
    } else {
      drawD = `M${d._xyfCoordinates
        .map(p => `${xScale(p[0])},${yScale(p[1])}`)
        .join("L")}Z`
    }

    const renderKey = renderKeyFn ? renderKeyFn(d, i) : `area-${i}`

    if (React.isValidElement(drawD)) {
      renderedAreas.push(drawD)
    } else if (canvasRender && canvasRender(d, i) === true) {
      const canvasArea = {
        type: "area",
        baseClass: "xyframe-area",
        tx: 0,
        ty: 0,
        d,
        i,
        markProps: { markType: "path", d: drawD },
        styleFn: areaStyle,
        renderFn,
        classFn: () => className
      }
      canvasDrawing.push(canvasArea)
    } else {
      renderedAreas.push(
        <Mark
          {...baseMarkProps}
          key={renderKey}
          forceUpdate={true}
          renderMode={renderFn ? renderFn(d, i) : undefined}
          className={className}
          markType="path"
          d={drawD}
          style={areaStyle(d, i)}
        />
      )
    }
  })
  return renderedAreas
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
  baseClass
}) {
  markProps.style = styleFn ? styleFn(d, i) : {}

  markProps.className = baseClass

  markProps.key = renderKeyFn
    ? renderKeyFn(d, i)
    : `${baseClass}-${d.key === undefined ? i : d.key}`

  if (tx || ty) {
    markProps.transform = `translate(${tx || 0},${ty || 0})`
  }

  if (classFn) {
    markProps.className = `${baseClass} ${classFn(d, i)}`
  }

  if (!markProps.markType) {
    return <markProps />
  }

  markProps.renderMode = renderFn ? renderFn(d, i) : undefined

  return <Mark {...markProps} />
}
