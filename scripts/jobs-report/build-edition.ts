import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { build } from "esbuild"
import { renderChartWithEvidence } from "semiotic/server"
import { ingest } from "./ingest"
import { archive } from "./archive"
import { bundle, json, writeEdition } from "./bundle"
import {
  firstEdition,
  laterEdition,
  canonicalRows,
  prepareMonth
} from "../../docs/src/pages/examples/jobs-report/model"
import { compareBriefings } from "../../docs/src/pages/examples/jobs-report/packet"
import {
  lineProps,
  pairedProps
} from "../../docs/src/pages/examples/jobs-report/chart-config"

async function main() {
  const source = process.argv[2]
  if (!source || process.argv.length !== 3)
    throw new Error(
      "Usage: node --import tsx scripts/jobs-report/build-edition.ts <raw-directory>"
    )
  const snapshot = ingest(resolve(source))
  const root = resolve("docs/public/stories/jobs-report", snapshot.id)
  // Raw files are retained byte-for-byte; generated records are separate.
  writeEdition(
    join(root, "raw"),
    Object.fromEntries(
      readdirSync(source)
        .filter((name) => name !== "outputs.json")
        .map((name) => [name, readFileSync(join(source, name))])
    )
  )
  const a = await bundle(snapshot, "2025-06", firstEdition)
  const b = await bundle(snapshot, "2025-06", laterEdition)
  writeEdition(join(root, "edition-a"), a.files)
  writeEdition(join(root, "edition-b"), b.files)
  const report = compareBriefings(a.briefing, b.briefing)
  const portable = await build({
    entryPoints: [resolve("scripts/jobs-report/cli.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    external: ["semiotic/artifact", "semiotic/xy", "semiotic/server", "sharp"],
    write: false
  })
  const lines = [true, false].map((then) =>
    renderChartWithEvidence(
      "LineChart",
      lineProps(snapshot, laterEdition, then)
    )
  )
  if (lines.some(({ evidence }) => evidence.empty))
    throw new Error("Missing comparison series")
  writeEdition(join(root, "tools"), {
    "cli.mjs": portable.outputFiles[0].text,
    "README.md": readFileSync(resolve("scripts/jobs-report/README.md")),
    "source-checks.json": readFileSync(
      resolve("scripts/jobs-report/source-checks.json")
    ),
    "dictionary.json": json({
      series: "CES0000000001 = PAYEMS; U.S. total nonfarm, seasonally adjusted",
      referenceMonth: "Employment reference period, YYYY-MM",
      releaseDate: "Publication vintage, YYYY-MM-DD",
      value: "Employment level or monthly change, distinguished by measure",
      unit: "thousand jobs; multiply by 1000 for jobs",
      estimateKind:
        "First, third, or other dated vintage; third includes benchmarking when its release does",
      monthlyChange:
        "Current minus preceding reference-month level within ONE dated CSV",
      exclusions:
        "No rows discarded. 2023-12 is the arithmetic baseline; featured 2026 months are outside the reading window.",
      rowCount: canonicalRows(snapshot).length,
      capturedAt: snapshot.capturedAt,
      unavailable:
        "October 2025 first estimate unavailable; no value imputed. Third values after the chosen as-of date are withheld."
    }),
    "change-report.json": json(report),
    "change-report.txt": `Reconstructed January 9 → March 6, 2026 vintages\nReference month: June 2025\nReason: source-update\n${report.changed.map((row) => `${row.key}: ${a.briefing.values.find((old) => old.key === row.key)?.value} → ${row.value} jobs`).join("\n")}\nClaims reassessed: ${report.affectedClaims.join(", ")}\nEarlier editorial review cannot authorize this new edition.\n`,
    "reported-then.svg": lines[0].svg,
    "named-vintage.svg": lines[1].svg,
    "opening-waterfall.phone.svg": renderChartWithEvidence("WaterfallChart", {
      ...b.briefing.props,
      width: 360,
      height: 310,
      margin: { top: 36, left: 62, right: 15, bottom: 56 }
    }).svg,
    "paired-2024.svg": renderChartWithEvidence(
      "DotPlot",
      pairedProps(snapshot, "2024")
    ).svg,
    "paired-2025.svg": renderChartWithEvidence(
      "DotPlot",
      pairedProps(snapshot, "2025")
    ).svg
  })
  writeEdition(join(root, "kit"), { "briefing-kit.tar.gz": archive(root) })
  // Promote the browser's source only after every promised output succeeds.
  writeFileSync(
    resolve("docs/src/pages/examples/jobs-report/snapshot.json"),
    JSON.stringify(snapshot) + "\n"
  )
  writeFileSync(
    resolve("docs/src/pages/examples/jobs-report/bootstrap.json"),
    json({
      id: snapshot.id,
      base: `/stories/jobs-report/${snapshot.id}`,
      capturedAt: snapshot.capturedAt,
      opening: prepareMonth(snapshot, "2025-06"),
      sourceDigest: snapshot.sourceDigest
    })
  )
  console.log(
    `Built ${snapshot.id}: ${canonicalRows(snapshot).length} canonical rows, two preserved editions; publication conditional.`
  )
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
