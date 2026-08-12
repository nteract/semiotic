import { dirname, resolve } from "node:path"
import { argv, cwd } from "node:process"
import { fileURLToPath } from "node:url"
import { pick, stripHeavy, writeCompactStrategyModule } from "./compactProjectionJson.mjs"

const dataDirectory = dirname(fileURLToPath(import.meta.url))
const sourceArgument = argv[2]
if (!sourceArgument) {
  throw new Error(
    "Usage: node docs/src/pages/examples/data/germanyStillBecoming.build.mjs <source-json-path>",
  )
}
const sourcePath = resolve(cwd(), sourceArgument)
const outputPath = resolve(dataDirectory, "germanyStillBecoming.source.generated.js")

/** Research-only fields dropped from the browser projection. */
const DROP_KEYS = new Set([
  "atom_ids",
  "modern_land_codes",
  "nuts2_codes",
  "area_km2_2022",
  "gdp_eur_m_2022",
  "population_2022",
  "area_km2_historical",
  "gdp_historical",
  "population_high",
  "population_historical_mid",
  "population_low",
  "population_reference_year",
])

writeCompactStrategyModule({
  sourcePath,
  outputPath,
  exportName: "germanyStillBecomingSource",
  builderName: "germanyStillBecoming.build.mjs",
  buildCompact: (source) => ({
    metadata: source.metadata,
    metric_definitions: source.metric_definitions,
    stages: source.stages.map((stage) => pick(stage, [
      "stage_id",
      "stage_order",
      "benchmark",
      "label",
      "focus",
      "description",
      "default_x",
      "source_key",
    ])),
    nodes: stripHeavy(source.nodes, DROP_KEYS),
    links: stripHeavy(source.links, DROP_KEYS),
    events: source.events.map((event) => pick(event, [
      "event_id",
      "date",
      "title",
      "event_type",
      "stage_before",
      "stage_after",
      "affected_streams",
      "map_instruction",
      "confidence",
      "notes",
      "source_key",
    ])),
    external_flows: stripHeavy(source.external_flows, DROP_KEYS),
    endpoint_atoms: stripHeavy(source.endpoint_atoms, DROP_KEYS),
    palette: source.palette.map((entry) => pick(entry, [
      "palette_key",
      "hex",
      "usage",
    ])),
    sources: source.sources.map((reference) => pick(reference, [
      "source_key",
      "title",
      "publisher",
      "url",
      "used_for",
      "quality_note",
      "source_type",
      "accessed",
    ])),
  }),
})
