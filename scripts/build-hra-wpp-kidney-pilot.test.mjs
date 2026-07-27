import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import {
  buildKidneyPilot,
  KIDNEY_ROOT_ID,
} from "./build-hra-wpp-kidney-pilot.mjs"

const source = {
  metadata: {
    version: "v1.6",
    creation_date: "2026-06-08",
    publisher: "HuBMAP",
    license: "https://creativecommons.org/licenses/by/4.0/",
    see_also: "https://example.test/kidney",
    derived_from: "https://example.test/kidney#raw-data",
  },
  data: {
    anatomical_structures: [
      {
        id: "AS:A",
        ccf_pref_label: "Shared label",
        ccf_part_of: [KIDNEY_ROOT_ID],
        ccf_is_provisional: false,
      },
      {
        id: "AS:B",
        ccf_pref_label: "Shared label",
        ccf_part_of: [KIDNEY_ROOT_ID],
        ccf_is_provisional: false,
      },
      {
        id: "AS:GRANDCHILD",
        ccf_pref_label: "Nested structure",
        ccf_part_of: ["AS:A"],
        ccf_is_provisional: false,
      },
    ],
    cell_types: [
      {
        id: "CT:CURATED",
        ccf_pref_label: "Curated cell",
        ccf_is_provisional: false,
      },
      {
        id: "CT:TEMP",
        ccf_pref_label: "Temporary cell",
        ccf_is_provisional: true,
      },
    ],
    asctb_record: [
      {
        id: "R1",
        anatomical_structure_list: [
          { source_concept: "AS:A", ccf_pref_label: "Shared label" },
          {
            source_concept: "AS:GRANDCHILD",
            ccf_pref_label: "Nested structure",
          },
        ],
        cell_type_list: [
          { source_concept: "CT:CURATED" },
          { source_concept: "CT:TEMP" },
          { source_concept: "CT:TEMP" },
        ],
      },
      {
        id: "R2",
        anatomical_structure_list: [
          { source_concept: "AS:B", ccf_pref_label: "Shared label" },
        ],
        cell_type_list: [{ source_concept: "CT:CURATED" }],
      },
    ],
  },
}

test("buildKidneyPilot preserves ontology identity and one hierarchy level", () => {
  const artifact = buildKidneyPilot(source)

  assert.deepEqual(
    artifact.chartRows.map((row) => row.anatomicalStructureId),
    ["AS:A", "AS:B"],
  )
  assert.equal(artifact.chartRows[0].cellTypeCount, 2)
  assert.equal(artifact.chartRows[0].temporaryCellTypeCount, 1)
  assert.equal(artifact.chartRows[1].cellTypeCount, 1)
  assert.notEqual(
    artifact.chartRows[0].displayLabel,
    artifact.chartRows[1].displayLabel,
  )
  assert.deepEqual(artifact.findings.observedLabelCollisions, [
    { label: "Shared label", ids: ["AS:A", "AS:B"] },
  ])
})

test("buildKidneyPilot is deterministic and validates the pinned version", () => {
  assert.deepEqual(buildKidneyPilot(source), buildKidneyPilot(source))
  assert.throws(
    () =>
      buildKidneyPilot({
        ...source,
        metadata: { ...source.metadata, version: "v1.7" },
      }),
    /Expected kidney v1\.6/,
  )
})

test("records without an identifier do not create an undefined record key", () => {
  const sourceWithMissingRecordId = {
    ...source,
    data: {
      ...source.data,
      asctb_record: [
        {
          anatomical_structure_list: [
            { source_concept: "AS:A", ccf_pref_label: "Shared label" },
          ],
          cell_type_list: [{ source_concept: "CT:CURATED" }],
        },
      ],
    },
  }

  const artifact = buildKidneyPilot(sourceWithMissingRecordId)
  assert.equal(artifact.chartRows[0].recordCount, 0)
})

test("the checked-in kidney v1.6 fixture pins the reviewed workshop evidence", () => {
  const artifact = JSON.parse(
    readFileSync(
      resolve("docs/src/data/hra-wpp-kidney-v1.6-pilot.json"),
      "utf8",
    ),
  )

  assert.deepEqual(artifact.summary, {
    recordCount: 78,
    declaredAnatomicalStructureCount: 67,
    observedAnatomicalStructureCount: 61,
    declaredCellTypeCount: 72,
    observedCellTypeCount: 70,
    provisionalAnatomicalStructureCount: 2,
    provisionalCellTypeCount: 3,
  })
  assert.deepEqual(
    artifact.reviewRows.map((row) => row.anatomicalStructureId),
    ["UBERON:0005215", "UBERON:0004100", "UBERON:0002015"],
  )
  assert.ok(
    artifact.findings.observedLabelCollisions.some(
      ({ label, ids }) => label === "Tubules" && ids.length === 2,
    ),
  )
})
