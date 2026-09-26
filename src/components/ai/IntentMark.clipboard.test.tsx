import React from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { IntentMark } from "./IntentMark"
import type { IntentManifest } from "./intentManifest"
import { ChartContainer } from "../ChartContainer"

const manifest: IntentManifest = {
  ididVersion: "0.1",
  chartId: "test",
  intent: { primary: "compare" }
}
const original = Object.getOwnPropertyDescriptor(navigator, "clipboard")
afterEach(() => {
  vi.useRealTimers()
  if (original) Object.defineProperty(navigator, "clipboard", original)
  else Reflect.deleteProperty(navigator, "clipboard")
})

describe("IntentMark clipboard feedback", () => {
  it("handles the same denial in the ChartContainer toolbar without changing the imperative API", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) }
    })
    render(
      <ChartContainer
        actions={{ copyConfig: true }}
        chartConfig={{ component: "BarChart", props: { data: [] } }}
      >
        <div>Chart</div>
      </ChartContainer>
    )
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Copy chart configuration" })
      )
    )
    expect(
      screen.getByRole("button", { name: /Copy failed/ })
    ).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Copy failed")
  })
  it.each(["reject", "missing"])(
    "reports %s clipboard failures without an unhandled rejection",
    async (mode) => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value:
          mode === "reject"
            ? { writeText: vi.fn().mockRejectedValue(new Error("Denied")) }
            : undefined
      })
      render(<IntentMark manifest={manifest} />)
      await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: "Copy manifest" }))
      )
      expect(
        screen.getByRole("button", { name: "Copy failed" })
      ).toBeInTheDocument()
      expect(screen.getByRole("status")).toHaveTextContent("Copy failed")
    }
  )

  it("announces success and clears its reset timer on unmount", async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    })
    const { unmount } = render(<IntentMark manifest={manifest} />)
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Copy manifest" }))
    )
    expect(writeText).toHaveBeenCalledWith(JSON.stringify(manifest, null, 2))
    expect(screen.getByRole("status")).toHaveTextContent("Copied")
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
