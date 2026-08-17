import * as React from "react"

/** A primitive label can use portable native SVG text. Other React content
 * follows the live overlays and is hosted in an HTML foreignObject. */
export function isStaticTextTickLabel(
  label: React.ReactNode,
): label is string | number {
  return typeof label === "string" || typeof label === "number"
}

export function renderStaticTickForeignObject(options: {
  label: React.ReactNode
  x: number
  y: number
  textAlign: "left" | "center" | "right"
  fontSize: number
  fontFamily: string
  color: string
}): React.ReactNode {
  const { label, x, y, textAlign, fontSize, fontFamily, color } = options
  return (
    <foreignObject x={x} y={y} width={60} height={24} style={{ overflow: "visible" }}>
      <div
        style={{
          color,
          fontFamily,
          fontSize,
          textAlign,
          userSelect: "none",
        }}
      >
        {label}
      </div>
    </foreignObject>
  )
}
