// Capture dated BLS estimates distributed by the St. Louis Fed's ALFRED.
// The CES XLSX/ZIP endpoints refused access in this environment. Never substitute
// the ordinary FRED export: it ignores vintage_date and returns today's series.
import calendar from "./calendar.json" with { type: "json" }
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { resolve } from "node:path"

const directory = process.argv[2]
if (!directory || process.argv.length !== 3)
  throw new Error(
    "Usage: node scripts/jobs-report/acquire.mjs <new-raw-directory>"
  )
const root = resolve(directory)
if (existsSync(root))
  throw new Error("Use a new directory; source captures are immutable.")
mkdirSync(root, { recursive: true })

// Reference month and publication day are separate facts. BLS's archive index
// identifies each linked release; October 2025 has no first-release document.
const releases = calendar

const manifest = {
  schemaVersion: 1,
  seriesId: "CES0000000001",
  distributorSeriesId: "PAYEMS",
  unit: "thousand jobs",
  seasonalAdjustment: "seasonally adjusted",
  geography: "United States",
  publisher: "U.S. Bureau of Labor Statistics",
  distributor: "ALFRED, Federal Reserve Bank of St. Louis",
  source: "https://alfred.stlouisfed.org/series?seid=PAYEMS",
  sourceTerms:
    "BLS public-domain data; cite BLS and ALFRED. No endorsement implied.",
  termsURL: "https://www.bls.gov/bls/linksite.htm",
  calendarSource: "https://www.bls.gov/bls/news-release/empsit.htm",
  requestedReferenceMonths: ["2024-01", "2025-12"],
  baselineReferenceMonth: "2023-12",
  captureStartedAt: new Date().toISOString(),
  unavailableFirstReleases: [
    {
      referenceMonth: "2025-10",
      reason:
        "BLS did not publish an October 2025 Employment Situation release during the lapse in appropriations. The December 16 estimate is second preliminary, not a first estimate."
    }
  ],
  notes: [
    "Raw bytes are ALFRED's dated CSV distribution of BLS CES levels, not the CES vintage workbook.",
    "BLS XLSX and ZIP access returned HTTP 403 during this capture; workbook-cell verification remains a separate admission check.",
    "First and third labels follow the BLS reference-period release sequence, including the 2025 shutdown gap. They are not assigned by counting downloaded files.",
    "February 7, 2025 and February 11, 2026 incorporate annual benchmark/seasonal updates. Revisions spanning those releases cannot be attributed solely to late survey responses."
  ],
  files: []
}
for (const [referenceMonth, releaseDate] of releases) {
  const file = `PAYEMS-${releaseDate}.csv`
  const path = resolve(root, file)
  const temporary = `${path}.partial`
  const url = `https://alfred.stlouisfed.org/graph/alfredgraph.csv?id=PAYEMS&cosd=2023-12-01&coed=2025-12-01&vintage_date=${releaseDate}`
  try {
    execFileSync("curl", [
      "-fsSL",
      "--max-time",
      "45",
      "--retry",
      "1",
      "-o",
      temporary,
      url
    ])
    const bytes = readFileSync(temporary)
    if (
      !bytes
        .toString("utf8")
        .startsWith(
          `observation_date,PAYEMS_${releaseDate.replaceAll("-", "")}`
        )
    )
      throw new Error(
        `Source did not confirm the requested vintage ${releaseDate}`
      )
    renameSync(temporary, path)
    const day =
      releaseDate.slice(5, 7) + releaseDate.slice(8) + releaseDate.slice(0, 4)
    manifest.files.push({
      file,
      url,
      referenceMonth,
      releaseDate,
      releaseURL: `https://www.bls.gov/news.release/archives/empsit_${day}.htm`,
      retrievedAt: new Date().toISOString(),
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex")
    })
    writeFileSync(
      resolve(root, "retrieval.json"),
      JSON.stringify(manifest, null, 2) + "\n"
    )
    console.log(`Captured ${file}`)
  } finally {
    rmSync(temporary, { force: true })
  }
}
console.log(
  `Captured ${manifest.files.length} dated exports. No current-series fallback was used.`
)
