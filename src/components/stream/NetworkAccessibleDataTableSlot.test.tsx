import React from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { expect, it, vi } from "vitest"
import { NetworkAccessibleDataTableSlot } from "./NetworkAccessibleDataTableSlot"
import { AccessibleDataTableSlot } from "./AccessibleDataTable"
import { renderToString } from "react-dom/server"

const loading = vi.hoisted(() => {
  const deferred = () => {
    let finish!: () => void
    const promise = new Promise<void>((resolve) => {
      finish = resolve
    })
    return { promise, finish: () => finish() }
  }
  return { network: deferred(), scene: deferred() }
})

vi.mock("./NetworkAccessibleDataTableContent", async (importOriginal) => {
  await loading.network.promise
  return importOriginal()
})

vi.mock("./AccessibleDataTableContent", async (importOriginal) => {
  await loading.scene.promise
  return importOriginal()
})

it.each([
  {
    name: "network",
    loading: loading.network,
    count: "1 nodes, 0 edges",
    table: (
      <NetworkAccessibleDataTableSlot
        tableId="lazy-summary"
        chartType="Network"
        nodes={[{ datum: { id: "A" } }]}
        edges={[]}
      />
    )
  },
  {
    name: "scene",
    loading: loading.scene,
    count: "1 elements",
    table: (
      <AccessibleDataTableSlot
        accessibleTable
        tableId="lazy-summary"
        chartType="XY"
        scene={[{ type: "point", datum: { id: "A" } }]}
      />
    )
  }
])(
  "$name keeps the SSR target, focus, and close controls while expanded content loads",
  async ({ table, count, loading }) => {
    const html = renderToString(table)
    expect(html).toContain('id="lazy-summary"')
    expect(html.replace(/<!--.*?-->/g, "")).toContain(
      `View data summary (${count})`
    )
    render(table)
    const trigger = screen.getByRole("button", {
      name: /View data summary/
    })
    expect(
      screen.getByRole("link", { name: "Skip to data table" })
    ).toHaveAttribute("href", "#lazy-summary")
    expect(document.getElementById("lazy-summary")).toBeInTheDocument()
    act(() => trigger.focus())
    fireEvent.click(trigger)
    const region = screen.getByRole("region")
    expect(region).toHaveFocus()
    expect(screen.getByText("Loading data summary…")).toHaveAttribute(
      "role",
      "status"
    )
    // Closing and reopening before the chunk arrives must retain the same controls.
    fireEvent.click(screen.getByRole("button", { name: "Close data summary" }))
    expect(
      screen.getByRole("button", { name: /View data summary/ })
    ).toHaveFocus()
    fireEvent.click(screen.getByRole("button", { name: /View data summary/ }))
    const pendingRegion = screen.getByRole("region")
    await act(async () => loading.finish())
    expect(screen.getByRole("region")).toBe(pendingRegion)
    expect(pendingRegion).toHaveFocus()
    expect(await screen.findByRole("row", { name: /\bA\b/ })).toHaveTextContent(
      "A"
    )
    fireEvent.click(screen.getByRole("button", { name: "Close data summary" }))
    expect(
      screen.getByRole("button", { name: /View data summary/ })
    ).toHaveFocus()
  }
)
