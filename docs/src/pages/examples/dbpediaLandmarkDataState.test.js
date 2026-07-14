import { describe, expect, it } from "vitest"
import {
  DBPEDIA_LANDMARK_DATA_ADAPTER,
  createDbpediaMixedProvenance,
  createDbpediaSnapshotProvenance,
} from "./dbpediaLandmarkDataState"

const paris = { label: "Paris" }

describe("DBpedia landmark data state", () => {
  it("records the live endpoint and checked-in snapshot when the view combines them", () => {
    const snapshot = createDbpediaSnapshotProvenance(paris)
    const loading = DBPEDIA_LANDMARK_DATA_ADAPTER.transitionDataAdapter(
      DBPEDIA_LANDMARK_DATA_ADAPTER.createDataAdapterState({
        kind: "snapshot",
        message: "Showing the validated Paris snapshot while DBpedia is checked.",
        provenance: [snapshot],
      }),
      {
        type: "begin-load",
        requestId: 1,
        message: "Showing the validated Paris snapshot while DBpedia is checked.",
      },
    )
    const settled = DBPEDIA_LANDMARK_DATA_ADAPTER.transitionDataAdapter(loading, {
      type: "set-result",
      requestId: 1,
      kind: "live",
      message: "DBpedia response merged with the snapshot.",
      provenance: createDbpediaMixedProvenance(paris),
    })

    expect(settled).toMatchObject({
      kind: "live",
      isLoading: false,
      provenance: [
        { kind: "live", source: "DBpedia SPARQL endpoint" },
        { kind: "snapshot", source: "Checked-in Paris landmark snapshot" },
      ],
    })
  })

  it("keeps the checked-in snapshot as the declared settled state after a failed request", () => {
    const initial = DBPEDIA_LANDMARK_DATA_ADAPTER.createDataAdapterState({
      kind: "snapshot",
      provenance: [createDbpediaSnapshotProvenance(paris)],
    })
    const loading = DBPEDIA_LANDMARK_DATA_ADAPTER.transitionDataAdapter(initial, {
      type: "begin-load",
      requestId: 2,
      message: "Checking DBpedia.",
    })
    const settled = DBPEDIA_LANDMARK_DATA_ADAPTER.transitionDataAdapter(loading, {
      type: "set-result",
      requestId: 2,
      kind: "snapshot",
      message: "DBpedia was unavailable.",
      provenance: [createDbpediaSnapshotProvenance(paris)],
    })

    expect(settled).toMatchObject({
      kind: "snapshot",
      isLoading: false,
      provenance: [{ kind: "snapshot", source: "Checked-in Paris landmark snapshot" }],
    })
  })
})
