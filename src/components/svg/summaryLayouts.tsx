import * as React from "react"

import { ProjectionTypes } from "../types/generalTypes"

import { boxplotRenderFn } from "./boxplotRenderer"
import { ckBinsRenderFn } from "./ckbinsRenderer"
import { contourRenderFn } from "./contourRenderer"
import { bucketizedRenderingFn } from "./bucketizedRenderer"

// Re-export renderer functions so existing imports from this module continue to work
export { boxplotRenderFn } from "./boxplotRenderer"
export { ckBinsRenderFn } from "./ckbinsRenderer"
export { contourRenderFn } from "./contourRenderer"
export { bucketizedRenderingFn } from "./bucketizedRenderer"

type SummaryType = { type: string }

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
  margin: object
  axisCreator?: Function
}

const summaryRenderHash = {
  contour: contourRenderFn,
  boxplot: boxplotRenderFn,
  violin: bucketizedRenderingFn,
  heatmap: bucketizedRenderingFn,
  ridgeline: bucketizedRenderingFn,
  histogram: bucketizedRenderingFn,
  horizon: bucketizedRenderingFn,
  ckbins: ckBinsRenderFn
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
  margin,
  axisCreator
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
    margin,
    axisCreator
  })
}

/**
 * Main drawing function for summary visualizations
 */
export const drawSummaries = ({
  data,
  type,
  renderMode,
  eventListenersGenerator,
  styleFn,
  classFn,
  projection,
  adjustedSize,
  margin,
  axisCreator
}: {
  data: object
  type: { type?: string | Function }
  renderMode: Function
  eventListenersGenerator: Function
  styleFn: Function
  classFn: Function
  projection: ProjectionTypes
  adjustedSize: number[]
  margin: object
  axisCreator?: Function
}) => {
  if (!type || !type.type) return
  type = typeof type === "string" ? { type } : type
  const chartSize =
    projection === "vertical" ? adjustedSize[1] : adjustedSize[0]

  return orFrameSummaryRenderer({
    data: data as unknown as Array<object>,
    type: type as SummaryType,
    renderMode,
    eventListenersGenerator,
    styleFn,
    classFn,
    projection,
    adjustedSize,
    chartSize,
    margin,
    axisCreator
  })
}

interface summaryInstruction {
  Mark?: JSX.Element
  containerProps?: object
  elements: object[]
}

/**
 * Converts summary instructions to rendered SVG elements
 */
export function summaryInstructionsToMarks(data: summaryInstruction[]) {
  const renderedSummaries: JSX.Element[] = []
  for (const container of data) {
    const renderedElements: JSX.Element[] = []
    const { elements, containerProps} = container
    if (container.Mark) {
      renderedSummaries.push(container.Mark)
    } else {
      for (let i = 0; i < elements.length; i++) {
        const element: Record<string, any> = elements[i] as Record<string, any>
        const { markType, style = {}, ...restProps } = element

        // Merge style object into direct props for cleaner SVG
        const elementProps: Record<string, any> = { ...restProps }
        if (style.fill !== undefined) elementProps.fill = style.fill
        if (style.stroke !== undefined) elementProps.stroke = style.stroke
        if (style.strokeWidth !== undefined) elementProps.strokeWidth = style.strokeWidth
        if (style.opacity !== undefined) elementProps.opacity = style.opacity
        if (style.fillOpacity !== undefined) elementProps.fillOpacity = style.fillOpacity
        if (style.strokeOpacity !== undefined) elementProps.strokeOpacity = style.strokeOpacity

        // Keep remaining styles
        const remainingStyles: Record<string, any> = { ...style }
        delete remainingStyles.fill
        delete remainingStyles.stroke
        delete remainingStyles.strokeWidth
        delete remainingStyles.opacity
        delete remainingStyles.fillOpacity
        delete remainingStyles.strokeOpacity
        if (Object.keys(remainingStyles).length > 0) {
          elementProps.style = remainingStyles
        }

        elementProps.key = element.key || i

        if (markType) {
          renderedElements.push(React.createElement(markType, elementProps))
        }
      }
      if (containerProps) {
        renderedSummaries.push(<g {...containerProps}>{renderedElements}</g>)
      } else {
        renderedSummaries.push(...renderedElements)
      }
    }
  }
  return renderedSummaries
}

export const renderLaidOutSummaries = ({
  data,
  canvasRender,
  canvasDrawing
}) => {
  if (canvasRender()) {
    for (const container of data) {
      if (container.type !== "svg-only-mark") {
        const { transform: containerTransform = "translate(0,0)" } =
          container?.containerProps ?? {
            transform: "translate(0,0)"
          }

        const [containerX, containerY] = containerTransform
          .replace("translate(", "")
          .replace(")", "")
          .split(",")
        for (const element of container.elements) {
          const { transform: elementTransform = "translate(0,0)" } = element

          const [elementX, elementY] = elementTransform
            .replace("translate(", "")
            .replace(")", "")
            .split(",")

          const canvasNode = {
            baseClass: "frame-piece",
            tx: parseInt(elementX) + parseInt(containerX),
            ty: parseInt(elementY) + parseInt(containerY),
            d: {},
            i: 0,
            markProps: element,
            styleFn: () => element.style,
            renderFn: element.renderMode,
            classFn: () => ""
          }

          canvasDrawing.push(canvasNode)
        }
      }
    }
  }

  return summaryInstructionsToMarks(
    data.filter((d) => !canvasRender() || d.type === "svg-only-mark")
  )
}
