import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { StreamPhysicsFrame } from "./StreamPhysicsFrame"
import { PhysicsSemanticDataTable } from "./physicsSemanticUI"

describe("PhysicsSemanticDataTable", () => {
  it("gives unnamed landmarks instance-local names", () => {
    const items = [{ id: "route", label: "Route", x: 40, y: 60 }]

    render(
      <>
        <PhysicsSemanticDataTable items={items} tableId="first-physics-table" />
        <PhysicsSemanticDataTable
          items={items}
          tableId="second-physics-table"
        />
      </>
    )

    expect(
      screen
        .getAllByRole("region")
        .map((region) => region.getAttribute("aria-label"))
    ).toEqual([
      "Data summary for physics chart first-physics-table",
      "Data summary for physics chart second-physics-table"
    ])
  })
})

it("keeps table navigation and a single authored announcement outside the physics image", () => {
  const restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  try {
    const draw = (description?: string, accessibleTable = true) => (
      <StreamPhysicsFrame
        title="Queue"
        summary="Queue stock is measured"
        size={[200, 120]}
        paused
        initialSpawns={[
          {
            id: "module",
            x: 50,
            y: 50,
            shape: { type: "circle", radius: 6 },
            mass: 1,
            datum: { units: 12 }
          }
        ]}
        semanticItems={[
          {
            id: "module-reading",
            bodyId: "module",
            label: "Module",
            description,
            x: 50,
            y: 50
          }
        ]}
        accessibleTable={accessibleTable}
      />
    )
    const { container, rerender } = render(draw("Module has 12 items waiting"))
    const frame = screen.getByRole("group", { name: "Queue" })
    const announcements = () =>
      [...container.querySelectorAll('[aria-live="polite"]')]
        .map((region) => region.textContent)
        .filter(Boolean)
    expect(screen.getByRole("note")).toHaveTextContent(
      "Queue stock is measured"
    )
    const table = screen.getByRole("region", { name: "Data summary for Queue" })
    expect(
      screen.getByRole("link", { name: "Skip to data table" })
    ).toHaveAttribute("href", `#${table.id}`)

    fireEvent.pointerMove(frame.querySelector("canvas")!, {
      clientX: 50,
      clientY: 50
    })
    expect(announcements()).toEqual([
      "Data point: reading: Module has 12 items waiting"
    ])
    fireEvent.keyDown(frame, { key: "Home" })
    expect(announcements()).toEqual(["Module has 12 items waiting"])
    const descriptionId = frame.getAttribute("aria-describedby")!
    expect(document.getElementById(descriptionId)?.textContent).toBe(
      "Module has 12 items waiting"
    )
    expect(
      [...container.querySelectorAll("[aria-live]")].filter((region) =>
        region.closest('[role="img"]')
      )
    ).toHaveLength(0)
    fireEvent.keyDown(frame, { key: "Escape" })
    expect(announcements()).toEqual([])

    rerender(draw(undefined, false))
    fireEvent.pointerMove(frame.querySelector("canvas")!, {
      clientX: 50,
      clientY: 50
    })
    expect(announcements()).toEqual(["Data point: units: 12"])
    expect(
      screen.queryByRole("link", { name: "Skip to data table" })
    ).toBeNull()
  } finally {
    restoreCanvas()
  }
})
