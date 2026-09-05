import { build } from "esbuild"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { join, resolve } from "node:path"
import { csvFormat } from "d3-dsv"
import { ingest, sha256, FIELDS } from "./ingest"
import {
  defaultState,
  eventReference
} from "../../docs/src/pages/examples/plane-day/state"
import { RULES } from "../../docs/src/pages/examples/plane-day/format"

async function main() {
  const sourceIndex = process.argv.indexOf("--source")
  if (sourceIndex < 0)
    throw new Error(
      "Usage: node --import tsx scripts/plane-day/build-edition.ts --source <pinned raw directory> [--output <staging directory>]"
    )
  const source = resolve(process.argv[sourceIndex + 1])
  const { snapshot, days, retrieval } = ingest(source)
  const outputIndex = process.argv.indexOf("--output")
  const output =
    outputIndex < 0
      ? resolve("docs/public/stories/plane-day", snapshot.editionId)
      : resolve(process.argv[outputIndex + 1])
  const inventory: { file: string; bytes: number; sha256: string }[] = []
  async function emit(file: string, value: string | Buffer) {
    const path = join(output, file)
    const bytes = Buffer.from(value)
    await mkdir(resolve(path, ".."), { recursive: true })
    try {
      const previous = await readFile(path)
      if (!previous.equals(bytes))
        throw new Error(
          `Immutable edition output differs: ${file}. Create a new edition; do not overwrite it.`
        )
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      await writeFile(path, bytes)
    }
    inventory.push({ file, bytes: bytes.length, sha256: sha256(bytes) })
  }
  const json = (value: unknown) => JSON.stringify(value) + "\n"
  for (const file of ["ha-july-2025.csv", "bts-readme.html", "retrieval.json"])
    await emit(`raw/${file}`, await readFile(join(source, file)))
  await emit(
    "airport-zones.json",
    await readFile(resolve("scripts/plane-day/airport-zones.json"))
  )
  await emit("snapshot.json", json(snapshot))
  await emit("cohort.csv", csvFormat(snapshot.days))
  for (const date of [...new Set(days.map((day) => day.date))])
    await emit(
      `days/${date}.json`,
      json(days.filter((day) => day.date === date))
    )
  const adapter = await build({
    entryPoints: [resolve("docs/src/pages/examples/plane-day/portable.ts")],
    bundle: true,
    platform: "neutral",
    format: "esm",
    write: false,
    external: ["semiotic/artifact"]
  })
  await emit("adapter.mjs", adapter.outputFiles[0].text)
  const executable = await build({
    entryPoints: [resolve("docs/src/pages/examples/plane-day/portable.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    alias: {
      "semiotic/artifact": resolve("src/components/semiotic-artifact.ts")
    }
  })
  const functions = await import(
    `data:text/javascript;base64,${Buffer.from(executable.outputFiles[0].text).toString("base64")}`
  )
  const initial = defaultState(snapshot)
  const states = snapshot.cases.map((day) => ({
    name: day.pattern,
    day,
    state: {
      ...initial,
      selected: eventReference(snapshot, day, day.flights[0].id)
    }
  }))
  const defaultDay = snapshot.cases.find(
    (day) => day.id === initial.selected.dayId
  )!
  states.push(
    { name: "default", day: defaultDay, state: initial },
    {
      name: "utc-note",
      day: defaultDay,
      state: {
        ...initial,
        timeBasis: "utc",
        view: "network",
        notes: [
          {
            target: initial.selected,
            authoredBy: "reader",
            status: "unreviewed",
            createdAt: snapshot.retrievedAt,
            text: "Example reader note: the second departure is much closer to schedule. What happened during the ground interval?"
          }
        ]
      }
    }
  )
  for (const { name, day, state } of states) {
    await emit(
      `${name}.packet.json`,
      json(functions.buildNotePacket(snapshot, day, state))
    )
    await emit(`${name}.html`, functions.renderDayHTML(snapshot, day, state))
  }
  await emit(
    "README.md",
    await readFile(resolve("scripts/plane-day/README.md"))
  )
  await emit(
    "consumer.mjs",
    await readFile(resolve("scripts/plane-day/consumer.mjs"))
  )
  const fieldDictionary = {
    FlightDate:
      "Scheduled departure date at origin; aircraft-day grouping date, not UTC calendar day",
    Reporting_Airline:
      "Reporting carrier code, fixed to HA; not the marketing-carrier table",
    DOT_ID_Reporting_Airline: "US DOT carrier identifier",
    Tail_Number:
      "Reported aircraft identity; blank rows cannot form aircraft-days",
    Flight_Number_Reporting_Airline:
      "Reported flight number, one part of the composite event ID",
    OriginAirportID: "Stable BTS origin airport ID",
    Origin: "Origin airport display code",
    DestAirportID: "Stable BTS destination airport ID",
    Dest: "Destination airport display code",
    CRSDepTime:
      "Scheduled origin-local departure HHMM; 2400 means next midnight",
    DepTime:
      "Actual origin-local departure HHMM; date derived from signed delay",
    DepDelay:
      "Signed actual minus scheduled departure, minutes; negative is early",
    CRSArrTime:
      "Scheduled destination-local arrival HHMM; date derived from elapsed duration",
    ArrTime:
      "Actual destination-local arrival HHMM; date derived from elapsed duration",
    ArrDelay: "Signed actual minus scheduled arrival, minutes",
    CRSElapsedTime: "Scheduled gate-to-gate duration, minutes",
    ActualElapsedTime: "Actual gate-to-gate duration, minutes",
    Cancelled: "1 cancelled, 0 not cancelled; missing is unresolved",
    CancellationCode: "Reported cancellation category; no inferred cause",
    Diverted:
      "1 diverted, 0 not diverted; diverted rows excluded from continuity",
    CarrierDelay:
      "Reported carrier-category delay minutes; blank stays unavailable",
    WeatherDelay:
      "Reported weather-category delay minutes; blank stays unavailable",
    NASDelay:
      "Reported national-airspace-category delay minutes; blank stays unavailable",
    SecurityDelay:
      "Reported security-category delay minutes; blank stays unavailable",
    LateAircraftDelay:
      "Reported late-aircraft-category delay minutes; not inferred from adjacency",
    sourceRecordLine:
      "Original archive CSV line, including header as line 1; a raw-row lookup, never event identity"
  }
  if (FIELDS.some((field) => !(field in fieldDictionary)))
    throw new Error("Missing field definition")
  await emit(
    "manifest.json",
    JSON.stringify(
      {
        storyId: "E02",
        schemaVersion: 1,
        editionId: snapshot.editionId,
        createdAt: snapshot.retrievedAt,
        parentEdition: null,
        sourcePublicationTime: null,
        transformVersion: snapshot.transformVersion,
        sources: [retrieval],
        terms: {
          url: "https://www.bts.gov/ntl/public-access/faqs",
          description:
            "Public BTS download; publicly searchable, downloadable and analyzable data. No API key or account required. Source attribution retained; no endorsement implied."
        },
        airportMapping: {
          version: snapshot.zonesVersion,
          tzdb: snapshot.tzdbVersion,
          node: process.version
        },
        rowCounts: snapshot.counts,
        exclusions: {
          order: [
            "631428 archive records → 7066 HA records",
            "Keep July 1 and 31 as context, exclude their 457 rows from the comparison window",
            "6609 window rows; missing tails cannot be grouped",
            "1627 named aircraft-days → 660 internally continuous days with at least 3 legs"
          ],
          shortAndBrokenOverlapDays:
            snapshot.counts.shortDays +
            snapshot.counts.brokenDays -
            snapshot.counts.ineligible,
          missingTailWindowRows: rowsWithoutTails(
            days,
            snapshot.counts.windowRows
          ),
          invalidFlightReasons: Object.fromEntries(
            [
              ...new Set(
                days.flatMap((day) => day.flights.flatMap((f) => f.issues))
              )
            ].map((reason) => [
              reason,
              days
                .flatMap((day) => day.flights)
                .filter((f) => f.issues.includes(reason)).length
            ])
          )
        },
        fieldDictionary,
        retainedFields: FIELDS,
        unusedRawFields:
          "The exact carrier extract retains every original column; columns not in retainedFields are not used in this story. The archive readme defines the complete raw table.",
        caseRules: RULES,
        caseSelection:
          "Within each named pattern: fewest legs, then ascending date and tail. All dates July 2–30. No claim of random or representative case sampling.",
        sourceReview:
          "Featured rows independently recalculated against the pinned raw CSV; see verification record. Human editorial review remains pending.",
        continuity:
          "Tail + airport ID + nonoverlapping scheduled and actual intervals; maximum 12-hour observed ground interval; unresolved or intervening different-date legs break the chain.",
        inventory,
        reproduction: `node --import tsx scripts/plane-day/build-edition.ts --source docs/public/stories/plane-day/${snapshot.editionId}/raw`,
        correctionURL: "https://semiotic.nteract.io/examples/plane-day#sources",
        successor: null
      },
      null,
      2
    ) + "\n"
  )
  if (outputIndex < 0) {
    await writeFile(
      resolve("docs/src/pages/examples/plane-day/snapshot.json"),
      json(snapshot)
    )
    await writeFile(
      resolve("docs/public/stories/plane-day/current.json"),
      json({
        editionId: snapshot.editionId,
        successor: null,
        correctionURL: "https://semiotic.nteract.io/examples/plane-day#sources"
      })
    )
  }
  console.log(
    JSON.stringify({
      output,
      files: inventory.length,
      bytes: inventory.reduce((sum, file) => sum + file.bytes, 0),
      counts: snapshot.counts
    })
  )
}

function rowsWithoutTails(
  days: ReturnType<typeof ingest>["days"],
  windowRows: number
) {
  return windowRows - days.reduce((sum, day) => sum + day.flights.length, 0)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
