import { describe, expect, it } from "vitest"
import { buildArtifactContract } from "./contract"
import { evaluateArtifact, repairArtifact } from "./evaluateArtifact"

describe("artifact evaluation input boundaries", () => {
  it.each([
    ["non-array claims", { claims: null }],
    ["non-array evidence", { evidence: null }],
    [
      "malformed temporal source",
      {
        time: {
          sources: [
            {
              id: "stream",
              kind: "stream",
              timezone: 7
            }
          ]
        }
      }
    ]
  ])("refuses %s without calling typed semantic auditors", (_label, patch) => {
    const props = { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" }
    const valid = buildArtifactContract("LineChart", props, {
      id: "invalid-input-boundary"
    })
    const contract = { ...valid, ...patch }

    const result = evaluateArtifact(
      "LineChart",
      props,
      contract as unknown as typeof valid,
      { recommendRepresentation: false }
    )

    expect(result.status).toBe("refuse")
    expect(result.validation.artifact.valid).toBe(false)
    expect(result.obligations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringMatching(/^contract\.validation\.error\./),
          status: "fail"
        })
      ])
    )
  })

  it("returns a validation ledger instead of repairing a malformed contract", () => {
    const props = { data: [{ x: 1, y: 2 }] }
    const valid = buildArtifactContract("LineChart", props, {
      id: "invalid-repair-boundary"
    })
    const result = repairArtifact(
      "LineChart",
      props,
      { ...valid, claims: null } as unknown as typeof valid,
      { applySafeIdentityRepairs: true, recommendRepresentation: false }
    )

    expect(result.status).toBe("requires-input")
    expect(result.before.validation.artifact.valid).toBe(false)
    expect(result.after).toBe(result.before)
    expect(result.ledger[0]).toMatchObject({
      path: "$.claims",
      applied: false,
      changesClaim: false
    })
  })

  it("binds identity to every data-bearing prop when chart data is also present", () => {
    const props = {
      data: [{ x: 1, y: 2 }],
      lines: [{ id: "forecast", coordinates: [[1, 2]] }],
      xAccessor: "x",
      yAccessor: "y"
    }
    const contract = buildArtifactContract("LineChart", props, {
      id: "mixed-data-identity"
    })

    const result = evaluateArtifact("LineChart", props, contract, {
      recommendRepresentation: false
    })

    expect(result.obligations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "identity.data", status: "pass" })
      ])
    )
  })
})
