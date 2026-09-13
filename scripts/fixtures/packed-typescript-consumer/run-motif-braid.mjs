import assert from "node:assert/strict"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const spec = {
  schemaVersion: "0.2",
  coordinate: { kind: "ordinal", sectionIds: ["A", "B"] },
  relations: {
    directed: true,
    edgeIdRequired: true,
    parallelEdges: "keep-by-id",
    selfLoops: "keep-by-id"
  },
  evidencePolicyId: "packed-consumer",
  measures: { assigned: { unitKind: "stock", countUnit: "entity" } },
  motifs: {
    catalogId: "phase2",
    catalogVersion: "0.2",
    countUnit: "entity",
    denominatorRef: "assigned",
    anchor: "completion"
  },
  forest: { display: { kind: "observed-prefix" } },
  dataRevision: "packed-consumer",
  temporal: { kind: "snapshot" }
}
const source = {
  graphRef: "packed-consumer",
  revision: "1",
  nodes: [
    { id: "A", sectionId: "A" },
    { id: "B", sectionId: "B" }
  ],
  edges: [
    { id: "ab", source: "A", target: "B" },
    { id: "ba", source: "B", target: "A" }
  ],
  occurrences: [
    {
      id: "loop",
      entityId: "people",
      entityCount: 7,
      nodePath: ["A", "B", "A"],
      stepEntityCounts: [100, 50, 10],
      complete: true
    }
  ],
  measureValues: [
    {
      measureId: "assigned",
      subjectId: "population",
      value: 50,
      status: "exact"
    }
  ]
}

for (const [condition, load] of [
  ["import", (entry) => import(entry)],
  ["require", require]
]) {
  const { renderChart } = await load("semiotic/server")
  for (const entry of ["semiotic/recipes", "semiotic/recipes/core"]) {
    const { prepareNetworkAtlasAsync, prepareMotifBraid, motifBraidLayout } =
      await load(entry)
    const prepared = await prepareNetworkAtlasAsync(spec, source)
    assert.equal(prepared.ok, true, JSON.stringify(prepared.issues))
    const braid = await prepareMotifBraid(prepared.atlas)
    assert.equal(braid.profile.cells[0].completionCount, 7)
    assert.equal(braid.profile.cells[0].denominator, 50)
    assert.deepEqual(braid.capsules[0].occurrenceIds, ["loop"])
    assert.deepEqual(braid.groups[0].stepEntityCounts, [100, 50, 10])
    assert.equal(braid.ribbons[1].toEntityCount, 10)
    const svg = renderChart("NetworkCustomChart", {
      nodes: braid.sceneSeeds.nodes,
      edges: braid.sceneSeeds.edges,
      layout: motifBraidLayout,
      layoutConfig: { braid },
      width: 640,
      height: 360
    })
    assert.match(svg, /<path[^>]*d="M/)
    assert.match(svg, /stroke-width/)
    assert.match(svg, /Step 3/)
    assert.match(svg, /<path[^>]*d="M[^"\n]* Z"[^>]*fill="#[^>]+/)
    console.log(
      `Motif Braid ${entry} ${condition}: async analysis, projection and server rendering passed`
    )
  }
}
