import { describe, expect, it } from "vitest"
import { retractClaim } from "./claims"
import { recommendRepresentation } from "./representation"
import type { ArtifactContract } from "./types"

const rows = [
  { step: 1, value: 2 },
  { step: 2, value: 3 }
]

const contract: ArtifactContract = {
  contractVersion: "0.1",
  artifact: {
    id: "representation-policy-exception",
    kind: "agent-answer",
    component: "LineChart"
  },
  purpose: {
    intents: [{ id: "trend", strength: "primary", source: "author" }],
    stakes: "informational"
  },
  claims: [
    {
      id: "generated-change",
      text: "The second recorded value is higher than the first.",
      kind: "observation",
      status: "supported",
      evidenceIds: ["source-values"],
      authoredBy: { id: "agent-writer", kind: "agent" },
      asOf: "2026-09-01T00:00:00Z"
    }
  ],
  evidence: [
    {
      id: "source-values",
      role: "source-data",
      fingerprint: "sha256:source-values-v1",
      observedAt: "2026-09-01T00:00:00Z",
      relationship: "descriptive"
    }
  ],
  time: {
    observedAt: "2026-09-01T00:00:00Z",
    processedAt: "2026-09-01T00:01:00Z",
    snapshotAt: "2026-09-01T00:01:30Z",
    publishedAt: "2026-09-01T00:02:00Z",
    presentation: { state: "historical", label: "Settled observations" },
    freshness: {
      status: "fresh",
      checkedAt: "2026-09-01T00:02:00Z",
      expiresAt: "2026-10-01T00:00:00Z"
    },
    window: {
      start: "2026-08-01T00:00:00Z",
      end: "2026-09-01T00:00:00Z",
      status: "settled"
    },
    completeness: { status: "settled", basis: "Two recorded observations" },
    revision: { status: "original" }
  }
}

describe("representation policy exceptions", () => {
  it("applies only accountable exceptions that remain valid at the explicit clock", () => {
    const activeException = {
      rule: "requireReviewForModelClaims" as const,
      rationale: "A named reviewer will complete this bounded internal review.",
      owner: "review-team",
      reviewAt: "2026-09-05T00:00:00Z"
    }
    const expiredException = {
      ...activeException,
      reviewAt: "2026-09-02T00:00:00Z"
    }

    const withoutException = recommendRepresentation(rows, contract, {
      policy: "agent-generated",
      now: "2026-09-03T00:00:00Z"
    })
    const active = recommendRepresentation(rows, contract, {
      policy: "agent-generated",
      exceptions: [activeException],
      now: "2026-09-03T00:00:00Z"
    })
    const expired = recommendRepresentation(rows, contract, {
      policy: "agent-generated",
      exceptions: [expiredException],
      now: "2026-09-03T00:00:00Z"
    })

    expect(withoutException.selected.kind).toBe("no-claim")
    expect(active.selected.kind).not.toBe("no-claim")
    expect(active.policy.appliedExceptions).toEqual([activeException])
    expect(expired.selected.kind).toBe("no-claim")
    expect(expired.policy.rejectedExceptions).toEqual([expiredException])
  })

  it("returns an explicit no-active-claim outcome when only retracted history remains", () => {
    const retracted = retractClaim(contract, "generated-change", {
      id: "withdraw-generated-change",
      reason: "The earlier statement was withdrawn.",
      createdAt: "2026-09-02T00:00:00Z",
      createdBy: { id: "review-desk", kind: "human" }
    })

    const strict = recommendRepresentation(rows, retracted, {
      policy: "public-civic",
      now: "2026-09-03T00:00:00Z"
    })
    const exploratory = recommendRepresentation(rows, retracted, {
      policy: "exploratory",
      now: "2026-09-03T00:00:00Z"
    })

    expect(strict).toMatchObject({
      status: "refuse",
      selected: {
        kind: "no-claim",
        label: "No active claim remains",
        reasons: [expect.stringContaining("retracted or superseded history")]
      }
    })
    expect(exploratory).toMatchObject({
      status: "conditional",
      selected: {
        kind: "no-claim",
        label: "No active claim remains"
      }
    })
  })

  it("does not let retracted history block an active supported replacement", () => {
    const retracted = retractClaim(contract, "generated-change", {
      id: "withdraw-generated-change",
      reason: "The earlier statement was replaced after review.",
      createdAt: "2026-09-02T00:00:00Z",
      createdBy: { id: "review-desk", kind: "human" }
    })
    const corrected: ArtifactContract = {
      ...retracted,
      claims: [
        ...retracted.claims,
        {
          id: "reviewed-change",
          text: "The second recorded value is one unit higher than the first.",
          kind: "observation",
          status: "supported",
          evidenceIds: ["source-values"],
          authoredBy: { id: "review-desk", kind: "human" },
          asOf: "2026-09-02T00:00:00Z"
        }
      ]
    }

    const result = recommendRepresentation(rows, corrected, {
      policy: "public-civic",
      now: "2026-09-03T00:00:00Z"
    })

    expect(result.status).not.toBe("refuse")
    expect(result.selected.kind).not.toBe("no-claim")
  })
})
