import * as React from "react"
import { fireEvent, render, screen, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { CompositionalNavigator } from "./CompositionalNavigator"
import { useCompositionalInterfaces } from "./useCompositionalInterfaces"
import { prepareCompositionalGraph } from "./prepare"

const prepared = prepareCompositionalGraph({
  schemaVersion: "semiotic.compositional-graph.v0.1",
  graphId: "nav",
  revision: "1",
  nodes: [
    {
      id: "card",
      parts: [
        {
          id: "field",
          label: "Field",
          ports: [{ id: "out", direction: "out" }]
        }
      ]
    }
  ],
  edges: []
})

describe("headless compositional interfaces", () => {
  it("exposes semantic kinds and detects removed owners, parts and ports", () => {
    const { result } = renderHook(() =>
      useCompositionalInterfaces(prepared, "card")
    )
    expect(result.current.items.map((i) => [i.kind, i.label])).toEqual([
      ["part", "Field"],
      ["port", "Field / out (out)"]
    ])
    expect(result.current.isRemoved(result.current.items[1].ref)).toBe(false)
    expect(
      result.current.isRemoved({
        nodeId: "card",
        endpoint: { kind: "part", partId: "field", portId: "missing" }
      })
    ).toBe(true)
    expect(
      result.current.isRemoved({
        nodeId: "card",
        endpoint: { kind: "part", partId: "missing" }
      })
    ).toBe(true)
    expect(
      result.current.isRemoved({
        nodeId: "missing",
        endpoint: { kind: "node" }
      })
    ).toBe(true)
  })
  it("keeps native Enter, arrow wrap and Escape behavior in the default navigator", () => {
    const select = vi.fn()
    render(<CompositionalNavigator prepared={prepared} onSelect={select} />)
    const owner = screen.getByRole("combobox")
    fireEvent.keyDown(owner, { key: "Enter" })
    expect(screen.getByRole("button", { name: "Field" })).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" })
    const port = screen.getByRole("button", { name: "Field / out (out)" })
    expect(port).toHaveFocus()
    fireEvent.click(port)
    expect(select).toHaveBeenCalledWith({
      nodeId: "card",
      endpoint: { kind: "part", partId: "field", portId: "out" }
    })
    fireEvent.keyDown(port, { key: "Escape" })
    expect(owner).toHaveFocus()
  })
})
