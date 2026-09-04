import { describe, expect, it } from "vitest"
import { buildArtifactContract } from "./contract"
import { evaluateArtifact, repairArtifact } from "./evaluateArtifact"
import { auditArtifactCollection } from "./collection"
import { recommendRepresentation } from "./representation"
import { resolveArtifactPolicy } from "./policies"
import { fingerprintValue } from "./fingerprint"
import type { Claim } from "./types"

const props = {
  data: [
    { x: 1, y: 1 },
    { x: 2, y: 2 },
    { x: 3, y: 3 }
  ],
  xAccessor: "x",
  yAccessor: "y",
  title: "A bounded series",
  description: "Three observations.",
  summary: "The final value exceeds the first.",
  accessibleTable: true
}

function contractWithClaims(claims: Claim[] = []) {
  return buildArtifactContract("LineChart", props, {
    id: "readiness",
    revision: "1",
    intents: ["trend"],
    claims,
    evidence: [
      {
        id: "rows",
        role: "source-data",
        fingerprint: fingerprintValue(props.data).fingerprint
      }
    ]
  })
}

const supportedClaim: Claim = {
  id: "increase",
  kind: "observation",
  status: "supported",
  text: "The final value exceeds the first.",
  evidenceIds: ["rows"],
  authoredBy: { id: "author", kind: "human" }
}

describe("required claims are binding on every judgment surface", () => {
  const base = resolveArtifactPolicy("exploratory")
  const policy = {
    ...base,
    id: "claims-required",
    minimumStakes: "exploratory" as const,
    rules: { ...base.rules, requireClaims: true },
    requiredRelations: ["claim-support" as const]
  }

  it.each([true, false])(
    "refuses an empty ledger with recommendations=%s",
    (recommend) => {
      const result = evaluateArtifact(
        "LineChart",
        props,
        contractWithClaims(),
        {
          policy,
          recommendRepresentation: recommend
        }
      )
      expect(result.obligations).toContainEqual(
        expect.objectContaining({
          id: "policy.claims-required",
          status: "fail"
        })
      )
      expect(result.status).toBe("refuse")
      expect(
        result.obligations.filter(({ status }) => status === "fail")
      ).toHaveLength(1)
    }
  )

  it.each([
    { claims: [] },
    { claims: [{ ...supportedClaim, status: "superseded" as const }] }
  ])(
    "requires an active claim, not just evidence or retired history: %j",
    ({ claims }) => {
      const contract = contractWithClaims(claims)
      expect(
        recommendRepresentation(props.data, contract, { policy })
      ).toMatchObject({
        status: "refuse",
        selected: { kind: "no-claim" }
      })
      expect(
        evaluateArtifact("LineChart", props, contract, {
          policy,
          recommendRepresentation: false
        }).status
      ).toBe("refuse")
      const collection = auditArtifactCollection({
        collectionVersion: "0.1",
        id: "required-claims",
        policyId: "editorial",
        artifacts: [contract]
      })
      expect(collection.ok).toBe(false)
      expect(collection.findings).toContainEqual(
        expect.objectContaining({
          id: "collection.policy.claims-required.readiness",
          status: "fail"
        })
      )
    }
  )

  it("keeps claimless exploration available without granting publication approval", () => {
    expect(
      evaluateArtifact("LineChart", props, contractWithClaims(), {
        policy: "exploratory",
        recommendRepresentation: false
      }).status
    ).toBe("conditional")
  })
})

describe("identity repair cannot launder existing support", () => {
  it.each([
    [
      "data",
      "LineChart",
      {
        ...props,
        data: [
          { x: 1, y: 3 },
          { x: 2, y: 2 },
          { x: 3, y: 1 }
        ]
      }
    ],
    ["configuration", "LineChart", { ...props, yAccessor: "x" }],
    ["component", "AreaChart", props]
  ])(
    "retains a mismatched %s binding and refuses automatic rebinding",
    (kind, component, nextProps) => {
      const contract = contractWithClaims([supportedClaim])
      const before = structuredClone(contract)
      const result = repairArtifact(component, nextProps, contract, {
        applySafeIdentityRepairs: true,
        recommendRepresentation: false
      })
      expect(result.before.status).toBe("refuse")
      expect(result.after.status).toBe("refuse")
      expect(result.after.obligations).toContainEqual(
        expect.objectContaining({
          id: `identity.${kind}`,
          status: "fail"
        })
      )
      expect(result.status).toBe("requires-input")
      expect(result.contract).toBe(contract)
      expect(contract).toEqual(before)
      expect(
        result.ledger.filter(({ category }) => category === "identity")
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            applied: false,
            changesClaim: true
          })
        ])
      )
    }
  )
})
