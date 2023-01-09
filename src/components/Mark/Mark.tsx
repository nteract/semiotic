import React from "react"
import { useEffect, useState } from "react"

import { generateSVG } from "./markBehavior/drawing"

import {
  reactCSSNameStyleHash,
  redrawSketchyList
} from "./constants/markTransition"
import { FillOpacity, MarkProps, StrokeOpacity } from "./Mark.types"

function generateSketchyKey(props) {
  let { style = {} } = props
  let sketchyKey = ""
  redrawSketchyList.forEach((d) => {
    sketchyKey += `-${style[d] || props[d]}`
  })
  return sketchyKey
}

const updateSketchy = (nextProps, previousSketchyKey) => {
  const RoughGenerator = nextProps.sketchyGenerator

  const renderOptions =
    nextProps.renderMode !== null && typeof nextProps.renderMode === "object"
      ? nextProps.renderMode
      : { renderMode: nextProps.renderMode }

  const sketchyKey =
    renderOptions.renderMode === "sketchy" && generateSketchyKey(nextProps)

  if (RoughGenerator && sketchyKey && sketchyKey !== previousSketchyKey) {
    const { style = {} } = nextProps
    const {
      simplification = 0,
      curveStepCount = 9,
      fillStyle = "hachure",
      roughness = 1,
      bowing = 1,
      fillWeight = 1,
      hachureAngle = -41
    } = renderOptions

    const roughGenerator = RoughGenerator({}, { width: 1000, height: 1000 })
    let drawingInstructions
    const roughOptions = {
      fill: style.fill || nextProps.fill,
      stroke: style.stroke || nextProps.stroke,
      strokeWidth: style.strokeWidth || nextProps.strokeWidth,
      fillStyle: fillStyle,
      roughness: roughness,
      bowing: bowing,
      fillWeight: fillWeight,
      hachureAngle: hachureAngle,
      hachureGap:
        renderOptions.hachureGap ||
        (style.fillOpacity && (5 - style.fillOpacity * 5) * fillWeight) ||
        fillWeight * 2,
      curveStepCount: curveStepCount,
      simplification: simplification
    }

    switch (nextProps.markType) {
      case "line":
        drawingInstructions = roughGenerator.line(
          nextProps.x1 || 0,
          nextProps.y1 || 0,
          nextProps.x2 || 0,
          nextProps.y2 || 0,
          roughOptions
        )
        break
      case "rect":
        if (nextProps.rx || nextProps.ry) {
          drawingInstructions = roughGenerator.circle(
            (nextProps.x || 0) + nextProps.width / 2,
            (nextProps.y || 0) + nextProps.width / 2,
            nextProps.width,
            roughOptions
          )
        } else {
          drawingInstructions = roughGenerator.rectangle(
            nextProps.x || 0,
            nextProps.y || 0,
            nextProps.width,
            nextProps.height,
            roughOptions
          )
        }
        break
      case "circle":
        drawingInstructions = roughGenerator.circle(
          nextProps.cx || 0,
          nextProps.cy || 0,
          nextProps.r * 2,
          roughOptions
        )
        break
      case "ellipse":
        drawingInstructions = roughGenerator.ellipse(
          nextProps.x || 0,
          nextProps.y || 0,
          nextProps.width,
          nextProps.height,
          roughOptions
        )
        break
      case "polygon":
        drawingInstructions = roughGenerator.polygon(
          nextProps.points,
          roughOptions
        )
        break
      case "path":
        if (!nextProps.d.includes("NaN") && !nextProps.d.includes("Infinity")) {
          drawingInstructions = roughGenerator.path(nextProps.d, roughOptions)
        }
        break
    }

    if (!drawingInstructions) {
      return null
    }

    const fillOpacityStyles: FillOpacity = {}
    const strokeOpacityStyles: StrokeOpacity = {}

    // Assume if hachure gap is explicitly set then opacity is real
    if (renderOptions.hachureGap || renderOptions.fillStyle === "solid") {
      fillOpacityStyles.opacity = style.opacity || nextProps.opacity
      fillOpacityStyles.fillOpacity = style.fillOpacity || nextProps.fillOpacity
      fillOpacityStyles.strokeOpacity =
        style.fillOpacity || nextProps.fillOpacity
      strokeOpacityStyles.opacity = style.opacity || nextProps.opacity
      strokeOpacityStyles.strokeOpacity =
        style.strokeOpacity || nextProps.strokeOpacity
    }

    const roughPieces = []
    roughGenerator
      .toPaths(drawingInstructions)
      .forEach(({ d, fill, stroke, strokeWidth, pattern }, i) => {
        const opacityStyles = i === 0 ? fillOpacityStyles : strokeOpacityStyles
        if (pattern) {
          const roughRandomID = `rough-${Math.random()}`
          roughPieces.push(
            <pattern
              key={`pattern-${i}`}
              id={roughRandomID}
              x={pattern.x}
              y={pattern.y}
              height={pattern.height}
              width={pattern.width}
              viewBox={pattern.viewBox}
            >
              <path
                key={`pattern-path-${i}`}
                d={pattern.path.d}
                style={{
                  fill: pattern.path.fill,
                  stroke: pattern.path.stroke,
                  strokeWidth: pattern.path.strokeWidth
                }}
              />
            </pattern>
          )
          fill = `url(#${roughRandomID})`
        }
        roughPieces.push(
          <path
            key={`path-${i}`}
            d={d}
            style={{
              fill: fill,
              stroke: stroke,
              strokeWidth: strokeWidth,
              ...opacityStyles
            }}
            transform={nextProps.transform}
          />
        )
      })

    return roughPieces
  }
  return null
}

export default function SemioticMark(props: MarkProps) {
  const { className = "" } = props

  const sketchyKey = generateSketchyKey(props)

  const [sketchyFill, changeSketchyFill] = useState(
    updateSketchy(props, sketchyKey)
  )
  const [previousSketchyKey, updateSketchyKey] = useState("")

  useEffect(() => {
    changeSketchyFill(updateSketchy(props, previousSketchyKey))
    updateSketchyKey(sketchyKey)
  }, [sketchyKey, props.renderMode?.renderMode ?? props.renderMode])

  const actualSVG =
    props.renderMode && props.renderMode?.renderMode === "sketchy"
      ? sketchyFill
      : generateSVG(props, className)

  return (
    <g className={className} aria-label={props["aria-label"]}>
      {actualSVG}
    </g>
  )
}
