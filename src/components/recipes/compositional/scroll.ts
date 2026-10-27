import type { Rect, SolvedCompositionalLayout, TerminalGeometry } from "./types"
import { compositionalEndpointKey, fail, freeze } from "./identity"
import { boundRects, finite, validateRect } from "./geometry"
import { compact, routeSection, terminalSection } from "./routing"
import { measureRoutes } from "./metrics"

/** Local vertical row scrolling with disclosed continuation anchors; never changes semantic identity. */
export function projectCompositionalScroll(
  solved: SolvedCompositionalLayout,
  options: {
    nodeId: string
    viewport: Rect
    offsetY: number
    viewRevision: string
  }
): SolvedCompositionalLayout {
  const node = solved.nodes.find((n) => n.id === options.nodeId)
  if (!node || solved.status === "infeasible")
    fail(
      "GEOMETRY_SCROLL_OWNER",
      "Scroll projection requires a feasible visible owner."
    )
  validateRect(options.viewport)
  finite(options.offsetY, "offsetY")
  const viewport = options.viewport
  if (
    viewport.x < 0 ||
    viewport.y < 0 ||
    viewport.x + viewport.width > node.rect.width ||
    viewport.y + viewport.height > node.rect.height
  )
    fail("GEOMETRY_SCROLL_VIEWPORT", "Row viewport must be inside the owner.")
  const top = node.rect.y + viewport.y,
    bottom = top + viewport.height
  const moveTerminal = (terminal: TerminalGeometry): TerminalGeometry => {
    if (
      terminal.displayNodeId !== node.id ||
      terminal.semantic.endpoint.kind !== "part"
    )
      return terminal
    if (
      terminal.normal.y !== 0 ||
      (Math.abs(terminal.anchor.x - node.rect.x) > 1e-7 &&
        Math.abs(terminal.anchor.x - node.rect.x - node.rect.width) > 1e-7)
    )
      fail(
        "CAPABILITY_SCROLL_ANCHOR",
        "This scroll projection requires horizontal boundary row slots."
      )
    const y = terminal.anchor.y - options.offsetY,
      visible = y >= top && y <= bottom
    const displayY = Math.max(top, Math.min(bottom, y))
    return {
      ...terminal,
      anchor: { ...terminal.anchor, y: displayY },
      escape: { ...terminal.escape, y: displayY },
      precision: visible ? terminal.precision : "proxy",
      exposureId: visible
        ? terminal.exposureId
        : JSON.stringify([
            "scroll",
            compositionalEndpointKey(terminal.semantic),
            terminal.end
          ])
    }
  }
  const nodes = solved.nodes.map((n) =>
    n.id !== node.id
      ? n
      : {
          ...n,
          parts: n.parts?.map((p) => {
            const rect = { ...p.rect, y: p.rect.y - options.offsetY }
            return {
              ...p,
              rect,
              clipped:
                rect.y < viewport.y ||
                rect.y + rect.height > viewport.y + viewport.height
            }
          })
        }
  )
  const edges = solved.edges.map((edge) => {
    const source = moveTerminal(edge.source),
      target = moveTerminal(edge.target)
    if (source === edge.source && target === edge.target) return edge
    if (edge.sections.length !== 1)
      fail(
        "CAPABILITY_SCROLL_SECTIONS",
        "The built-in scroll repair requires a single route section."
      )
    const old = edge.sections[0]
    const middle = old.points.slice(1, -1)
    const points = compact([
      source.anchor,
      source.escape,
      ...middle,
      target.escape,
      target.anchor
    ])
    // Repaired terminal legs are orthogonal. Existing commands are regenerated
    // together with hit/export bounds, so no stale smoothed picking geometry remains.
    const direct =
      edge.routing === "none" ||
      edge.routing === "terminals" ||
      edge.routing === "bump"
    // Duplicate lanes keep their offsets from the two escape points.
    const shift = (
      point: typeof source.escape,
      before: TerminalGeometry,
      after: TerminalGeometry
    ) => ({
      x: point.x + after.escape.x - before.escape.x,
      y: point.y + after.escape.y - before.escape.y
    })
    const section = direct
      ? terminalSection(
          old.id,
          source,
          target,
          old.points.length > 4
            ? shift(old.points[2], edge.source, source)
            : source.escape,
          old.points.length > 4
            ? shift(old.points[old.points.length - 3], edge.target, target)
            : target.escape,
          edge.routing === "bump",
          true
        )
      : routeSection(old.id, points, false, [])
    return {
      ...edge,
      source,
      target,
      sections: [section],
      bounds: section.bounds
    }
  })
  const routing = edges.find((e) => e.routing !== "none")?.routing
  const measured = measureRoutes(
    edges,
    true,
    new Set(edges.map((e) => e.edgeId)),
    routing === "none" ? "orthogonal" : routing,
    new Set(edges.filter((e) => e.routing === "none").map((e) => e.edgeId))
  )
  return freeze({
    ...solved,
    viewRevision: options.viewRevision,
    nodes,
    edges,
    bundles: [],
    bounds: boundRects([
      ...nodes.map((n) => n.rect),
      ...edges.map((e) => e.bounds)
    ]),
    metrics: { ...solved.metrics, ...measured.metrics, completedSweeps: 0 },
    status: "degraded",
    diagnostics: [
      ...solved.diagnostics,
      {
        code: "GEOMETRY_SCROLL_PROXIES",
        severity: "info",
        message:
          "Clipped row endpoints use disclosed continuation proxies; terminal routes were locally repaired without a global solve.",
        nodeIds: [node.id]
      }
    ]
  })
}
