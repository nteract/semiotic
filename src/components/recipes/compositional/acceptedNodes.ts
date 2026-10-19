import type { LayoutRequest, SolvedCompositionalLayout } from "./types"
import { compositionalEndpointKey, endpoint, fail } from "./identity"
import { validateRect } from "./geometry"
import { projectionOwners } from "./projection"

/** Display IDs belong to the engine; semantic coverage belongs to the request. */
export function validateSolvedNodes(
  request: LayoutRequest,
  solved: SolvedCompositionalLayout
): void {
  const { semantics, views, hidden } = projectionOwners(request)
  const expected = new Set<string>()
  for (const owner of semantics.values()) {
    if (hidden.has(owner.id)) continue
    expected.add(compositionalEndpointKey(endpoint(owner.id)))
    if (views.get(owner.id)?.mode === "exploded")
      for (const part of owner.parts ?? [])
        expected.add(
          compositionalEndpointKey(
            endpoint(owner.id, {
              kind: "part",
              partId: part.id
            })
          )
        )
  }
  for (const node of solved.nodes) {
    const key = compositionalEndpointKey(node.semantic)
    if (!expected.delete(key))
      fail(
        "IDENTITY_SOLVED_NODE",
        "Unknown, hidden or repeated display-node semantics."
      )
    validateRect(node.rect)
    const owner = semantics.get(node.semantic.nodeId)!
    const whole = node.semantic.endpoint.kind === "node"
    const parts = new Set<string>()
    for (const part of node.parts ?? []) {
      if (
        !whole ||
        parts.has(part.partId) ||
        !owner.parts?.some((p) => p.id === part.partId) ||
        compositionalEndpointKey(part.semantic) !==
          compositionalEndpointKey(
            endpoint(owner.id, { kind: "part", partId: part.partId })
          )
      )
        fail(
          "IDENTITY_SOLVED_PART",
          "Solved parts must retain unique owner-local semantic identities."
        )
      parts.add(part.partId)
      validateRect(part.rect)
    }
    if (
      whole &&
      views.get(owner.id)?.mode !== "summary" &&
      (owner.parts ?? []).some((part) => !parts.has(part.id))
    )
      fail("IDENTITY_SOLVED_PART", "A visible owner is missing solved parts.")
  }
  if (expected.size)
    fail(
      "IDENTITY_SOLVED_NODE",
      "A feasible solution must cover the requested visible projection."
    )
}
