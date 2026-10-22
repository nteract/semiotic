import type { LayoutRequest, SolvedCompositionalLayout } from "./types"
import { compositionalEndpointKey, endpoint, fail } from "./identity"
import { contains, validateRect } from "./geometry"
import { distance } from "./routing"
import { validateSolvedNodes } from "./acceptedNodes"
import { projectionOwners } from "./projection"

/** Validate portable engine output before it becomes the shared scene authority. */
export function validateCompositionalSolution(
  request: LayoutRequest,
  solved: SolvedCompositionalLayout
): void {
  if (!["complete", "degraded", "infeasible"].includes(solved.status))
    fail("REVISION_STATUS", "Unknown layout status.")
  if (solved.status === "infeasible") return
  const nodes = new Map(solved.nodes.map((n) => [n.id, n]))
  const { hidden } = projectionOwners(request)
  if (nodes.size !== solved.nodes.length)
    fail("IDENTITY_SOLVED_NODE", "Duplicate display node ID.")
  validateSolvedNodes(request, solved)
  validateRect(solved.bounds)
  const edges = new Map(request.prepared.graph.edges.map((e) => [e.id, e])),
    seen = new Set<string>()
  for (const e of solved.edges) {
    const original = edges.get(e.edgeId)
    if (!original || seen.has(e.edgeId))
      fail("IDENTITY_SOLVED_EDGE", "Unknown or repeated solved edge ID.")
    seen.add(e.edgeId)
    if (
      compositionalEndpointKey(e.source.semantic) !==
        compositionalEndpointKey(
          endpoint(original.source, original.sourceEndpoint)
        ) ||
      compositionalEndpointKey(e.target.semantic) !==
        compositionalEndpointKey(
          endpoint(original.target, original.targetEndpoint)
        )
    )
      fail(
        "ENDPOINT_SOLVED_RETARGET",
        "An engine changed the semantic endpoint.",
        { edgeIds: [e.edgeId] }
      )
    validateRect(e.bounds)
    if (
      !nodes.has(e.source.displayNodeId) ||
      !nodes.has(e.target.displayNodeId) ||
      !e.sections.length
    )
      fail(
        "GEOMETRY_SOLVED_ROUTE",
        "A route needs display owners and path sections."
      )
    // Each terminal attaches to the display node of its semantic owner (or of
    // the collapsed container that exposes it), at a point on that node.
    for (const terminal of [e.source, e.target]) {
      const display = nodes.get(terminal.displayNodeId)!
      const owner =
        hidden.get(terminal.semantic.nodeId) ?? terminal.semantic.nodeId
      if (
        display.semantic.nodeId !== owner ||
        !contains(display.rect, terminal.anchor)
      )
        fail(
          "GEOMETRY_TERMINAL_OWNER",
          "A terminal must attach to its own display node.",
          { edgeIds: [e.edgeId] }
        )
    }
    let previous = e.source.anchor
    for (const section of e.sections) {
      validateRect(section.bounds)
      if (
        section.points.length < 2 ||
        distance(previous, section.points[0]) > 1e-7
      )
        fail(
          "GEOMETRY_ROUTE_CONTINUITY",
          "Route skeleton does not meet its terminal or preceding section."
        )
      const commands = section.commands
      if (
        commands?.length &&
        (commands[0].kind !== "M" ||
          distance(previous, commands[0].point) > 1e-7 ||
          distance(
            commands[commands.length - 1].point,
            section.points[section.points.length - 1]
          ) > 1e-7)
      )
        fail(
          "GEOMETRY_ROUTE_COMMANDS",
          "Final commands and skeleton disagree at terminals."
        )
      const points = [
        ...section.points,
        ...(commands ?? []).flatMap((c) =>
          c.kind === "C" ? [c.point, c.control1, c.control2] : [c.point]
        )
      ]
      for (const p of points)
        if (
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y) ||
          !contains(section.bounds, p) ||
          !contains(e.bounds, p) ||
          !contains(solved.bounds, p)
        )
          fail(
            "GEOMETRY_ROUTE_BOUNDS",
            "Route geometry must be finite and within its conservative bounds."
          )
      previous = section.points[section.points.length - 1]
    }
    if (distance(previous, e.target.anchor) > 1e-7)
      fail("GEOMETRY_ROUTE_TERMINAL", "Route misses its target anchor.")
  }
  if (
    seen.size !== edges.size ||
    solved.metrics.routedEdgeCount !== seen.size ||
    solved.metrics.omittedEdgeCount !== 0
  )
    fail(
      "ROUTING_OMITTED_EDGE",
      "A feasible transaction must represent every requested connection."
    )
  if (
    solved.status === "complete" &&
    solved.metrics.hardConstraintViolations !== 0
  )
    fail(
      "CONSTRAINT_SOLVED",
      "A complete result cannot contain hard constraint violations."
    )
  for (const bundle of solved.bundles) {
    if (
      new Set(bundle.memberEdgeIds).size !== bundle.memberEdgeIds.length ||
      bundle.count !== bundle.memberEdgeIds.length ||
      bundle.memberEdgeIds.some((id) => !edges.has(id))
    )
      fail(
        "IDENTITY_BUNDLE",
        "Bundle counts and memberships must match materialized edges."
      )
  }
}
