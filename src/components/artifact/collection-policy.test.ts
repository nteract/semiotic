import { describe, expect, it } from "vitest"
import { auditClaims } from "./claims"
import {
  auditArtifactCollection,
  serializeArtifactCollection,
  validateArtifactCollection,
  type ArtifactCollectionContract
} from "./collection"
import { buildArtifactContract } from "./contract"
import type { RenderEvidence } from "../server/renderEvidence"
import type { ArtifactContract, Claim } from "./types"

const rows = [
  { month: 1, value: 4 },
  { month: 2, value: 7 }
]

const props = {
  data: rows,
  xAccessor: "month",
  yAccessor: "value",
  title: "Monthly values",
  description: "Two monthly observations.",
  summary: "The second value is higher.",
  accessibleTable: true
}

function reviewedPanel(
  id = "policy-panel",
  claim: Partial<Claim> = {}
): ArtifactContract {
  return buildArtifactContract("LineChart", props, {
    id,
    intents: ["trend"],
    purpose: {
      stakes: "informational",
      allowedUses: ["reviewed explanation"]
    },
    claims: [
      {
        id: `${id}-claim`,
        text: "The second value is higher than the first.",
        kind: "observation",
        status: "supported",
        evidenceIds: [`${id}-evidence`],
        authoredBy: { id: "model-author", kind: "agent" },
        ...claim
      }
    ],
    evidence: [{ id: `${id}-evidence`, role: "source-data" }],
    time: {
      observedAt: "2026-09-01T00:00:00Z",
      processedAt: "2026-09-01T00:01:00Z",
      snapshotAt: "2026-09-01T00:01:30Z",
      publishedAt: "2026-09-01T00:02:00Z",
      presentation: { state: "historical" },
      window: {
        start: "2026-08-01T00:00:00Z",
        end: "2026-09-01T00:00:00Z",
        status: "settled"
      },
      completeness: { status: "settled", basis: "Versioned extract" },
      revision: { status: "original" },
      snapshot: { id: `${id}-snapshot`, format: "other" }
    },
    reception: {
      channels: [{ channel: "visual" }, { channel: "screen-reader" }],
      description: props.description,
      dataFallback: true
    },
    form: {
      chartFamily: "time-series",
      whyThisForm: "Position encodes the declared comparison."
    },
    contestability: { sourceRequestsAllowed: true },
    accountability: {
      generatedBy: "collection-policy-test",
      authors: [{ id: "model-author", kind: "agent" }]
    },
    inheritance: {
      preservation: "claim-evidence-preserved",
      rawDataDefault: "exclude"
    }
  })
}

function collectionWith(
  artifact: ArtifactContract,
  policyId?: string
): ArtifactCollectionContract {
  return {
    collectionVersion: "0.1",
    id: "policy-collection",
    artifacts: [artifact],
    ...(policyId !== undefined ? { policyId } : {})
  }
}

function paintedLineEvidence(
  overrides: Partial<RenderEvidence> = {}
): RenderEvidence {
  return {
    component: "LineChart",
    frameType: "xy",
    status: "ok",
    empty: false,
    markCount: 2,
    markCountByType: { line: 1, point: 2 },
    width: 500,
    height: 300,
    annotationCount: 0,
    ariaLabel: props.description,
    warnings: [],
    semanticStatus: "meaningful",
    ...overrides
  }
}

describe("collection policy enforcement", () => {
  it("applies a declared versioned policy more strictly than the default panel audit", () => {
    const artifact = reviewedPanel()
    const withoutPolicy = auditArtifactCollection(collectionWith(artifact))
    const withPolicy = auditArtifactCollection(
      collectionWith(artifact, "agent-generated"),
      { now: "2026-09-03T00:00:00Z" }
    )

    expect(auditClaims(artifact).ok).toBe(true)
    expect(withoutPolicy.ok).toBe(true)
    expect(withPolicy).toMatchObject({
      ok: false,
      policy: { id: "agent-generated", version: "0.1" }
    })
    expect(withPolicy.findings.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "collection.policy.render-evidence-missing.policy-panel",
        "collection.policy.evidence-identity-required.policy-panel",
        "collection.policy.artifact.policy-panel.claims.model-review.policy-panel-claim"
      ])
    )
  })

  it("accepts compatible non-empty renderer proof under a strict policy", () => {
    const artifact = reviewedPanel("rendered-panel")
    artifact.evidence[0].fingerprint = "sha256:known-evidence"
    artifact.claims[0].review = {
      status: "approved",
      reviewer: { id: "human-reviewer", kind: "human" },
      reviewedAt: "2026-09-02T00:00:00Z"
    }

    const audit = auditArtifactCollection(
      collectionWith(artifact, "agent-generated"),
      {
        now: "2026-09-03T00:00:00Z",
        renderEvidenceByArtifactId: {
          "rendered-panel": paintedLineEvidence()
        }
      }
    )

    expect(audit.ok).toBe(true)
    expect(audit.findings).toContainEqual(
      expect.objectContaining({
        id: "collection.policy.render-evidence.rendered-panel",
        status: "pass"
      })
    )
  })

  it("fails closed for mismatched, empty, and degraded renderer proof", () => {
    const artifact = reviewedPanel("unproven-panel")
    const collection = collectionWith(artifact, "agent-generated")
    const mismatched = auditArtifactCollection(collection, {
      renderEvidenceByArtifactId: {
        "unproven-panel": paintedLineEvidence({ component: "BarChart" })
      }
    })
    const empty = auditArtifactCollection(collection, {
      renderEvidenceByArtifactId: {
        "unproven-panel": paintedLineEvidence({
          status: "empty",
          empty: true,
          markCount: 0,
          markCountByType: {}
        })
      }
    })
    const degraded = auditArtifactCollection(collection, {
      renderEvidenceByArtifactId: {
        "unproven-panel": paintedLineEvidence({
          semanticStatus: "degraded"
        })
      }
    })

    expect(mismatched.findings).toContainEqual(
      expect.objectContaining({
        id: "collection.policy.render-evidence-component.unproven-panel",
        status: "fail"
      })
    )
    expect(empty.findings).toContainEqual(
      expect.objectContaining({
        id: "collection.policy.render-evidence-empty.unproven-panel",
        status: "fail"
      })
    )
    expect(degraded.findings).toContainEqual(
      expect.objectContaining({
        id: "collection.policy.render-evidence-semantic.unproven-panel",
        status: "fail"
      })
    )
  })

  it("enforces policy claim-status, time, and relation obligations per artifact", () => {
    const artifact = reviewedPanel("unknown-panel", {
      status: "unknown",
      authoredBy: { id: "human-author", kind: "human" }
    })
    artifact.evidence[0].fingerprint = "sha256:known-evidence"
    artifact.time = undefined

    const audit = auditArtifactCollection(
      collectionWith(artifact, "editorial"),
      { now: "2026-09-03T00:00:00Z" }
    )

    expect(audit.findings.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "collection.policy.unknown-claim.unknown-panel.unknown-panel-claim",
        "collection.policy.time-required.unknown-panel",
        "collection.policy.relation.unknown-panel.time"
      ])
    )
  })

  it("fails closed for an unknown policy without changing validation or transfer", () => {
    const collection = collectionWith(
      reviewedPanel("unknown-policy-panel"),
      "unregistered-policy"
    )

    const validation = validateArtifactCollection(collection)
    const serialized = serializeArtifactCollection(collection)
    const audit = auditArtifactCollection(collection)

    expect(validation.valid).toBe(true)
    expect(serialized).toMatchObject({
      collection: { policyId: "unregistered-policy" },
      transfer: { status: "preserved" }
    })
    expect(audit.ok).toBe(false)
    expect(audit.findings).toContainEqual(
      expect.objectContaining({
        id: "collection.policy.unknown",
        status: "fail",
        path: "policyId"
      })
    )
  })

  it("keeps known policy failures out of structural collection validation", () => {
    const collection = collectionWith(
      reviewedPanel("strict-transfer-panel"),
      "agent-generated"
    )

    expect(auditArtifactCollection(collection).ok).toBe(false)
    expect(validateArtifactCollection(collection).valid).toBe(true)
    expect(serializeArtifactCollection(collection).transfer.status).toBe(
      "preserved"
    )
  })
})

describe("collection correction lifecycle auditing", () => {
  it("rejects a correction while its affected claim remains active", () => {
    const artifact = reviewedPanel("active-correction")
    const collection: ArtifactCollectionContract = {
      ...collectionWith(artifact),
      corrections: [
        {
          id: "retire-active-claim",
          affectedClaimIds: ["active-correction-claim"],
          reason: "A later review invalidated the bounded claim."
        }
      ]
    }

    const audit = auditArtifactCollection(collection)
    const validation = validateArtifactCollection(collection)

    expect(audit.ok).toBe(false)
    expect(audit.findings).toContainEqual(
      expect.objectContaining({
        id: "collection.correction-affected-status.retire-active-claim.active-correction.active-correction-claim",
        relation: "challenge-and-correction",
        status: "fail"
      })
    )
    expect(validation).toMatchObject({
      valid: false,
      errors: [
        expect.objectContaining({
          message:
            'Correction "retire-active-claim" affects claim "active-correction/active-correction-claim", but the claim remains supported.'
        })
      ]
    })
    expect(serializeArtifactCollection(collection).transfer.status).toBe(
      "invalid"
    )
  })

  it("accepts a coherent scoped replacement without retiring a same-named claim elsewhere", () => {
    const historical = reviewedPanel("historical-panel", {
      id: "shared-claim",
      status: "superseded"
    })
    historical.claims.push({
      ...historical.claims[0],
      id: "replacement-claim",
      status: "supported",
      supersedes: ["shared-claim"]
    })
    const current = reviewedPanel("current-panel", { id: "shared-claim" })
    const collection: ArtifactCollectionContract = {
      ...collectionWith(historical),
      artifacts: [historical, current],
      corrections: [
        {
          id: "scoped-replacement",
          affectedClaimIds: ["shared-claim"],
          replacementClaimIds: ["replacement-claim"],
          reason: "A corrected result replaced the earlier bounded claim.",
          scope: {
            affectedClaims: [
              { artifactId: "historical-panel", claimId: "shared-claim" }
            ],
            replacementClaims: [
              {
                artifactId: "historical-panel",
                claimId: "replacement-claim"
              }
            ]
          }
        }
      ]
    }

    const audit = auditArtifactCollection(collection)

    expect(audit.ok).toBe(true)
    expect(validateArtifactCollection(collection).valid).toBe(true)
    expect(
      audit.findings.filter(({ id }) => id.startsWith("collection.correction-"))
    ).toEqual([])
  })

  it("accepts a retracted affected claim when no replacement is declared", () => {
    const artifact = reviewedPanel("retracted-correction", {
      status: "retracted"
    })
    const collection: ArtifactCollectionContract = {
      ...collectionWith(artifact),
      corrections: [
        {
          id: "retraction-only",
          affectedClaimIds: ["retracted-correction-claim"],
          reason: "The bounded claim was withdrawn without replacement."
        }
      ]
    }

    expect(auditArtifactCollection(collection).ok).toBe(true)
    expect(validateArtifactCollection(collection).valid).toBe(true)
  })

  it("reports an unscoped same-named affected claim once without cascading state findings", () => {
    const historical = reviewedPanel("ambiguous-history", {
      id: "shared-claim",
      status: "retracted"
    })
    const current = reviewedPanel("ambiguous-current", { id: "shared-claim" })
    const collection: ArtifactCollectionContract = {
      ...collectionWith(historical),
      artifacts: [historical, current],
      corrections: [
        {
          id: "ambiguous-affected",
          affectedClaimIds: ["shared-claim", "shared-claim"],
          reason: "The target artifact was not declared."
        }
      ]
    }

    const correctionFindings = auditArtifactCollection(
      collection
    ).findings.filter(({ id }) => id.startsWith("collection.correction-"))

    expect(correctionFindings.map(({ id }) => id)).toEqual([
      "collection.correction-claim-ambiguous.ambiguous-affected.affected.shared-claim"
    ])
  })

  it("fails closed when an unscoped replacement identifier is ambiguous", () => {
    const historical = reviewedPanel("replacement-history", {
      id: "historical-claim",
      status: "superseded"
    })
    historical.claims.push({
      ...historical.claims[0],
      id: "shared-replacement",
      status: "supported",
      supersedes: ["historical-claim"]
    })
    const other = reviewedPanel("replacement-other", {
      id: "shared-replacement"
    })
    const collection: ArtifactCollectionContract = {
      ...collectionWith(historical),
      artifacts: [historical, other],
      corrections: [
        {
          id: "ambiguous-replacement",
          affectedClaimIds: ["historical-claim"],
          replacementClaimIds: ["shared-replacement"],
          reason: "The replacement artifact was not declared."
        }
      ]
    }

    const correctionFindings = auditArtifactCollection(
      collection
    ).findings.filter(({ id }) => id.startsWith("collection.correction-"))

    expect(correctionFindings.map(({ id }) => id)).toEqual([
      "collection.correction-claim-ambiguous.ambiguous-replacement.replacement.shared-replacement"
    ])
  })

  it("rejects one exact claim as both the affected and replacement target", () => {
    const artifact = reviewedPanel("overlap-panel", {
      status: "superseded"
    })
    const claimId = artifact.claims[0].id
    const collection: ArtifactCollectionContract = {
      ...collectionWith(artifact),
      corrections: [
        {
          id: "overlapping-target",
          affectedClaimIds: [claimId],
          replacementClaimIds: [claimId],
          reason: "The declared replacement repeats the historical target."
        }
      ]
    }

    expect(auditArtifactCollection(collection).findings).toContainEqual(
      expect.objectContaining({
        id: `collection.correction-target-overlap.overlapping-target.overlap-panel.${claimId}`,
        status: "fail"
      })
    )
  })
})
