import type { NetworkAtlasSource, NetworkAtlasSpec } from "semiotic/atlas/core"
import { atlasWorkload } from "./network-atlas-workloads"

/** Output-sensitive probes. Each runs the public catalog, so the report must
 * retain every emitted template (a fan-in also emits leaf-to-hub chains).
 */
export function atlasMotifWorkloads() {
  const { spec: baseSpec } = atlasWorkload({ size: 1000, witnessLimit: 5 })
  const cases: {
    name: string
    spec: NetworkAtlasSpec
    source: NetworkAtlasSource
  }[] = []
  for (const template of [
    "serial-chain",
    "fan-out",
    "fan-in",
    "repeated-state-episode"
  ] as const) {
    const sizes = template.startsWith("fan") ? [10000] : [1000, 10000]
    for (const size of sizes) {
      const count = template === "repeated-state-episode" ? 2 : size
      const nodes = Array.from({ length: count }, (_, i) => ({
        id: `n${i}`,
        sectionId: `Band ${(i % 20) + 1}`
      }))
      const edges =
        template === "repeated-state-episode"
          ? [
              { id: "ab", source: "n0", target: "n1" },
              { id: "ba", source: "n1", target: "n0" }
            ]
          : nodes.slice(1).map((node, i) => ({
              id: `e${i}`,
              source:
                template === "fan-in"
                  ? node.id
                  : template === "fan-out"
                    ? "n0"
                    : nodes[i].id,
              target: template === "fan-in" ? "n0" : node.id
            }))
      for (const witnessLimit of template.startsWith("fan")
        ? [32, size]
        : [size]) {
        const name = `${template}-${size}-${witnessLimit < size ? "bounded" : "full"}`
        const roots =
          template === "fan-in" ? nodes.slice(1).map((node) => node.id) : ["n0"]
        cases.push({
          name,
          spec: {
            ...baseSpec,
            dataRevision: name,
            motifs: { ...baseSpec.motifs, matchBudget: witnessLimit },
            forest: {
              display: { ...baseSpec.forest.display, roots },
              requiredPaths: { roots, relationScopeId: "directed-admitted" }
            }
          },
          source: {
            graphRef: "synthetic-atlas-motif-probes-v1",
            revision: name,
            nodes,
            edges,
            measureValues: [],
            ...(template === "repeated-state-episode" && {
              occurrences: Array.from({ length: size }, (_, i) => ({
                id: `episode-${i}`,
                entityId: `entity-${i}`,
                nodePath: ["n0", "n1", "n0"],
                complete: true
              }))
            })
          }
        })
      }
    }
  }
  return cases
}
