import React from "react"
import { useRef, useEffect, useState } from "react"
import { dequal } from "dequal"
import { select } from "d3-selection"
import "d3-transition"

import { generateSVG } from "./markBehavior/drawing"

import {
  attributeTransitionWhitelist,
  reactCSSNameStyleHash,
  redrawSketchyList,
  differentD
} from "./constants/markTransition"
import { FillOpacity, MarkProps, StrokeOpacity } from "./Mark.types"

function filterProps(originalProps, filterKeys) {
  const newProps = {}
  filterKeys.forEach((f) => {
    if (originalProps[f] !== undefined) {
      newProps[f] = originalProps[f]
    }
  })
  return newProps
}

function generateSketchyHash(props) {
  let { style = {} } = props
  let sketchyHash = ""
  redrawSketchyList.forEach((d) => {
    sketchyHash += `-${style[d] || props[d]}`
  })
  return sketchyHash
}

function adjustedPropName(propname) {
  return reactCSSNameStyleHash[propname] || propname
}

const updateSketchy = (nextProps, oldSketchyHash) => {
  const RoughGenerator = nextProps.sketchyGenerator

  const renderOptions =
    nextProps.renderMode !== null && typeof nextProps.renderMode === "object"
      ? nextProps.renderMode
      : { renderMode: nextProps.renderMode }

  const sketchyHash =
    renderOptions.renderMode === "sketchy" && generateSketchyHash(nextProps)
  if (RoughGenerator && sketchyHash && sketchyHash !== oldSketchyHash) {
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
        drawingInstructions = roughGenerator.path(nextProps.d, roughOptions)
        break
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
  const {
    renderMode,
    markType,
    forceUpdate,
    className = "",
    children,
    customTween
  } = props

  const [sketchyHash, changeSketchyHash] = useState(generateSketchyHash(props))
  const [sketchyFill, changeSketchyFill] = useState(
    updateSketchy(props, sketchyHash)
  )
  const [actualSVG, changeActualSVG] = useState(
    () =>
      ((props.renderMode === "sketchy" ||
        (props.renderMode && props.renderMode.renderMode === "sketchy")) &&
        sketchyFill) ||
      generateSVG(props, className)
  )

  const markRef = useRef(null)

  const prevPropsRef: any = useRef()

  useEffect(() => {
    console.log(
      "renderMode, markType, forceUpdate, className, children, !!customTween",
      renderMode,
      markType,
      forceUpdate,
      className,
      !!customTween
    )
  }, [renderMode, markType, forceUpdate, className, !!customTween])

  useEffect(() => {
    let node = markRef.current

    let cloneProps = actualSVG.props

    const prevProps = prevPropsRef.current ?? props
    const prevClassname = prevProps.className || ""

    if (
      !dequal(renderMode, prevProps.renderMode) ||
      prevProps.markType !== markType ||
      forceUpdate !== prevProps.forceUpdate ||
      !!prevProps.customTween !== !!customTween ||
      prevClassname !== className
    ) {
      console.log("OVERRIDE")
      changeActualSVG(generateSVG(props, props.className))
      changeSketchyHash(generateSketchyHash(props))
      changeSketchyFill(updateSketchy(props, sketchyHash))
    } else if (!cloneProps || !node) {
      console.log("MISSING")
      return
    } else {
      const transitionableProps = filterProps(
        props,
        attributeTransitionWhitelist
      )
      const transitionablePrevProps = filterProps(
        prevProps,
        attributeTransitionWhitelist
      )

      console.log("props", props)
      console.log("prevProps", prevProps)
      console.log("transitionableProps", transitionableProps)
      console.log("transitionablePrevProps", transitionablePrevProps)
      console.log(
        "!dequal(transitionableProps, transitionablePrevProps) ",
        !dequal(transitionableProps, transitionablePrevProps)
      )

      console.log("props.style", props.style)
      console.log("prevProps.style", prevProps.style)
      if (
        !dequal(transitionableProps, transitionablePrevProps) ||
        !dequal(props.style, prevProps.style)
      ) {
        let { transitionDuration = {} } = props
        const isDefault = typeof transitionDuration === "number"
        const defaultDuration = isDefault ? transitionDuration : 1000
        transitionDuration = isDefault
          ? { default: defaultDuration }
          : { default: defaultDuration, ...transitionDuration }

        const newProps = Object.keys(transitionableProps)
        const oldProps = Object.keys(transitionablePrevProps).filter(
          (d) => !newProps.find((p) => p === d)
        )

        const hasTransition = select(node).select("*").transition
        console.log("hasTransition", hasTransition)
        console.log("newProps", newProps)
        console.log("oldProps", oldProps)
        oldProps.forEach((oldProp) => {
          if (oldProp !== "style") {
            select(node).select("*").attr(adjustedPropName(oldProp), undefined)
          }
        })

        newProps.forEach((newProp) => {
          console.log("newProp", newProp)
          if (
            !hasTransition ||
            (newProp === "d" && differentD(cloneProps.d, prevProps.d))
          ) {
            if (newProp === "d" && props.customTween) {
              select(node)
                .select("*")
                .attr(
                  "d",
                  props.customTween.fn(
                    props.customTween.props,
                    props.customTween.props
                  )(1)
                )
            } else {
              console.log("SJHOUDL DBE CHANGING")
              select(node)
                .select("*")
                .attr(adjustedPropName(newProp), cloneProps[newProp])
            }
          } else {
            const {
              default: defaultDur,
              [newProp]: appliedDuration = defaultDur
            } = transitionDuration

            if (newProp === "d" && props.customTween) {
              const initialTweenProps = { ...prevProps.customTween.props }
              const nextTweenProps = { ...props.customTween.props }
              select(node)
                .select("*")
                .transition(adjustedPropName("d"))
                .duration(appliedDuration)
                .attrTween("d", () => {
                  return props.customTween.fn(initialTweenProps, nextTweenProps)
                })
            } else {
              console.log("NO REALLY CHANGE NO REALLY CHANGE NO REALLY CHANGE")
              console.log(
                "adjustedPropName(newProp)",
                adjustedPropName(newProp)
              )
              console.log("cloneProps[newProp]", cloneProps[newProp])
              console.log("select node", select(node))
              select(node)
                .select("*")
                .transition(adjustedPropName(newProp))
                .duration(appliedDuration)
                .attr(adjustedPropName(newProp), cloneProps[newProp])
            }
          }
        })

        const newStyleProps = Object.keys(cloneProps.style || {})
        const oldStyleProps = Object.keys(prevProps.style || {}).filter(
          (d) => !newStyleProps.find((p) => p === d)
        )

        oldStyleProps.forEach((oldProp) => {
          select(node).select("*").style(adjustedPropName(oldProp), undefined)
        })

        newStyleProps.forEach((newProp) => {
          if (!hasTransition) {
            select(node)
              .select("*")
              .style(adjustedPropName(newProp), cloneProps.style[newProp])
          } else {
            const {
              default: defaultDur,
              [newProp]: appliedDuration = defaultDur
            } = transitionDuration

            select(node)
              .select("*")
              .transition(adjustedPropName(newProp))
              .duration(appliedDuration)
              .style(adjustedPropName(newProp), cloneProps.style[newProp])
          }
        })
      }
    }

    prevPropsRef.current = props
  })

  return (
    <g ref={markRef} className={className} aria-label={props["aria-label"]}>
      {actualSVG}
    </g>
  )
}
