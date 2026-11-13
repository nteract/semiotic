// Transpiled and copied into each temporary consumer. Keep all imports built-in:
// neither the checkout's renderer nor its node_modules may enter this process.
import { readFileSync, realpathSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import type { Fixture, RenderResult, SideResult } from "./types"

async function main() {
  const root = dirname(fileURLToPath(import.meta.url))
  const require = createRequire(import.meta.url)
  const packageRoot = realpathSync(join(root, "node_modules/semiotic"))
  const entryUrl = import.meta.resolve("semiotic/server")
  const entry = fileURLToPath(entryUrl)
  if (relative(packageRoot, realpathSync(entry)).startsWith(".."))
    throw new Error("Renderer resolved outside the installed artifact")
  const renderer = await import(entryUrl)
  const withEvidence = typeof renderer.renderChartWithEvidence === "function"
  if (!withEvidence && typeof renderer.renderChart !== "function")
    throw new Error("Artifact has no renderChart API")
  const fixtures: Fixture[] = JSON.parse(
    readFileSync(join(root, "fixtures.json"), "utf8")
  )
  const results: Record<string, SideResult> = {}
  for (const fixture of fixtures) {
    const renders: RenderResult[] = []
    try {
      for (let repetition = 0; repetition < 2; repetition++) {
        const props = structuredClone(fixture.props)
        const result = withEvidence
          ? await renderer.renderChartWithEvidence(fixture.component, props)
          : {
              svg: await renderer.renderChart(fixture.component, props),
              evidence: null
            }
        if (
          typeof result?.svg !== "string" ||
          (withEvidence &&
            (!result.evidence || typeof result.evidence !== "object"))
        )
          throw new Error("Renderer returned no SVG/evidence payload")
        renders.push({ svg: result.svg, evidence: result.evidence })
      }
      results[fixture.id] = { status: "rendered", renders }
    } catch (error) {
      results[fixture.id] = { status: "error", error: String(error), renders }
    }
  }
  writeFileSync(
    join(root, "results.json"),
    JSON.stringify(
      {
        runtime: {
          node: process.version,
          react: require("react/package.json").version,
          reactDom: require("react-dom/package.json").version,
          platform: process.platform,
          arch: process.arch
        },
        entry,
        packageRoot,
        evidenceAvailable: withEvidence,
        results
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
