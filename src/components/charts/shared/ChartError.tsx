"use client"
import * as React from "react"

export interface ChartErrorProps {
  /** Component name for the error message */
  componentName: string
  /** The error message to display */
  message: string
  /** Chart width */
  width: number
  /** Chart height */
  height: number
}

/**
 * Renders a visible, styled error state inside the chart's dimensions.
 * Shows the component name, error message, and a hint for developers.
 *
 * Designed to be obvious in development but not alarming in production —
 * uses muted colors that adapt to light/dark backgrounds.
 */
export default function ChartError({
  componentName,
  message,
  width,
  height,
}: ChartErrorProps) {
  return (
    <div
      role="alert"
      style={{
        width,
        height: Math.max(height, 120),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px dashed rgba(128, 128, 128, 0.4)",
        borderRadius: 8,
        background: "rgba(128, 128, 128, 0.04)",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "rgba(128, 128, 128, 0.7)",
            marginBottom: 6,
            fontFamily: "monospace",
          }}
        >
          {componentName}
        </div>
        <div
          style={{
            fontSize: 14,
            color: "rgba(128, 128, 128, 0.9)",
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>
      </div>
    </div>
  )
}
