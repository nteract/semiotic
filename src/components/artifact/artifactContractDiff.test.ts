import { describe, expect, it } from "vitest"
import { buildArtifactContract } from "./contract"
import { diffArtifactContracts } from "./artifactContractDiff"

function contractWithRecords() {
  return buildArtifactContract(
    "LineChart",
    {
      data: [
        { x: 1, y: 2 },
        { x: 2, y: 3 }
      ],
      xAccessor: "x",
      yAccessor: "y"
    },
    {
      id: "stable-diff",
      intents: "trend",
      claims: [
        {
          id: "claim-a",
          text: "A is supported.",
          kind: "observation",
          status: "supported",
          evidenceIds: ["evidence-a"]
        },
        {
          id: "claim-b",
          text: "B is provisional.",
          kind: "inference",
          status: "provisional",
          evidenceIds: ["evidence-b"]
        }
      ],
      evidence: [
        { id: "evidence-a", role: "source-data", label: "Source A" },
        { id: "evidence-b", role: "external-source", label: "Source B" }
      ]
    }
  )
}

describe("artifact contract semantic diff", () => {
  it("ignores claim and evidence record reordering", () => {
    const before = contractWithRecords()
    const after = structuredClone(before)
    after.claims.reverse()
    after.evidence.reverse()

    expect(diffArtifactContracts(before, after)).toEqual([])
  })

  it("still reports record changes after stable-ID alignment", () => {
    const before = contractWithRecords()
    const after = structuredClone(before)
    after.claims.reverse()
    after.evidence.reverse()
    after.claims.find(({ id }) => id === "claim-a")!.status = "disputed"
    after.evidence.find(({ id }) => id === "evidence-b")!.label =
      "Revised source B"

    expect(diffArtifactContracts(before, after)).toEqual([
      {
        path: 'claims[id="claim-a"].status',
        kind: "changed",
        before: "supported",
        after: "disputed"
      },
      {
        path: 'evidence[id="evidence-b"].label',
        kind: "changed",
        before: "Source B",
        after: "Revised source B"
      }
    ])
  })
})
