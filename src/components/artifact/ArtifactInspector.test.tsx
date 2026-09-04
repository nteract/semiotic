import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, expectTypeOf, it, vi } from "vitest"
import type { ArtifactContract } from "./types"
import type { ArtifactEvaluation } from "./evaluateArtifactTypes"
import { ArtifactInspector } from "./ArtifactInspector"
import {
  summarizeArtifactInspection,
  type ArtifactInspectorEvaluation
} from "./artifactInspectorSummary"

const contract: ArtifactContract = {
  contractVersion: "0.1",
  artifact: {
    id: "inspection-fixture",
    kind: "chart",
    title: "Service volume through September",
    revision: "4"
  },
  purpose: {
    intents: [{ id: "trend", strength: "primary" }],
    stakes: "informational"
  },
  claims: [
    {
      id: "claim.supported",
      text: "Volume increased over the recorded period.",
      kind: "observation",
      status: "supported",
      evidenceIds: ["evidence.rows"]
    },
    {
      id: "claim.provisional",
      text: "The most recent value may still change.",
      kind: "observation",
      status: "provisional",
      evidenceIds: ["evidence.missing"],
      uncertainty: {
        kind: "qualitative",
        description: "Late records can revise the final interval."
      }
    }
  ],
  evidence: [
    {
      id: "evidence.rows",
      role: "source-data",
      label: "Validated service rows",
      source: { name: "Service warehouse", uri: "warehouse://service" },
      fingerprint: "sha256:1234"
    },
    {
      id: "evidence.notes",
      role: "human-observation",
      label: "Analyst notes"
    }
  ],
  time: {
    presentation: {
      state: "historical",
      label: "Historical snapshot through 2026-09-30"
    },
    window: {
      start: "2026-01-01T00:00:00Z",
      end: "2026-09-30T23:59:59Z",
      status: "provisional"
    }
  },
  reception: {
    channels: [{ channel: "visual", disclosure: "summary" }],
    manualChecks: ["Check wording with the intended audience"]
  },
  form: {
    chartFamily: "xy",
    whyThisForm: "A connected line supports comparison across ordered time",
    rejectedAlternatives: [
      { representation: "Table", reason: "The trend is the primary task" }
    ]
  },
  contestability: {
    alternativeViews: [
      {
        id: "exact-values",
        label: "Exact-value table",
        rationale: "Use for lookup"
      }
    ],
    corrections: [
      {
        id: "correction.4",
        affectedClaimIds: ["claim.supported"],
        reason: "Late records changed the final interval"
      }
    ]
  },
  fieldStatus: {
    "accountability.owner": {
      status: "unknown",
      reason: "Source owner is unknown"
    },
    "reception.screenReader": {
      status: "manual",
      reason: "Assistive-technology review is required"
    }
  }
}

const evaluation: ArtifactInspectorEvaluation = {
  status: "conditional",
  policy: { id: "editorial", version: "0.1" },
  manualChecks: [
    "Check wording with the intended audience",
    "Reviewer approval is required"
  ],
  obligations: [
    {
      id: "review.approval",
      relation: "accountability",
      status: "manual",
      message: "Reviewer approval is required"
    },
    {
      id: "time.zone",
      relation: "time",
      status: "unknown",
      message: "Time zone is unknown"
    },
    {
      id: "claim.support",
      relation: "claim-support",
      status: "pass",
      message: "The supported claim links to evidence"
    }
  ],
  alternatives: [
    {
      id: "text",
      label: "Bounded text summary",
      reasons: ["The claims can be read without a chart"]
    }
  ]
}

describe("ArtifactInspector", () => {
  it("accepts the complete artifact evaluation result", () => {
    expectTypeOf<ArtifactEvaluation>().toMatchTypeOf<ArtifactInspectorEvaluation>()
  })

  it("summarizes policy, time, claims, evidence, unknowns, and review work", () => {
    const summary = summarizeArtifactInspection(contract, evaluation)

    expect(summary).toMatchObject({
      outcome: "conditional",
      time: {
        status: "provisional",
        label: "Historical snapshot through 2026-09-30"
      },
      claims: { total: 2, active: 2, supported: 1, unresolved: 1 },
      evidence: {
        total: 2,
        referenced: 1,
        unreferenced: 1,
        missingReferences: 1
      },
      policy: { status: "known", label: "editorial@0.1" },
      review: { status: "required", count: 3 },
      unknowns: { count: 2 }
    })
    expect(summary.review.items).toEqual([
      "Check wording with the intended audience",
      "Assistive-technology review is required",
      "Reviewer approval is required"
    ])
  })

  it("uses native progressive disclosure and exposes each signal accessibly", () => {
    const onDisclosureChange = vi.fn()
    const { container } = render(
      <ArtifactInspector
        contract={contract}
        evaluation={evaluation}
        title="Inspection fixture"
        headingLevel={4}
        expandedSections={[
          "details",
          "time",
          "history",
          "alternatives",
          "policy",
          "machine"
        ]}
        onDisclosureChange={onDisclosureChange}
      />
    )

    const region = screen.getByRole("region", { name: "Inspection fixture" })
    expect(within(region).getByRole("heading", { level: 4 })).toHaveTextContent(
      "Inspection fixture"
    )
    expect(within(region).getByRole("status")).toHaveTextContent(
      "Conditional — follow-up is required"
    )
    expect(within(region).getByText("editorial@0.1")).toBeInTheDocument()
    expect(
      within(region).getByText(/1 supported · 1 unresolved/)
    ).toBeInTheDocument()
    expect(
      within(region).getByText(/1 referenced · 1 unreferenced/)
    ).toBeInTheDocument()
    expect(
      within(region).getByText("Assistive-technology review is required")
    ).toBeInTheDocument()
    expect(within(region).getByText("Time and as-of state")).toBeInTheDocument()
    expect(
      within(region).getByText(/2026-01-01.*through.*2026-09-30/)
    ).toBeInTheDocument()
    expect(
      within(region).getByText("Corrections and history")
    ).toBeInTheDocument()
    const history = within(region)
      .getByText("Corrections and history")
      .closest("details") as HTMLDetailsElement
    expect(
      within(history).getByText(/Late records changed/)
    ).toBeInTheDocument()
    expect(within(region).getByText("Exact-value table")).toBeInTheDocument()
    expect(within(region).getByText("Bounded text summary")).toBeInTheDocument()
    expect(
      within(region).getByText(
        "A connected line supports comparison across ordered time"
      )
    ).toBeInTheDocument()

    const rootDetails = container.querySelector(
      ".semiotic-artifact-inspector__details"
    ) as HTMLDetailsElement
    const machineDetails = screen
      .getByText("Machine-readable JSON")
      .closest("details") as HTMLDetailsElement
    expect(rootDetails.open).toBe(true)
    expect(machineDetails.open).toBe(true)
    expect(
      within(region).getByLabelText("Machine-readable artifact inspection")
    ).toHaveAttribute("tabindex", "0")

    rootDetails.open = false
    fireEvent(rootDetails, new Event("toggle"))
    expect(onDisclosureChange).toHaveBeenCalledWith("details", false)
  })

  it("states missing evaluation and contract fields as unknown", () => {
    const minimal: ArtifactContract = {
      contractVersion: "0.1",
      artifact: { id: "minimal", kind: "chart" },
      purpose: { intents: [] },
      claims: [],
      evidence: [],
      fieldStatus: {
        time: { status: "unknown", reason: "No reporting period was supplied" }
      }
    }

    render(
      <ArtifactInspector
        contract={minimal}
        expandedSections={["details", "claims", "evidence", "policy"]}
      />
    )

    expect(screen.getByRole("status")).toHaveTextContent(
      "Not evaluated — policy outcome is unknown"
    )
    expect(
      screen.getAllByText(/No reporting period was supplied/)
    ).not.toHaveLength(0)
    expect(
      screen.getAllByText(/Unknown — no policy evaluation was supplied/)
    ).not.toHaveLength(0)
    expect(
      screen.getByText("Unknown — no claims are declared.")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Unknown — no evidence records are declared.")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Manual review state is unknown.")
    ).toBeInTheDocument()
  })

  it("serializes semantically equal contracts with stable key ordering", () => {
    const reordered = {
      fieldStatus: contract.fieldStatus,
      contestability: contract.contestability,
      form: contract.form,
      reception: contract.reception,
      time: contract.time,
      evidence: contract.evidence,
      claims: contract.claims,
      purpose: contract.purpose,
      artifact: contract.artifact,
      contractVersion: contract.contractVersion
    } satisfies ArtifactContract
    const first = render(
      <ArtifactInspector
        contract={contract}
        evaluation={evaluation}
        expandedSections={["details", "machine"]}
      />
    )
    const firstText = first.getByLabelText(
      "Machine-readable artifact inspection"
    ).textContent
    first.unmount()
    const second = render(
      <ArtifactInspector
        contract={reordered}
        evaluation={evaluation}
        expandedSections={["details", "machine"]}
      />
    )

    expect(
      second.getByLabelText("Machine-readable artifact inspection").textContent
    ).toBe(firstText)
    expect(JSON.parse(firstText ?? "")).toMatchObject({
      evaluation: { status: "conditional" },
      format: "semiotic-artifact-inspection/v1"
    })
  })
})
