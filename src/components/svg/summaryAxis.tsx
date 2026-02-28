import * as React from "react"
import Axis from "../Axis"

/**
 * Generates an Axis component for summary visualizations
 * This function creates the actual Axis component with the provided props
 */
export function axisGenerator(axisProps, i, axisScale) {
  return (
    <Axis
      label={axisProps.label}
      key={axisProps.key || `orframe-summary-axis-${i}`}
      orient={axisProps.orient}
      size={axisProps.size}
      ticks={axisProps.ticks}
      tickSize={axisProps.tickSize}
      tickFormat={axisProps.tickFormat}
      tickValues={axisProps.tickValues}
      rotate={axisProps.rotate}
      scale={axisScale}
      className={axisProps.className}
    />
  )
}
