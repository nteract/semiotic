import * as React from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, expectTypeOf, it, vi } from "vitest"
import { DetailsPanel, type DetailsPanelProps } from "./DetailsPanel"
import type { ChartObservation, ClickObservation, HoverObservation } from "./store/ObservationStore"

const clicked: ClickObservation = { type: "click", datum: { name: "Alpha" }, chartType: "Scatterplot", chartId: "a", timestamp: 1, x: 20, y: 30 }
const content = (datum: { name?: unknown }) => <span>{String(datum.name)}</span>

describe("DetailsPanel lifecycle and semantics", () => {
  it("preserves extensible props and infers the observation type from the trigger", () => {
    interface ExtendedPanelProps extends DetailsPanelProps { testId?: string }
    const props: ExtendedPanelProps = { children: (_datum, observation: ClickObservation) => observation.type }
    const namedHoverProps: DetailsPanelProps = {
      trigger: "hover",
      children: (_datum, observation: ClickObservation) => observation.type,
      position: "right",
      size: 240,
      chartId: "a",
      observation: { ...clicked, type: "hover" },
      dismissOnEmpty: false,
      showClose: true,
      onToggle: () => undefined,
      className: "legacy-panel",
      style: { color: "black" },
    }
    expect(props.children).toBeTypeOf("function")
    expect(<DetailsPanel {...props} />).toBeDefined()
    expect(<DetailsPanel {...namedHoverProps} />).toBeDefined()
    const clickedContent = <DetailsPanel observation={clicked}>{(_datum, observation) => {
      expectTypeOf(observation).toEqualTypeOf<ClickObservation>()
      return observation.type
    }}</DetailsPanel>
    const hoverContent = <DetailsPanel trigger="hover" observation={{ ...clicked, type: "hover" }}>{(_datum, observation) => {
      expectTypeOf(observation).toEqualTypeOf<HoverObservation>()
      return observation.type
    }}</DetailsPanel>
    const { rerender } = render(clickedContent)
    rerender(hoverContent)
  })
  it("notifies only actual transitions despite callback identity changes and StrictMode", () => {
    const toggled = vi.fn()
    const ui = (observation?: ChartObservation | null) => <React.StrictMode><DetailsPanel observation={observation} onToggle={(open) => toggled(open)}>{content}</DetailsPanel></React.StrictMode>
    const { rerender } = render(ui())
    expect(toggled).not.toHaveBeenCalled()
    rerender(ui(clicked))
    expect(screen.getByRole("region", { name: "Chart details" })).toHaveTextContent("Alpha")
    expect(toggled.mock.calls).toEqual([[true]])
    rerender(ui(clicked))
    expect(toggled.mock.calls).toEqual([[true]])
    rerender(ui(null))
    expect(screen.queryByRole("region")).toBeNull()
    expect(toggled.mock.calls).toEqual([[true], [false]])
    rerender(ui(null))
    expect(toggled.mock.calls).toEqual([[true], [false]])
  })

  it("focuses keyboard activations, exposes a named dialog, and restores focus on Escape", () => {
    function Harness() {
      const [observation, setObservation] = React.useState<ChartObservation | null>(null)
      return <><button onClick={() => setObservation({ type: "activate", inputType: "keyboard", datum: { name: "Alpha" }, chartType: "Scatterplot", timestamp: 1 })}>Inspect Alpha</button><DetailsPanel position="overlay" ariaLabel="Point details" observation={observation}>{content}</DetailsPanel></>
    }
    render(<Harness />)
    const trigger = screen.getByRole("button", { name: "Inspect Alpha" })
    act(() => trigger.focus())
    fireEvent.click(trigger)
    const panel = screen.getByRole("dialog", { name: "Point details" })
    expect(panel).toHaveFocus()
    fireEvent.keyDown(panel, { key: "Escape" })
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(trigger).toHaveFocus()
    expect(panel).toHaveAttribute("inert")
  })

  it("filters direct observations by trigger and chart and passes hover observations truthfully", () => {
    const child = vi.fn((datum) => content(datum))
    const { rerender } = render(<DetailsPanel trigger="hover" chartId="a" observation={clicked}>{child}</DetailsPanel>)
    expect(child).not.toHaveBeenCalled()
    const hover = { ...clicked, type: "hover" as const }
    rerender(<DetailsPanel trigger="hover" chartId="a" observation={{ ...hover, chartId: "b" }}>{child}</DetailsPanel>)
    expect(child).not.toHaveBeenCalled()
    rerender(<DetailsPanel trigger="hover" chartId="a" observation={hover}>{child}</DetailsPanel>)
    expect(child).toHaveBeenLastCalledWith(hover.datum, hover)
    expect(screen.getByRole("region")).toHaveAttribute("aria-live", "polite")
  })

  it("cancels delayed removal when a new observation opens during the closing transition", () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(<DetailsPanel observation={clicked}>{content}</DetailsPanel>)
      fireEvent.click(screen.getByRole("button", { name: "Close details" }))
      act(() => vi.advanceTimersByTime(100))
      rerender(<DetailsPanel observation={{ ...clicked, timestamp: 2, datum: { name: "Beta" } }}>{content}</DetailsPanel>)
      act(() => vi.advanceTimersByTime(300))
      expect(screen.getByRole("region")).toHaveTextContent("Beta")
    } finally { vi.useRealTimers() }
  })

  it("treats a null renderer as hidden without an open notification", () => {
    const toggled = vi.fn()
    render(<DetailsPanel observation={clicked} onToggle={toggled}>{() => null}</DetailsPanel>)
    expect(screen.queryByRole("region")).toBeNull()
    expect(toggled).not.toHaveBeenCalled()
  })

  it("retains the original click payload and removes reduced-motion transitions", () => {
    const previous = window.matchMedia
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    try {
      const child = vi.fn((datum) => content(datum))
      render(<DetailsPanel observation={clicked}>{child}</DetailsPanel>)
      expect(child).toHaveBeenLastCalledWith(clicked.datum, clicked)
      const panel = screen.getByRole("region")
      expect(panel.style.transition).toBe("")
      expect(panel.style.opacity).toBe("1")
      const close = screen.getByRole("button", { name: "Close details" })
      expect(close).toHaveStyle({ width: "24px", height: "24px" })
      fireEvent.click(close)
      expect(panel).not.toBeInTheDocument()
    } finally { window.matchMedia = previous }
  })
})
