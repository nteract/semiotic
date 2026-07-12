import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { validateProps } from "semiotic/utils"
import {
  FOCAL_INSERT_B_PREDICATE,
  INCIDENT_PREDICATE,
  compilePredicate,
  fulfillmentDomain,
  orderRecords,
} from "./insight-forge/insightForgeData"
import { makeArtifact } from "./insight-forge/insightForgeArtifacts"
import {
  InsightForgeWorkbench,
  artifactIdFromDatum,
  buildChartModel,
  createKnowledgeChartConfig,
  defaultModeFor,
  supportsCompare,
} from "./InsightForgeExamplePage"

function artifact(id, kind, extra = {}) {
  return makeArtifact({
    id,
    kind,
    title: id,
    summary: `${id} summary`,
    predicate: FOCAL_INSERT_B_PREDICATE,
    ...extra,
  })
}

describe("Insight Forge integration contracts", () => {
  it("does not overstate a single Sankey node or cohort point as a broader claim", () => {
    expect(artifactIdFromDatum("route-ledger", { id: "package:insert-b" })).toBe(
      "route-denominator",
    )
    expect(
      artifactIdFromDatum("inspection-bench", {
        id: "one-insert-b-point",
        packageDesignId: "insert-b",
        isFocalInsertB: true,
      }),
    ).toBe("inspection-view")
  })

  it("chooses compare only where the recipient room implements it", () => {
    const counterevidence = artifact("counter", "counterevidence")
    expect(supportsCompare(counterevidence, { id: "inspection-bench" })).toBe(true)
    expect(defaultModeFor(counterevidence, { id: "inspection-bench" })).toBe("compare")
    expect(defaultModeFor(counterevidence, { id: "sorting-shelf" })).toBe("filter")
  })

  it("creates and rehydrates a valid, incident-scoped Knowledge Heatmap", () => {
    const insight = artifact("accepted-insight", "insight", {
      maturity: "operational",
      lifecycle: { status: "accepted" },
    })
    const config = createKnowledgeChartConfig(insight)
    expect(config.component).toBe("Heatmap")
    expect(validateProps(config.component, config.props).valid).toBe(true)

    const knowledge = artifact("knowledge", "knowledge-view", {
      predicate: insight.predicate,
      maturity: "operational",
      lifecycle: { status: "accepted" },
      lineage: { parentIds: [insight.id] },
      payload: { config },
    })
    const artifacts = { [insight.id]: insight, [knowledge.id]: knowledge }
    const model = buildChartModel({
      roomId: "knowledge-lab",
      rows: orderRecords,
      allRows: orderRecords,
      chartWidth: 760,
      shelfDimension: "reason",
      routeScope: "returned",
      applications: [],
      artifacts,
      acceptedInsight: null,
      knowledgeView: knowledge,
    })
    const expectedScope = orderRecords.filter(
      compilePredicate(fulfillmentDomain, {
        op: "and",
        clauses: [INCIDENT_PREDICATE, { op: "eq", field: "fulfillment.warehouse", value: "reno" }],
      }),
    )
    expect(model.scopeRows).toHaveLength(expectedScope.length)
    expect(model.configProps.data).toHaveLength(18)
    expect(model.configProps.annotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "highlight",
          field: "id",
          value: "starlight-lantern|insert-b",
          sourceArtifactId: insight.id,
        }),
        expect.objectContaining({ type: "callout", sourceArtifactId: insight.id }),
      ]),
    )
  })

  it("renders the traveled-path and recipe-atlas drawers without crashing", () => {
    render(<InsightForgeWorkbench />)

    // Authored map surfaces each room's question.
    expect(screen.getByText("Authored map")).toBeTruthy()

    // Navigate: watchtower → sorting-shelf produces one on-spine transition.
    fireEvent.click(screen.getByRole("button", { name: /Sorting Shelf/i }))

    // Traveled paths panel mounts the NetworkCustomChart arc diagram and
    // derives the session transition against the authored spine.
    fireEvent.click(screen.getByRole("button", { name: /Traveled paths/i }))
    expect(screen.getByText(/How this session moved through the rooms/i)).toBeTruthy()
    expect(screen.getByText(/authored spine for 1 of 1/i)).toBeTruthy()

    // Recipes & lineage panel shows the canonical crafting tree.
    fireEvent.click(screen.getByRole("button", { name: /Recipes & lineage/i }))
    expect(screen.getByText(/The full Shattered Lanterns crafting tree/i)).toBeTruthy()
    expect(screen.getByText(/retracts the carrier hypothesis/i)).toBeTruthy()
  })

  it("turns applied counterevidence into visible Inspection Bench marks", () => {
    const counterevidence = artifact("counter", "counterevidence")
    const model = buildChartModel({
      roomId: "inspection-bench",
      rows: orderRecords,
      allRows: orderRecords,
      chartWidth: 760,
      shelfDimension: "reason",
      routeScope: "returned",
      applications: [{ artifactId: counterevidence.id, mode: "compare" }],
      artifacts: { [counterevidence.id]: counterevidence },
      acceptedInsight: null,
      knowledgeView: null,
    })
    expect(model.configProps.annotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "highlight", sourceArtifactId: counterevidence.id }),
        expect.objectContaining({ type: "callout", sourceArtifactId: counterevidence.id }),
      ]),
    )
  })
})
