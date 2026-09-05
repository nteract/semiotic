import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { resolve, join } from "node:path"
import {
  ITEMS,
  TRANSFORM_VERSION
} from "../../docs/src/pages/examples/grocery-receipt/items"
import type {
  GrocerySnapshot,
  PriceRow,
  SourceFile
} from "../../docs/src/pages/examples/grocery-receipt/types"

interface BLSObservation {
  year: string
  period: string
  value: string
  footnotes: { text?: string }[]
}
interface BLSResponse {
  status: string
  message: string[]
  Results: { series: { seriesID: string; data: BLSObservation[] }[] }
}

export async function writeImmutable(path: string, content: string | Buffer) {
  try {
    await writeFile(path, content, { flag: "wx" })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
    const existing = await readFile(path)
    if (!existing.equals(Buffer.from(content)))
      throw new Error(
        `Refusing to rewrite immutable edition file ${path}. Create a new edition.`
      )
  }
}

export async function ingest(sourceDirectory: string) {
  const sources: SourceFile[] = JSON.parse(
    await readFile(join(sourceDirectory, "retrieval.json"), "utf8")
  )
  const raw = new Map<string, Buffer>()
  for (const name of [
    "ap.series",
    "ap.item",
    "prices.json",
    "selected-items.html"
  ]) {
    const source = sources.find((entry) => entry.file === name)
    if (!source || !Number.isFinite(Date.parse(source.retrievedAt)))
      throw new Error(`Missing retrieval record for ${name}`)
    const bytes = await readFile(join(sourceDirectory, name))
    if (
      bytes.length !== source.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== source.sha256
    )
      throw new Error(`Raw checksum mismatch: ${name}`)
    raw.set(name, bytes)
  }
  const dictionary = raw
    .get("ap.series")!
    .toString("utf8")
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split("\t").map((field) => field.trim()))
  const itemDictionary = raw.get("ap.item")!.toString("utf8")
  for (const item of ITEMS) {
    const matches = dictionary.filter((fields) => fields[0] === item.seriesId)
    if (
      matches.length !== 1 ||
      matches[0][1] !== "0000" ||
      matches[0][3] !== item.sourceTitle ||
      !itemDictionary.includes(matches[0][2])
    ) {
      throw new Error(
        `Dictionary admission failed: ${item.seriesId}. Review the changed definition; do not substitute another series.`
      )
    }
  }
  const response: BLSResponse = JSON.parse(
    raw.get("prices.json")!.toString("utf8")
  )
  if (
    response.status !== "REQUEST_SUCCEEDED" ||
    response.message.length ||
    response.Results.series.length !== ITEMS.length
  )
    throw new Error("The BLS response is incomplete or reports an error.")
  const priceSource = sources.find((source) => source.file === "prices.json")!
  const editionId = `e01-bls-${priceSource.retrievedAt.slice(0, 10)}-${priceSource.sha256.slice(0, 8)}`
  const months = Array.from(
    { length: 84 },
    (_, i) =>
      `${2019 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`
  )
  const allMonths = [
    ...Array.from(
      { length: 12 },
      (_, i) => `2018-${String(i + 1).padStart(2, "0")}`
    ),
    ...months
  ]
  const rows: PriceRow[] = []
  const counts: Record<string, unknown>[] = []
  for (const item of ITEMS) {
    const series = response.Results.series.filter(
      (entry) => entry.seriesID === item.seriesId
    )
    if (series.length !== 1)
      throw new Error(`Missing or duplicate series ${item.seriesId}`)
    const monthly = series[0].data.filter((row) =>
      /^M(0[1-9]|1[0-2])$/.test(row.period)
    )
    const observations = new Map<string, BLSObservation>()
    for (const row of monthly) {
      const month = `${row.year}-${row.period.slice(1)}`
      if (!allMonths.includes(month) || observations.has(month))
        throw new Error(
          `Unexpected or duplicate month ${item.seriesId}:${month}`
        )
      observations.set(month, row)
    }
    let observed = 0
    for (const month of allMonths) {
      const source = observations.get(month)
      const numeric = Boolean(source && /^\d+\.\d{3}$/.test(source.value))
      if (source && !numeric && !["-", "", "."].includes(source.value.trim()))
        throw new Error(`Unrecognized BLS value ${source.value}`)
      if (numeric) observed++
      rows.push({
        id: `${item.seriesId}:${month}`,
        seriesId: item.seriesId,
        itemId: item.itemId,
        month,
        priceUSD: numeric ? Number(source!.value) : null,
        quantityUnit: item.quantityUnit,
        sourceStatus: numeric ? "observed" : "unavailable",
        footnotes:
          source?.footnotes
            .map((note) => note.text)
            .filter((text): text is string => Boolean(text)) ?? [],
        snapshotId: editionId
      })
    }
    counts.push({
      itemId: item.itemId,
      received: series[0].data.length,
      afterAnnualPeriodExclusion: monthly.length,
      excludedOutsideWindow: 0,
      observed,
      unavailable: allMonths.length - observed,
      canonical: allMonths.length,
      priorYearContext: 12,
      displayWindow: months.length
    })
  }
  // Independently match the API to the public selected-item table. Empty and
  // dash cells remain missing; their presence is never evidence of a price.
  const table = new Map<string, string[]>()
  const monthCodes = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec"
  ]
  for (const match of raw
    .get("selected-items.html")!
    .toString("utf8")
    .matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [
      ...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)
    ].map((cell) =>
      cell[1]
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;|&#160;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    const date = cells[0]?.match(/^([A-Za-z.]+)\s+(\d{4})$/)
    if (!date) continue
    const month = monthCodes.indexOf(date[1].slice(0, 3).toLowerCase()) + 1
    if (month) table.set(`${date[2]}-${String(month).padStart(2, "0")}`, cells)
  }
  const columns: Record<string, number> = {
    bananas: 1,
    bread: 3,
    eggs: 7,
    milk: 11,
    chicken: 5,
    chuck: 9
  }
  let crossChecked = 0
  for (const row of rows.filter((row) => months.includes(row.month))) {
    const cells = table.get(row.month)
    if (!cells || cells.length !== 12)
      throw new Error(
        `Source table month ${row.month} was not found or its columns changed.`
      )
    const text = cells[columns[row.itemId]]
    const price = /^\d+\.\d{3}$/.test(text) ? Number(text) : null
    if (price !== row.priceUSD)
      throw new Error(`API / selected-table disagreement for ${row.id}`)
    crossChecked++
  }
  const snapshot: GrocerySnapshot = {
    schemaVersion: 1,
    storyId: "E01",
    editionId,
    retrievedAt: sources
      .map((source) => source.retrievedAt)
      .sort()
      .at(-1)!,
    transformVersion: TRANSFORM_VERSION,
    geography: "BLS U.S. city average; not seasonally adjusted",
    months,
    items: ITEMS,
    rows,
    sources
  }
  const output = resolve("docs/public/stories/grocery-bill", editionId)
  await mkdir(join(output, "raw"), { recursive: true })
  for (const [name, content] of raw)
    await writeImmutable(join(output, "raw", name), content)
  await writeImmutable(
    join(output, "raw/retrieval.json"),
    JSON.stringify(sources, null, 2) + "\n"
  )
  const serialized = JSON.stringify(snapshot) + "\n"
  await writeImmutable(join(output, "snapshot.json"), serialized)
  await writeImmutable(
    join(output, "manifest.json"),
    JSON.stringify(
      {
        ...snapshot,
        rows: undefined,
        counts,
        crossChecked,
        parentEdition: null,
        sourceTerms: "https://www.bls.gov/bls/linksite.htm",
        sourceUpdatedAt: null,
        sourceUpdateNote:
          "Retrieval time is recorded; an API retrieval does not establish a source revision time.",
        fields: {
          id: "BLS series ID + ':' + YYYY-MM",
          seriesId: "Frozen BLS average-price series",
          itemId: "Stable example item identity",
          month: "Observation month, not retrieval month",
          priceUSD:
            "USD per quantityUnit, source precision 0.001; null means unavailable",
          quantityUnit: "lb, dozen, or gallon; never converted silently",
          sourceStatus: "observed or unavailable",
          footnotes: "BLS API footnote text",
          snapshotId: "Immutable edition identity"
        },
        reproduction: `npx tsx scripts/grocery-receipt/build-edition.ts --source docs/public/stories/grocery-bill/${editionId}/raw`
      },
      null,
      2
    ) + "\n"
  )
  const csv =
    [
      "seriesId,itemId,month,priceUSD,quantityUnit,sourceStatus,snapshotId",
      ...rows.map((row) =>
        [
          row.seriesId,
          row.itemId,
          row.month,
          row.priceUSD === null ? "" : row.priceUSD.toFixed(3),
          row.quantityUnit,
          row.sourceStatus,
          row.snapshotId
        ].join(",")
      )
    ].join("\n") + "\n"
  await writeImmutable(join(output, "prices.csv"), csv)
  console.log(
    JSON.stringify({
      editionId,
      output,
      rows: rows.length,
      crossChecked,
      unavailable: rows
        .filter((row) => row.priceUSD === null)
        .map((row) => row.id)
    })
  )
  return { snapshot, output }
}
