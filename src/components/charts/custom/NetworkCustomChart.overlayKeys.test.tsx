import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"
import * as React from "react"
import { NetworkCustomChart } from "./NetworkCustomChart"
import { networkHitTarget } from "../../stream/hitTarget"
import { unwrapDatum } from "../../recipes/recipeUtils"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

// Regression guard for the art-genealogy overlay pattern: a custom network
// layout draws its edges/nodes in `overlays`, keyed by the datum's id. Because
// the frame hands the layout RealtimeEdge *wrappers* (raw fields under `.data`),
// keying by a bare `edge.id` yields `key={undefined}` for every edge — React's
// "each child needs a unique key" warning, and a silently-broken style channel.
// `unwrapDatum(edge)` recovers the raw `{ id, source, target, type }`.

setupCanvasMock()

const NODES = [{ id: "A" }, { id: "B" }, { id: "C" }]
const EDGES = [
  { id: "e0", source: "A", target: "B", kind: "solid" },
  { id: "e1", source: "B", target: "C", kind: "dashed" },
]

function artStyleLayout(ctx: { nodes: unknown[]; edges: unknown[] }) {
  const pos = ctx.nodes.map((n, i) => {
    const d = unwrapDatum<{ id: string }>(n)!
    return { id: d.id, x: 50 + i * 60, y: 50 + i * 40, width: 40, height: 24 }
  })
  const byId = new Map(pos.map((p) => [p.id, p]))
  return {
    sceneNodes: pos.map((p) =>
      networkHitTarget({ x: p.x - p.width / 2, y: p.y - p.height / 2, width: p.width, height: p.height, datum: p, id: p.id }),
    ),
    sceneEdges: [],
    overlays: (
      <g pointerEvents="none">
        {ctx.edges.map((edge) => {
          const e = unwrapDatum<{ id: string; source: string; target: string; kind: string }>(edge)!
          const s = byId.get(e.source)
          const t = byId.get(e.target)
          if (!s || !t) return null
          return <path key={e.id} d={`M${s.x},${s.y}L${t.x},${t.y}`} strokeDasharray={e.kind === "dashed" ? "4 4" : undefined} />
        })}
        {pos.map((p) => (
          <rect key={p.id} x={p.x} y={p.y} width={p.width} height={p.height} />
        ))}
      </g>
    ),
  }
}

describe("NetworkCustomChart — overlay datum keying", () => {
  it("draws a wrapper-edge overlay without a missing-key warning when keyed via unwrapDatum", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    render(
      <NetworkCustomChart nodes={NODES} edges={EDGES} layout={artStyleLayout as never} width={400} height={300} />,
    )
    const keyWarnings = spy.mock.calls.filter((c) => String(c[0]).includes("unique") && String(c[0]).toLowerCase().includes("key"))
    spy.mockRestore()
    expect(keyWarnings).toHaveLength(0)
  })
})
