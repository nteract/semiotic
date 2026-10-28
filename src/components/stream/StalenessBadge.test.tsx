import { ThemeProvider } from "../ThemeProvider"
import { contrastRatio } from "../charts/shared/colorContrast"
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

  it("renders source-state overrides instead of STALE", () => {
    const { rerender, getByText } = render(
      <StalenessBadge isStale state="stopped" />,
    )
    expect(getByText("STOPPED")).toBeInTheDocument()
    rerender(<StalenessBadge isStale={false} state="failed" />)
    expect(getByText("FAILED")).toBeInTheDocument()
    rerender(<StalenessBadge isStale={false} settling />)
    expect(getByText("SETTLING")).toBeInTheDocument()
  })
})

it.each(["light", "dark", "high-contrast"] as const)("keeps all %s status labels at text contrast and announces changes", theme => {
  for (const state of ["live", "stale", "stopped", "failed", "settling"] as const) {
    const result = render(<ThemeProvider theme={theme}><StalenessBadge isStale={false} state={state} /></ThemeProvider>)
    const badge = result.getByRole("status")
    const hex = (css: string) => "#" + css.match(/\d+/g)!.slice(0, 3).map(value => Number(value).toString(16).padStart(2, "0")).join("")
    expect(contrastRatio(hex(badge.style.backgroundColor), hex(badge.style.color))).toBeGreaterThanOrEqual(4.5)
    expect(badge.textContent).toBe(state.toUpperCase())
    expect(badge.getAttribute("aria-atomic")).toBe("true")
    result.unmount()
  }
})
