import * as React from "react"
import type { ReactNode } from "react"
import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type { NetworkSceneNode, RealtimeNode, RealtimeEdge } from "../stream/networkTypes"

/**
 * Layered flowchart layout for the Mermaid adapter (and any pre-layered DAG).
 *
 * A Mermaid flowchart is a directed acyclic graph, not a force graph — so it
 * should render as a *layered diagram* with shape-appropriate node glyphs,
 * directional arrows, and edge labels, the way Mermaid draws it. This recipe
 * does exactly that from the `layer`/`row` coordinates `fromMermaid` already
 * computes (longest-path layering), so it needs **no layout engine and no new
 * dependency**. It ships in `semiotic/recipes`, so it tree-shakes — you only
 * pull it in if you use it.
 *
 * For large or dense graphs where crossing-minimization matters, run a real
 * Sugiyama layouter (the BYO `dagre` recipe, or `d3-dag`) to assign
 * `layer`/`row`, then render with this layout — the rendering and the
 * positioning are deliberately separate concerns.
 *
 * Pure, SSR-safe: hit-testable rects are emitted as scene nodes; all visual
 * chrome (shape glyphs, labels, edges, arrowheads, edge labels) is an SVG
 * `overlays` group painted on top, in plot-relative coordinates.
 */

export type MermaidDirection = "TD" | "TB" | "BT" | "LR" | "RL"

export interface MermaidDagConfig {
  /** Flow direction. TD/TB top-down, BT bottom-up, LR left-right, RL right-left. @default "TD" */
  direction?: MermaidDirection
  /** Glyph width / height in px (shrunk to fit). @default 150 / 46 */
  nodeWidth?: number
  nodeHeight?: number
  /** Node field accessors. @default "layer" / "row" / "label" / "shape" */
  layerAccessor?: string
  rowAccessor?: string
  labelAccessor?: string
  shapeAccessor?: string
  /** Edge label field. @default "label" */
  edgeLabelAccessor?: string
  /** Colors (CSS vars by default so they follow the theme). */
  nodeFill?: string
  nodeStroke?: string
  textColor?: string
  edgeColor?: string
  /** Stroke for decision (diamond) glyphs. */
  accentColor?: string
}

type NodeShape =
  | "rect"
  | "round"
  | "stadium"
  | "subroutine"
  | "cylinder"
  | "circle"
  | "diamond"
  | "hexagon"
  | "flag"

function read(d: RealtimeNode | RealtimeEdge, key: string, fallback: unknown): unknown {
  const wrapped = (d as { data?: Record<string, unknown> }).data
  const fromData = wrapped ? wrapped[key] : undefined
  if (fromData != null) return fromData
  const own = (d as unknown as Record<string, unknown>)[key]
  return own == null ? fallback : own
}

function truncate(label: string, maxChars: number): string {
  return label.length > maxChars ? `${label.slice(0, Math.max(1, maxChars - 1))}…` : label
}

/** A human-readable flowchart "type" for each shape — surfaced in the tooltip. */
const SHAPE_KIND: Record<NodeShape, string> = {
  rect: "process",
  round: "process",
  stadium: "terminal",
  subroutine: "subprocess",
  cylinder: "database",
  circle: "connector",
  diamond: "decision",
  hexagon: "preparation",
  flag: "process",
}

/** SVG element drawing the node's shape, centered at (cx, cy). */
function shapeGlyph(
  shape: NodeShape,
  cx: number,
  cy: number,
  w: number,
  h: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
): ReactNode {
  const left = cx - w / 2
  const top = cy - h / 2
  const common = { fill, stroke, strokeWidth }
  switch (shape) {
    case "diamond": {
      const pts = `${cx},${top} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${left},${cy}`
      return <polygon points={pts} {...common} />
    }
    case "circle": {
      return <circle cx={cx} cy={cy} r={Math.min(w, h) / 2} {...common} />
    }
    case "stadium":
    case "round": {
      return <rect x={left} y={top} width={w} height={h} rx={shape === "stadium" ? h / 2 : 8} ry={shape === "stadium" ? h / 2 : 8} {...common} />
    }
    case "hexagon": {
      const inset = Math.min(w * 0.18, 16)
      const pts = `${left + inset},${top} ${cx + w / 2 - inset},${top} ${cx + w / 2},${cy} ${cx + w / 2 - inset},${cy + h / 2} ${left + inset},${cy + h / 2} ${left},${cy}`
      return <polygon points={pts} {...common} />
    }
    case "cylinder": {
      const ry = Math.min(h * 0.16, 8)
      const body = `M${left},${top + ry} a${w / 2},${ry} 0 0 0 ${w},0 v${h - 2 * ry} a${w / 2},${ry} 0 0 1 ${-w},0 z`
      const rim = `M${left},${top + ry} a${w / 2},${ry} 0 0 1 ${w},0`
      return (
        <g>
          <path d={body} {...common} />
          <path d={rim} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      )
    }
    case "subroutine": {
      const bar = Math.min(8, w * 0.08)
      return (
        <g>
          <rect x={left} y={top} width={w} height={h} rx={3} {...common} />
          <line x1={left + bar} y1={top} x2={left + bar} y2={top + h} stroke={stroke} strokeWidth={strokeWidth} />
          <line x1={left + w - bar} y1={top} x2={left + w - bar} y2={top + h} stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      )
    }
    case "flag":
    case "rect":
    default:
      return <rect x={left} y={top} width={w} height={h} rx={4} {...common} />
  }
}

export const mermaidDagLayout: NetworkCustomLayout<MermaidDagConfig> = (ctx) => {
  const cfg = ctx.config || {}
  const plot = ctx.dimensions.plot
  const dir = cfg.direction ?? "TD"
  const horizontal = dir === "LR" || dir === "RL"
  const reversed = dir === "BT" || dir === "RL"

  const layerAcc = cfg.layerAccessor ?? "layer"
  const rowAcc = cfg.rowAccessor ?? "row"
  const labelAcc = cfg.labelAccessor ?? "label"
  const shapeAcc = cfg.shapeAccessor ?? "shape"
  const edgeLabelAcc = cfg.edgeLabelAccessor ?? "label"

  const nodeFill = cfg.nodeFill ?? "var(--semiotic-surface, #20242d)"
  const nodeStroke = cfg.nodeStroke ?? "var(--semiotic-border, #5a6573)"
  const textColor = cfg.textColor ?? "var(--semiotic-text, #e6e6e6)"
  const edgeColor = cfg.edgeColor ?? "var(--semiotic-text-secondary, #9aa0a6)"
  const accent = cfg.accentColor ?? "var(--semiotic-warning, #d49a00)"

  if (ctx.nodes.length === 0) return { sceneNodes: [], overlays: null }

  // ── Group by layer, order within layer ──────────────────────────────────
  const byLayer = new Map<number, RealtimeNode[]>()
  let maxLayer = 0
  for (const n of ctx.nodes) {
    const layer = Math.round(Number(read(n, layerAcc, 0)))
    maxLayer = Math.max(maxLayer, layer)
    const list = byLayer.get(layer) || []
    list.push(n)
    byLayer.set(layer, list)
  }
  const layerCount = maxLayer + 1
  let maxInLayer = 1
  for (const list of byLayer.values()) {
    list.sort((a, b) => Number(read(a, rowAcc, 0)) - Number(read(b, rowAcc, 0)))
    maxInLayer = Math.max(maxInLayer, list.length)
  }

  // ── Glyph size (fit to plot) ─────────────────────────────────────────────
  const depthSpan = horizontal ? plot.width : plot.height
  const crossSpan = horizontal ? plot.height : plot.width
  const depthCell = depthSpan / layerCount
  const crossCell = crossSpan / (maxInLayer + 1)
  const w = Math.max(44, Math.min(cfg.nodeWidth ?? 150, horizontal ? depthCell - 36 : crossCell * 0.92))
  const h = Math.max(26, Math.min(cfg.nodeHeight ?? 46, horizontal ? crossCell * 0.7 : depthCell * 0.5))

  // ── Logical → pixel mapping ──────────────────────────────────────────────
  const depthPad = (horizontal ? w : h) / 2 + 6
  const depthExtent = Math.max(1, depthSpan - 2 * depthPad)
  const depthAt = (layer: number): number => {
    const l = reversed ? layerCount - 1 - layer : layer
    const base = layerCount > 1 ? (l / (layerCount - 1)) * depthExtent : depthExtent / 2
    return (horizontal ? plot.x : plot.y) + depthPad + base
  }
  const crossAt = (indexInLayer: number, count: number): number =>
    (horizontal ? plot.y : plot.x) + ((indexInLayer + 1) / (count + 1)) * crossSpan

  const pos = new Map<string, { cx: number; cy: number; shape: NodeShape }>()
  const sceneNodes: NetworkSceneNode[] = []
  const nodeGlyphs: ReactNode[] = []

  for (const [layer, list] of byLayer) {
    list.forEach((node, i) => {
      const depth = depthAt(layer)
      const cross = crossAt(i, list.length)
      const cx = horizontal ? depth : cross
      const cy = horizontal ? cross : depth
      const shape = String(read(node, shapeAcc, "rect")) as NodeShape
      const label = String(read(node, labelAcc, node.id))
      pos.set(node.id, { cx, cy, shape })

      // Transparent hit-rect for hover/selection (visuals live in the overlay).
      // The datum is tooltip-shaped: a name + a human-readable type, so the
      // smart default tooltip shows "Valid?" / "type: decision" rather than the
      // node id alone. `shape` is kept for custom tooltips that want the glyph.
      sceneNodes.push({
        type: "rect",
        x: cx - w / 2,
        y: cy - h / 2,
        w,
        h,
        style: { fill: "transparent", stroke: "transparent" },
        datum: { id: node.id, name: label, type: SHAPE_KIND[shape] ?? "process", shape },
        id: node.id,
        label,
      })

      nodeGlyphs.push(
        <g key={`n-${node.id}`}>
          {shapeGlyph(shape, cx, cy, w, h, nodeFill, shape === "diamond" ? accent : nodeStroke, 1.5)}
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={13}
            fill={textColor}
            style={{ pointerEvents: "none" }}
          >
            {truncate(label, Math.max(4, Math.floor((w - 12) / 7)))}
          </text>
        </g>,
      )
    })
  }

  // ── Edges: directional bezier + arrowhead + edge label ───────────────────
  const edgeGlyphs: ReactNode[] = []
  ctx.edges.forEach((edge, ei) => {
    const sId = typeof edge.source === "string" ? edge.source : edge.source.id
    const tId = typeof edge.target === "string" ? edge.target : edge.target.id
    const s = pos.get(sId)
    const t = pos.get(tId)
    if (!s || !t) return

    // Attach on the depth-facing edges of each glyph.
    const sx = horizontal ? s.cx + w / 2 : s.cx
    const sy = horizontal ? s.cy : s.cy + h / 2
    const tx = horizontal ? t.cx - w / 2 : t.cx
    const ty = horizontal ? t.cy : t.cy - h / 2

    const pathD = horizontal
      ? `M${sx},${sy} C${(sx + tx) / 2},${sy} ${(sx + tx) / 2},${ty} ${tx},${ty}`
      : `M${sx},${sy} C${sx},${(sy + ty) / 2} ${tx},${(sy + ty) / 2} ${tx},${ty}`

    // Arrowhead oriented along the source→target direction.
    const ang = Math.atan2(ty - sy, tx - sx)
    const aLen = 9
    const aW = 4.5
    const bx = tx - aLen * Math.cos(ang)
    const by = ty - aLen * Math.sin(ang)
    const nx = -Math.sin(ang) * aW
    const ny = Math.cos(ang) * aW
    const head = `${tx},${ty} ${bx + nx},${by + ny} ${bx - nx},${by - ny}`

    const elabel = read(edge, edgeLabelAcc, undefined)
    const mx = (sx + tx) / 2
    const my = (sy + ty) / 2

    edgeGlyphs.push(
      <g key={`e-${ei}`}>
        <path d={pathD} fill="none" stroke={edgeColor} strokeWidth={1.4} />
        <polygon points={head} fill={edgeColor} />
        {typeof elabel === "string" && elabel.length > 0 && (
          <g>
            <rect
              x={mx - (elabel.length * 6.5) / 2 - 4}
              y={my - 9}
              width={elabel.length * 6.5 + 8}
              height={18}
              rx={3}
              fill="var(--semiotic-bg, #11151c)"
              stroke={nodeStroke}
              strokeWidth={0.75}
            />
            <text x={mx} y={my} textAnchor="middle" dominantBaseline="central" fontSize={11} fill={textColor} style={{ pointerEvents: "none" }}>
              {elabel}
            </text>
          </g>
        )}
      </g>,
    )
  })

  const overlays: ReactNode = (
    <g className="mermaid-dag">
      {edgeGlyphs}
      {nodeGlyphs}
    </g>
  )

  return { sceneNodes, overlays }
}
