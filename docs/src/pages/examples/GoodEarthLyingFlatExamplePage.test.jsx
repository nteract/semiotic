import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { GoodEarthLyingFlatTooltip } from "./GoodEarthLyingFlatExamplePage"
import { GOOD_EARTH_PROCESS_EDGES, GOOD_EARTH_PROCESS_NODES } from "./data/goodEarthLyingFlat"

describe("GoodEarthLyingFlatTooltip", () => {
  it("identifies the selected causal claim, confidence, and type", () => {
    const edge = GOOD_EARTH_PROCESS_EDGES.find((item) => item.source === "involution" && item.target === "lying_flat")
    render(<GoodEarthLyingFlatTooltip hover={edge} />)

    expect(screen.getByText(/Involution → Lying flat/)).toBeTruthy()
    expect(screen.getByText(/causal-emphasis units · high confidence/)).toBeTruthy()
    expect(screen.getByText("cultural response")).toBeTruthy()
  })

  it("explains a concept without treating width as a population count", () => {
    const node = GOOD_EARTH_PROCESS_NODES.find((item) => item.id === "property_security")
    render(<GoodEarthLyingFlatTooltip hover={{ data: node }} />)

    expect(screen.getByText("Property as family security")).toBeTruthy()
    expect(screen.getByText(/Housing becomes the urban successor/i)).toBeTruthy()
    expect(screen.getByText(/connected causal claims/)).toBeTruthy()
  })
})
