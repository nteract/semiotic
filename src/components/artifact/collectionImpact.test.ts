import { describe, expect, it } from "vitest"
import { contractWithClaim } from "./artifactTestFixtures"
import {
  affectedCollectionClaims,
  type ArtifactCollectionContract
} from "./collection"

function sharedIdsCollection(): ArtifactCollectionContract {
  const artifacts = ["panel-a", "panel-b"].map((id) => {
    const artifact = contractWithClaim(id, {
      id: "summary",
      evidenceIds: ["total"]
    })
    artifact.evidence = [
      { id: "rows", role: "source-data" },
      {
        id: "filtered",
        role: "transformation",
        transformation: {
          id: "filter",
          kind: "filter",
          inputEvidenceIds: ["rows"]
        }
      },
      {
        id: "total",
        role: "transformation",
        transformation: {
          id: "sum",
          kind: "aggregation",
          inputEvidenceIds: ["filtered"]
        }
      }
    ]
    return artifact
  })
  return {
    collectionVersion: "0.1",
    id: "shared-ids",
    artifacts,
    claimDependencies: artifacts.map((artifact) => ({
      artifactId: artifact.artifact.id,
      claimId: "summary",
      evidenceIds: ["total"]
    }))
  }
}

describe("artifact-local collection impact", () => {
  it("propagates through multiple transformations only in the named panel", () => {
    expect(
      affectedCollectionClaims(sharedIdsCollection(), [
        { artifactId: "panel-a", evidenceId: "rows" }
      ])
    ).toEqual([{ artifactId: "panel-a", claimId: "summary" }])
  })

  it("requires qualification for ambiguous legacy IDs", () => {
    expect(() =>
      affectedCollectionClaims(sharedIdsCollection(), ["rows"])
    ).toThrow("artifact-qualified evidence reference")
  })

  it("keeps unique legacy IDs working and ignores unknown legacy IDs", () => {
    const collection = sharedIdsCollection()
    collection.artifacts = collection.artifacts.slice(0, 1)
    expect(affectedCollectionClaims(collection, ["rows", "unknown"])).toEqual([
      { artifactId: "panel-a", claimId: "summary" }
    ])
  })

  it("supports explicit multi-panel changes without duplicate claims or cyclic traversal", () => {
    const collection = sharedIdsCollection()
    collection.artifacts[0].evidence[0].transformation = {
      id: "cycle",
      kind: "filter",
      inputEvidenceIds: ["total"]
    }
    collection.claimDependencies!.push(collection.claimDependencies![0])
    expect(
      affectedCollectionClaims(collection, [
        { artifactId: "panel-b", evidenceId: "rows" },
        { artifactId: "panel-a", evidenceId: "rows" },
        { artifactId: "panel-a", evidenceId: "rows" }
      ])
    ).toEqual([
      { artifactId: "panel-a", claimId: "summary" },
      { artifactId: "panel-b", claimId: "summary" }
    ])
  })

  it.each([
    { artifactId: "missing", evidenceId: "rows" },
    { artifactId: "panel-a", evidenceId: "missing" }
  ])("rejects an unresolved qualified reference %j", (reference) => {
    expect(() =>
      affectedCollectionClaims(sharedIdsCollection(), [reference])
    ).toThrow("Unknown evidence reference")
  })

  it("rejects duplicate artifact identities instead of overwriting a panel", () => {
    const collection = sharedIdsCollection()
    collection.artifacts[1].artifact.id = "panel-a"
    expect(() =>
      affectedCollectionClaims(collection, [
        { artifactId: "panel-a", evidenceId: "rows" }
      ])
    ).toThrow("artifact IDs must be unique")
  })
})
