"use client"
import * as React from "react"

export interface ChartErrorProps {
  /** Component name for the error message */
  componentName: string
  /** The error message to display */
  message: string
  /** Optional diagnostic suggestions from diagnoseConfig */
  diagnosticHint?: string
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
  diagnosticHint,
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
        {diagnosticHint && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 12px",
              background: "rgba(128, 128, 128, 0.06)",
              borderRadius: 4,
              fontSize: 12,
              color: "rgba(128, 128, 128, 0.8)",
              fontFamily: "monospace",
              textAlign: "left",
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
            }}
          >
            {diagnosticHint}
          </div>
        )}
      </div>
    </div>
  )
}
