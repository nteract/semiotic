import React from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { validateArtifactContract } from "semiotic/artifact"
import WatermarksExamplePage from "./WatermarksExamplePage"
import { buildWatermarkTemporalRecord } from "./watermarksTemporalRecord"

vi.mock("semiotic/physics", async () => {
  const ReactModule = await import("react")
  const { buildEventDropPhysics, readEventDropOccupancy } =
    await import("../../../../src/components/charts/physics/eventDropPhysics")
  return {
    EventDropChart: ReactModule.forwardRef(function MockEventDropChart(
      { description, title },
      _ref,
    ) {
      return <div role="img" aria-label={`${title}. ${description}`} />
    }),
    buildEventDropPhysics,
    readEventDropOccupancy,
  }
})

vi.mock("../../hooks/useResponsiveWidth", () => ({
  default: () => [800, vi.fn()],
}))

vi.mock("./PhysicsExampleConversationArc", () => ({
  PhysicsArcStatus: () => <div data-testid="physics-arc-status" />,
  usePhysicsExampleConversationArc: () => ({
    recordEdit: vi.fn(),
    recordRendered: vi.fn(),
  }),
}))

vi.mock("./ExamplePageLayout", () => ({
  default: ({ children, title }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}))

vi.mock("../../components/CodeBlock", () => ({
  default: ({ children }) => <pre>{children}</pre>,
}))

const temporalEvents = [
  { id: "open-event", eventTime: 63, arrivalTime: 36, source: "stream" },
  { id: "settled-event", eventTime: 45, arrivalTime: 18, source: "stream" },
  { id: "late-event", eventTime: 28, arrivalTime: 70, source: "backfill" },
]

it("keeps historical acceptance and the selected explanation aligned as closure advances", () => {
  render(<WatermarksExamplePage />)
  expect(screen.getByRole("img", { name: /7 on time and 3 late/ })).toBeInTheDocument()
  expect(screen.getByTestId("watermark-admission-decision")).toHaveTextContent(
    "The window was already closed, so this event was late.",
  )
  fireEvent.click(screen.getByText("Explore other streams and settings"))
  fireEvent.change(screen.getByRole("slider", { name: /arrival frontier/i }), {
    target: { value: "60" },
  })
  expect(screen.getByRole("img", { name: /6 on time and 0 late/ })).toBeInTheDocument()
  expect(screen.getByTestId("watermark-admission-decision")).toHaveTextContent(
    "The window was still open, so this event was accepted.",
  )
  fireEvent.change(screen.getByRole("slider", { name: /arrival frontier/i }), {
    target: { value: "70" },
  })
  expect(screen.getByRole("img", { name: /7 on time and 3 late/ })).toBeInTheDocument()
})

it("explains the selected lag and the batch result without changing historical admissions", () => {
  render(<WatermarksExamplePage />)
  const period = screen.getByTestId("watermark-period")
  const result = screen.getByTestId("watermark-snapshot-result")
  expect(period).toHaveTextContent("now 70s − lag 18s = watermark 52s")
  expect(result).toHaveTextContent("7 accepted · 3 late")
  fireEvent.click(screen.getByRole("button", { name: /Wait for the delayed batch/ }))
  fireEvent.click(screen.getByRole("button", { name: "After the batch", exact: true }))
  expect(period).toHaveTextContent("now 70s − lag 54s = watermark 16s")
  expect(result).toHaveTextContent("10 accepted · 0 late")
  expect(result).toHaveTextContent("The batch arrived before its windows closed.")
  const payload = JSON.parse(screen.getByTestId("watermark-temporal-payload").textContent)
  expect(payload.states.every((state) => state.time.watermark.allowedLateness === "PT0S")).toBe(
    true,
  )
  fireEvent.click(screen.getByRole("button", { name: /Close sooner/ }))
  expect(result).toHaveTextContent("7 accepted · 3 late")
  expect(period).toHaveTextContent("watermark 52s")
})

describe("watermark Artifact Contract time record", () => {
  it("derives open, settled, and corrected states without reading the ambient clock", () => {
    const inputs = {
      scenarioId: "test-replay",
      events: temporalEvents,
      arrivedEvents: temporalEvents,
      currentTime: 70,
      windowSize: 12,
      watermarkLag: 18,
    }
    const record = buildWatermarkTemporalRecord(inputs)

    expect(buildWatermarkTemporalRecord(inputs)).toEqual(record)
    expect(record.payload.referenceTime).toBe("2026-01-01T00:01:10.000Z")
    expect(record.stages.map(({ id }) => id)).toEqual(["live-open", "settled", "late-corrected"])
    expect(record.stages.map(({ time }) => time.window.status)).toEqual([
      "open",
      "settled",
      "corrected",
    ])
    expect(record.stages.map(({ time }) => time.completeness.status)).toEqual([
      "provisional",
      "settled",
      "settled",
    ])
    expect(record.stages[2].time.revision).toMatchObject({
      status: "backfilled",
      correctionId: "watermarks:test-replay:late-arrival:late-event",
    })
    expect(record.stages.every(({ audit }) => audit.ok && audit.summary.fail === 0)).toBe(true)
    expect(record.stages.every(({ claimAudit }) => claimAudit.ok)).toBe(true)
    expect(record.stages.every(({ contract }) => validateArtifactContract(contract).valid)).toBe(
      true,
    )
    expect(record.stages[0].contract.claims).toEqual([
      expect.objectContaining({ status: "provisional" }),
    ])
    expect(record.stages[1].contract.claims).toEqual([
      expect.objectContaining({ status: "supported" }),
    ])
    const correctedClaims = record.stages[2].contract.claims
    const [previousClaim, replacementClaim] = correctedClaims
    const [correction] = record.stages[2].contract.contestability.corrections
    expect(previousClaim.status).toBe("superseded")
    expect(replacementClaim).toMatchObject({
      status: "supported",
      supersedes: [previousClaim.id],
    })
    expect(correction).toMatchObject({
      id: record.stages[2].time.revision.correctionId,
      affectedClaimIds: [previousClaim.id],
      replacementClaimIds: [replacementClaim.id],
    })
    expect(record.payload.states[2]).toMatchObject({
      id: "late-corrected",
      eventId: "late-event",
      time: {
        window: { status: "corrected" },
        completeness: { status: "settled" },
      },
      claimState: {
        claims: [
          { id: previousClaim.id, status: "superseded" },
          { id: replacementClaim.id, status: "supported" },
        ],
        corrections: [{ id: correction.id }],
        audit: { ok: true, fail: 0 },
      },
      audit: { ok: true, fail: 0 },
    })
  })

  it("renders plain-language states and the same inspectable payload", () => {
    const { container } = render(<WatermarksExamplePage />)

    fireEvent.click(screen.getByText("Inspect time states and correction records"))
    expect(screen.getByRole("heading", { name: "One declared time model" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Live / open" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Settled", exact: true })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Late arrival / corrected" })).toBeInTheDocument()
    expect(
      screen.getByText(/window remains open; completeness is provisional/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/window and completeness are both settled/i)).toBeInTheDocument()
    expect(screen.getByText(/revision is backfilled, the window is corrected/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText("Explore other streams and settings"))
    expect(screen.getByRole("slider", { name: /Arrival frontier/ })).toBeInTheDocument()
    expect(screen.queryByRole("slider", { name: /Current event time/ })).not.toBeInTheDocument()

    const payload = JSON.parse(screen.getByTestId("watermark-temporal-payload").textContent)
    expect(payload.schema).toBe("semiotic.time-state/0.1")
    expect(payload.scenarioId).toBe("backfill")
    expect(payload.states.map(({ id }) => id)).toEqual(["live-open", "settled", "late-corrected"])
    expect(payload.states[0].time.watermark).toMatchObject({
      value: "2026-01-01T00:00:52.000Z",
      allowedLateness: "PT0S",
      policy: "Arrival frontier minus 18s watermark lag",
    })

    const openCard = container.querySelector('[data-state="live-open"]')
    const settledCard = container.querySelector('[data-state="settled"]')
    const correctedCard = container.querySelector('[data-state="late-corrected"]')
    expect(within(openCard).getByText("provisional", { selector: "strong" })).toBeInTheDocument()
    expect(within(settledCard).getByText("supported", { selector: "strong" })).toBeInTheDocument()
    expect(
      within(correctedCard).getByText("superseded", { selector: "strong" }),
    ).toBeInTheDocument()
    expect(within(correctedCard).getByText("supported", { selector: "strong" })).toBeInTheDocument()

    for (const state of payload.states) {
      for (const claim of state.claimState.claims) {
        expect(screen.getByText(claim.text, { exact: true })).toBeInTheDocument()
      }
    }
    const correctedState = payload.states.find(({ id }) => id === "late-corrected")
    const correction = correctedState.claimState.corrections[0]
    expect(within(correctedCard).getByText(correction.id, { exact: true })).toBeInTheDocument()
    expect(correctedState.time.revision.correctionId).toBe(correction.id)
  })
})
