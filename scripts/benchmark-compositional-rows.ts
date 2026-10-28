// Run with: node --import tsx scripts/benchmark-compositional-rows.ts
import { cpus, arch, platform } from "node:os"
import { rowTopologyFixture } from "../benchmarks/compositional"
import { routeCompositionalGraph } from "../src/components/recipes/compositional/solve"
import { traceCompositionalGraph } from "../src/components/recipes/compositional/trace"

const results = []
for (const [owners, rows, mode, chains] of [
  [1000, 3, "route-only", false],
  [300, 8, "optimize", false],
  [50, 4, "route-only", false],
  [50, 4, "route-only", true]
] as const) {
  const input = rowTopologyFixture(
    owners,
    rows,
    chains,
    owners === 50 ? { layers: 10, fanOut: 1 } : {}
  )
  const request = { ...input, options: { ...input.options, mode } }
  const samples: number[] = []
  for (let i = 0; i < 8; i++) {
    const start = performance.now()
    const result = routeCompositionalGraph(request)
    const elapsed = performance.now() - start
    if (result.status !== "complete")
      throw new Error(JSON.stringify(result.diagnostics))
    if (i >= 3) samples.push(elapsed)
  }
  samples.sort((a, b) => a - b)
  const trace = traceCompositionalGraph(request.prepared, {
    start: {
      nodeId: `owner-${owners - 1}`,
      endpoint: { kind: "part", partId: `row-${rows - 1}`, portId: "out" }
    },
    direction: "upstream",
    maxVisited: owners * rows * 4,
    maxDepth: owners * rows * 4
  })
  if (trace.completeness !== "complete")
    throw new Error(`Incomplete trace for ${owners} owners`)
  results.push({
    owners,
    rows,
    edges: request.prepared.graph.edges.length,
    mode,
    routing: "terminals",
    chains,
    tracedEdges: trace.edgeIds.length,
    tracedTransfers: trace.transferIds.length,
    p50: samples[2],
    p95: samples[4]
  })
}
console.log(
  JSON.stringify(
    {
      cpu: cpus()[0].model,
      platform: platform(),
      arch: arch(),
      node: process.version,
      warmups: 3,
      samples: 5,
      results
    },
    null,
    2
  )
)
