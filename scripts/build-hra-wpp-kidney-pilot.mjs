#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const KIDNEY_PURL =
  "https://purl.humanatlas.io/asct-b/kidney/v1.6"
export const KIDNEY_ROOT_ID = "UBERON:0002113"
export const DEFAULT_OUTPUT = resolve(
  "docs/src/data/hra-wpp-kidney-v1.6-pilot.json",
)

const uniqueBy = (items, accessor) => {
  const seen = new Set()
  return items.filter((item) => {
    const key = accessor(item)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const shortId = (id) => String(id).split(/[\/#]/).filter(Boolean).at(-1)

function validateSource(source) {
  const data = source?.data
  if (source?.metadata?.version !== "v1.6") {
    throw new Error(
      `Expected kidney v1.6, received ${source?.metadata?.version || "no version"}`,
    )
  }
  for (const field of [
    "anatomical_structures",
    "cell_types",
    "asctb_record",
  ]) {
    if (!Array.isArray(data?.[field])) {
      throw new Error(`HRA source is missing data.${field}`)
    }
  }
}

function aggregateObservedStructures(records) {
  const structures = new Map()

  for (const record of records) {
    const cellTypes = uniqueBy(
      record.cell_type_list || [],
      (cellType) => cellType.source_concept,
    )

    for (const structure of uniqueBy(
      record.anatomical_structure_list || [],
      (item) => item.source_concept,
    )) {
      const id = structure.source_concept
      if (!id) continue
      const aggregate = structures.get(id) || {
        id,
        labels: new Set(),
        cellTypeIds: new Set(),
        recordIds: new Set(),
      }
      if (structure.ccf_pref_label) {
        aggregate.labels.add(structure.ccf_pref_label)
      }
      for (const cellType of cellTypes) {
        if (cellType.source_concept) {
          aggregate.cellTypeIds.add(cellType.source_concept)
        }
      }
      aggregate.recordIds.add(record.id || String(record.record_number))
      structures.set(id, aggregate)
    }
  }

  return structures
}

function findObservedLabelCollisions(observedStructures, definitions) {
  const byLabel = new Map()

  for (const [id, aggregate] of observedStructures) {
    const label =
      definitions.get(id)?.ccf_pref_label || [...aggregate.labels][0] || id
    const ids = byLabel.get(label) || []
    ids.push(id)
    byLabel.set(label, ids)
  }

  return [...byLabel]
    .filter(([, ids]) => new Set(ids).size > 1)
    .map(([label, ids]) => ({ label, ids: [...new Set(ids)].sort() }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function buildKidneyPilot(source) {
  validateSource(source)

  const { metadata, data } = source
  const definitions = new Map(
    data.anatomical_structures.map((structure) => [structure.id, structure]),
  )
  const cellTypeDefinitions = new Map(
    data.cell_types.map((cellType) => [cellType.id, cellType]),
  )
  const observedStructures = aggregateObservedStructures(data.asctb_record)
  const directChildIds = new Set(
    data.anatomical_structures
      .filter((structure) =>
        (structure.ccf_part_of || []).includes(KIDNEY_ROOT_ID),
      )
      .map((structure) => structure.id),
  )

  const chartRows = [...observedStructures]
    .filter(([id]) => directChildIds.has(id))
    .map(([id, aggregate]) => {
      const definition = definitions.get(id)
      const label =
        definition?.ccf_pref_label || [...aggregate.labels][0] || id
      const temporaryCellTypeCount = [...aggregate.cellTypeIds].filter(
        (cellTypeId) =>
          cellTypeDefinitions.get(cellTypeId)?.ccf_is_provisional === true,
      ).length

      return {
        anatomicalStructureId: id,
        anatomicalStructureLabel: label,
        displayLabel: `${label} · ${shortId(id)}`,
        cellTypeCount: aggregate.cellTypeIds.size,
        temporaryCellTypeCount,
        recordCount: aggregate.recordIds.size,
        structureIsProvisional:
          definition?.ccf_is_provisional === true,
      }
    })
    .sort(
      (a, b) =>
        b.cellTypeCount - a.cellTypeCount ||
        a.anatomicalStructureId.localeCompare(b.anatomicalStructureId),
    )

  const observedCellTypeIds = new Set(
    data.asctb_record.flatMap((record) =>
      (record.cell_type_list || [])
        .map((cellType) => cellType.source_concept)
        .filter(Boolean),
    ),
  )

  return {
    kind: "semiotic-hra-wpp-kidney-pilot",
    schemaVersion: 1,
    source: {
      purl: KIDNEY_PURL,
      version: metadata.version,
      creationDate: metadata.creation_date,
      publisher: metadata.publisher,
      license: metadata.license,
      seeAlso: metadata.see_also,
      derivedFrom: metadata.derived_from,
    },
    methodology: {
      scope: `Observed direct children of kidney (${KIDNEY_ROOT_ID})`,
      identity:
        "Ontology identifiers are semantic keys; labels are display text only.",
      aggregation:
        "For each ASCT+B record, distinct cell types are associated with every anatomical structure in that record's path, then deduplicated per structure.",
      caveats: [
        "Counts are set memberships and are not additive across anatomical structures.",
        "A record can contribute to more than one hierarchy path.",
        "Parent and descendant rows must not be ranked together as independent categories.",
      ],
    },
    summary: {
      recordCount: data.asctb_record.length,
      declaredAnatomicalStructureCount: data.anatomical_structures.length,
      observedAnatomicalStructureCount: observedStructures.size,
      declaredCellTypeCount: data.cell_types.length,
      observedCellTypeCount: observedCellTypeIds.size,
      provisionalAnatomicalStructureCount: data.anatomical_structures.filter(
        (structure) => structure.ccf_is_provisional === true,
      ).length,
      provisionalCellTypeCount: data.cell_types.filter(
        (cellType) => cellType.ccf_is_provisional === true,
      ).length,
    },
    chartRows,
    reviewRows: chartRows.filter(
      (row) =>
        row.structureIsProvisional || row.temporaryCellTypeCount > 0,
    ),
    findings: {
      observedLabelCollisions: findObservedLabelCollisions(
        observedStructures,
        definitions,
      ),
      hierarchyFailure:
        "Ranking the kidney root beside descendants makes the largest bar a hierarchy artifact and implies independent categories. The pilot therefore limits the chart to one explicit sibling scope.",
    },
  }
}

export async function fetchKidneySource() {
  const response = await fetch(KIDNEY_PURL, {
    headers: { Accept: "application/json" },
    redirect: "follow",
  })
  if (!response.ok) {
    throw new Error(`HRA request failed with HTTP ${response.status}`)
  }
  return response.json()
}

async function main() {
  const output = process.argv.includes("--write")
    ? DEFAULT_OUTPUT
    : process.argv.find((argument) => argument.startsWith("--output="))?.slice(9)
  const artifact = buildKidneyPilot(await fetchKidneySource())
  const serialized = `${JSON.stringify(artifact, null, 2)}\n`

  if (output) {
    await mkdir(dirname(output), { recursive: true })
    await writeFile(output, serialized)
    console.log(`Wrote ${output}`)
  } else {
    process.stdout.write(serialized)
  }
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isMain) {
  await main()
}
