import * as React from "react"

/** Circle at the top (x threshold) or left (y threshold) plot edge. */
export interface ThresholdEndCapConfig {
  radius?: number
  fill?: string
}

export function renderThresholdEndCap(
  config: boolean | "circle" | ThresholdEndCapConfig | undefined,
  start: [number, number],
  color: string
) {
  if (!config) return null
  const options = typeof config === "object" ? config : {}
  return (
    <circle
      className="semiotic-threshold-end-cap"
      cx={start[0]}
      cy={start[1]}
      r={Math.max(0, options.radius ?? 4)}
      fill={options.fill ?? color}
    />
  )
}
