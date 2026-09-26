import React from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ClipboardStatus, useClipboard } from "./useClipboard"
import { copyWithFallback } from "../../docs/src/components/clipboard"

const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard"
)
const originalCommand = Object.getOwnPropertyDescriptor(document, "execCommand")
afterEach(() => {
  vi.useRealTimers()
  for (const [target, key, original] of [
    [navigator, "clipboard", originalClipboard],
    [document, "execCommand", originalCommand]
  ] as const) {
    if (original) Object.defineProperty(target, key, original)
    else Reflect.deleteProperty(target, key)
  }
})
function Copy({ fallback = false }) {
  const { status, copy } = useClipboard(1200)
  return (
    <>
      <button
        onClick={() =>
          void copy(
            fallback ? () => copyWithFallback("chart code") : "chart code"
          )
        }
      >
        Copy
      </button>
      <ClipboardStatus status={status} />
    </>
  )
}
const mockClipboard = (writeText: () => Promise<void>) =>
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText }
  })

describe("clipboard lifecycle and legacy fallback", () => {
  it.each([false, "throw"])(
    "reports failed fallback %s, removes temporary DOM, and restores focus",
    async (failure) => {
      mockClipboard(() => Promise.reject(new Error("Denied")))
      Object.defineProperty(document, "execCommand", {
        configurable: true,
        value: () => {
          if (failure === "throw") throw new Error("Denied")
          return false
        }
      })
      render(<Copy fallback />)
      const button = screen.getByRole("button")
      button.focus()
      await act(async () => fireEvent.click(button))
      expect(screen.getByRole("status")).toHaveTextContent("Copy failed")
      expect(document.querySelector("textarea")).toBeNull()
      expect(button).toHaveFocus()
    }
  )

  it("reports a successful legacy fallback accurately", async () => {
    mockClipboard(() => Promise.reject(new Error("Denied")))
    const execCommand = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand
    })
    render(<Copy fallback />)
    await act(async () => fireEvent.click(screen.getByRole("button")))
    expect(execCommand).toHaveBeenCalledWith("copy")
    expect(screen.getByRole("status")).toHaveTextContent("Copied")
  })

  it("ignores stale requests and resets only the latest feedback", async () => {
    vi.useFakeTimers()
    let finishFirst!: () => void
    const first = new Promise<void>((resolve) => {
      finishFirst = resolve
    })
    mockClipboard(
      vi
        .fn()
        .mockReturnValueOnce(first)
        .mockRejectedValueOnce(new Error("Denied"))
    )
    render(<Copy />)
    fireEvent.click(screen.getByRole("button"))
    await act(async () => fireEvent.click(screen.getByRole("button")))
    expect(screen.getByRole("status")).toHaveTextContent("Copy failed")
    await act(async () => finishFirst())
    expect(screen.getByRole("status")).toHaveTextContent("Copy failed")
    act(() => vi.advanceTimersByTime(1200))
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  it("does not schedule reset work after an outstanding copy resolves on an unmounted component", async () => {
    vi.useFakeTimers()
    let finish!: () => void
    mockClipboard(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    const { unmount } = render(<Copy />)
    fireEvent.click(screen.getByRole("button"))
    unmount()
    await act(async () => finish())
    expect(vi.getTimerCount()).toBe(0)
  })
})
