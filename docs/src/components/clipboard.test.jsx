import React from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import CodeBlock from "./CodeBlock"
import ComponentMeta from "./ComponentMeta"

const original = Object.getOwnPropertyDescriptor(navigator, "clipboard")
afterEach(() => {
  if (original) Object.defineProperty(navigator, "clipboard", original)
  else Reflect.deleteProperty(navigator, "clipboard")
})

it.each([
  ["code", <CodeBlock code="const x = 1" />],
  ["import", <ComponentMeta importStatement='import { BarChart } from "semiotic/ordinal"' />],
])("reports failed %s copies truthfully", async (_, component) => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) },
  })
  render(component)
  await act(async () => fireEvent.click(screen.getByRole("button", { name: /Copy/ })))
  expect(screen.getByRole("button", { name: "Copy failed" })).toBeInTheDocument()
  expect(screen.getByRole("status")).toHaveTextContent("Copy failed")
})
