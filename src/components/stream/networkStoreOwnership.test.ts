import { describe, expect, it } from "vitest"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import { buildNetworkSSRStore } from "./networkSSRStore"
import { createFrameForceWorkerRequest } from "./layouts/forceLayoutWorkerPolicy"
import { createNode } from "./networkPipelineHelpers"
import type { NetworkPipelineConfig } from "./networkTypes"

describe("network store ownership", () => {
  it.each([
    "force",
    "sankey",
    "chord",
    "tree",
    "cluster",
    "treemap",
    "circlepack",
    "partition",
    "orbit"
  ] as const)("builds an empty isolated %s scene", (chartType) => {
    const store = buildNetworkSSRStore(
      { chartType },
      { nodes: [], edges: [] },
      [400, 300]
    )
    expect(store.sceneNodes).toEqual([])
    expect(store.sceneEdges).toEqual([])
    expect(store.labels).toEqual([])
  })

  it("layouts frozen author configuration without writing pipeline state onto it", () => {
    const config = Object.freeze<NetworkPipelineConfig>({
      chartType: "orbit",
      nodeIDAccessor: "name"
    })
    const root = {
      name: "Root",
      children: [
        { name: "A", value: 1 },
        { name: "B", value: 2 }
      ]
    }
    const live = new NetworkPipelineStore(config)
    live.ingestHierarchy(root, [400, 300])
    live.buildScene([400, 300])
    const scene = live.sceneNodes
    const revision = live.layoutVersion
    const isolated = buildNetworkSSRStore(
      config,
      { nodes: [], edges: [], hierarchy: root },
      [600, 400]
    )
    expect(isolated).not.toBe(live)
    expect(live.sceneNodes).toBe(scene)
    expect(live.layoutVersion).toBe(revision)
    expect(Object.keys(config)).toEqual(["chartType", "nodeIDAccessor"])
    expect(isolated.sceneNodes.length).toBeGreaterThan(0)
    live.updateConfig({ orbitSpeed: 0.1 })
    live.buildScene([400, 300])
    expect(live.sceneNodes.length).toBeGreaterThan(0)
  })

  it("distinguishes an authored origin from an uninitialized force node", () => {
    const origin = { ...createNode("origin"), x: 0, y: 0, __hasPosition: true }
    const cold = createNode("cold")
    const previous = new Map([
      ["origin", { x: 100, y: 200 }],
      ["cold", { x: 50, y: 60 }]
    ])
    const request = createFrameForceWorkerRequest(
      [origin, cold],
      [],
      { chartType: "force" },
      [400, 300],
      previous
    )
    expect(request.nodes[0]).toMatchObject({ x: 0, y: 0, __hasPosition: true })
    expect(request.nodes[1]).toMatchObject({
      x: 50,
      y: 60,
      __hasPosition: true
    })
  })
})
