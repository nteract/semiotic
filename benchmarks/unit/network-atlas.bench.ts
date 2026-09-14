import { bench, describe } from "vitest"
import { prepareNetworkAtlas } from "../../src/components/recipes/atlas/prepare"
import { matchMotifs } from "../../src/components/recipes/atlas/motifs"
import { atlasWorkload } from "../setup/network-atlas-workloads"
import { atlasMotifWorkloads } from "../setup/network-atlas-motif-workloads"

const options = { time: 0, iterations: 3, warmupTime: 0, warmupIterations: 1 }

describe("Network Atlas preparation", () => {
  for (const size of [1000, 10000] as const) {
    const { spec, source } = atlasWorkload({ size, witnessLimit: 5 })
    bench(
      `prepare-${size}-vertices-${size * 5}-edges-20-bands`,
      () => {
        prepareNetworkAtlas(spec, source)
      },
      options
    )
    bench(
      `match-${size}-vertices-${size * 2}-fan-matches`,
      () => {
        matchMotifs(spec, source)
      },
      options
    )
  }
  for (const { name, spec, source } of atlasMotifWorkloads()) {
    bench(
      `match-${name}`,
      () => {
        matchMotifs(spec, source)
      },
      options
    )
  }
})
