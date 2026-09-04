import { describe, expect, it } from "vitest"
import { auditClaims } from "./claims"
import { ARTIFACT_POLICIES, activePolicyRules } from "./policies"
import { auditTemporalContext } from "./temporal"

describe("deterministic temporal metadata validation", () => {
  it("rejects malformed frontier timestamps and lateness durations", () => {
    const malformedFrontier = auditTemporalContext({
      watermark: {
        value: "2026-09-01T12:00:00",
        allowedLateness: "PT18S"
      },
      completeness: { status: "provisional" }
    })

    expect(malformedFrontier.findings).toContainEqual(
      expect.objectContaining({
        id: "time.clock.invalid.watermark-frontier",
        status: "fail",
        path: "time.watermark.value"
      })
    )

    for (const allowedLateness of ["", "18 seconds", "-PT18S", "P1M", "P1DT"]) {
      const audit = auditTemporalContext({
        watermark: {
          value: "2026-09-01T12:00:00Z",
          allowedLateness
        },
        completeness: { status: "provisional" }
      })

      expect(
        audit.findings,
        `expected ${JSON.stringify(allowedLateness)} to be rejected`
      ).toContainEqual(
        expect.objectContaining({
          id: "time.watermark.allowed-lateness-invalid",
          status: "fail"
        })
      )
    }
  })

  it("accepts nonnegative fixed-unit ISO durations", () => {
    for (const allowedLateness of ["PT0S", "PT18S", "PT1H30M", "P2D", "P1W"]) {
      const audit = auditTemporalContext({
        processedAt: "2026-09-01T12:05:00Z",
        watermark: {
          value: "2026-09-01T12:00:00Z",
          allowedLateness
        },
        completeness: { status: "provisional" }
      })

      expect(audit.findings.map(({ id }) => id)).not.toContain(
        "time.watermark.allowed-lateness-invalid"
      )
    }
  })

  it("rejects a frontier later than every declared processing or source clock", () => {
    const processingAudit = auditTemporalContext({
      processedAt: "2026-09-01T12:09:00Z",
      watermark: { value: "2026-09-01T12:11:00Z" },
      completeness: { status: "provisional" }
    })
    const sourceAudit = auditTemporalContext({
      watermark: { value: "2026-09-01T12:11:00Z" },
      completeness: { status: "provisional" },
      sources: [
        {
          id: "hourly-rollup",
          kind: "processing-job",
          observedAt: "2026-09-01T12:10:00Z"
        }
      ]
    })

    for (const audit of [processingAudit, sourceAudit]) {
      expect(audit.findings).toContainEqual(
        expect.objectContaining({
          id: "time.watermark.after-declared-clock",
          status: "fail",
          path: "time.watermark.value"
        })
      )
    }
  })

  it("does not call a window settled before the frontier reaches its end", () => {
    const audit = auditTemporalContext({
      processedAt: "2026-09-01T12:15:00Z",
      watermark: {
        value: "2026-09-01T12:09:59Z",
        allowedLateness: "PT30S"
      },
      window: {
        start: "2026-09-01T12:00:00Z",
        end: "2026-09-01T12:10:00Z",
        status: "settled"
      },
      completeness: { status: "settled" }
    })

    expect(audit.findings).toContainEqual(
      expect.objectContaining({
        id: "time.watermark.before-settled-window-end",
        status: "fail"
      })
    )
  })

  it("rejects timezone-less exception bounds and reference clocks", () => {
    const localBound = {
      rule: "refuseUnknownClaims" as const,
      rationale: "Bounded review",
      owner: "Review desk",
      expiresAt: "2026-09-03T00:00:00"
    }
    const absoluteBound = {
      ...localBound,
      expiresAt: "2026-09-03T00:00:00Z"
    }

    expect(
      activePolicyRules(
        ARTIFACT_POLICIES.editorial,
        [localBound],
        "2026-09-02T00:00:00Z"
      ).rejectedExceptions
    ).toEqual([localBound])
    expect(
      activePolicyRules(
        ARTIFACT_POLICIES.editorial,
        [absoluteBound],
        "2026-09-02T00:00:00"
      ).rejectedExceptions
    ).toEqual([absoluteBound])
  })

  it("rejects timezone-less review decisions and review reference clocks", () => {
    const auditReview = (reviewedAt: string, now: string) =>
      auditClaims(
        {
          claims: [
            {
              id: "generated-summary",
              kind: "observation",
              status: "supported",
              evidenceIds: ["source"],
              authoredBy: { id: "generator", kind: "agent" },
              review: {
                status: "approved",
                reviewer: { id: "reviewer", kind: "human" },
                reviewedAt
              }
            }
          ],
          evidence: [
            {
              id: "source",
              role: "source-data",
              fingerprint: "sha256:source"
            }
          ],
          accountability: {
            generatedBy: "deterministic fixture",
            reviews: [
              {
                id: "release-review",
                status: "approved",
                reviewer: { id: "reviewer", kind: "human" },
                reviewedAt
              }
            ]
          }
        },
        { requireReviewForModelClaims: true, now }
      )

    const localDecision = auditReview(
      "2026-09-01T00:00:00",
      "2026-09-02T00:00:00Z"
    )
    expect(localDecision.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "claims.model-review.generated-summary",
          status: "fail"
        }),
        expect.objectContaining({
          id: "reviews.attribution.release-review",
          status: "warn"
        })
      ])
    )

    const localReference = auditReview(
      "2026-09-01T00:00:00Z",
      "2026-09-02T00:00:00"
    )
    expect(localReference.findings).toContainEqual(
      expect.objectContaining({
        id: "claims.model-review.generated-summary",
        status: "fail"
      })
    )
  })
})
