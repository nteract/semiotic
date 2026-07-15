import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { getSpecimen } from "./sentenceStructureData"
import SentenceStructureStage, {
  selectWordTreeGraph,
  wordTreePositions,
} from "./SentenceStructureStage"

vi.mock("../../../hooks/useResponsiveWidth", () => ({
  default: () => [800, vi.fn()],
}))

vi.mock("semiotic/network", async () => {
  const ReactModule = await import("react")
  return {
    networkHitTarget: (target) => target,
    NetworkCustomChart: ({ nodes, edges, description }) =>
      ReactModule.createElement("div", {
        "data-testid": "network-custom-chart",
        "data-node-count": nodes.length,
        "data-edge-count": edges.length,
        "data-description": description,
      }),
  }
})

vi.mock("semiotic/xy", async () => {
  const ReactModule = await import("react")
  return {
    hitTargetPoint: (target) => target,
    XYCustomChart: () => ReactModule.createElement("div", { "data-testid": "xy-custom-chart" }),
  }
})

describe("SentenceStructureStage", () => {
  it("renders the authored sentence diagram as a NetworkCustomChart graph", () => {
    const specimen = getSpecimen("attachment-ambiguity")

    render(
      <SentenceStructureStage
        view="reed-kellogg"
        specimen={specimen}
        tokens={specimen.tokens}
        selectedTokenIds={[]}
        interpretationId="default"
        direction="forward"
        alignment="meaning"
        rewrites={{}}
        reducedMotion
        onSelectToken={vi.fn()}
        onSelectInterpretation={vi.fn()}
        onSelectSource={vi.fn()}
      />,
    )

    expect(screen.queryByTestId("xy-custom-chart")).toBeNull()
    expect(screen.getByTestId("network-custom-chart")).toHaveAttribute("data-node-count", "7")
    expect(screen.getByTestId("network-custom-chart")).toHaveAttribute("data-edge-count", "6")
    expect(screen.getByTestId("network-custom-chart")).toHaveAttribute(
      "data-description",
      expect.stringContaining("deterministic corpus-derived Reed–Kellogg"),
    )
  })

  it("selects several deep root branches and keeps split/rejoin edges within budget", () => {
    const nodes = [{ id: "root", depth: 0, count: 20 }]
    const edges = []
    let previousId = "root"
    for (let index = 1; index <= 30; index += 1) {
      const id = `long-${index}`
      nodes.push({ id, depth: index, count: 7 })
      edges.push({ id: `${previousId}->${id}`, source: previousId, target: id })
      previousId = id
    }
    nodes.push(
      { id: "left-1", depth: 1, count: 4 },
      { id: "left-2", depth: 2, count: 4 },
      { id: "right-1", depth: 1, count: 4 },
      { id: "right-2", depth: 2, count: 4 },
      { id: "merge", depth: 3, count: 4 },
      { id: "tail-1", depth: 4, count: 4 },
      { id: "tail-2", depth: 5, count: 4 },
      { id: "other-1", depth: 1, count: 2 },
      { id: "other-2", depth: 2, count: 2 },
    )
    edges.push(
      { id: "root->left-1", source: "root", target: "left-1" },
      { id: "left-1->left-2", source: "left-1", target: "left-2" },
      { id: "root->right-1", source: "root", target: "right-1" },
      { id: "right-1->right-2", source: "right-1", target: "right-2" },
      { id: "left-2->merge", source: "left-2", target: "merge" },
      { id: "right-2->merge", source: "right-2", target: "merge" },
      { id: "merge->tail-1", source: "merge", target: "tail-1" },
      { id: "tail-1->tail-2", source: "tail-1", target: "tail-2" },
      { id: "root->other-1", source: "root", target: "other-1" },
      { id: "other-1->other-2", source: "other-1", target: "other-2" },
    )

    const selected = selectWordTreeGraph({ nodes, edges }, 20)
    const selectedIds = new Set(selected.nodes.map((node) => node.id))
    const selectedEdgeIds = new Set(selected.edges.map((edge) => edge.id))

    expect(selected.nodes).toHaveLength(20)
    expect([...selectedIds]).toEqual(expect.arrayContaining([
      "root",
      "long-1",
      "long-10",
      "left-1",
      "right-1",
      "merge",
      "tail-2",
      "other-1",
    ]))
    expect([...selectedEdgeIds]).toEqual(expect.arrayContaining([
      "left-2->merge",
      "right-2->merge",
      "merge->tail-1",
    ]))
    expect(selectWordTreeGraph({ nodes, edges }, 20)).toEqual(selected)
  })

  it("layers a convergence after both parents and centers it between their routes", () => {
    const nodes = [
      { id: "root", depth: 0 },
      { id: "left", depth: 1 },
      { id: "right", depth: 1 },
      { id: "merge", depth: 2 },
      { id: "tail", depth: 3 },
    ]
    const edges = [
      { source: "root", target: "left" },
      { source: "root", target: "right" },
      { source: "left", target: "merge" },
      { source: "right", target: "merge" },
      { source: "merge", target: "tail" },
    ]

    const positions = wordTreePositions(800, 500, nodes, "forward", edges)
    const left = positions.get("left")
    const right = positions.get("right")
    const merge = positions.get("merge")

    expect(left.x).toBe(right.x)
    expect(merge.x).toBeGreaterThan(left.x)
    expect(merge.y).toBeCloseTo((left.y + right.y) / 2)
    expect(wordTreePositions(800, 500, nodes, "backward", edges).get("merge").x)
      .toBeLessThan(wordTreePositions(800, 500, nodes, "backward", edges).get("left").x)
  })
})
