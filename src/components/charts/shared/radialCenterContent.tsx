import * as React from "react"

// `centerContent` is historically an HTML overlay in StreamOrdinalFrame, so
// arbitrary React content must remain inside a foreignObject in static SVG.
// A native SVG element, however, is safe and materially more portable (Figma
// and several SVG importers discard foreignObject entirely). Keep the allow
// list deliberately narrow: unknown components still take the HTML fallback.
const SVG_CENTER_CONTENT_TAGS = new Set([
  "svg",
  "g",
  "text",
  "tspan",
  "path",
  "circle",
  "ellipse",
  "rect",
  "line",
  "polyline",
  "polygon",
  "use",
  "image",
  "defs",
  "symbol"
])

export function renderSvgCenterContent(
  centerContent: React.ReactNode,
  centerX: number,
  centerY: number
): React.ReactNode | null {
  if (!React.isValidElement(centerContent)) return null
  if (
    !SVG_CENTER_CONTENT_TAGS.has(centerContent.type as string)
  ) {
    return null
  }

  const svgElement = centerContent as React.ReactElement<
    React.SVGProps<SVGElement>
  >

  // A bare <text> is the common Gauge readout. Give it useful center defaults
  // without rewriting explicit SVG coordinates or typography supplied by the
  // caller. Other SVG nodes retain their complete native shape untouched.
  const element =
    svgElement.type === "text"
      ? React.cloneElement(svgElement, {
          x: svgElement.props.x ?? 0,
          y: svgElement.props.y ?? 0,
          textAnchor: svgElement.props.textAnchor ?? "middle",
          dominantBaseline: svgElement.props.dominantBaseline ?? "middle"
        })
      : svgElement

  return (
    <g
      className="semiotic-radial-center-content"
      transform={`translate(${centerX},${centerY})`}
      pointerEvents="none"
    >
      {element}
    </g>
  )
}

/** Render SVG centers in an SVG viewport; preserve arbitrary HTML overlays. */
export function RadialCenterContent({
  content,
  centerX,
  centerY,
  width,
  height
}: {
  content: React.ReactNode
  centerX: number
  centerY: number
  width: number
  height: number
}) {
  const svg = renderSvgCenterContent(content, centerX, centerY)
  if (svg)
    return (
      <svg
        width={width}
        height={height}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          pointerEvents: "none",
          overflow: "visible"
        }}
      >
        {svg}
      </svg>
    )
  return (
    <div
      style={{
        position: "absolute",
        left: centerX,
        top: centerY,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        textAlign: "center"
      }}
    >
      {content}
    </div>
  )
}
