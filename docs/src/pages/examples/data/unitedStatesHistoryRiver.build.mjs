import { dirname, resolve } from "node:path"
import { argv, cwd } from "node:process"
import { fileURLToPath } from "node:url"
import { pick, writeCompactStrategyModule } from "./compactProjectionJson.mjs"

const dataDirectory = dirname(fileURLToPath(import.meta.url))
const sourceArgument = argv[2]
if (!sourceArgument) {
  throw new Error(
    "Usage: node docs/src/pages/examples/data/unitedStatesHistoryRiver.build.mjs <source-json-path>",
  )
}
const sourcePath = resolve(cwd(), sourceArgument)
const outputPath = resolve(dataDirectory, "unitedStatesHistoryRiver.source.generated.js")

const EVENT_IDS = new Set([
  "E01", "E02", "E03", "E06", "E09", "E10", "E11", "E13", "E14", "E15",
  "E16", "E17", "E18", "E20", "E21", "E22", "E26", "E28", "E31", "E32",
  "E34", "E35", "E36",
])

const SOURCE_IDS = new Set([
  "CENSUS_STATEHOOD",
  "CENSUS_ACQUISITIONS",
  "NARA_FOUNDING",
  "SENATE_CIVIL_WAR",
  "SENATE_RECONSTRUCTION",
  "PHILIPPINES_HISTORY",
  "CUBA_OCCUPATIONS",
  "PANAMA_CANAL",
  "DOI_INSULAR_TYPES",
  "DOI_TTPI",
])

writeCompactStrategyModule({
  sourcePath,
  outputPath,
  exportName: "unitedStatesHistoryRiverSource",
  builderName: "unitedStatesHistoryRiver.build.mjs",
  buildCompact: (source) => ({
    metadata: pick(source.metadata, [
      "title",
      "version",
      "status",
      "critical_caveat",
      "civil_war_caveat",
      "status_caveat",
    ]),
    admissions_status: source.admissions_status.map((row) => pick(row, [
      "jurisdiction_code",
      "jurisdiction",
      "current_status_key",
      "statehood_order",
      "statehood_or_current_status_date",
      "immediate_prior_status",
      "primary_acquisition_stream",
    ])),
    events: source.events
      .filter((event) => EVENT_IDS.has(event.event_id))
      .map((event) => pick(event, [
        "event_id",
        "date",
        "title",
        "event_type",
        "status_consequence",
        "notes",
      ])),
    sources: source.sources
      .filter((reference) => SOURCE_IDS.has(reference.source_key))
      .map((reference) => pick(reference, [
        "source_key",
        "title",
        "publisher",
        "url",
        "used_for",
        "quality_note",
      ])),
  }),
})
