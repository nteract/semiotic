import { describe, expect, it } from "vitest"
import { createEvidenceLedger, validateEvidenceLedger } from "./createEvidenceLedger"

const fixture = {
  sources: [{ id: "source-1", title: "Source" }],
  claims: [
    { id: "claim-1", claimClass: "measurement", sourceIds: ["source-1"], chapters: ["one"] },
  ],
  claimClasses: { measurement: { label: "Measurement" } },
}

describe("createEvidenceLedger", () => {
  it("builds stable source, claim, and section lookups", () => {
    const ledger = createEvidenceLedger(fixture)
    expect(ledger.sourceById("source-1")?.title).toBe("Source")
    expect(ledger.claimById("claim-1")?.claimClass).toBe("measurement")
    expect(ledger.claimsForSection("one").map((claim) => claim.id)).toEqual(["claim-1"])
    expect(Object.isFrozen(ledger.sources)).toBe(true)
    expect(Object.isFrozen(ledger.claimById("claim-1").sourceIds)).toBe(true)
  })

  it("reports duplicate and dangling identifiers", () => {
    const result = validateEvidenceLedger({
      sources: [{ id: "source-1" }, { id: "source-1" }],
      claims: [{ id: "claim-1", claimClass: "unknown", sourceIds: ["missing"] }],
      claimClasses: fixture.claimClasses,
    })
    expect(result.ok).toBe(false)
    expect(result.errors.join(" ")).toMatch(/duplicate evidence source/i)
    expect(result.errors.join(" ")).toMatch(/unknown class/i)
    expect(result.errors.join(" ")).toMatch(/missing source/i)
  })

  it("rejects missing identifiers, inherited claim classes, and malformed source lists", () => {
    const result = validateEvidenceLedger({
      sources: [{}],
      claims: [{ id: "claim-1", claimClass: "toString", sourceIds: "source-1" }],
      claimClasses: fixture.claimClasses,
    })
    expect(result.ok).toBe(false)
    expect(result.errors.join(" ")).toMatch(/source requires a non-empty id/i)
    expect(result.errors.join(" ")).toMatch(/unknown class/i)
    expect(result.errors.join(" ")).toMatch(/sourceIds must be an array/i)
  })
})
