import React from "react"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ArtifactContractProvenance } from "./LivingLedgerExamplePage"
import {
  REPLAY_DATES,
  SERVICE_SYSTEM_IDS,
  SOURCE_MANIFEST,
  deriveSnapshot,
  pulseSeriesFor,
} from "./living-ledger/livingLedgerData"
import { buildLivingLedgerArtifact } from "./living-ledger/livingLedgerArtifact"

function floodContract() {
  const dayIndex = 179
  const snapshot = deriveSnapshot(dayIndex)
  const system = snapshot.systems.find(({ id }) => id === SERVICE_SYSTEM_IDS.flood)
  const pulse = pulseSeriesFor(system.id, dayIndex)
  return buildLivingLedgerArtifact({
    system,
    pulse,
    thresholds: pulse.thresholds,
    events: snapshot.events,
    manifest: SOURCE_MANIFEST,
    replayDate: REPLAY_DATES[dayIndex],
    dayIndex,
  }).contract
}

describe("Living Ledger Artifact Contract readout", () => {
  it("makes the selected meaning and evidence path available as text", () => {
    const contract = floodContract()
    const { container } = render(<ArtifactContractProvenance contract={contract} />)

    expect(screen.getByText("Decision basis")).toBeInTheDocument()
    expect(screen.getByText(/14-day exceedance forecast moved above/)).toBeInTheDocument()
    expect(screen.getByText("Uncertainty")).toBeInTheDocument()
    expect(screen.getByText("Evidence boundary and time basis")).toBeInTheDocument()
    expect(screen.getByText("Selected-system replay projection")).toBeInTheDocument()
    expect(screen.getByText("2026-07-12T00:00:00.000Z")).toBeInTheDocument()

    const path = screen.getByText("Source and correction path").parentElement
    expect(within(path).getByRole("link", { name: /Copernicus/ })).toHaveAttribute(
      "href",
      "https://global-flood.emergency.copernicus.eu/react/technical-information/products/",
    )
    expect(within(path).getByText(/Quarantined record/)).toBeInTheDocument()
    expect(within(path).getByText(/Accepted correction/)).toBeInTheDocument()
    expect(container.querySelector("[data-contract-id]")).toHaveAttribute(
      "data-contract-id",
      contract.artifact.id,
    )
  })
})
