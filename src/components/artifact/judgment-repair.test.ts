import { describe, expect, it } from "vitest"
import type { RenderEvidence } from "../server/renderEvidence"
import { buildArtifactContract } from "./contract"
import { evaluateArtifact, repairArtifact } from "./evaluateArtifact"
import {
  activePolicyRules,
  ARTIFACT_POLICIES,
  type ArtifactPolicy
} from "./policies"
import { recommendRepresentation } from "./representation"

const trendRows = [
  { month: 1, value: 4 },
  { month: 2, value: 7 },
  { month: 3, value: 6 }
]

const trendProps = {
  data: trendRows,
  xAccessor: "month",
  yAccessor: "value",
  title: "Monthly values",
  description: "Three monthly observations.",
  summary: "Values rose and then eased.",
  accessibleTable: true
}

function completeTrendContract() {
  return buildArtifactContract("LineChart", trendProps, {
    id: "render-proof",
    intents: ["trend"],
    claims: [
      {
        id: "trend-claim",
        text: "The values change over the reported period.",
        kind: "observation",
        status: "supported",
        evidenceIds: ["trend-source"],
        authoredBy: { id: "author", kind: "human" }
      }
    ],
    evidence: [
      {
        id: "trend-source",
        role: "source-data",
        fingerprint: "sha256:trend-source"
      }
    ],
    time: {
      observedAt: "2026-09-01T12:00:00Z",
      presentation: { state: "historical" },
      completeness: { status: "settled", basis: "Bounded fixture" }
    },
    reception: {
      channels: [{ channel: "visual" }, { channel: "screen-reader" }],
      description: trendProps.description,
      dataFallback: true
    },
    form: {
      chartFamily: "time-series",
      whyThisForm: "Position over time supports the declared trend reading."
    },
    contestability: { sourceRequestsAllowed: true },
    accountability: { authors: [{ id: "author", kind: "human" }] },
    inheritance: { preservation: "claim-evidence-preserved" }
  })
}

function paintedLineEvidence(): RenderEvidence {
  return {
    component: "LineChart",
    frameType: "xy",
    status: "ok",
    empty: false,
    markCount: 3,
    markCountByType: { line: 1, point: 3 },
    width: 500,
    height: 300,
    annotationCount: 0,
    ariaLabel: "Monthly values",
    warnings: [],
    semanticStatus: "meaningful"
  }
}

describe("artifact judgment and repair completion", () => {
  it("enforces render proof only when the active policy requires it", () => {
    const policy: ArtifactPolicy = {
      ...ARTIFACT_POLICIES.exploratory,
      id: "render-required",
      minimumStakes: "exploratory",
      rules: {
        ...ARTIFACT_POLICIES.exploratory.rules,
        requireRenderEvidence: true
      }
    }
    const contract = completeTrendContract()
    const missing = evaluateArtifact("LineChart", trendProps, contract, {
      policy,
      recommendRepresentation: false
    })
    const proven = evaluateArtifact("LineChart", trendProps, contract, {
      policy,
      recommendRepresentation: false,
      render: () => ({ svg: "<svg />", evidence: paintedLineEvidence() })
    })
    const mismatched = evaluateArtifact("LineChart", trendProps, contract, {
      policy,
      recommendRepresentation: false,
      render: () => ({
        svg: "<svg />",
        evidence: { ...paintedLineEvidence(), component: "BarChart" }
      })
    })

    expect(missing.status).toBe("refuse")
    expect(missing.obligations).toContainEqual(
      expect.objectContaining({
        id: "policy.render-evidence-required",
        status: "fail"
      })
    )
    expect(missing.repairs).toContainEqual(
      expect.objectContaining({
        id: "repair.policy.render-evidence-required",
        category: "configuration",
        changesClaim: false
      })
    )
    expect(proven.status).not.toBe("refuse")
    expect(proven.obligations).toContainEqual(
      expect.objectContaining({
        id: "policy.render-evidence-required",
        status: "pass"
      })
    )
    expect(mismatched.status).toBe("refuse")
  })

  it("keeps render proof opt-in for compatibility and enables it for release policies", () => {
    expect(ARTIFACT_POLICIES.exploratory.rules.requireRenderEvidence).toBe(
      false
    )
    for (const id of [
      "operational-streaming",
      "editorial",
      "public-civic",
      "agent-generated"
    ] as const) {
      expect(ARTIFACT_POLICIES[id].rules.requireRenderEvidence).toBe(true)
    }
    expect(
      activePolicyRules(
        ARTIFACT_POLICIES.editorial,
        [
          {
            rule: "requireRenderEvidence",
            owner: "Release editor",
            rationale: "Renderer outage with a documented manual review",
            expiresAt: "2026-09-04T00:00:00Z"
          }
        ],
        "2026-09-03T00:00:00Z"
      ).rules.requireRenderEvidence
    ).toBe(false)
  })

  it("selects small multiples and blocks only a requested prohibited use", () => {
    const seriesRows = Array.from({ length: 6 }, (_, seriesIndex) =>
      [1, 2, 3].map((month) => ({
        month,
        series: `Series ${seriesIndex + 1}`,
        value: month + seriesIndex
      }))
    ).flat()
    const contract = buildArtifactContract(
      "LineChart",
      {
        data: seriesRows,
        xAccessor: "month",
        yAccessor: "value",
        lineIDAccessor: "series"
      },
      { id: "multi-series", intents: ["trend"] }
    )

    const multiples = recommendRepresentation(seriesRows, contract)
    expect(multiples.selected).toMatchObject({
      kind: "small-multiples",
      label: "Small multiples by series"
    })
    expect(multiples.selected.reasons[0]).toContain("6 series groups")

    const restricted = {
      ...contract,
      purpose: {
        ...contract.purpose,
        prohibitedUses: ["automated action"]
      }
    }
    expect(recommendRepresentation(seriesRows, restricted).selected.kind).toBe(
      "small-multiples"
    )

    const requestedRestrictedUse = {
      ...restricted,
      purpose: {
        ...restricted.purpose,
        communicativeAct: "Trigger automated actions from the current values."
      }
    }
    expect(
      recommendRepresentation(seriesRows, requestedRestrictedUse)
    ).toMatchObject({
      status: "refuse",
      selected: {
        kind: "no-action",
        reasons: [
          "The current purpose requests a prohibited use: automated action."
        ]
      }
    })
  })

  it("adds chart-fit alternatives without pretending a form change is safe to apply", () => {
    const pieRows = Array.from({ length: 15 }, (_, index) => ({
      category: `Category ${index + 1}`,
      value: index + 1
    }))
    const pieProps = {
      data: pieRows,
      categoryAccessor: "category",
      valueAccessor: "value"
    }
    const contract = buildArtifactContract("PieChart", pieProps, {
      id: "crowded-pie",
      intents: ["rank"],
      claims: [
        {
          id: "ranking",
          text: "The categories can be ranked.",
          kind: "observation",
          status: "supported",
          evidenceIds: []
        }
      ]
    })
    const result = repairArtifact("PieChart", pieProps, contract)
    const configurationRepairs = result.ledger.filter(
      ({ category }) => category === "configuration"
    )
    const claimRepairs = result.ledger.filter(
      ({ changesClaim }) => changesClaim
    )

    expect(configurationRepairs).toContainEqual(
      expect.objectContaining({
        id: "repair.configuration.alternative.1",
        applied: false,
        changesClaim: false,
        suggestedComponent: expect.any(String)
      })
    )
    expect(claimRepairs.length).toBeGreaterThan(0)
    expect(claimRepairs.every(({ category }) => category === "contract")).toBe(
      true
    )
    expect(result.component).toBe("PieChart")
    expect(result.props).toBe(pieProps)
  })
})
