import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  UnitedStatesRiverTooltip,
  usInventoryAt,
} from "./UnitedStatesHistoryRiverExamplePage"
import {
  US_CORE_NODE_IDS,
  US_DOMAIN,
  US_PROCESS_EDGES,
  US_PROCESS_NODES,
} from "./data/unitedStatesHistoryRiver"

describe("UnitedStatesRiverTooltip", () => {
  it("describes a persistent institution using lifecycle-aware present inventory", () => {
    const territories = US_PROCESS_NODES.find((node) => node.id === US_CORE_NODE_IDS.territories)
    render(<UnitedStatesRiverTooltip hover={territories} />)

    expect(screen.getByText("United States Territories")).toBeTruthy()
    expect(screen.getByText(/persistent reservoir/i)).toBeTruthy()
    expect(screen.getByText(/5 active jurisdiction routes at present/i)).toBeTruthy()
  })

  it("describes a predecessor bundle without inventing negative present inventory", () => {
    const newEngland = US_PROCESS_NODES.find((node) => node.id === "NEW_ENGLAND_COLONIES")
    render(<UnitedStatesRiverTooltip hover={newEngland} />)

    expect(screen.getByText(/4 jurisdiction routes depart this source/i)).toBeTruthy()
    expect(screen.queryByText(/-4 active jurisdiction routes/i)).toBeNull()
    expect(usInventoryAt(newEngland.id, US_DOMAIN[1], US_PROCESS_EDGES)).toBe(0)
  })

  it("names the route and legal transition on a statehood passage", () => {
    const california = US_PROCESS_EDGES.find((edge) => edge.id === "STATEHOOD_CA")
    render(<UnitedStatesRiverTooltip hover={{ data: california }} />)

    expect(screen.getByText("United States Territories → United States")).toBeTruthy()
    expect(screen.getByText(/California travels on this route/i)).toBeTruthy()
    expect(screen.getByText("1 jurisdiction route")).toBeTruthy()
    expect(screen.getByText(/31st state/i)).toBeTruthy()
  })

  it("keeps Cuba's occupation distinct from annexation and exposes its fade date", () => {
    const cuba = US_PROCESS_EDGES.find((edge) => edge.holdingId === "CUBA_OCCUPATION_1898")
    render(<UnitedStatesRiverTooltip hover={{ data: cuba }} />)

    expect(screen.getByText(/military occupation, never annexed/i)).toBeTruthy()
    expect(screen.getByText(/fades from the U.S. Colonies band on 20 May 1902/i)).toBeTruthy()
  })

  it("reports lifecycle exits instead of the layout's unreduced target mass", () => {
    expect(usInventoryAt(US_CORE_NODE_IDS.colonies, US_DOMAIN[1], US_PROCESS_EDGES)).toBe(0)
    expect(usInventoryAt(US_CORE_NODE_IDS.states, US_DOMAIN[1], US_PROCESS_EDGES)).toBe(50)
    expect(usInventoryAt(US_CORE_NODE_IDS.territories, US_DOMAIN[1], US_PROCESS_EDGES)).toBe(5)
  })
})
