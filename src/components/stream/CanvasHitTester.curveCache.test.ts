import { findAllNodesAtX, findNearestNode } from "./CanvasHitTester"
import type { AreaSceneNode, LineSceneNode } from "./types"

describe("curve sampling cache", () => {
  it("keeps different curves independent when lines share their point array", () => {
    const path: [number, number][] = [
      [0, 0],
      [100, 100]
    ]
    const before: LineSceneNode = {
      type: "line",
      path,
      curve: "stepBefore",
      style: { stroke: "blue" },
      datum: [{ id: "first" }, { id: "last" }]
    }
    const after: LineSceneNode = { ...before, curve: "stepAfter" }

    for (const nodes of [
      [before, after],
      [after, before]
    ]) {
      const hits = findAllNodesAtX(nodes, 25, 100)
      expect(hits.map(({ y }) => y)).toEqual(
        nodes.map((node) => (node === before ? 100 : 0))
      )
      expect(hits[0].datum).toBe(before.datum![0])
    }
  })

  it("resamples when a retained line changes curve type", () => {
    const line: LineSceneNode = {
      type: "line",
      path: [
        [0, 0],
        [100, 100]
      ],
      curve: "stepBefore",
      style: { stroke: "blue" },
      datum: [{ id: "first" }, { id: "last" }]
    }
    for (const [curve, y] of [
      ["stepBefore", 100],
      ["stepAfter", 0],
      ["linear", 25],
      ["stepBefore", 100]
    ] as const) {
      line.curve = curve
      expect(findAllNodesAtX([line], 25, 100)[0].y).toBe(y)
    }
  })

  it("keeps top and bottom area tooltip positions in sync with the curve", () => {
    const area: AreaSceneNode = {
      type: "area",
      topPath: [
        [0, 50],
        [100, 100]
      ],
      bottomPath: [
        [0, 0],
        [100, 20]
      ],
      curve: "stepBefore",
      style: { fill: "blue" },
      datum: [{ id: "first" }, { id: "last" }]
    }
    expect(findAllNodesAtX([area], 25, 100)[0]).toMatchObject({
      y: 100,
      y0: 20
    })
    area.curve = "stepAfter"
    expect(findAllNodesAtX([area], 25, 100)[0]).toMatchObject({ y: 50, y0: 0 })
  })

  it("updates area pointer hits when the curve changes without replacing the path", () => {
    const area: AreaSceneNode = {
      type: "area",
      topPath: [
        [0, 0],
        [100, 100]
      ],
      bottomPath: [
        [0, 120],
        [100, 120]
      ],
      curve: "stepBefore",
      style: { fill: "blue" },
      datum: [{ id: "first" }, { id: "last" }]
    }
    expect(findNearestNode([area], 25, 100, 1)?.node).toBe(area)
    area.curve = "stepAfter"
    expect(findNearestNode([area], 25, 100, 1)).toBeNull()
    expect(findNearestNode([area], 25, 0, 1)?.node).toBe(area)
  })
})
