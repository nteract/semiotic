import React from "react"
import { render } from "@testing-library/react"
import { renderHook, act } from "@testing-library/react"
import { LinkedCharts, useSelection, useLinkedHover } from "./LinkedCharts"

describe("LinkedCharts", () => {
  it("renders children within a SelectionProvider", () => {
    const { container } = render(
      <LinkedCharts>
        <div data-testid="child">Child</div>
      </LinkedCharts>
    )
    expect(container.querySelector("[data-testid='child']")).toBeTruthy()
  })

  it("allows useSelection hooks to work within it", () => {
    function TestHook() {
      const { isActive, selectPoints, clear } = useSelection({ name: "test" })
      return (
        <div>
          <span data-testid="active">{String(isActive)}</span>
          <button data-testid="select" onClick={() => selectPoints({ cat: ["A"] })}>Select</button>
          <button data-testid="clear" onClick={clear}>Clear</button>
        </div>
      )
    }

    const { getByTestId } = render(
      <LinkedCharts>
        <TestHook />
      </LinkedCharts>
    )

    expect(getByTestId("active").textContent).toBe("false")
    act(() => { getByTestId("select").click() })
    expect(getByTestId("active").textContent).toBe("true")
    act(() => { getByTestId("clear").click() })
    expect(getByTestId("active").textContent).toBe("false")
  })

  it("shares selection state between two hooks with the same name", () => {
    let hook1Active = false
    let hook2Active = false

    function Producer() {
      const { isActive, selectPoints } = useSelection({ name: "shared" })
      hook1Active = isActive
      return <button data-testid="produce" onClick={() => selectPoints({ cat: ["X"] })}>Go</button>
    }

    function Consumer() {
      const { isActive } = useSelection({ name: "shared" })
      hook2Active = isActive
      return <span data-testid="consumed">{String(isActive)}</span>
    }

    const { getByTestId } = render(
      <LinkedCharts>
        <Producer />
        <Consumer />
      </LinkedCharts>
    )

    expect(hook1Active).toBe(false)
    expect(hook2Active).toBe(false)

    act(() => { getByTestId("produce").click() })

    expect(hook1Active).toBe(true)
    expect(hook2Active).toBe(true)
  })

  it("accepts selections config with resolution modes", () => {
    // Should not throw when configuring resolution modes
    const { container } = render(
      <LinkedCharts selections={{
        highlight: { resolution: "union" },
        brush: { resolution: "crossfilter" }
      }}>
        <div>Charts</div>
      </LinkedCharts>
    )
    expect(container.textContent).toContain("Charts")
  })

  it("useLinkedHover produces selections consumed by useSelection", () => {
    let consumerActive = false

    function HoverProducer() {
      const { onHover } = useLinkedHover({ name: "hl", fields: ["region"] })
      return <button data-testid="hover" onClick={() => onHover({ region: "East" })}>Hover</button>
    }

    function SelectionConsumer() {
      const { isActive, predicate } = useSelection({ name: "hl" })
      consumerActive = isActive
      return <span data-testid="match">{String(predicate({ region: "East" }))}</span>
    }

    const { getByTestId } = render(
      <LinkedCharts>
        <HoverProducer />
        <SelectionConsumer />
      </LinkedCharts>
    )

    expect(consumerActive).toBe(false)
    act(() => { getByTestId("hover").click() })
    expect(consumerActive).toBe(true)
    expect(getByTestId("match").textContent).toBe("true")
  })
})
