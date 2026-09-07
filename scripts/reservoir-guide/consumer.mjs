import { readFile, mkdir, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import { resolve, join } from "node:path"
import { pathToFileURL } from "node:url"
import { renderChartWithEvidence } from "semiotic/server"

const [directory, outputDirectory] = process.argv
  .slice(2)
  .map((p) => resolve(p))
if (!directory || !outputDirectory)
  throw new Error("Usage: node consumer.mjs <edition> <output>")
const adapter = await import(pathToFileURL(join(directory, "adapter.mjs")).href)
const snapshot = adapter.verifySnapshot(
  JSON.parse(await readFile(join(directory, "snapshot.json"), "utf8"))
)
for (const source of snapshot.sources) {
  const bytes = await readFile(join(directory, "raw", source.file))
  if (
    bytes.length !== source.bytes ||
    createHash("sha256").update(bytes).digest("hex") !== source.sha256
  )
    throw new Error(`Source differs: ${source.file}`)
}
await mkdir(outputDirectory, { recursive: true })
const results = []
for (const name of [
  "default",
  "changed-measurement",
  "missing-storage",
  "leap-day"
]) {
  const packet = JSON.parse(
    await readFile(join(directory, `${name}.json`), "utf8")
  )
  const imported = adapter.importGuidePacket(packet, snapshot)
  if (imported.issue) throw new Error(imported.issue)
  const chart = renderChartWithEvidence("LineChart", {
    ...adapter.seasonRenderProps(imported.guide),
    _idPrefix: "saved-season"
  })
  if (packet.checks.some((check) => check.status === "fail"))
    throw new Error(`Failed numerical binding: ${name}`)
  const distribution = imported.guide.baseline.count
    ? renderChartWithEvidence("SwarmPlot", {
        ...adapter.distributionChartProps(imported.guide),
        _idPrefix: "saved-distribution"
      })
    : null
  await writeFile(
    join(outputDirectory, `${name}.html`),
    adapter.renderSavedHTML(
      snapshot,
      imported.guide,
      chart.svg,
      distribution?.svg
    )
  )
  results.push({
    name,
    state: imported.state,
    checks: packet.checks,
    renderer: chart.evidence,
    distribution: distribution?.evidence ?? null
  })
}
await writeFile(
  join(outputDirectory, "verification.json"),
  JSON.stringify(results, null, 2) + "\n"
)
console.log(
  `Verified ${snapshot.editionId}, ${snapshot.sources.length} source checksums, four packets and four independent HTML renders.`
)
