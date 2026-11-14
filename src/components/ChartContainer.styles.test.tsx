import * as React from "react"
import { act, render } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { hydrateRoot } from "react-dom/client"
import { describe, expect, it, vi } from "vitest"
import { ChartContainer } from "./ChartContainer"
import { MobileChartContainer } from "./MobileChartContainer"

const shared = () =>
  document.head.querySelectorAll("style[data-semiotic-container-style]")
const chart = (breakpoint: number) => (
  <ChartContainer title="Report" mobile={{ breakpoint }}>
    <div>Data</div>
  </ChartContainer>
)

describe("ChartContainer stylesheet ownership", () => {
  it("shares static and matching breakpoint rules, and releases only unused rules", () => {
    const first = render(<React.StrictMode>{chart(480)}</React.StrictMode>)
    const second = render(chart(480))
    const third = render(chart(600))
    expect(shared()).toHaveLength(3)
    first.unmount()
    expect(shared()).toHaveLength(3)
    second.unmount()
    expect(shared()).toHaveLength(2)
    third.rerender(chart(320))
    expect(shared()).toHaveLength(2)
    expect(
      document.head.querySelector('[data-semiotic-container-style="chart-600"]')
    ).toBeNull()
    third.unmount()
    expect(shared()).toHaveLength(0)
  })

  it("includes SSR styles and hydrates without changing or duplicating chart content", async () => {
    const ui = (
      <>
        {chart(480)}
        {chart(480)}
      </>
    )
    const element = document.createElement("div")
    element.innerHTML = renderToString(ui)
    document.body.append(element)
    expect(element.querySelector("style")?.textContent).toContain(
      "@keyframes semiotic-skeleton-pulse"
    )
    expect(element.querySelector("style")?.textContent).toContain(
      '[data-semiotic-mobile-breakpoint="480"]'
    )
    const chartElement = element.querySelector(".semiotic-chart-container")
    const recover = vi.fn()
    const root = hydrateRoot(element, ui, { onRecoverableError: recover })
    await act(async () => {})
    expect(recover).not.toHaveBeenCalled()
    expect(element.querySelector(".semiotic-chart-container")).toBe(
      chartElement
    )
    expect(element.querySelectorAll("style")).toHaveLength(0)
    expect(shared()).toHaveLength(2)
    act(() => root.unmount())
    element.remove()
    expect(shared()).toHaveLength(0)
  })

  it("keeps styles inside a shadow root and releases them on unmount", () => {
    const host = document.createElement("div")
    document.body.append(host)
    const shadow = host.attachShadow({ mode: "open" })
    const mount = document.createElement("div")
    shadow.append(mount)
    const view = render(chart(480), { container: mount })
    expect(
      shadow.querySelectorAll("style[data-semiotic-container-style]")
    ).toHaveLength(2)
    expect(shared()).toHaveLength(0)
    view.unmount()
    expect(shadow.querySelectorAll("style")).toHaveLength(0)
    host.remove()
  })

  it("shares the mobile shell styles as well as the inner container styles", () => {
    const mobile = (breakpoint: number) => (
      <MobileChartContainer breakpoint={breakpoint}>
        <div>Data</div>
      </MobileChartContainer>
    )
    const first = render(mobile(480))
    const second = render(mobile(480))
    const third = render(mobile(800))
    expect(shared()).toHaveLength(6)
    first.unmount()
    expect(shared()).toHaveLength(6)
    second.unmount()
    expect(shared()).toHaveLength(4)
    third.unmount()
    expect(shared()).toHaveLength(0)
  })
})
