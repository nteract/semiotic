import { describe, expect, it } from "vitest"
import { auditClaims } from "./claims"
import {
  affectedCollectionClaims,
  applyCollectionCorrection,
  auditArtifactCollection,
  buildArtifactCollectionLineage,
  serializeArtifactCollection,
  validateArtifactCollection,
  type ArtifactCollectionContract
} from "./collection"
import { contractWithClaim } from "./artifactTestFixtures"

describe("collection coherence", () => {
  it("finds cross-view conflicts and traces changed evidence", () => {
    const first = contractWithClaim("panel-a", {
      scope: { metric: "conversion", direction: "increase" }
    })
    const second = {
      ...contractWithClaim("panel-b", {
        status: "superseded",
        scope: { metric: "conversion", direction: "decrease" }
      }),
      time: {
        ...contractWithClaim("panel-b").time,
        freshness: { status: "stale" as const, basis: "expired extract" }
      }
    }
    const collection: ArtifactCollectionContract = {
      collectionVersion: "0.1",
      id: "operations-overview",
      artifacts: [first, second],
      metrics: [
        {
          id: "conversion-a",
          label: "Conversion",
          definition: "completed / started",
          unit: "percent",
          denominator: "sessions"
        },
        {
          id: "conversion-b",
          label: "Conversion",
          definition: "completed / visitors",
          unit: "ratio",
          denominator: "visitors"
        }
      ],
      views: [
        {
          artifactId: "panel-a",
          selectionFingerprint: "sha256:new-selection",
          summarySelectionFingerprint: "sha256:old-selection"
        }
      ],
      claimDependencies: [
        {
          artifactId: "panel-a",
          claimId: "panel-a-claim",
          evidenceIds: ["panel-a-evidence"]
        },
        {
          artifactId: "panel-b",
          claimId: "panel-b-claim",
          evidenceIds: ["panel-b-evidence"]
        }
      ],
      actions: [
        {
          id: "action-1",
          action: "Increase capacity",
          claimIds: ["panel-b-claim"],
          status: "taken"
        }
      ]
    }

    const audit = auditArtifactCollection(collection)

    expect(audit.ok).toBe(false)
    expect(audit.findings.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "collection.metric-definition.conversion",
        "collection.metric-unit.conversion",
        "collection.metric-denominator.conversion",
        "collection.snapshot-skew",
        "collection.stale-panel",
        "collection.stale-summary.panel-a",
        "collection.contradictory-claims.conversion",
        "collection.action-invalidated.action-1.panel-b-claim"
      ])
    )
    expect(affectedCollectionClaims(collection, ["panel-a-evidence"])).toEqual([
      { artifactId: "panel-a", claimId: "panel-a-claim" }
    ])
  })

  it("propagates transformed evidence changes through connected lineage", () => {
    const artifact = contractWithClaim("derived-panel")
    artifact.claims[0].evidenceIds = ["derived-evidence"]
    artifact.evidence = [
      { id: "raw-evidence", role: "source-data" },
      {
        id: "derived-evidence",
        role: "transformation",
        transformation: {
          id: "derive-values",
          kind: "aggregation",
          inputEvidenceIds: ["raw-evidence"]
        }
      }
    ]
    const collection: ArtifactCollectionContract = {
      collectionVersion: "0.1",
      id: "derived-collection",
      artifacts: [artifact],
      sourceRegistry: [{ id: "warehouse", label: "Warehouse" }],
      claimDependencies: [
        {
          artifactId: "derived-panel",
          claimId: "derived-panel-claim",
          evidenceIds: ["derived-evidence"],
          sourceIds: ["warehouse"]
        },
        {
          artifactId: "derived-panel",
          claimId: "derived-panel-claim",
          evidenceIds: ["derived-evidence"]
        }
      ]
    }

    expect(affectedCollectionClaims(collection, ["raw-evidence"])).toEqual([
      {
        artifactId: "derived-panel",
        claimId: "derived-panel-claim"
      }
    ])

    const lineage = buildArtifactCollectionLineage(collection)
    expect(lineage.edges).toEqual(
      expect.arrayContaining([
        {
          source: "artifact:derived-panel",
          target: "evidence:derived-panel:raw-evidence",
          relation: "contains"
        },
        {
          source: "evidence:derived-panel:raw-evidence",
          target: "evidence:derived-panel:derived-evidence",
          relation: "produces"
        },
        {
          source: "source:warehouse",
          target: "evidence:derived-panel:derived-evidence",
          relation: "produces"
        }
      ])
    )
    expect(lineage.edges).not.toContainEqual({
      source: "evidence:derived-panel:raw-evidence",
      target: "artifact:derived-panel",
      relation: "contains"
    })
  })

  it("serializes, corrects, and traces a collection without dropping prior claims", () => {
    const original = contractWithClaim("panel-a")
    const replacement = {
      ...contractWithClaim("panel-b"),
      claims: [
        {
          ...contractWithClaim("panel-b").claims[0],
          id: "panel-a-claim-v2"
        }
      ]
    }
    const collection: ArtifactCollectionContract = {
      collectionVersion: "0.1",
      id: "corrected-collection",
      artifacts: [original, replacement],
      sourceRegistry: [{ id: "warehouse", label: "Warehouse snapshot" }],
      actions: [
        {
          id: "review",
          action: "Review the revision",
          claimIds: ["panel-a-claim-v2"]
        }
      ]
    }
    const corrected = applyCollectionCorrection(collection, {
      id: "collection-correction",
      affectedClaimIds: ["panel-a-claim"],
      replacementClaimIds: ["panel-a-claim-v2"],
      reason: "A later snapshot changed the bounded statement."
    })
    const serialized = serializeArtifactCollection(corrected)
    const lineage = buildArtifactCollectionLineage(corrected)

    expect(corrected.artifacts[0].claims[0].status).toBe("superseded")
    expect(corrected.artifacts[1].claims[0].supersedes).toBeUndefined()
    expect(corrected.artifacts[0].contestability?.corrections).toBeUndefined()
    expect(corrected.artifacts[1].contestability?.corrections).toBeUndefined()
    expect(auditClaims(corrected.artifacts[0]).summary.fail).toBe(0)
    expect(auditClaims(corrected.artifacts[1]).summary.fail).toBe(0)
    expect(corrected.corrections).toHaveLength(1)
    expect(serialized.transfer.status).toBe("preserved")
    expect(serialized.collection).not.toBe(corrected)
    expect(lineage.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "artifact" }),
        expect.objectContaining({ kind: "claim" }),
        expect.objectContaining({ kind: "evidence" }),
        expect.objectContaining({ kind: "action" })
      ])
    )
    expect(lineage.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ relation: "supports" }),
        expect.objectContaining({ relation: "supersedes" }),
        expect.objectContaining({ relation: "acts-on" })
      ])
    )
  })

  it("keeps scoped cross-artifact correction references out of local claims", () => {
    const original = contractWithClaim("scope-a")
    const replacement = {
      ...contractWithClaim("scope-b"),
      claims: [
        {
          ...contractWithClaim("scope-b").claims[0],
          id: "scope-a-claim-v2"
        }
      ]
    }
    const corrected = applyCollectionCorrection(
      {
        collectionVersion: "0.1",
        id: "scoped-correction",
        artifacts: [original, replacement]
      },
      {
        id: "scoped-fix",
        affectedClaimIds: ["scope-a-claim"],
        replacementClaimIds: ["scope-a-claim-v2"],
        reason: "A bounded revision replaced the earlier claim.",
        scope: {
          affectedClaims: [{ artifactId: "scope-a", claimId: "scope-a-claim" }],
          replacementClaims: [
            { artifactId: "scope-b", claimId: "scope-a-claim-v2" }
          ]
        }
      }
    )
    const lineage = buildArtifactCollectionLineage(corrected)

    expect(corrected.artifacts[0].claims[0].status).toBe("superseded")
    expect(corrected.artifacts[1].claims[0].supersedes).toBeUndefined()
    expect(corrected.artifacts[0].contestability?.corrections).toBeUndefined()
    expect(corrected.artifacts[1].contestability?.corrections).toBeUndefined()
    expect(auditClaims(corrected.artifacts[0]).summary.fail).toBe(0)
    expect(auditClaims(corrected.artifacts[1]).summary.fail).toBe(0)
    expect(auditArtifactCollection(corrected).summary.fail).toBe(0)
    expect(lineage.edges).toContainEqual({
      source: "claim:scope-b:scope-a-claim-v2",
      target: "claim:scope-a:scope-a-claim",
      relation: "supersedes"
    })
  })

  it("retains local correction links when both claims share an artifact", () => {
    const original = contractWithClaim("local-correction")
    const artifact = {
      ...original,
      claims: [
        original.claims[0],
        {
          ...original.claims[0],
          id: "local-correction-claim-v2"
        }
      ]
    }
    const corrected = applyCollectionCorrection(
      {
        collectionVersion: "0.1",
        id: "local-collection",
        artifacts: [artifact]
      },
      {
        id: "local-fix",
        affectedClaimIds: ["local-correction-claim"],
        replacementClaimIds: ["local-correction-claim-v2"],
        reason: "A bounded revision replaced the earlier claim.",
        scope: {
          affectedClaims: [
            {
              artifactId: "local-correction",
              claimId: "local-correction-claim"
            }
          ],
          replacementClaims: [
            {
              artifactId: "local-correction",
              claimId: "local-correction-claim-v2"
            }
          ]
        }
      }
    )
    const correctedArtifact = corrected.artifacts[0]

    expect(correctedArtifact.claims[0].status).toBe("superseded")
    expect(correctedArtifact.claims[1].supersedes).toEqual([
      "local-correction-claim"
    ])
    expect(correctedArtifact.contestability?.corrections).toContainEqual(
      expect.objectContaining({
        id: "local-fix",
        affectedClaimIds: ["local-correction-claim"],
        replacementClaimIds: ["local-correction-claim-v2"]
      })
    )
    expect(auditClaims(correctedArtifact).ok).toBe(true)
  })

  it("requires an artifact identifier when collection actions use an ambiguous claim id", () => {
    const first = contractWithClaim("panel-a")
    const second = contractWithClaim("panel-b")
    first.claims[0].id = "shared-claim"
    second.claims[0].id = "shared-claim"
    const collection: ArtifactCollectionContract = {
      collectionVersion: "0.1",
      id: "ambiguous-actions",
      artifacts: [first, second],
      actions: [
        {
          id: "action-without-artifact",
          action: "Review the shared claim",
          claimIds: ["shared-claim"]
        },
        {
          id: "action-with-artifact",
          action: "Review panel A",
          artifactId: "panel-a",
          claimIds: ["shared-claim"]
        }
      ]
    }

    const audit = auditArtifactCollection(collection)
    const lineage = buildArtifactCollectionLineage(collection)

    expect(audit.findings.map(({ id }) => id)).toContain(
      "collection.action-claim-ambiguous.action-without-artifact.shared-claim"
    )
    expect(
      lineage.edges.filter(
        ({ source, relation }) =>
          source === "action:action-with-artifact" && relation === "acts-on"
      )
    ).toEqual([
      {
        source: "action:action-with-artifact",
        target: "claim:panel-a:shared-claim",
        relation: "acts-on"
      }
    ])
    expect(
      lineage.edges.filter(
        ({ source, relation }) =>
          source === "action:action-without-artifact" && relation === "acts-on"
      )
    ).toEqual([])
  })

  it("applies artifact-qualified corrections without changing same-named claims", () => {
    const first = contractWithClaim("panel-a")
    const second = contractWithClaim("panel-b")
    first.claims[0].id = "shared-claim"
    second.claims[0].id = "shared-claim"
    const collection: ArtifactCollectionContract = {
      collectionVersion: "0.1",
      id: "scoped-correction",
      artifacts: [first, second]
    }

    const corrected = applyCollectionCorrection(collection, {
      id: "correct-panel-a",
      affectedClaimIds: ["shared-claim"],
      reason: "Panel A used an outdated value.",
      scope: {
        affectedClaims: [{ artifactId: "panel-a", claimId: "shared-claim" }]
      }
    })
    const ambiguous = applyCollectionCorrection(collection, {
      id: "ambiguous-correction",
      affectedClaimIds: ["shared-claim"],
      reason: "No artifact scope was supplied."
    })
    const partlyInvalid = applyCollectionCorrection(collection, {
      id: "partly-invalid-correction",
      affectedClaimIds: ["shared-claim"],
      reason: "One declared artifact does not exist.",
      scope: {
        affectedClaims: [
          { artifactId: "panel-a", claimId: "shared-claim" },
          { artifactId: "missing-panel", claimId: "shared-claim" }
        ]
      }
    })

    expect(corrected.artifacts[0].claims[0].status).toBe("retracted")
    expect(corrected.artifacts[1].claims[0].status).toBe("supported")
    expect(corrected.artifacts[0].contestability?.corrections).toHaveLength(1)
    expect(
      corrected.artifacts[1].contestability?.corrections ?? []
    ).toHaveLength(0)
    expect(serializeArtifactCollection(corrected).transfer.status).toBe(
      "preserved"
    )
    expect(ambiguous.artifacts.map(({ claims }) => claims[0].status)).toEqual([
      "supported",
      "supported"
    ])
    expect(
      partlyInvalid.artifacts.map(({ claims }) => claims[0].status)
    ).toEqual(["supported", "supported"])
    expect(
      auditArtifactCollection(ambiguous).findings.map(({ id }) => id)
    ).toContain(
      "collection.correction-claim-ambiguous.ambiguous-correction.affected.shared-claim"
    )
  })

  it("uses collision-safe lineage ids and keeps supersession artifact-local", () => {
    const first = contractWithClaim("panel:one")
    const second = contractWithClaim("panel")
    first.claims = [
      { ...first.claims[0], id: "shared" },
      {
        ...first.claims[0],
        id: "current",
        supersedes: ["shared"]
      }
    ]
    second.claims = [
      { ...second.claims[0], id: "one:shared" },
      { ...second.claims[0], id: "shared" },
      {
        ...second.claims[0],
        id: "cross-current",
        supersedes: ["shared"]
      }
    ]
    const collection: ArtifactCollectionContract = {
      collectionVersion: "0.1",
      id: "delimiter-collisions",
      artifacts: [first, second],
      corrections: [
        {
          id: "cross-artifact-correction",
          affectedClaimIds: ["shared"],
          replacementClaimIds: ["cross-current"],
          reason: "The replacement is published in another artifact.",
          scope: {
            affectedClaims: [{ artifactId: "panel:one", claimId: "shared" }],
            replacementClaims: [
              { artifactId: "panel", claimId: "cross-current" }
            ]
          }
        }
      ]
    }

    const lineage = buildArtifactCollectionLineage(collection)
    const claimNodeIds = lineage.nodes
      .filter(({ kind }) => kind === "claim")
      .map(({ id }) => id)

    expect(new Set(claimNodeIds).size).toBe(5)
    expect(claimNodeIds).toEqual(
      expect.arrayContaining([
        "claim:panel%3Aone:shared",
        "claim:panel:one%3Ashared"
      ])
    )
    expect(lineage.edges).toContainEqual({
      source: "claim:panel%3Aone:current",
      target: "claim:panel%3Aone:shared",
      relation: "supersedes"
    })
    expect(lineage.edges).not.toContainEqual({
      source: "claim:panel%3Aone:current",
      target: "claim:panel:shared",
      relation: "supersedes"
    })
    expect(lineage.edges).toContainEqual({
      source: "claim:panel:cross-current",
      target: "claim:panel%3Aone:shared",
      relation: "supersedes"
    })
    expect(lineage.edges).not.toContainEqual({
      source: "claim:panel:cross-current",
      target: "claim:panel:shared",
      relation: "supersedes"
    })
  })

  it("rejects malformed collection structure and broken collection references", () => {
    const artifact = contractWithClaim("panel-a")
    artifact.evidence.push({
      id: "unrelated-evidence",
      role: "source-data"
    })
    const malformed = serializeArtifactCollection({
      collectionVersion: "0.1",
      id: "malformed",
      artifacts: [artifact],
      metrics: "not-an-array"
    })
    const collection: ArtifactCollectionContract = {
      collectionVersion: "0.1",
      id: "broken-references",
      artifacts: [artifact],
      metrics: [
        {
          id: "conversion",
          label: "Conversion",
          definition: "completed / started",
          unit: "percent"
        },
        {
          id: "conversion-ratio",
          label: "Conversion",
          definition: "completed / started"
        }
      ],
      views: [{ artifactId: "panel-a", metricIds: ["missing-metric"] }],
      claimDependencies: [
        {
          artifactId: "panel-a",
          claimId: "panel-a-claim",
          evidenceIds: ["unrelated-evidence"],
          sourceIds: ["missing-source"]
        }
      ]
    }
    const audit = auditArtifactCollection(collection)
    const serialized = serializeArtifactCollection(collection)

    expect(malformed.transfer.status).toBe("invalid")
    expect(malformed.transfer.warnings).toContain(
      "$.metrics: Expected an array."
    )
    expect(audit.findings.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "collection.metric-unit.conversion",
        "collection.view-metric.panel-a.missing-metric",
        "collection.dependency-claim-evidence.panel-a.panel-a-claim",
        "collection.dependency-source.panel-a.panel-a-claim"
      ])
    )
    expect(serialized.transfer.status).toBe("invalid")
  })

  it("rejects undeclared collection data and malformed action records", () => {
    const artifact = contractWithClaim("action-panel")
    artifact.artifact.revision = "revision-2"
    const base: ArtifactCollectionContract = {
      collectionVersion: "0.1",
      id: "action-collection",
      artifacts: [artifact]
    }
    const undeclared = {
      ...base,
      rawData: [{ privateValue: "must-use-extensions" }]
    }
    const malformedActor = {
      ...base,
      actions: [
        {
          id: "malformed-actor",
          action: "Review",
          claimIds: ["action-panel-claim"],
          artifactId: "action-panel",
          actor: "not-an-actor"
        }
      ]
    }
    const inconsistentAction: ArtifactCollectionContract = {
      ...base,
      actions: [
        {
          id: "inconsistent-action",
          action: "Publish",
          claimIds: ["action-panel-claim"],
          artifactId: "action-panel",
          artifactRevision: "revision-1",
          invalidatedByClaimId: "missing-claim",
          status: "taken",
          actor: { kind: "human", name: "Review desk" }
        }
      ]
    }

    expect(validateArtifactCollection(undeclared)).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ path: "$.rawData" })]
    })
    expect(serializeArtifactCollection(undeclared).transfer.status).toBe(
      "invalid"
    )
    expect(validateArtifactCollection(malformedActor)).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ path: "$.actions[0].actor" })]
    })
    const semanticValidation = validateArtifactCollection(inconsistentAction)
    expect(semanticValidation.valid).toBe(false)
    expect(semanticValidation.errors.map(({ message }) => message)).toEqual(
      expect.arrayContaining([
        'Action "inconsistent-action" is bound to a different artifact revision.',
        'Action "inconsistent-action" references unknown invalidating claim "missing-claim".',
        'Action "inconsistent-action" names an invalidating claim but is not marked invalidated.'
      ])
    )
  })
})
