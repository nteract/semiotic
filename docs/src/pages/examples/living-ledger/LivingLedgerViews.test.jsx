import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import {
  ExposureLabel,
  ServiceSystemTable,
  StatusGlyph,
  serviceSystemId,
  systemRiskLevel,
} from "./LivingLedgerViews"

const canonicalSystem = {
  id: "pollination::habitat::crops",
  shortName: "Valley pollination",
  bioregionName: "Central Valley",
  freshness: "current",
  ecosystemCondition: { value: 58 },
  serviceAdequacy: 0.939,
  alert: { level: "Watch", warningKind: "trend-change" },
  risk: {
    confidence: "medium",
    exposure: { value: 890000, unit: "hectares" },
  },
}

describe("Living Ledger view adapters", () => {
  it("normalizes canonical alert levels without treating stale evidence as healthy", () => {
    expect(systemRiskLevel(canonicalSystem)).toBe("watch")
    expect(
      systemRiskLevel({ ...canonicalSystem, freshness: "stale", alert: { level: "Observe" } }),
    ).toBe("unknown")
    expect(serviceSystemId(canonicalSystem)).toBe(canonicalSystem.id)
  })

  it("reads exposure from the multi-dimensional risk state", () => {
    render(<ExposureLabel system={canonicalSystem} />)
    expect(screen.getByText("890K hectares")).toBeInTheDocument()
  })

  it("keeps the accessible table on the same service-system identity", () => {
    const onSelect = vi.fn()
    render(
      <ServiceSystemTable
        systems={[canonicalSystem]}
        selectedId={canonicalSystem.id}
        onSelect={onSelect}
      />,
    )

    screen.getByRole("button", { name: /Valley pollination/i }).click()
    expect(onSelect).toHaveBeenCalledWith(canonicalSystem.id, "table")
    expect(screen.getByText("Central Valley")).toBeInTheDocument()
    expect(screen.getByText("94%")).toBeInTheDocument()
  })

  it("gives a titled status glyph an accessible name", () => {
    render(<StatusGlyph level="action" title="Action alert" />)
    expect(screen.getByRole("img", { name: "Action alert" })).toBeInTheDocument()
  })
})
