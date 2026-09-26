import React from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { expect, it, vi } from "vitest"
import { NetworkAccessibleDataTableSlot } from "./NetworkAccessibleDataTableSlot"

const loading = vi.hoisted(() => {
  let finish!: () => void
  const promise = new Promise<void>((resolve) => {
    finish = resolve
  })
  return { promise, finish: () => finish() }
})

vi.mock("./NetworkAccessibleDataTable", async (importOriginal) => {
  await loading.promise
  return importOriginal()
})

it("reveals the skip link with its target after loading, then restores the trigger on close", async () => {
  render(
    <NetworkAccessibleDataTableSlot
      tableId="lazy-summary"
      chartType="Network"
      nodes={[{ datum: { id: "A" } }]}
      edges={[]}
    />
  )
  expect(screen.queryByRole("link")).toBeNull()
  expect(screen.queryByRole("button")).toBeNull()
  await act(async () => loading.finish())
  const trigger = await screen.findByRole("button", {
    name: /View data summary/
  })
  expect(
    screen.getByRole("link", { name: "Skip to data table" })
  ).toHaveAttribute("href", "#lazy-summary")
  expect(document.getElementById("lazy-summary")).toBeInTheDocument()
  act(() => trigger.focus())
  fireEvent.click(trigger)
  expect(screen.getByRole("region")).toHaveFocus()
  fireEvent.click(screen.getByRole("button", { name: "Close data summary" }))
  expect(
    screen.getByRole("button", { name: /View data summary/ })
  ).toHaveFocus()
})
