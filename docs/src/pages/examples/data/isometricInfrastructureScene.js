import { isometricGlyphs } from "semiotic/network/perspective"
import { GRID, LINKS, PALETTE, ZONES } from "./isometricInfrastructureData"

const GLYPH_SIZE = { server: 46, database: 42, box: 34, cloud: 56 }

export function hostColor(host) {
  if (host.kind === "cloud") return PALETTE.cloud
  if (host.status === "alert") return PALETTE.hostAlert
  if (host.status === "idle") return PALETTE.hostIdle
  return PALETTE.host
}

export function linkColor(link) {
  if (link.status === "alert") return PALETTE.linkAlert
  if (link.protocol === "egress") return PALETTE.linkEgress
  return PALETTE.link
}

/** Grid cell size shared by the layout and the ground grid. */
export function cellSize(width, height) {
  return Math.min(width / (GRID.cols + 1.5), height / (GRID.rows + 1.5))
}

/**
 * The layout owns ground positions only: hosts on grid cells, links as
 * straight segments. `perspective` does the rest — projection, pictogram
 * depth order, zone plates, orthogonal routing and label rotation.
 */
export function infrastructureLayout({ nodes, edges, dimensions, config }) {
  const cell = cellSize(dimensions.width, dimensions.height)
  const ox = (dimensions.width - cell * (GRID.cols - 1)) / 2
  const oy = (dimensions.height - cell * (GRID.rows - 1)) / 2
  const at = new Map()
  const focus = config.hovered
  const touches = (link) =>
    !focus || link.source === focus || link.target === focus ||
    link.source?.id === focus || link.target?.id === focus
  const sceneNodes = nodes.map((node) => {
    const host = node.data ?? node
    const cx = ox + host.col * cell
    const cy = oy + host.row * cell
    at.set(host.id, [cx, cy])
    const dim = focus && focus !== host.id &&
      !LINKS.some((l) => touches(l) && (l.source === host.id || l.target === host.id))
    return {
      type: "glyph",
      cx,
      cy,
      size: GLYPH_SIZE[host.kind] ?? 36,
      glyph: isometricGlyphs[host.kind],
      color: hostColor(host),
      style: { fill: hostColor(host), opacity: dim ? 0.35 : 1 },
      datum: node,
      id: host.id,
      label: host.label
    }
  })
  const sceneEdges = edges.map((edge) => {
    const link = edge.data ?? edge
    const [x1, y1] = at.get(edge.source?.id ?? edge.source)
    const [x2, y2] = at.get(edge.target?.id ?? edge.target)
    return {
      type: "line",
      x1, y1, x2, y2,
      style: {
        stroke: linkColor(link),
        strokeWidth: touches(link) && focus ? 2.5 : 1.6,
        opacity: touches(link) ? 0.95 : 0.2
      },
      datum: edge
    }
  })
  const labels = sceneNodes.map((node) => ({
    x: node.cx,
    y: node.cy + 28,
    text: node.label,
    anchor: "middle",
    fontSize: 11,
    fill: PALETTE.label,
    // A background-colored halo keeps names legible over pale pictograms.
    stroke: PALETTE.background,
    strokeWidth: 3,
    paintOrder: "stroke",
    anchorPoint: [node.cx, node.cy]
  }))
  return { sceneNodes, sceneEdges, labels }
}

/** The diagram's perspective: one config object, rebuilt when a control changes. */
export function infrastructurePerspective({ view = "isometric", cell, route = "orthogonal-rounded", lift = "none", transition = false }) {
  return {
    type: view,
    ...(transition ? { transition: { duration: 700 } } : {}),
    ground: { grid: { step: cell / 2, stroke: PALETTE.ground } },
    regions: ZONES.map((zone) => ({
      ...zone,
      padding: cell * 0.55,
      fill: PALETTE.zone,
      stroke: PALETTE.zoneEdge,
      labelColor: PALETTE.zoneLabel
    })),
    edges: { route },
    labels: { mode: "ground" },
    ...(lift === "cpu" ? { elevation: "cpu" } : {}),
    elevationGuides: { stroke: PALETTE.label, shadow: true }
  }
}
