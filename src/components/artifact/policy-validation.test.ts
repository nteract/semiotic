import { describe, expect, it } from "vitest"
import { buildArtifactContract, validateArtifactContract } from "./contract"
import { evaluateArtifact } from "./evaluateArtifact"
import { ARTIFACT_FIELD_POLICIES } from "./fieldPolicies"
import {
  activePolicyRules,
  ARTIFACT_POLICIES,
  resolveArtifactPolicy,
  type ArtifactPolicy,
  type ArtifactPolicyException
} from "./policies"

describe("artifact policy boundaries", () => {
  it("does not apply expiring exceptions without a valid explicit clock", () => {
    const exception = {
      rule: "refuseUnknownClaims" as const,
      rationale: "Time-bounded editorial review",
      owner: "Review desk",
      expiresAt: "2026-09-03T00:00:00Z"
    }

    expect(
      activePolicyRules(ARTIFACT_POLICIES.editorial, [exception])
        .rejectedExceptions
    ).toEqual([exception])
    expect(
      activePolicyRules(
        ARTIFACT_POLICIES.editorial,
        [exception],
        "2026-09-02T00:00:00Z"
      ).appliedExceptions
    ).toEqual([exception])
  })

  it("rejects unbounded, unattributed, expired, permissive, and non-own exceptions", () => {
    const future = "2026-09-03T00:00:00Z"
    const exceptions: ArtifactPolicyException[] = [
      {
        rule: "refuseUnknownClaims",
        rationale: "No time bound",
        owner: "Review desk"
      },
      {
        rule: "refuseUnknownClaims",
        rationale: "   ",
        owner: "Review desk",
        expiresAt: future
      },
      {
        rule: "refuseUnknownClaims",
        rationale: "Missing owner",
        owner: " ",
        expiresAt: future
      },
      {
        rule: "refuseUnknownClaims",
        rationale: "Past review window",
        owner: "Review desk",
        reviewAt: "2026-08-31T00:00:00Z"
      },
      {
        rule: "requireFreshnessForLive",
        rationale: "Already disabled",
        owner: "Review desk",
        expiresAt: future
      },
      {
        rule: "allowManualChecks",
        rationale: "Permission flags are not waivers",
        owner: "Review desk",
        expiresAt: future
      },
      {
        rule: "allowExceptions",
        rationale: "Exception control cannot waive itself",
        owner: "Review desk",
        expiresAt: future
      },
      {
        rule: "toString",
        rationale: "Inherited keys are not policy rules",
        owner: "Review desk",
        expiresAt: future
      },
      {
        rule: "refuseUnknownClaims",
        rationale: "Every supplied bound must be valid",
        owner: "Review desk",
        expiresAt: "",
        reviewAt: future
      }
    ]

    const result = activePolicyRules(
      ARTIFACT_POLICIES.editorial,
      exceptions,
      "2026-09-01T00:00:00Z"
    )

    expect(result.appliedExceptions).toEqual([])
    expect(result.rejectedExceptions).toEqual(exceptions)
    expect(result.rules.allowManualChecks).toBe(true)
    expect(result.rules.refuseUnknownClaims).toBe(true)
  })

  it("freezes built-in policies while returning independent mutable copies", () => {
    expect(Object.isFrozen(ARTIFACT_POLICIES)).toBe(true)
    for (const policy of Object.values(ARTIFACT_POLICIES)) {
      expect(Object.isFrozen(policy)).toBe(true)
      expect(Object.isFrozen(policy.rules)).toBe(true)
      expect(Object.isFrozen(policy.requiredRelations)).toBe(true)
    }

    const resolved = resolveArtifactPolicy("editorial")
    resolved.rules.requireClaims = false
    resolved.requiredRelations.length = 0

    expect(ARTIFACT_POLICIES.editorial.rules.requireClaims).toBe(true)
    expect(
      ARTIFACT_POLICIES.editorial.requiredRelations.length
    ).toBeGreaterThan(0)
  })

  it("accepts complete custom policies and returns independent nested values", () => {
    const custom: ArtifactPolicy = {
      ...ARTIFACT_POLICIES.exploratory,
      id: "organization-preview",
      version: "1.0",
      label: "Organization preview",
      description: "A complete organization-owned preview policy.",
      minimumStakes: "informational",
      rules: { ...ARTIFACT_POLICIES.exploratory.rules },
      requiredRelations: ["claim-support", "representation-fit", "time"]
    }

    const resolved = resolveArtifactPolicy(custom)

    expect(resolved).toEqual(custom)
    expect(resolved).not.toBe(custom)
    expect(resolved.rules).not.toBe(custom.rules)
    expect(resolved.requiredRelations).not.toBe(custom.requiredRelations)
  })

  it.each([
    ["non-object input", null],
    [
      "unknown top-level field",
      {
        ...ARTIFACT_POLICIES.exploratory,
        id: "invalid-extra-field",
        unexpected: true
      }
    ],
    [
      "blank required field",
      {
        ...ARTIFACT_POLICIES.exploratory,
        id: "invalid-label",
        label: "   "
      }
    ],
    [
      "missing rule",
      {
        ...ARTIFACT_POLICIES.exploratory,
        id: "invalid-missing-rule",
        rules: { requireClaims: false }
      }
    ],
    [
      "non-boolean rule",
      {
        ...ARTIFACT_POLICIES.exploratory,
        id: "invalid-rule-value",
        rules: {
          ...ARTIFACT_POLICIES.exploratory.rules,
          refuseUnknownClaims: "false"
        }
      }
    ],
    [
      "unknown rule",
      {
        ...ARTIFACT_POLICIES.exploratory,
        id: "invalid-extra-rule",
        rules: {
          ...ARTIFACT_POLICIES.exploratory.rules,
          skipReview: true
        }
      }
    ],
    [
      "empty relations",
      {
        ...ARTIFACT_POLICIES.exploratory,
        id: "invalid-empty-relations",
        requiredRelations: []
      }
    ],
    [
      "unknown relation",
      {
        ...ARTIFACT_POLICIES.exploratory,
        id: "invalid-relation",
        requiredRelations: ["claim-support", "trust-me"]
      }
    ],
    [
      "duplicate relation",
      {
        ...ARTIFACT_POLICIES.exploratory,
        id: "invalid-duplicate-relation",
        requiredRelations: ["claim-support", "claim-support"]
      }
    ],
    [
      "missing minimum stakes",
      {
        ...ARTIFACT_POLICIES.exploratory,
        id: "invalid-missing-stakes"
      }
    ],
    [
      "unknown minimum stakes",
      {
        ...ARTIFACT_POLICIES.exploratory,
        id: "invalid-stakes",
        minimumStakes: "urgent"
      }
    ]
  ])("rejects a custom policy with %s", (_case, value) => {
    expect(() => resolveArtifactPolicy(value as never)).toThrow(
      "Invalid custom artifact policy"
    )
  })

  it("rejects altered definitions that claim a built-in policy id", () => {
    const spoofed = {
      ...ARTIFACT_POLICIES.editorial,
      rules: {
        ...ARTIFACT_POLICIES.editorial.rules,
        refuseUnsupportedClaims: false
      }
    }
    const exactClone = {
      ...ARTIFACT_POLICIES.editorial,
      rules: { ...ARTIFACT_POLICIES.editorial.rules },
      requiredRelations: [...ARTIFACT_POLICIES.editorial.requiredRelations]
    }

    expect(() => resolveArtifactPolicy(spoofed)).toThrow(
      'built-in policy id "editorial" cannot be redefined'
    )
    expect(resolveArtifactPolicy(exactClone)).toEqual(
      ARTIFACT_POLICIES.editorial
    )
  })

  it("keeps declared manual checks visible and enforceable by policy", () => {
    const props = {
      data: [{ category: "A", value: 2 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      title: "One category",
      description: "One category with a value of two.",
      summary: "A bounded example."
    }
    const contract = buildArtifactContract("BarChart", props, {
      id: "manual-check-case",
      intents: ["compare-categories"],
      reception: {
        channels: [{ channel: "screen-reader" }],
        manualChecks: ["Confirm the reading order with assistive technology."]
      }
    })
    const policy = {
      ...ARTIFACT_POLICIES.exploratory,
      id: "manual-check-required",
      minimumStakes: "exploratory" as const,
      rules: {
        ...ARTIFACT_POLICIES.exploratory.rules,
        allowManualChecks: false
      }
    }

    const evaluation = evaluateArtifact("BarChart", props, contract, {
      policy,
      recommendRepresentation: false
    })

    expect(evaluation.status).toBe("refuse")
    expect(evaluation.obligations).toContainEqual(
      expect.objectContaining({
        id: "reception.manual-check.1",
        status: "manual",
        path: "reception.manualChecks[0]"
      })
    )
    expect(evaluation.manualChecks).toContain(
      "Confirm the reading order with assistive technology."
    )
  })

  it("makes strict required relations blocking while exploratory gaps stay visible", () => {
    const props = {
      data: [{ category: "A", value: 2 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      title: "One category",
      description: "One category with a value of two.",
      summary: "A bounded example."
    }
    const contract = buildArtifactContract("BarChart", props, {
      id: "minimal-policy-case",
      intents: ["compare-categories"],
      claims: [
        {
          id: "value",
          text: "A has a value of two.",
          kind: "observation",
          status: "supported",
          evidenceIds: ["rows"]
        }
      ],
      evidence: [
        {
          id: "rows",
          role: "source-data",
          fingerprint: "sha256:rows"
        }
      ]
    })

    const exploratory = evaluateArtifact("BarChart", props, contract, {
      policy: "exploratory",
      recommendRepresentation: false
    })
    const strict = evaluateArtifact("BarChart", props, contract, {
      policy: "editorial",
      recommendRepresentation: false
    })

    expect(exploratory.status).not.toBe("refuse")
    expect(exploratory.obligations).toContainEqual(
      expect.objectContaining({
        id: "policy.relation.representation-fit",
        status: "unknown"
      })
    )
    expect(strict.status).toBe("refuse")
    expect(strict.obligations).toContainEqual(
      expect.objectContaining({
        id: "policy.relation.challenge-and-correction",
        status: "fail"
      })
    )
  })

  it("does not treat empty relation sections as substantive policy evidence", () => {
    const props = {
      data: [{ category: "A", value: 2 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      title: "One category",
      description: "One category with a value of two.",
      summary: "A bounded example."
    }
    const contract = buildArtifactContract("BarChart", props, {
      id: "empty-policy-sections",
      intents: ["compare-categories"],
      purpose: {
        stakes: "informational",
        allowedUses: ["Editorial review"]
      },
      claims: [
        {
          id: "value",
          kind: "observation",
          status: "supported",
          evidenceIds: ["rows"]
        }
      ],
      evidence: [
        { id: "rows", role: "source-data", fingerprint: "sha256:rows" }
      ],
      time: {},
      reception: { channels: [] },
      form: {},
      contestability: {},
      accountability: {},
      inheritance: {}
    })

    const evaluation = evaluateArtifact("BarChart", props, contract, {
      policy: "editorial",
      recommendRepresentation: false
    })
    const policyRelations = evaluation.obligations.filter(({ id }) =>
      id.startsWith("policy.relation.")
    )

    expect(evaluation.status).toBe("refuse")
    expect(policyRelations).toEqual(
      expect.arrayContaining(
        [
          "representation-fit",
          "reception",
          "time",
          "challenge-and-correction",
          "accountability",
          "preservation"
        ].map((relation) =>
          expect.objectContaining({
            id: `policy.relation.${relation}`,
            status: "fail"
          })
        )
      )
    )
  })

  it("turns missing evidence identity into an explicit policy refusal", () => {
    const props = {
      data: [{ category: "A", value: 2 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      title: "One category",
      description: "One category with a value of two.",
      summary: "A bounded example."
    }
    const contract = buildArtifactContract("BarChart", props, {
      id: "unidentified-evidence",
      intents: ["compare-categories"],
      claims: [
        {
          id: "value",
          kind: "observation",
          status: "supported",
          evidenceIds: ["rows"]
        }
      ],
      evidence: [{ id: "rows", role: "source-data" }]
    })

    const evaluation = evaluateArtifact("BarChart", props, contract, {
      policy: "editorial",
      recommendRepresentation: false
    })

    expect(evaluation.status).toBe("refuse")
    expect(evaluation.obligations).toContainEqual(
      expect.objectContaining({
        id: "policy.evidence-identity-required",
        status: "fail",
        evidenceIds: ["rows"]
      })
    )
  })
})

describe("runtime contract validation", () => {
  it("rejects sparse and non-JSON contract values before semantic evaluation", () => {
    const contract = buildArtifactContract(
      "LineChart",
      {},
      {
        id: "sparse-contract",
        intents: ["trend"]
      }
    )
    const sparseClaims = new Array(1)
    const sparse = { ...contract, claims: sparseClaims }
    const nonFinite = {
      ...contract,
      extensions: { threshold: Number.NaN }
    }

    expect(validateArtifactContract(sparse)).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ path: "$.claims[0]" })]
    })
    expect(validateArtifactContract(nonFinite)).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ path: "$.extensions.threshold" })]
    })
    expect(() =>
      evaluateArtifact("LineChart", {}, sparse as never, {
        recommendRepresentation: false
      })
    ).not.toThrow()
  })

  it("rejects invalid closed-union values before untrusted callers evaluate them", () => {
    const validation = validateArtifactContract({
      contractVersion: "0.1",
      artifact: { id: "invalid", kind: "poster" },
      purpose: { intents: [{ id: "compare", strength: "sometimes" }] },
      claims: [
        {
          id: "claim",
          kind: "guess",
          status: "certain",
          evidenceIds: [1]
        }
      ],
      evidence: [{ id: "evidence", role: "rumor" }],
      fieldStatus: { claims: { status: "probably" } }
    })

    expect(validation.valid).toBe(false)
    expect(validation.errors.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        "$.artifact.kind",
        "$.purpose.intents[0].strength",
        "$.claims[0].kind",
        "$.claims[0].status",
        "$.claims[0].evidenceIds",
        "$.evidence[0].role",
        "$.fieldStatus.claims.status"
      ])
    )
  })

  it("enforces field supplier, derivation, proposal, and review rules", () => {
    const validateState = (
      path: string,
      state: NonNullable<
        ReturnType<typeof buildArtifactContract>["fieldStatus"]
      >[string]
    ) => {
      const contract = buildArtifactContract(
        "LineChart",
        {},
        {
          id: "field-policy-case",
          intents: ["trend"]
        }
      )
      contract.fieldStatus = { [path]: state }
      return validateArtifactContract(contract)
    }

    const protectedProposal = validateState("artifact.createdAt", {
      status: "unknown",
      suppliedBy: "model-proposal"
    })
    const missingSupplier = validateState("artifact.id", {
      status: "known"
    })
    const forbiddenDerivation = validateState("purpose.stakes", {
      status: "known",
      suppliedBy: "author",
      reviewedBy: "reviewer-1",
      derived: true
    })
    const finalizedProposal = validateState("purpose.stakes", {
      status: "known",
      suppliedBy: "model-proposal",
      reviewedBy: "reviewer-1"
    })
    const missingReview = validateState("purpose.stakes", {
      status: "known",
      suppliedBy: "author"
    })
    const allowedProposal = validateState("purpose.stakes", {
      status: "unknown",
      suppliedBy: "model-proposal"
    })
    const reviewedKnownValue = validateState("purpose.stakes", {
      status: "known",
      suppliedBy: "author",
      reviewedBy: "reviewer-1"
    })

    expect(protectedProposal.errors.map(({ path }) => path)).toContain(
      "$.fieldStatus.artifact.createdAt.suppliedBy"
    )
    expect(missingSupplier.errors.map(({ path }) => path)).toContain(
      "$.fieldStatus.artifact.id.suppliedBy"
    )
    expect(forbiddenDerivation.errors.map(({ path }) => path)).toContain(
      "$.fieldStatus.purpose.stakes.derived"
    )
    expect(finalizedProposal.errors.map(({ path }) => path)).toContain(
      "$.fieldStatus.purpose.stakes.suppliedBy"
    )
    expect(missingReview.errors.map(({ path }) => path)).toContain(
      "$.fieldStatus.purpose.stakes.reviewedBy"
    )
    expect(allowedProposal.valid).toBe(true)
    expect(reviewedKnownValue.valid).toBe(true)
  })

  it("keeps field policies immutable and handles reserved path keys safely", () => {
    expect(Object.isFrozen(ARTIFACT_FIELD_POLICIES)).toBe(true)
    for (const policy of Object.values(ARTIFACT_FIELD_POLICIES)) {
      expect(Object.isFrozen(policy)).toBe(true)
      expect(Object.isFrozen(policy.suppliedBy)).toBe(true)
    }

    const contract = buildArtifactContract(
      "LineChart",
      {},
      {
        id: "reserved-field-path",
        intents: ["trend"]
      }
    )
    contract.fieldStatus = JSON.parse(
      '{"__proto__":{"status":"unknown","suppliedBy":"system"}}'
    )

    expect(() => validateArtifactContract(contract)).not.toThrow()
    expect(validateArtifactContract(contract).valid).toBe(true)
  })
})
