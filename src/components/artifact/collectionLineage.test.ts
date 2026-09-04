import { expect, it } from "vitest"
import { contractWithClaim } from "./artifactTestFixtures"
import {
  buildArtifactCollectionLineage,
  type ArtifactCollectionContract
} from "./collection"

it("keeps local temporal sources and schemas separate from other panels and the shared registry", () => {
  const artifacts = ["panel-a", "panel-b"].map((id) => {
    const artifact = contractWithClaim(id)
    artifact.time!.sources = [
      { id: "rows", kind: "stream", label: `${id} stream`, version: "v1" },
      { id: "rows", kind: "snapshot", label: `${id} snapshot`, version: "v1" }
    ]
    return artifact
  })
  const collection: ArtifactCollectionContract = {
    collectionVersion: "0.1",
    id: "local-sources",
    artifacts,
    sourceRegistry: [{ id: "rows", label: "Shared registry source" }],
    claimDependencies: artifacts.map((artifact) => ({
      artifactId: artifact.artifact.id,
      claimId: artifact.claims[0].id,
      evidenceIds: [artifact.evidence[0].id],
      sourceIds: ["rows"]
    }))
  }
  const lineage = buildArtifactCollectionLineage(collection)
  expect(
    lineage.nodes.filter(({ kind }) => kind === "source" || kind === "snapshot")
  ).toEqual(
    [
      { id: "source:rows", kind: "source", label: "Shared registry source" },
      {
        id: "source:panel-a:stream:rows",
        kind: "source",
        label: "panel-a stream",
        artifactId: "panel-a"
      },
      {
        id: "snapshot:panel-a:rows",
        kind: "snapshot",
        label: "panel-a snapshot",
        artifactId: "panel-a"
      },
      {
        id: "source:panel-b:stream:rows",
        kind: "source",
        label: "panel-b stream",
        artifactId: "panel-b"
      },
      {
        id: "snapshot:panel-b:rows",
        kind: "snapshot",
        label: "panel-b snapshot",
        artifactId: "panel-b"
      }
    ].sort((a, b) => a.id.localeCompare(b.id))
  )
  expect(
    lineage.nodes.filter(({ kind }) => kind === "schema").map(({ id }) => id)
  ).toEqual([
    "schema:panel-a:snapshot:rows:v1",
    "schema:panel-a:stream:rows:v1",
    "schema:panel-b:snapshot:rows:v1",
    "schema:panel-b:stream:rows:v1"
  ])
  for (const artifact of artifacts) {
    const id = artifact.artifact.id
    expect(
      lineage.edges
        .filter(
          (edge) =>
            edge.target === `evidence:${id}:${id}-evidence` &&
            edge.relation === "produces"
        )
        .map(({ source }) => source)
    ).toEqual([
      `snapshot:${id}:rows`,
      `source:${id}:stream:rows`,
      "source:rows"
    ])
  }
})

it("does not merge different local source kinds projected to the same graph kind", () => {
  const artifact = contractWithClaim("panel")
  artifact.time!.sources = [
    { id: "rows", kind: "stream", version: "v1" },
    { id: "rows", kind: "publication", version: "v1" }
  ]
  const lineage = buildArtifactCollectionLineage({
    collectionVersion: "0.1",
    id: "kinds",
    artifacts: [artifact]
  })
  expect(
    lineage.nodes.filter(({ kind }) => kind === "source").map(({ id }) => id)
  ).toEqual(["source:panel:publication:rows", "source:panel:stream:rows"])
  expect(
    lineage.nodes.filter(({ kind }) => kind === "schema").map(({ id }) => id)
  ).toEqual(["schema:panel:publication:rows:v1", "schema:panel:stream:rows:v1"])
})
