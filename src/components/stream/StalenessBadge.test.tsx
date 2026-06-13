import { render } from "@testing-library/react"
import { StalenessBadge } from "./StalenessBadge"

describe("StalenessBadge", () => {
  it("renders LIVE when fresh and STALE when stale", () => {
    const { rerender, getByText } = render(<StalenessBadge isStale={false} />)
    expect(getByText("LIVE")).toBeInTheDocument()
    rerender(<StalenessBadge isStale={true} />)
    expect(getByText("STALE")).toBeInTheDocument()
  })

  it("defaults to the top-right corner and never intercepts pointer events", () => {
    const { container } = render(<StalenessBadge isStale={false} />)
    const el = container.querySelector(".stream-staleness-badge") as HTMLElement
    expect(el.style.top).toBe("4px")
    expect(el.style.right).toBe("4px")
    expect(el.style.pointerEvents).toBe("none")
  })

  it("honors the requested corner", () => {
    const { container } = render(<StalenessBadge isStale position="bottom-left" />)
    const el = container.querySelector(".stream-staleness-badge") as HTMLElement
    expect(el.style.bottom).toBe("4px")
    expect(el.style.left).toBe("4px")
  })

  it("uses the canonical (legible) typography shared across all four frames", () => {
    const { container } = render(<StalenessBadge isStale={false} />)
    const el = container.querySelector(".stream-staleness-badge") as HTMLElement
    expect(el.style.fontSize).toBe("11px")
    expect(el.style.fontWeight).toBe("600")
  })
})
