import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ApolloTooltip } from "./ApolloLunarChoreographyExamplePage"
import {
  APOLLO_PROCESS_EDGES,
  APOLLO_PROCESS_NODES,
} from "./data/apolloLunarChoreography"

describe("ApolloTooltip", () => {
  it("explains node-band phase data instead of returning an empty tooltip", () => {
    const lifeboat = APOLLO_PROCESS_NODES.find((node) => node.id === "LIFEBOAT")

    render(<ApolloTooltip hover={lifeboat} edges={APOLLO_PROCESS_EDGES} />)

    expect(screen.getByText("LM lifeboat")).toBeTruthy()
    expect(screen.getByText(/emergency shelter/i)).toBeTruthy()
    expect(screen.getByText(/1 mission in this lens · 2 timed transitions/)).toBeTruthy()
    expect(screen.getByText(/1 arriving · 1 departing ribbon/)).toBeTruthy()
  })

  it("keeps mission detail in edge-ribbon tooltips", () => {
    const descent = APOLLO_PROCESS_EDGES.find((edge) => edge.id === "apollo-11-descent")

    render(<ApolloTooltip hover={{ data: descent }} edges={APOLLO_PROCESS_EDGES} />)

    expect(screen.getByText("Apollo 11")).toBeTruthy()
    expect(screen.getByText("Lunar orbit → Lunar surface")).toBeTruthy()
    expect(screen.getByText(/Neil Armstrong, Buzz Aldrin/)).toBeTruthy()
  })
})
