import { NetworkPipelineStore } from "../../src/components/stream/NetworkPipelineStore"
import { findNearestNetworkNode } from "../../src/components/stream/NetworkCanvasHitTester"
import {
  prepareNetworkCustomHits,
  preparedNetworkCustomHits
} from "../../src/components/stream/networkFrameCursorInteraction"
import type { NetworkLayoutResult } from "../../src/components/stream/networkCustomLayout"
import type { NetworkRectNode } from "../../src/components/stream/networkTypes"

const scenarios = [
  "fresh scene",
  "unchanged scene",
  "edge restyle",
  "one rectangle",
  "all rectangles",
  "one path",
  "all paths",
  "replacement scene"
] as const

const summarize = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    samples: sorted.length,
    mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
    max: sorted[sorted.length - 1]
  }
}

/** Diagnostic only: scene commit and both indexes, outside pointer budgets. */
export function measureCustomHitPreparation(source: NetworkLayoutResult) {
  const samples = scenarios.map((name) => ({
    name,
    commit: [] as number[],
    preparation: [] as number[],
    queries: {
      node: [] as number[],
      edge: [] as number[],
      miss: [] as number[]
    }
  }))
  const freshScene = (): NetworkLayoutResult => ({
    sceneNodes: source.sceneNodes!.map((node) => ({
      ...node,
      style: { ...node.style }
    })),
    sceneEdges: source.sceneEdges!.map((edge) => ({
      ...edge,
      style: { ...edge.style },
      _cachedPath2D: undefined,
      _cachedPath2DSource: undefined
    }))
  })
  for (let trial = 0; trial < 30; trial++) {
    let scene = freshScene(),
      strokeWidth = 2,
      revision = 0
    const store = new NetworkPipelineStore({
      chartType: "force",
      customNetworkLayout: () => ({
        ...scene,
        restyleEdge: () => ({ strokeWidth })
      })
    })
    for (const sample of samples) {
      const { name } = sample
      if (name === "replacement scene") scene = freshScene()
      if (name === "one rectangle" || name === "all rectangles") {
        const rects = scene.sceneNodes as NetworkRectNode[]
        for (const node of name === "one rectangle" ? rects.slice(0, 1) : rects)
          node.y += 10000
      }
      if (name === "one path" || name === "all paths") {
        const edges = scene.sceneEdges!
        for (const edge of name === "one path" ? edges.slice(0, 1) : edges)
          // Preserve the workload's single cubic shape while changing its
          // endpoint. Arbitrary/multi-subpath fallbacks have separate probes.
          if (edge.type !== "line")
            edge.pathD = edge.pathD.replace(/-?\d+(?:\.\d+)?$/, (y) =>
              String(Number(y) + 1)
            )
      }
      // Measure the scene notification separately; index construction must not
      // disappear into a setup step or be confused with the warm query budget.
      let start = performance.now()
      if (name === "edge restyle") {
        strokeWidth = 40
        store.restyleScene(null)
      } else if (name !== "unchanged scene") {
        store.updateConfig({ layoutConfig: { revision: ++revision } })
        store.buildScene([1400, 900])
      }
      sample.commit.push(performance.now() - start)
      if (name !== "unchanged scene" && preparedNetworkCustomHits(store))
        throw new Error(`Stale prepared scene after ${name}`)
      start = performance.now()
      prepareNetworkCustomHits(store)
      sample.preparation.push(performance.now() - start)
      const prepared = preparedNetworkCustomHits(store)
      if (!prepared?.rectIndex || !prepared.edgeIndex)
        throw new Error(`Missing rectangle/edge index after ${name}`)
      if (
        prepared.rectIndex.nodes !== store.sceneNodes ||
        prepared.edgeIndex.edges !== store.sceneEdges
      )
        throw new Error(
          `Prepared arrays differ from committed scene after ${name}`
        )
      const node = store.sceneNodes[0] as NetworkRectNode
      const probes = [
        {
          name: "node" as const,
          x: node.x + node.w / 2,
          y: node.y + node.h / 2,
          mark: node
        },
        { name: "edge" as const, x: 100, y: -100, mark: store.sceneEdges[0] },
        { name: "miss" as const, x: -100, y: -1000, mark: undefined }
      ]
      for (const probe of probes) {
        start = performance.now()
        const hits = preparedNetworkCustomHits(store)!
        const hit = findNearestNetworkNode(
          store.sceneNodes,
          store.sceneEdges,
          probe.x,
          probe.y,
          12,
          null,
          0,
          true,
          1,
          hits.edgeIndex,
          hits.rectIndex
        )
        sample.queries[probe.name].push(performance.now() - start)
        if (hit?.mark !== probe.mark)
          throw new Error(`Incorrect ${probe.name} hit after ${name}`)
      }
    }
  }
  return {
    nodes: source.sceneNodes!.length,
    edges: source.sceneEdges!.length,
    trials: 30,
    reports: samples.map(({ name, commit, preparation, queries }) => ({
      name,
      sceneCommitMs: summarize(commit),
      preparationMs: summarize(preparation),
      firstQueryMs: {
        node: summarize(queries.node),
        edge: summarize(queries.edge),
        miss: summarize(queries.miss)
      }
    }))
  }
}
