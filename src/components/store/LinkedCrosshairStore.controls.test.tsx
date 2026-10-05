import * as React from "react"
import { act, fireEvent, render, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { renderToString } from "react-dom/server"
import { LinkedCharts } from "../LinkedCharts"
import {
  useLinkedCrosshair,
  useCrosshairActions,
  type CrosshairPosition
} from "./LinkedCrosshairStore"

function Controls({ label = "position" }: { label?: string }) {
  const { position, setPosition } = useLinkedCrosshair("sync")
  const actions = useCrosshairActions()
  return (
    <>
      <output data-testid={label}>
        {position ? `${position.xValue}:${!!position.locked}` : "none"}
      </output>
      <button onClick={() => actions.setCrosshairPosition("sync", 10, "chart")}>
        Hover
      </button>
      <button onClick={() => actions.clearCrosshairPosition("sync", "chart")}>
        Leave
      </button>
      <button onClick={() => actions.toggleCrosshairLock("sync", 10, "chart")}>
        Click
      </button>
      <button onClick={() => actions.unlockCrosshair("sync")}>Escape</button>
      <button onClick={() => setPosition({ xValue: 20, locked: true })}>
        Table lock
      </button>
      <button onClick={() => setPosition(null)}>Table clear</button>
    </>
  )
}

describe("public linked crosshair controls", () => {
  it("reports hover, lock, leave, external replacement, and clear from the same state", () => {
    const onPositionChange = vi.fn()
    const view = render(
      <LinkedCharts
        showLegend={false}
        crosshair={{ name: "sync", onPositionChange }}
      >
        <Controls />
      </LinkedCharts>
    )
    const position = view.getByTestId("position")
    fireEvent.click(view.getByText("Hover"))
    expect(position.textContent).toBe("10:false")
    expect(onPositionChange).toHaveBeenLastCalledWith({
      xValue: 10,
      sourceId: "chart"
    })
    fireEvent.click(view.getByText("Click"))
    expect(position.textContent).toBe("10:true")
    fireEvent.click(view.getByText("Leave"))
    fireEvent.click(view.getByText("Hover"))
    expect(onPositionChange).toHaveBeenCalledTimes(2)
    fireEvent.click(view.getByText("Table lock"))
    expect(position.textContent).toBe("20:true")
    fireEvent.click(view.getByText("Table clear"))
    expect(position.textContent).toBe("none")
  })

  it("keeps controlled props authoritative and emits requests without an echo loop", () => {
    const onPositionChange = vi.fn()
    const children = <Controls />
    const view = render(
      <LinkedCharts
        showLegend={false}
        crosshair={{ name: "sync", position: null, onPositionChange }}
      >
        {children}
      </LinkedCharts>
    )
    fireEvent.click(view.getByText("Hover"))
    expect(view.getByTestId("position").textContent).toBe("none")
    expect(onPositionChange).toHaveBeenCalledTimes(1)
    const hovered = onPositionChange.mock.calls[0][0] as CrosshairPosition
    view.rerender(
      <LinkedCharts
        showLegend={false}
        crosshair={{ name: "sync", position: hovered, onPositionChange }}
      >
        {children}
      </LinkedCharts>
    )
    expect(view.getByTestId("position").textContent).toBe("10:false")
    expect(onPositionChange).toHaveBeenCalledTimes(1)
    fireEvent.click(view.getByText("Click"))
    expect(view.getByTestId("position").textContent).toBe("10:false")
    view.rerender(
      <LinkedCharts
        showLegend={false}
        crosshair={{
          name: "sync",
          position: { xValue: 35, locked: true },
          onPositionChange
        }}
      >
        {children}
      </LinkedCharts>
    )
    expect(view.getByTestId("position").textContent).toBe("35:true")
    fireEvent.click(view.getByText("Hover"))
    fireEvent.click(view.getByText("Leave"))
    expect(onPositionChange).toHaveBeenCalledTimes(2)
    fireEvent.click(view.getByText("Escape"))
    expect(onPositionChange).toHaveBeenLastCalledWith(null)
  })

  it("isolates identical names in separate LinkedCharts providers", () => {
    const view = render(
      <>
        <LinkedCharts showLegend={false}>
          <Controls label="one" />
        </LinkedCharts>
        <LinkedCharts showLegend={false}>
          <Controls label="two" />
        </LinkedCharts>
      </>
    )
    fireEvent.click(view.getAllByText("Table lock")[0])
    expect(view.getByTestId("one").textContent).toBe("20:true")
    expect(view.getByTestId("two").textContent).toBe("none")
  })

  it("supports standalone hook consumers and rejects non-finite positions", () => {
    const hook = renderHook(() => useLinkedCrosshair("standalone-control"))
    act(() => hook.result.current.setPosition({ xValue: 0, locked: true }))
    expect(hook.result.current.position?.xValue).toBe(0)
    act(() => hook.result.current.setPosition({ xValue: NaN }))
    expect(hook.result.current.position).toBeNull()
  })

  it("renders controlled state on the server", () => {
    expect(
      renderToString(
        <LinkedCharts
          showLegend={false}
          crosshair={{ name: "sync", position: { xValue: 25, locked: true } }}
        >
          <Controls />
        </LinkedCharts>
      )
    ).toContain("25:true")
  })
})

it("Escape clears independent dashboards once per group", () => {
  const first = vi.fn()
  const second = vi.fn()
  const view = render(
    <>
      <LinkedCharts
        showLegend={false}
        crosshair={{ name: "sync", onPositionChange: first }}
      >
        <Controls label="first" />
      </LinkedCharts>
      <LinkedCharts
        showLegend={false}
        crosshair={{ name: "sync", onPositionChange: second }}
      >
        <Controls label="second" />
      </LinkedCharts>
    </>
  )
  for (const button of view.getAllByText("Table lock")) fireEvent.click(button)
  fireEvent.keyDown(document, { key: "Escape" })
  expect(view.getByTestId("first").textContent).toBe("none")
  expect(view.getByTestId("second").textContent).toBe("none")
  expect(first).toHaveBeenCalledTimes(2)
  expect(second).toHaveBeenCalledTimes(2)
})
