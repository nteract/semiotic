import * as React from "react"
import type { Style } from "../types"
import { glyphNodeToSVG, svgFill } from "../sceneToSVGShared"
import { isHatchFill, hatchPatternDef } from "../../charts/shared/hatchFill"
import type { PhysicsBodyState } from "./PhysicsKernel"
import { resolveBodyMark } from "./physicsBodyCanvas"
import { physicsPolygonVertices, resolveBodyGlyph } from "./physicsBodyGeometry"

/** SVG counterpart of the built-in body painter, including datum mark overrides. */
export function physicsBodySVG(
  body: PhysicsBodyState,
  style: Style,
  index: number,
  idPrefix = "physics"
) {
  const mark = resolveBodyMark(body, style)
  const r =
    body.shape.type === "circle"
      ? (style.r ?? body.shape.radius)
      : Math.max(body.shape.width, body.shape.height) / 2
  const glyph = resolveBodyGlyph(body, style)
  if (glyph)
    return glyphNodeToSVG(
      {
        glyph,
        size: r * 2,
        style,
        color: typeof style.fill === "string" ? style.fill : undefined,
        accent: style.stroke
      },
      body.x,
      body.y,
      `physics-body-${index}`
    )
  const hatchId = `${idPrefix}-body-${index}-hatch`
  const hatch = isHatchFill(style.fill)
    ? hatchPatternDef(style.fill, hatchId)
    : undefined
  const wrap = (node: React.ReactElement) =>
    hatch ? (
      <React.Fragment key={`physics-body-${index}`}>
        <defs>{hatch}</defs>
        {node}
      </React.Fragment>
    ) : (
      React.cloneElement(node, { key: `physics-body-${index}` })
    )
  const paint = {
    fill: hatch ? `url(#${hatchId})` : svgFill(style.fill),
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    opacity: style.opacity,
    fillOpacity: style.fillOpacity,
    strokeDasharray: style.strokeDasharray
  }
  // The generic point/rect serializer preserves hatch fill support.
  if (mark === "circle" && !style.r) return undefined
  if (mark === "pill" || mark === "square" || body.shape.type === "aabb") {
    const w =
      mark === "pill"
        ? r * 2.4
        : body.shape.type === "aabb"
          ? body.shape.width
          : r * 1.7
    const h =
      mark === "pill"
        ? r * 1.35
        : body.shape.type === "aabb"
          ? body.shape.height
          : r * 1.7
    return wrap(
      <rect
        x={body.x - w / 2}
        y={body.y - h / 2}
        width={w}
        height={h}
        rx={mark === "pill" ? h / 2 : Math.min(4, w / 4)}
        {...paint}
      />
    )
  }
  if (
    mark === "triangle" ||
    mark === "hexagon" ||
    mark === "faceted" ||
    mark === "diamond"
  ) {
    const points = physicsPolygonVertices(
      body.x,
      body.y,
      r,
      mark === "triangle" ? 3 : mark === "diamond" ? 4 : 6
    )
    return wrap(
      <path
        d={`${points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join("")}Z`}
        {...paint}
      />
    )
  }
  return wrap(
    <g>
      <circle cx={body.x} cy={body.y} r={r} {...paint} />
      {mark === "halo" && (style.strokeWidth ?? 0) > 0 && (
        <circle
          cx={body.x}
          cy={body.y}
          r={r * 1.35}
          fill="none"
          stroke={style.stroke ?? paint.fill}
          strokeWidth={Math.max(1.5, style.strokeWidth ?? 1.5)}
          opacity={(style.opacity ?? 1) * 0.55}
        />
      )}
    </g>
  )
}
