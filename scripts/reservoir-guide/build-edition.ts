import { UNAVAILABLE_HTML } from "../../docs/src/pages/examples/reservoir-guide/offline-document"
import { build } from "esbuild"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { csvFormat } from "d3-dsv"
import { renderChartWithEvidence } from "semiotic/server"
import { ingest, sha256 } from "./ingest"
import { defaultState } from "../../docs/src/pages/examples/reservoir-guide/state"
import { prepareGuide } from "../../docs/src/pages/examples/reservoir-guide/prepare"
import { buildGuidePacket } from "../../docs/src/pages/examples/reservoir-guide/packet"
import {
  distributionChartProps,
  seasonRenderProps
} from "../../docs/src/pages/examples/reservoir-guide/chart-config"
import { renderSavedHTML } from "../../docs/src/pages/examples/reservoir-guide/exports"
import { DICTIONARY } from "../../docs/src/pages/examples/reservoir-guide/dictionary"

async function main() {
  const sourceIndex = process.argv.indexOf("--source")
  if (sourceIndex < 0)
    throw new Error(
      "Usage: node --import tsx scripts/reservoir-guide/build-edition.ts --source <raw directory> [--output <staging directory>]"
    )
  const source = resolve(process.argv[sourceIndex + 1])
  const snapshot = ingest(source)
  const outputIndex = process.argv.indexOf("--output")
  const output =
    outputIndex < 0
      ? resolve("docs/public/stories/reservoir-guide", snapshot.editionId)
      : resolve(process.argv[outputIndex + 1])
  const inventory: { file: string; bytes: number; sha256: string }[] = []
  const json = (value: unknown) => JSON.stringify(value) + "\n"
  async function emit(file: string, value: string | Buffer) {
    const path = join(output, file)
    const bytes = Buffer.from(value)
    await mkdir(resolve(path, ".."), { recursive: true })
    try {
      if (!(await readFile(path)).equals(bytes))
        throw new Error(
          `Immutable edition output differs: ${file}. Use a new output directory or a new edition version.`
        )
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      await writeFile(path, bytes)
    }
    inventory.push({ file, bytes: bytes.length, sha256: sha256(bytes) })
  }
  for (const file of [...snapshot.sources.map((s) => s.file), "retrieval.json"])
    await emit(`raw/${file}`, await readFile(join(source, file)))
  await emit("snapshot.json", json(snapshot))
  await emit("dictionary.json", json(DICTIONARY))
  const adapter = await build({
    entryPoints: [
      resolve("docs/src/pages/examples/reservoir-guide/portable.ts")
    ],
    bundle: true,
    platform: "neutral",
    format: "esm",
    write: false,
    external: ["semiotic/artifact"]
  })
  await emit("adapter.mjs", adapter.outputFiles[0].text)
  await emit("README.md", await readFile("scripts/reservoir-guide/README.md"))
  await emit(
    "consumer.mjs",
    await readFile("scripts/reservoir-guide/consumer.mjs")
  )
  const initial = defaultState(snapshot)
  const cases = [
    { name: "default", state: initial },
    { name: "changed-measurement", state: { ...initial, stationId: "ORO" } },
    {
      name: "missing-storage",
      state: {
        ...initial,
        stationId: "DNP",
        waterYear: 1993,
        comparisonYear: 2025
      }
    },
    {
      name: "leap-day",
      state: {
        ...initial,
        waterYear: 2024,
        comparisonYear: 2025,
        monthDay: "02-29"
      }
    }
  ]
  const evidence = []
  for (const item of cases) {
    const packet = buildGuidePacket(snapshot, item.state)
    const chart = renderChartWithEvidence("LineChart", {
      ...seasonRenderProps(packet.guide),
      _idPrefix: "saved-season"
    })
    const distribution = packet.guide.baseline.count
      ? renderChartWithEvidence("SwarmPlot", {
          ...distributionChartProps(packet.guide),
          _idPrefix: "saved-distribution"
        })
      : null
    await emit(`${item.name}.json`, json(packet))
    await emit(
      `${item.name}.html`,
      renderSavedHTML(snapshot, packet.guide, chart.svg, distribution?.svg)
    )
    await emit(
      `${item.name}-season.csv`,
      csvFormat(
        packet.guide.season.map((p) => ({
          monthDay: p.monthDay,
          selectedDate: p.active?.observationDate ?? null,
          selectedAF: p.active?.storageAcreFeet ?? null,
          selectedStatus: p.active?.status ?? "no-calendar-date",
          comparisonDate: p.comparison?.observationDate ?? null,
          comparisonAF: p.comparison?.storageAcreFeet ?? null,
          comparisonStatus: p.comparison?.status ?? "no-calendar-date",
          baselineMeanAF: p.baselineMean,
          baselineCount: p.baselineCount
        }))
      )
    )
    evidence.push({
      case: item.name,
      checks: packet.checks,
      temporalAudit: packet.temporalAudit,
      renderer: chart.evidence,
      distribution: distribution?.evidence ?? null
    })
  }
  await emit("evidence.json", json(evidence))
  await emit(
    "manifest.json",
    json({
      version: 1,
      editionId: snapshot.editionId,
      fingerprint: snapshot.fingerprint,
      retrievedAt: snapshot.retrievedAt,
      transformVersion: snapshot.transformVersion,
      sourceTerms:
        "California DWR Conditions of Use, preserved in raw/conditions-of-use.html. Data is provided without warranty and can be revised. Agency links do not imply endorsement.",
      counts: snapshot.counts,
      dictionary: DICTIONARY,
      sources: snapshot.sources,
      inventory,
      reproduction: `node --import tsx scripts/reservoir-guide/build-edition.ts --source docs/public/stories/reservoir-guide/${snapshot.editionId}/raw --output <empty-directory>`,
      review:
        "Independent editorial review, five-reader acceptance, manual assistive technology and real Android measurements pending."
    })
  )
  if (outputIndex < 0 || process.argv.includes("--bootstrap")) {
    const { series: _series, sourceLineOverrides: _lines, ...header } = snapshot
    const guide = prepareGuide(snapshot, initial)
    const snapshotURL = `/stories/reservoir-guide/${snapshot.editionId}/snapshot.json`
    await writeFile(
      "docs/src/pages/examples/reservoir-guide/bootstrap.json",
      json({ header, guide: { ...guide, season: [] }, snapshotURL })
    )
    const root = resolve("docs/public/stories/reservoir-guide")
    await mkdir(join(root, snapshot.editionId), { recursive: true })
    const snapshotPath = join(root, snapshot.editionId, "snapshot.json")
    try {
      if ((await readFile(snapshotPath, "utf8")) !== json(snapshot))
        throw new Error("Pinned snapshot differs; create a new edition")
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      await writeFile(snapshotPath, json(snapshot))
    }
    await mkdir(join(root, "offline"), { recursive: true })
    await writeFile(
      join(root, "current.json"),
      json({
        editionId: snapshot.editionId,
        fingerprint: snapshot.fingerprint,
        snapshotURL
      })
    )
    const worker = await build({
      entryPoints: [
        resolve("docs/src/pages/examples/reservoir-guide/offline-worker.ts")
      ],
      bundle: true,
      platform: "browser",
      format: "iife",
      write: false
    })
    await writeFile(join(root, "offline/worker.js"), worker.outputFiles[0].text)
    await writeFile(join(root, "offline/index.html"), UNAVAILABLE_HTML)
  }
  console.log(
    json({
      editionId: snapshot.editionId,
      output,
      snapshotBytes: inventory.find((f) => f.file === "snapshot.json")?.bytes,
      files: inventory.length
    })
  )
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
