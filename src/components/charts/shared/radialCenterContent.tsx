import * as React from "react"

// Text and SVG elements use native SVG so rasterizers and design tools retain
// them. Arbitrary React HTML uses an overlay (foreignObject in static SVG).
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

/** An allow-listed SVG element, or a fragment/array made only of them. */
function isSvgCenterContent(node: React.ReactNode): boolean {
  if (Array.isArray(node))
    return node.length > 0 && node.every(isSvgCenterContent)
  if (!React.isValidElement(node)) return false
  if (node.type === React.Fragment) {
    const children = React.Children.toArray(
      (node.props as { children?: React.ReactNode }).children
    )
    return children.length > 0 && children.every(isSvgCenterContent)
  }
  return typeof node.type === "string" && SVG_CENTER_CONTENT_TAGS.has(node.type)
}

export function renderSvgCenterContent(
  centerContent: React.ReactNode,
  centerX: number,
  centerY: number,
  textStyle?: React.SVGProps<SVGTextElement>
): React.ReactNode | null {
  if (typeof centerContent === "string" || typeof centerContent === "number") {
    centerContent = (
      <text fill="currentColor" {...textStyle}>
        {centerContent}
      </text>
    )
  }
  if (!isSvgCenterContent(centerContent)) return null
  if (
    !React.isValidElement(centerContent) ||
    centerContent.type === React.Fragment
  ) {
    return (
      <g
        className="semiotic-radial-center-content"
        transform={`translate(${centerX},${centerY})`}
        pointerEvents="none"
      >
        {centerContent}
      </g>
    )
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
