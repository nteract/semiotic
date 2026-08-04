import { describe, expect, it } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * M9 — generated example corpora must stay out of cold library entry graphs.
 * Docs examples may import them; package entry files and src barrels may not.
 */
describe("generated example data hygiene (M9)", () => {
  const here = dirname(fileURLToPath(import.meta.url))
  // docs/src/pages/examples/data → repo root (5 levels up)
  const root = resolve(here, "../../../../../")
  const forbidden = [
    "dhqThunderdome.generated",
    "unitedStatesHistoryRiver.source.generated",
    "united_states_history_river_dataset",
  ]

  const entryFiles = [
    "src/components/semiotic-network.ts",
    "src/components/semiotic-ai.ts",
    "src/components/semiotic-ai-core.ts",
    "src/components/semiotic-recipes.ts",
    "benchmarks/setup/cold-consumer-imports.json",
  ].filter((relative) => existsSync(resolve(root, relative)))

  for (const relative of entryFiles) {
    it(`does not reference generated example modules from ${relative}`, () => {
      const text = readFileSync(resolve(root, relative), "utf8")
      for (const token of forbidden) {
        expect(text.includes(token), `${relative} must not mention ${token}`).toBe(false)
      }
    })
  }

  it("ships regen docs for DHQ and US river sources", () => {
    const dhqReadme = readFileSync(resolve(root, "scripts/dhq/README.md"), "utf8")
    expect(dhqReadme).toMatch(/build-example-data/)
    const dataReadme = readFileSync(
      resolve(root, "docs/src/pages/examples/data/README-generated.md"),
      "utf8",
    )
    expect(dataReadme).toMatch(/unitedStatesHistoryRiver/)
  })
})
