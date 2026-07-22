import * as React from "react"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { createMockCanvasContext } from "../../../test-utils/canvasMock"
import { PhysicsPipelineStore } from "../../stream/physics/PhysicsPipelineStore"
import { buildCrucibleProjection } from "./crucibleEffects"
import { compileCruciblePlan } from "./cruciblePhysics"
import {
  CrucibleChrome,
  CrucibleProjectionOverlay,
  crucibleBodySemanticItem,
  crucibleProjectionSemanticItems,
  drawCrucibleBonds
} from "./crucibleChrome"

const plan = compileCruciblePlan({
  data: [
    { id: "tax", count: 12 },
    { id: "jobs", count: 9 }
  ],
  idAccessor: "id",
  amountAccessor: "count",
  size: [490, 410],
  phases: [
    { id: "test", label: "Test", duration: 1 },
    { id: "pour", label: "Pour", duration: 1 }
  ],
  products: [{ id: "tax-jobs", label: "tax + jobs", outletId: "product" }],
  events: [
    {
      id: "form",
      at: { phaseId: "test", progress: 0.5 },
      effects: [
        {
          type: "combine",
          sourceIds: ["tax", "jobs"],
          productId: "tax-jobs"
        }
      ]
    }
  ]
})

describe("CrucibleChart chrome", () => {
  it("draws a collider-aligned vessel, phase rail, and named outlets", () => {
    const { container, getByTestId } = render(
      <CrucibleChrome
        layout={plan.layout}
        phases={plan.phases}
        state={plan.terminalState}
      />
    )

    expect(getByTestId("crucible-phase-rail")).toBeTruthy()
    expect(container.textContent).toContain("TEST")
    expect(container.textContent).toContain("PRODUCTS")
    const boundary = container.querySelector(
      `rect[x="${plan.layout.chamber.x}"][y="${plan.layout.chamber.y}"]`
    )
    expect(boundary?.getAttribute("width")).toBe(
      String(plan.layout.chamber.width)
    )
  })

  it("builds projection marks and semantics from ledger values", () => {
    const projection = { groupBy: "product", measure: "amount" } as const
    const rows = buildCrucibleProjection(plan.terminalState, projection)
    const semanticItems = crucibleProjectionSemanticItems(
      rows,
      plan.layout,
      projection,
      "mentions"
    )
    const { getByTestId } = render(
      <CrucibleProjectionOverlay
        rows={rows}
        layout={plan.layout}
        projection={projection}
        amountLabel="mentions"
      />
    )

    expect(getByTestId("crucible-projection-overlay")).toBeTruthy()
    expect(rows).toMatchObject([
      { key: "tax-jobs", label: "tax + jobs", amount: 21 }
    ])
    expect(semanticItems[0].label).toBe("tax + jobs: 21 mentions")
  })

  it("exposes source/product semantics and paints committed lineage bonds", () => {
    const store = new PhysicsPipelineStore(plan.config)
    store.enqueue(plan.terminalSpawns)
    store.tick(0)
    const bodies = store.readBodies()
    const productBody = bodies.find((body) =>
      String(body.id).includes("product")
    )!
    const semantic = crucibleBodySemanticItem(productBody, plan.terminalState)
    const ctx = createMockCanvasContext() as unknown as CanvasRenderingContext2D

    drawCrucibleBonds(ctx, bodies, plan.terminalState)

    expect(semantic).toMatchObject({
      label: "tax + jobs",
      group: "derived product · complete"
    })
    expect(ctx.moveTo).toHaveBeenCalled()
    expect(ctx.lineTo).toHaveBeenCalled()
  })
})
