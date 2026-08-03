import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { GermanyBecomingTooltip } from "./GermanyStillBecomingExamplePage"
import { GERMANY_PROCESS_EDGES, GERMANY_PROCESS_NODES } from "./data/germanyStillBecoming"

describe("GermanyBecomingTooltip", () => {
  it("explains a historical container and its endpoint contribution", () => {
    const confederation = GERMANY_PROCESS_NODES.find((node) => node.id === "S05_NORTH_GERMAN_CONFED")
    render(<GermanyBecomingTooltip hover={confederation} />)

    expect(screen.getByText("North German Confederation")).toBeTruthy()
    expect(screen.getByText(/Prussian-led federation north of the Main/i)).toBeTruthy()
    expect(screen.getByText(/of the endpoint by balanced/)).toBeTruthy()
  })

  it("names both containers and the kind of passage in a ribbon tooltip", () => {
    const recombination = GERMANY_PROCESS_EDGES.find((edge) => edge.id === "L066")
    render(<GermanyBecomingTooltip hover={{ data: recombination }} metricId="area_pct_DE" />)

    expect(screen.getByText(/1815 → 1867 \/ Recombines/)).toBeTruthy()
    expect(screen.getByText(/Hesse-Darmstadt and Hessian minors → North German Confederation/)).toBeTruthy()
    expect(screen.getByText(/by area/)).toBeTruthy()
  })

  it("retains the explicit endpoint-width caveat in edge notes", () => {
    const edge = GERMANY_PROCESS_EDGES[0]
    render(<GermanyBecomingTooltip hover={{ data: edge }} />)
    expect(screen.getByText(/Mass-conserving endpoint-contribution flow/)).toBeTruthy()
  })
})
