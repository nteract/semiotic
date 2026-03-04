import * as React from "react"

import { ProjectionTypes } from "../types/generalTypes"

type SummaryType = { type: string | Function }

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
  if (typeof type.type === "function") {
    return type.type({
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
  console.error(
    `Invalid summary type: ${type.type} - Must be a function`
  )
  return {}
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

