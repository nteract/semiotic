import { wrapWithDataHint } from "../devDataAccessWarning"
import { resolveNodeRefId } from "../accessorUtils"
import type { NetworkCircleNode, NetworkLabel, NetworkPipelineConfig, NetworkSceneEdge, RealtimeEdge, RealtimeNode } from "../networkTypes"
import type { Style } from "../types"

type LinkNode = NetworkCircleNode & { id: string; datum: RealtimeNode }

export function indexLinkNodes<T extends { id: string }>(nodes: T[]) {
  return new Map(nodes.map(node => [node.id, node]))
}

export function buildLinkNodes(
  nodes: RealtimeNode[],
  config: NetworkPipelineConfig,
  radius: (node: RealtimeNode) => number,
  defaults: (node: RealtimeNode, index: number) => Style,
) {
  const circles: LinkNode[] = []
  for (const [index, node] of nodes.entries()) {
    if (node.x == null || node.y == null) continue
    const r = radius(wrapWithDataHint(node, "nodeSize"))
    const fallback = defaults(node, index)
    const user = config.nodeStyle?.(wrapWithDataHint(node, "nodeStyle"))
    circles.push({
      type: "circle", cx: node.x, cy: node.y, r,
      id: node.id, label: node.id, accessibleDatum: node.data, datum: node,
      depth: node.depth,
      style: {
        fill: user?.fill || fallback.fill,
        stroke: user?.stroke || config.themeSemantic?.surface || "#fff",
        strokeWidth: user?.strokeWidth ?? fallback.strokeWidth,
        opacity: user?.opacity ?? fallback.opacity,
        cursor: user?.cursor,
      },
    })
  }
  return circles
}

export function buildLinkLabels(circles: LinkNode[], placement: "above" | "below", getText: (node: RealtimeNode) => unknown) {
  const labels: NetworkLabel[] = []
  const above = placement === "above"
  for (const { cx, cy, r, datum } of circles) {
    if (!above && r <= 4) continue
    const text = getText(datum)
    if (above && !text) continue
    labels.push({
      x: cx, y: above ? cy - r - 4 : cy + r + 12,
      text: String(text), anchorPoint: [cx, cy], anchor: "middle",
      ...(above ? { baseline: "auto", fontSize: 11 } : { fill: "currentColor", fontSize: 10 }),
    })
  }
  return labels
}

function pairKey(source: string, target: string) {
  const [first, second] = source < target ? [source, target] : [target, source]
  return `${first.length}:${first}${second}`
}

/** Preserve input paint order and give links between the same endpoints separate lanes. */
export function buildNetworkLinks(
  circles: LinkNode[],
  edges: RealtimeEdge[],
  height: number,
  edgeStyle: NetworkPipelineConfig["edgeStyle"],
  stroke: string,
  strokeWidth = 1,
  opacity = 0.6,
): NetworkSceneEdge[] {
  const nodes = indexLinkNodes(circles)
  const pairs = new Map<string, { count: number; next: number }>()
  for (const edge of edges) {
    const key = pairKey(resolveNodeRefId(edge.source), resolveNodeRefId(edge.target))
    const pair = pairs.get(key)
    if (pair) pair.count++
    else pairs.set(key, { count: 1, next: 0 })
  }

  const links: NetworkSceneEdge[] = []
  for (const edge of edges) {
    const source = resolveNodeRefId(edge.source)
    const target = resolveNodeRefId(edge.target)
    const a = nodes.get(source)
    const b = nodes.get(target)
    if (!a || !b) continue
    const pair = pairs.get(pairKey(source, target))!
    const index = pair.next++
    const userStyle = edgeStyle?.(wrapWithDataHint(edge, "edgeStyle"))
    const style = {
      stroke: userStyle?.stroke || stroke,
      strokeWidth: userStyle?.strokeWidth ?? strokeWidth,
      opacity: userStyle?.opacity ?? opacity,
      cursor: userStyle?.cursor,
    }
    const meta = { datum: edge, accessibleDatum: edge.data, style }
    const dx = b.cx - a.cx
    const dy = b.cy - a.cy
    if (dx === 0 && dy === 0) {
      const reach = Math.max(12, a.r, b.r) + 8 + index * 12
      const y = a.cy + (a.cy < height / 2 ? 1 : -1) * 2 * reach
      links.push({ ...meta, type: "curved", pathD: `M${a.cx},${a.cy} C${a.cx - reach},${y} ${a.cx + reach},${y} ${b.cx},${b.cy}` })
      continue
    }
    const bend = (index - (pair.count - 1) / 2) * 28
    if (bend === 0) {
      links.push({ ...meta, type: "line", x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy })
      continue
    }
    // Orient the normal consistently for A→B and B→A.
    const scale = bend * (source < target ? 1 : -1) / Math.hypot(dx, dy)
    const cx = (a.cx + b.cx) / 2 - dy * scale
    const cy = (a.cy + b.cy) / 2 + dx * scale
    links.push({ ...meta, type: "curved", pathD: `M${a.cx},${a.cy} Q${cx},${cy} ${b.cx},${b.cy}` })
  }
  return links
}
