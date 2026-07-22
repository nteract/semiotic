import { describe, expect, it } from "vitest"
import { renderChart, renderChartWithEvidence } from "./renderToStaticSVG"

const fixture = {
  data: [
    { id: "liberty", label: "Liberty", category: "principle", amount: 2 },
    { id: "order", label: "Order", category: "principle", amount: 1 },
    { id: "aside", label: "Aside", category: "residue", amount: 0.5 }
  ],
  idAccessor: "id",
  labelAccessor: "label",
  categoryAccessor: "category",
  amountAccessor: "amount",
  phases: [
    { id: "heat", label: "Heat", duration: 2, motion: "mix" },
    { id: "temper", label: "Temper", duration: 2, motion: "bind" }
  ],
  products: [
    {
      id: "civic-alloy",
      label: "Civic Alloy",
      category: "synthesis",
      outletId: "product",
      color: "#b8792d"
    }
  ],
  outlets: [
    { id: "product", label: "Argument", side: "bottom" },
    { id: "residue", label: "Discarded", side: "left" }
  ],
  events: [
    {
      id: "form",
      at: { phaseId: "heat", progress: 0.5 },
      effects: [
        {
          type: "combine",
          sourceIds: ["liberty", "order"],
          productId: "civic-alloy",
          complete: false
        }
      ]
    },
    {
      id: "discard",
      at: { phaseId: "temper", progress: 0.25 },
      effects: [
        {
          type: "eject",
          select: { ids: ["aside"] },
          outletId: "residue",
          reason: "Did not survive the exchange"
        }
      ]
    },
    {
      id: "finish",
      at: { phaseId: "temper", progress: 0.75 },
      effects: [
        {
          type: "complete-product",
          productId: "civic-alloy",
          outletId: "product"
        }
      ]
    }
  ],
  projection: { groupBy: "product", measure: "amount" },
  amountLabel: "mentions",
  width: 720,
  height: 440,
  title: "Debate crucible"
} as const

describe("CrucibleChart static rendering", () => {
  it("renders the authored terminal ledger with chart chrome and projection", () => {
    const { svg, evidence } = renderChartWithEvidence("CrucibleChart", fixture)

    expect(svg).toMatch(/^<svg/)
    expect(svg).toContain("Debate crucible")
    expect(svg).toContain('data-testid="crucible-chrome"')
    expect(svg).toContain('data-testid="crucible-projection-overlay"')
    expect(svg).toContain("Civic Alloy")
    expect(evidence.component).toBe("CrucibleChart")
    expect(evidence.frameType).toBe("physics")
    expect(evidence.status).toBe("ok")
    expect(evidence.markCount).toBe(4)
  })

  it("honors authored snapshotAt only in snapshot mode", () => {
    const early = renderChartWithEvidence("CrucibleChart", {
      ...fixture,
      playback: "snapshot",
      snapshotAt: { phaseId: "heat", progress: 0.25 }
    })
    const replay = renderChartWithEvidence("CrucibleChart", {
      ...fixture,
      playback: "replay",
      snapshotAt: { phaseId: "heat", progress: 0.25 },
      paused: true,
      playbackRate: 0.25,
      rerunMS: 0
    })

    expect(early.svg).not.toContain("Civic Alloy")
    expect(early.evidence.markCount).toBe(3)
    expect(replay.svg).toContain("Civic Alloy")
    expect(replay.evidence.markCount).toBe(4)
  })

  it("allows callers to suppress chart-owned chrome", () => {
    const svg = renderChart("CrucibleChart", {
      ...fixture,
      showChrome: false,
      showProjection: false
    })

    expect(svg).not.toContain('data-testid="crucible-chrome"')
    expect(svg).not.toContain('data-testid="crucible-projection-overlay"')
  })
})
