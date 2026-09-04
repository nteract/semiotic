import { describe, expect, it } from "vitest"
import { prepareArtifactRevision } from "./artifactRevision"
import { buildArtifactContract } from "./contract"
import type { ArtifactContract, Claim } from "./types"

const rows = [
  { month: 1, value: 4 },
  { month: 2, value: 7 },
  { month: 3, value: 6 }
]

const props = {
  data: rows,
  xAccessor: "month",
  yAccessor: "value",
  title: "Monthly values",
  description: "Values for three settled observations.",
  summary: "Values rose and then eased."
}

function originalContract(): ArtifactContract {
  return buildArtifactContract("LineChart", props, {
    id: "monthly-values",
    revision: "1",
    intents: ["trend"],
    purpose: { stakes: "informational" },
    claims: [
      {
        id: "monthly-values-claim-1",
        text: "The series ends at 6.",
        kind: "observation",
        status: "supported",
        evidenceIds: ["monthly-values-source"],
        authoredBy: { id: "data-desk", kind: "human" }
      }
    ],
    evidence: [
      {
        id: "monthly-values-source",
        role: "source-data",
        fingerprint: "sha256:monthly-values-source"
      }
    ],
    time: {
      eventTime: { value: "2026-08-31T12:00:00Z" },
      observedAt: "2026-08-31T12:00:00Z",
      processedAt: "2026-08-31T12:01:00Z",
      presentation: {
        state: "historical",
        label: "Values as of 2026-08-31 12:00 UTC"
      },
      freshness: {
        status: "fresh",
        checkedAt: "2026-08-31T12:02:00Z",
        basis: "bounded extract"
      },
      window: {
        start: "2026-08-01T00:00:00Z",
        end: "2026-09-01T00:00:00Z",
        status: "settled"
      },
      completeness: { status: "settled", basis: "bounded extract" },
      revision: { status: "original" }
    },
    reception: {
      channels: [{ channel: "visual" }, { channel: "agent" }],
      description: props.description,
      dataFallback: true
    },
    form: {
      chartFamily: "time-series",
      whyThisForm: "Position over time supports the stated comparison."
    },
    contestability: { sourceRequestsAllowed: true },
    accountability: {
      authors: [{ name: "Data desk", kind: "human" }]
    }
  })
}

const replacementClaim: Claim = {
  id: "monthly-values-claim-2",
  text: "After the correction, the series ends at 8.",
  kind: "observation",
  status: "supported",
  evidenceIds: ["monthly-values-source-v2"],
  asOf: "2026-08-31T12:10:00Z",
  authoredBy: { id: "data-desk", kind: "human" }
}

function revisionOptions() {
  return {
    revision: "2",
    data: [...rows.slice(0, 2), { month: 3, value: 8 }],
    evidence: [
      ...originalContract().evidence,
      {
        id: "monthly-values-source-v2",
        role: "source-data" as const,
        fingerprint: "sha256:monthly-values-source-v2",
        dataVersion: "2",
        observedAt: "2026-08-31T12:10:00Z"
      }
    ],
    presentation: {
      title: "Corrected monthly values",
      description: "Values after a late source record was included.",
      summary: "The corrected series ends at 8."
    },
    time: {
      eventTime: { value: "2026-08-31T12:10:00Z" },
      observedAt: "2026-08-31T12:10:00Z",
      processedAt: "2026-08-31T12:11:00Z",
      presentation: {
        state: "historical" as const,
        label: "Corrected values as of 2026-08-31 12:10 UTC"
      },
      window: {
        start: "2026-08-01T00:00:00Z",
        end: "2026-09-01T00:00:00Z",
        status: "corrected" as const
      },
      completeness: { status: "settled" as const, basis: "corrected extract" },
      revision: {
        status: "corrected" as const,
        reason: "A late source record changed the final value."
      }
    },
    claimTransitions: [
      {
        action: "supersede" as const,
        previousClaimId: "monthly-values-claim-1",
        replacement: replacementClaim,
        correction: {
          id: "monthly-values-correction-2",
          reason: "A late source record changed the final value.",
          createdAt: "2026-08-31T12:12:00Z"
        }
      }
    ],
    groundingChannels: ["visual" as const, "agent" as const],
    policy: "exploratory" as const,
    now: "2026-08-31T12:12:00Z",
    recommendRepresentation: false
  }
}

describe("prepareArtifactRevision", () => {
  it("moves data, claims, visible text, time, and grounding as one snapshot", () => {
    const current = originalContract()
    const propsBefore = structuredClone(props)
    const contractBefore = structuredClone(current)
    const result = prepareArtifactRevision(
      "LineChart",
      props,
      current,
      revisionOptions()
    )

    expect(props).toEqual(propsBefore)
    expect(current).toEqual(contractBefore)
    expect(result.evaluation.status).toBe("conditional")
    expect(result.publishable).toBe(false)
    expect(result.props).toMatchObject({
      data: [...rows.slice(0, 2), { month: 3, value: 8 }],
      title: "Corrected monthly values",
      description: "Values after a late source record was included.",
      summary: "The corrected series ends at 8."
    })
    expect(result.contract.artifact).toMatchObject({
      id: "monthly-values",
      revision: "2",
      title: "Corrected monthly values",
      configFingerprint: expect.stringMatching(/^sha256:/),
      dataFingerprint: expect.stringMatching(/^sha256:/)
    })
    expect(result.contract.artifact.dataFingerprint).not.toBe(
      current.artifact.dataFingerprint
    )
    expect(result.contract.claims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "monthly-values-claim-1",
          status: "superseded"
        }),
        expect.objectContaining({
          id: "monthly-values-claim-2",
          status: "supported",
          supersedes: ["monthly-values-claim-1"]
        })
      ])
    )
    expect(result.contract.evidence).toContainEqual(
      expect.objectContaining({
        id: "monthly-values-source-v2",
        dataVersion: "2"
      })
    )
    expect(result.contract.time?.revision).toEqual({
      status: "corrected",
      reason: "A late source record changed the final value.",
      previousArtifactId: "monthly-values",
      correctionId: "monthly-values-correction-2"
    })
    expect(result.contract.reception?.description).toBe(
      "Values after a late source record was included."
    )
    expect(result.contract.inheritance?.sourceArtifactIds).toContain(
      "monthly-values"
    )
    expect(result.changedClaimIds).toEqual([
      "monthly-values-claim-1",
      "monthly-values-claim-2"
    ])
    expect(result.evaluation.validation.artifact.valid).toBe(true)
    expect(result.evaluation.obligations).toContainEqual(
      expect.objectContaining({ id: "identity.data", status: "pass" })
    )
    expect(result.grounding.agent?.artifact.revision).toBe("2")
    expect(result.grounding.agent?.claims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "monthly-values-claim-2",
          status: "supported"
        })
      ])
    )
  })

  it("fails before returning a partial correction when linkage is missing", () => {
    const current = originalContract()
    const before = structuredClone(current)
    const options = revisionOptions()

    expect(() =>
      prepareArtifactRevision("LineChart", props, current, {
        ...options,
        time: {
          ...options.time,
          revision: {
            ...options.time.revision,
            correctionId: "unrelated-correction"
          }
        }
      })
    ).toThrow(/must link a correction/)
    expect(() =>
      prepareArtifactRevision("LineChart", props, current, {
        ...options,
        claimTransitions: []
      })
    ).toThrow(/requires an explicit claim transition/)
    expect(current).toEqual(before)
  })

  it("replays deterministically from explicit inputs", () => {
    const current = originalContract()
    const first = prepareArtifactRevision(
      "LineChart",
      props,
      current,
      revisionOptions()
    )
    const second = prepareArtifactRevision(
      "LineChart",
      props,
      current,
      revisionOptions()
    )

    expect(second).toEqual(first)
  })

  it("clears contract text when visible text is explicitly removed", () => {
    const current = originalContract()
    const result = prepareArtifactRevision("LineChart", props, current, {
      revision: "2",
      propUpdates: { title: undefined, description: undefined },
      time: {
        revision: { status: "original" }
      },
      policy: "exploratory",
      now: "2026-08-31T12:12:00Z",
      recommendRepresentation: false
    })

    expect(result.props.title).toBeUndefined()
    expect(result.props.description).toBeUndefined()
    expect(result.contract.artifact.title).toBeUndefined()
    expect(result.contract.reception?.description).toBeUndefined()
  })

  it.each([
    { data: [...rows].reverse() },
    { propUpdates: { yAccessor: "otherValue" } },
    {
      evidence: [
        ...originalContract().evidence,
        {
          id: "new-source",
          role: "source-data" as const,
          fingerprint: "sha256:new-source"
        }
      ]
    }
  ])(
    "does not rebind changed evidence or configuration with stale claims: %j",
    (update) => {
      const current = originalContract()
      const before = structuredClone(current)
      expect(() =>
        prepareArtifactRevision("LineChart", props, current, {
          revision: "2",
          time: {},
          ...update
        })
      ).toThrow(/explicit claim transition/)
      expect(current).toEqual(before)
    }
  )

  it("does not use already changed props as the previous revision", () => {
    expect(() =>
      prepareArtifactRevision(
        "LineChart",
        {
          ...props,
          data: [...rows].reverse()
        },
        originalContract(),
        revisionOptions()
      )
    ).toThrow(/current props must match/)
  })

  it("preserves old evidence identities even when claims are explicitly revised", () => {
    const options = revisionOptions()
    options.evidence[0] = {
      ...options.evidence[0],
      fingerprint: "sha256:rewritten-history"
    }
    expect(() =>
      prepareArtifactRevision("LineChart", props, originalContract(), options)
    ).toThrow(/needs a new identifier/)
  })

  it("requires reassessment of every active claim when dependencies are unscoped", () => {
    const current = originalContract()
    current.claims.push({ ...current.claims[0], id: "another-active-claim" })
    expect(() =>
      prepareArtifactRevision("LineChart", props, current, revisionOptions())
    ).toThrow(/another-active-claim/)
  })
})
