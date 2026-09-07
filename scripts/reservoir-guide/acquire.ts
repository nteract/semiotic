import { execFile } from "node:child_process"
import { parseArgs, promisify } from "node:util"
import { link, mkdir, mkdtemp, readFile, rename, rm, unlink, writeFile } from "node:fs/promises"
import { resolve, join } from "node:path"
import { createHash } from "node:crypto"

interface SourceFile {
  file: string
  url: string
  retrievedAt: string
  bytes: number
  sha256: string
}

const execute = promisify(execFile)
async function main() {
  const { positionals, values } = parseArgs({
    options: { resume: { type: "boolean" } },
    allowPositionals: true,
    strict: true
  })
  const [directory] = positionals
  if (positionals.length !== 1 || !directory)
    throw new Error(
      "Usage: node --import tsx scripts/reservoir-guide/acquire.ts [--resume] <raw-directory>"
    )
  const output = resolve(directory)
  await mkdir(output, { recursive: true })
  const stations = ["SHA", "ORO", "FOL", "NML", "DNP", "CLE"]
  const jobs = stations
    .flatMap((station) => [
      {
        file: `${station}.csv`,
        url: `https://cdec.water.ca.gov/dynamicapp/req/CSVDataServlet?Stations=${station}&SensorNums=15&dur_code=D&Start=1990-10-01&End=2025-09-30`
      },
      {
        file: `${station}-metadata.html`,
        url: `https://cdec.water.ca.gov/dynamicapp/staMeta?station_id=${station}`
      }
    ])
    .concat([
      {
        file: "daily-reservoir-summary.html",
        url: "https://cdec.water.ca.gov/reportapp/javareports?name=RES"
      },
      {
        file: "reference-capacities-2025.html",
        url: "https://cdec.water.ca.gov/reportapp/javareports?name=RES.20250731"
      },
      {
        file: "data-flags.html",
        url: "https://cdec.water.ca.gov/reportapp/javareports?name=FlagList"
      },
      {
        file: "oroville-daily-july-2025.html",
        url: "https://cdec.water.ca.gov/dynamicapp/QueryDaily?s=ORO&end=2025-07-30"
      },
      {
        file: "reservoir-information.html",
        url: "https://cdec.water.ca.gov/misc/resinfo.html"
      },
      {
        file: "webservice-guide.html",
        url: "https://cdec.water.ca.gov/dynamicapp/wsSensorData"
      },
      {
        file: "water-watch-guide.html",
        url: "https://cww.water.ca.gov/about-the-data"
      },
      {
        file: "conditions-of-use.html",
        url: "https://water.ca.gov/Conditions-of-Use"
      }
    ])
  let sources: SourceFile[] = []
  if (values.resume) {
    try {
      sources = JSON.parse(await readFile(join(output, "retrieval.json"), "utf8")).sources
    } catch (error) {
      // A failed first download has no completed sources or manifest yet.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    }
  }
  for (const job of jobs) {
    const path = join(output, job.file)
    const existing = sources.find((source) => source.file === job.file)
    if (existing) {
      const bytes = await readFile(path)
      if (createHash("sha256").update(bytes).digest("hex") !== existing.sha256)
        throw new Error(`Pinned raw source changed: ${job.file}`)
      continue
    }
    try {
      await readFile(path)
      throw new Error(`Refusing to replace existing raw source: ${job.file}`)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    }
    const staging = await mkdtemp(join(output, ".acquire-"))
    try {
      const downloaded = join(staging, job.file)
      await execute("curl", [
        "-fLsS",
        "--connect-timeout",
        "15",
        "--max-time",
        "90",
        "--retry",
        "1",
        "-o",
        downloaded,
        job.url
      ])
      const retrievedAt = new Date().toISOString()
      const bytes = await readFile(downloaded)
      const source = {
        ...job,
        retrievedAt,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex")
      }
      const manifest = join(staging, "retrieval.json")
      await writeFile(manifest, JSON.stringify({ sources: [...sources, source] }, null, 2) + "\n")
      // Publish only complete downloads, without replacing an existing source.
      await link(downloaded, path)
      try {
        await rename(manifest, join(output, "retrieval.json"))
      } catch (error) {
        await unlink(path)
        throw error
      }
      sources.push(source)
      console.log(`${job.file}: ${bytes.length} bytes, retrieved ${retrievedAt}`)
    } finally {
      await rm(staging, { recursive: true, force: true })
    }
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
