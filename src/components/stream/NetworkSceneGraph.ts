import type {
  NetworkCircleNode,
  NetworkRectNode,
  NetworkArcNode,
  NetworkLineEdge,
  NetworkBezierEdge,
  NetworkRibbonEdge,
  NetworkCurvedEdge,
  NetworkLabel
} from "./networkTypes"
import type { Style } from "./types"

/**
 * Builder functions for network scene nodes.
 * Used by layout plugins to construct the scene graph.
 */

export function buildCircleNode(
  cx: number,
  cy: number,
  r: number,
  style: Style,
  datum: any,
  id?: string,
  label?: string,
  depth?: number
): NetworkCircleNode {
  return { type: "circle", cx, cy, r, style, datum, id, label, depth }
}

export function buildRectNode(
  x: number,
  y: number,
  w: number,
  h: number,
  style: Style,
  datum: any,
  id?: string,
  label?: string,
  depth?: number
): NetworkRectNode {
  return { type: "rect", x, y, w, h, style, datum, id, label, depth }
}

export function buildArcNode(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
  style: Style,
  datum: any,
  id?: string,
  label?: string
): NetworkArcNode {
  return { type: "arc", cx, cy, innerR, outerR, startAngle, endAngle, style, datum, id, label }
}

export function buildLineEdge(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style: Style,
  datum: any
): NetworkLineEdge {
  return { type: "line", x1, y1, x2, y2, style, datum }
}

export function buildBezierEdge(
  pathD: string,
  style: Style,
  datum: any,
  bezierCache?: any
): NetworkBezierEdge {
  return { type: "bezier", pathD, bezierCache, style, datum }
}

export function buildRibbonEdge(
  pathD: string,
  style: Style,
  datum: any
): NetworkRibbonEdge {
  return { type: "ribbon", pathD, style, datum }
}

export function buildCurvedEdge(
  pathD: string,
  style: Style,
  datum: any
): NetworkCurvedEdge {
  return { type: "curved", pathD, style, datum }
}

export function buildLabel(
  x: number,
  y: number,
  text: string,
  options?: Partial<Omit<NetworkLabel, "x" | "y" | "text">>
): NetworkLabel {
  return { x, y, text, ...options }
}
