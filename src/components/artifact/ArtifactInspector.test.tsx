import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react"
import { renderToString } from "react-dom/server"
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

  it("counts duplicate evidence rows and distinct missing references across active and retired claims", () => {
    const [claim] = contract.claims
    const [evidence, other] = contract.evidence
    const summary = summarizeArtifactInspection({
      ...contract,
      evidence: [evidence, evidence, other],
      claims: [
        {
          ...claim,
          status: "retracted",
          evidenceIds: [evidence.id, "missing"]
        },
        { ...claim, status: "superseded", evidenceIds: ["missing"] },
        { ...claim, status: "unknown", evidenceIds: [] }
      ]
    })
    expect(summary.claims).toEqual({
      total: 3,
      active: 1,
      supported: 0,
      unresolved: 1
    })
    expect(summary.evidence).toEqual({
      total: 3,
      referenced: 2,
      unreferenced: 1,
      missingReferences: 1
    })
    expect(summary.unknowns.items).toContain(
      `Claim ${claim.id} has unknown status`
    )
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
    expect(rootDetails.open).toBe(true)
  })

  it("keeps a controlled section in its requested state until the host accepts the change", () => {
    const change = vi.fn()
    const view = (openClaims: boolean) => (
      <ArtifactInspector
        contract={contract}
        onDisclosureChange={change}
        expandedSections={openClaims ? ["details", "claims"] : ["details"]}
      />
    )
    const { rerender } = render(view(false))
    const summary = screen.getByText("Claims (2)")
    const details = summary.closest("details")!
    fireEvent.click(summary)
    expect(details.open).toBe(false)
    expect(change.mock.calls).toEqual([["claims", true]])
    rerender(view(true))
    expect(details.open).toBe(true)
    fireEvent(details, new Event("toggle"))
    expect(change).toHaveBeenCalledTimes(1)
    fireEvent.click(summary)
    expect(details.open).toBe(true)
    expect(change.mock.calls).toEqual([
      ["claims", true],
      ["claims", false]
    ])
    rerender(view(false))
    expect(details.open).toBe(false)
  })

  it("renders the controlled state on the server and hydrates without reporting prop changes", () => {
    const change = vi.fn()
    const view = (
      <ArtifactInspector
        contract={contract}
        expandedSections={["details", "history"]}
        onDisclosureChange={change}
      />
    )
    const container = document.createElement("div")
    container.innerHTML = renderToString(view)
    const summary = within(container).getByText("Corrections and history")
    expect(summary.closest("details")!.open).toBe(true)
    const hydrated = render(view, { hydrate: true, container })
    fireEvent(summary.closest("details")!, new Event("toggle"))
    expect(change).not.toHaveBeenCalled()
    fireEvent.click(summary)
    expect(change.mock.calls).toEqual([["history", false]])
    expect(summary.closest("details")!.open).toBe(true)
    hydrated.unmount()
  })

  it("preserves a native disclosure across unrelated renders and reports only its own toggles", async () => {
    const change = vi.fn()
    const view = (title: string) => (
      <ArtifactInspector
        contract={contract}
        title={title}
        onDisclosureChange={change}
      />
    )
    const { rerender } = render(view("First"))
    fireEvent.click(screen.getByText(/Inspect claims, evidence/))
    await waitFor(() => expect(change.mock.calls).toEqual([["details", true]]))
    const summary = screen.getByText("Corrections and history")
    fireEvent.click(summary)
    await waitFor(() =>
      expect(change.mock.calls).toEqual([
        ["details", true],
        ["history", true]
      ])
    )
    rerender(view("Updated"))
    expect(summary.closest("details")!.open).toBe(true)
    fireEvent.click(summary)
    await waitFor(() =>
      expect(change).toHaveBeenLastCalledWith("history", false)
    )
  })

  it("retains duplicate records and unique row identity when another record is inserted", () => {
    const first = contract.claims[0]
    const second = { ...first, text: "Duplicate claim" }
    const warn = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const view = (claims: ArtifactContract["claims"]) => (
        <ArtifactInspector
          contract={{ ...contract, claims }}
          expandedSections={["details", "claims"]}
        />
      )
      const { rerender } = render(view([first, second, contract.claims[1]]))
      const uniqueRow = screen.getByText(contract.claims[1].text!).closest("li")
      rerender(
        view([
          { ...first, id: "0:" + first.id, text: "Inserted claim" },
          first,
          second,
          contract.claims[1]
        ])
      )
      expect(screen.getByText(contract.claims[1].text!).closest("li")).toBe(
        uniqueRow
      )
      rerender(view([first, contract.claims[1]]))
      expect(screen.queryByText("Duplicate claim")).toBeNull()
      expect(screen.getAllByText(first.text!)).toHaveLength(1)
      expect(warn.mock.calls.flat().join(" ")).not.toMatch(
        /same key|unique .*key/i
      )
    } finally {
      warn.mockRestore()
    }
  })

  it("reuses inspection work across presentation changes and refreshes it for new inputs", () => {
    const read = vi.fn(() => contract.fieldStatus)
    const observed = {
      ...contract,
      get fieldStatus() {
        return read()
      }
    }
    const { rerender } = render(
      <ArtifactInspector contract={observed} evaluation={evaluation} />
    )
    const reads = read.mock.calls.length
    expect(reads).toBeGreaterThan(0)
    rerender(
      <ArtifactInspector
        contract={observed}
        evaluation={evaluation}
        title="Updated"
        expandedSections={["machine"]}
      />
    )
    expect(read).toHaveBeenCalledTimes(reads)
    const text = () =>
      JSON.parse(
        screen.getByLabelText("Machine-readable artifact inspection")
          .textContent!
      )
    rerender(
      <ArtifactInspector
        contract={observed}
        evaluation={{ ...evaluation, status: "refuse" }}
      />
    )
    expect(text().evaluation.status).toBe("refuse")
    expect(screen.getByRole("status")).toHaveTextContent("Refused")
    rerender(<ArtifactInspector contract={{ ...contract, claims: [] }} />)
    expect(text().contract.claims).toEqual([])
    expect(
      screen.getByText("0 supported · 0 unresolved · 0 total")
    ).toBeInTheDocument()
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

  it("serializes shared objects, circular data, and bigint without invoking embedded callbacks", () => {
    const toJSON = vi.fn(() => "overridden")
    const shared = { count: BigInt(12), toJSON, omitted: undefined }
    const extra: Record<string, unknown> = { left: shared, right: shared }
    extra.self = extra
    const extended = { ...contract, extra }
    render(<ArtifactInspector contract={extended} />)
    const text = screen.getByLabelText(
      "Machine-readable artifact inspection"
    ).textContent!
    expect(JSON.parse(text).contract.extra).toEqual({
      left: { count: "12" },
      right: { count: "12" },
      self: "[Circular]"
    })
    expect(toJSON).not.toHaveBeenCalled()
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
