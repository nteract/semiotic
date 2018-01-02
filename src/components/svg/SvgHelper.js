import React from "react"

import { select } from "d3-selection"
import { arc, line, curveLinearClosed } from "d3-shape"
import { Mark } from "semiotic-mark"

const twoPI = Math.PI * 2

export const drawAreaConnector = ({
  x1,
  x2,
  y1,
  y2,
  sizeX1,
  sizeY1,
  sizeX2,
  sizeY2
}) => {
  return `M${x1},${y1}L${x2},${y2}L${x2 + sizeX2},${y2 + sizeY2}L${x1 +
    sizeX1},${y1 + sizeY1}Z`
}

export const wrap = (text, width) => {
  text.each(function() {
    const textNode = select(this),
      words = textNode
        .text()
        .split(/\s+/)
        .reverse(),
      lineHeight = 1.1, // ems
      y = textNode.attr("y"),
      dy = parseFloat(textNode.attr("dy"))

    let word,
      line = [],
      lineNumber = 0,
      tspan = textNode
        .text(null)
        .append("tspan")
        .attr("x", 0)
        .attr("y", y)
        .attr("dy", `${dy}em`)

    while (words.length > 0) {
      word = words.pop()
      line.push(word)
      tspan.text(line.join(" "))
      if (tspan.node().getComputedTextLength() > width) {
        line.pop()
        tspan.text(line.join(" "))
        line = [word]

        tspan = text
          .append("tspan")
          .attr("x", 0)
          .attr("y", y)
          .attr("dy", `${++lineNumber * lineHeight + dy}em`)
          .text(word)
      }
    }
  })
}

export const hexToRgb = hex => {
  if (hex.substr(0, 1).toLowerCase() === "r") {
    return hex
      .split("(")[1]
      .split(")")[0]
      .split(",")
  }
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ]
    : [0, 0, 0]
}

export const groupBarMark = ({
  bins,
  binMax,
  relativeBuckets,
  columnWidth,
  projection,
  adjustedSize,
  chartSize,
  summaryI,
  data,
  summary,
  renderValue,
  summaryStyle,
  type,
  margin,
  baseMarkProps
}) => {
  let xProp = -columnWidth / 2

  const mappedBins = []
  const mappedPoints = []
  const actualMax = (relativeBuckets && relativeBuckets[summary.name]) || binMax

  bins.forEach((d, i) => {
    const opacity = d.value / actualMax
    const finalStyle =
      type.type === "heatmap"
        ? { opacity: opacity, fill: summaryStyle.fill }
        : summaryStyle
    const finalColumnWidth =
      type.type === "heatmap" ? columnWidth : columnWidth * opacity
    let yProp = d.y
    let height = d.y1
    let width = finalColumnWidth
    let xOffset =
      type.type === "heatmap" ? finalColumnWidth / 2 : finalColumnWidth
    let yOffset = d.y1 / 2

    if (projection === "horizontal") {
      yProp =
        type.type === "heatmap"
          ? -columnWidth / 2
          : columnWidth / 2 - finalColumnWidth
      xProp = d.y - d.y1
      height = finalColumnWidth
      width = d.y1
      yOffset =
        type.type === "heatmap" ? finalColumnWidth / 2 : finalColumnWidth
      xOffset = d.y1 / 2
    } else if (projection === "radial") {
      const arcGenerator = arc()
        .innerRadius((d.y - margin.left) / 2)
        .outerRadius((d.y + d.y1 - margin.left) / 2)

      const angle = summary.pct - summary.pct_padding
      let startAngle = summary.pct_middle - summary.pct_padding

      let endAngle =
        type.type === "heatmap"
          ? startAngle + angle
          : startAngle + angle * opacity
      startAngle *= twoPI
      endAngle *= twoPI

      const arcAdjustX = adjustedSize[0] / 2
      const arcAdjustY = adjustedSize[1] / 2

      const arcTranslate = `translate(${arcAdjustX},${arcAdjustY})`
      const arcCenter = arcGenerator.centroid({ startAngle, endAngle })
      mappedPoints.push({
        key: summary.name,
        value: d.value,
        pieces: d.pieces.map(d => d.piece),
        label: "Heatmap",
        x: arcCenter[0] + arcAdjustX,
        y: arcCenter[1] + arcAdjustY
      })
      mappedBins.push(
        <Mark
          {...baseMarkProps}
          markType="path"
          transform={arcTranslate}
          renderMode={renderValue}
          key={`groupIcon-${summaryI}-${i}`}
          d={arcGenerator({ startAngle, endAngle })}
          style={finalStyle}
        />
      )
    }
    if (projection !== "radial") {
      mappedPoints.push({
        key: summary.name,
        value: d.value,
        pieces: d.pieces.map(d => d.piece),
        label: "Heatmap",
        x: xProp + xOffset,
        y: yProp + yOffset
      })

      mappedBins.push(
        <Mark
          {...baseMarkProps}
          markType="rect"
          renderMode={renderValue}
          key={`groupIcon-${summaryI}-${i}`}
          x={xProp}
          y={yProp}
          height={height}
          width={width}
          style={finalStyle}
        />
      )
    }
  })

  return { marks: mappedBins, points: mappedPoints }
}

// FROM d3-svg-ribbon
export function linearRibbon() {
  let _lineConstructor = line()
  let _xAccessor = function(d) {
    return d.x
  }
  let _yAccessor = function(d) {
    return d.y
  }
  let _rAccessor = function(d) {
    return d.r
  }
  let _interpolator = curveLinearClosed

  function _ribbon(pathData) {
    let bothPoints = buildRibbon(pathData)

    return _lineConstructor
      .x(_xAccessor)
      .y(_yAccessor)
      .curve(_interpolator)(bothPoints)
  }

  _ribbon.x = function(_value) {
    if (!arguments.length) return _xAccessor

    _xAccessor = _value
    return _ribbon
  }

  _ribbon.y = function(_value) {
    if (!arguments.length) return _yAccessor

    _yAccessor = _value
    return _ribbon
  }

  _ribbon.r = function(_value) {
    if (!arguments.length) return _rAccessor

    _rAccessor = _value
    return _ribbon
  }

  _ribbon.interpolate = function(_value) {
    if (!arguments.length) return _interpolator

    _interpolator = _value
    return _ribbon
  }

  return _ribbon

  function offsetEdge(d) {
    let diffX = _yAccessor(d.target) - _yAccessor(d.source)
    let diffY = _xAccessor(d.target) - _xAccessor(d.source)

    let angle0 = Math.atan2(diffY, diffX) + Math.PI / 2
    let angle1 = angle0 + Math.PI * 0.5
    let angle2 = angle0 + Math.PI * 0.5

    let x1 = _xAccessor(d.source) + _rAccessor(d.source) * Math.cos(angle1)
    let y1 = _yAccessor(d.source) - _rAccessor(d.source) * Math.sin(angle1)
    let x2 = _xAccessor(d.target) + _rAccessor(d.target) * Math.cos(angle2)
    let y2 = _yAccessor(d.target) - _rAccessor(d.target) * Math.sin(angle2)

    return { x1: x1, y1: y1, x2: x2, y2: y2 }
  }

  function buildRibbon(points) {
    let bothCode = []
    let x = 0
    let transformedPoints = {}

    while (x < points.length) {
      if (x !== points.length - 1) {
        transformedPoints = offsetEdge({
          source: points[x],
          target: points[x + 1]
        })
        let p1 = { x: transformedPoints.x1, y: transformedPoints.y1 }
        let p2 = { x: transformedPoints.x2, y: transformedPoints.y2 }
        bothCode.push(p1, p2)
        if (bothCode.length > 3) {
          let l = bothCode.length - 1
          let lineA = { a: bothCode[l - 3], b: bothCode[l - 2] }
          let lineB = { a: bothCode[l - 1], b: bothCode[l] }
          let intersect = findIntersect(
            lineA.a.x,
            lineA.a.y,
            lineA.b.x,
            lineA.b.y,
            lineB.a.x,
            lineB.a.y,
            lineB.b.x,
            lineB.b.y
          )
          if (intersect.found === true) {
            lineA.b.x = intersect.x
            lineA.b.y = intersect.y
            lineB.a.x = intersect.x
            lineB.a.y = intersect.y
          }
        }
      }

      x++
    }
    x--
    //Back
    while (x >= 0) {
      if (x !== 0) {
        transformedPoints = offsetEdge({
          source: points[x],
          target: points[x - 1]
        })
        let p1 = { x: transformedPoints.x1, y: transformedPoints.y1 }
        let p2 = { x: transformedPoints.x2, y: transformedPoints.y2 }
        bothCode.push(p1, p2)
        if (bothCode.length > 3) {
          let l = bothCode.length - 1
          let lineA = { a: bothCode[l - 3], b: bothCode[l - 2] }
          let lineB = { a: bothCode[l - 1], b: bothCode[l] }
          let intersect = findIntersect(
            lineA.a.x,
            lineA.a.y,
            lineA.b.x,
            lineA.b.y,
            lineB.a.x,
            lineB.a.y,
            lineB.b.x,
            lineB.b.y
          )
          if (intersect.found === true) {
            lineA.b.x = intersect.x
            lineA.b.y = intersect.y
            lineB.a.x = intersect.x
            lineB.a.y = intersect.y
          }
        }
      }

      x--
    }

    return bothCode
  }

  function findIntersect(l1x1, l1y1, l1x2, l1y2, l2x1, l2y1, l2x2, l2y2) {
    let d,
      a,
      b,
      n1,
      n2,
      result = {
        x: null,
        y: null,
        found: false
      }
    d = (l2y2 - l2y1) * (l1x2 - l1x1) - (l2x2 - l2x1) * (l1y2 - l1y1)
    if (d === 0) {
      return result
    }
    a = l1y1 - l2y1
    b = l1x1 - l2x1
    n1 = (l2x2 - l2x1) * a - (l2y2 - l2y1) * b
    n2 = (l1x2 - l1x1) * a - (l1y2 - l1y1) * b
    a = n1 / d
    b = n2 / d

    result.x = l1x1 + a * (l1x2 - l1x1)
    result.y = l1y1 + a * (l1y2 - l1y1)

    if (a > 0 && a < 1 && (b > 0 && b < 1)) {
      result.found = true
    }

    return result
  }
}
