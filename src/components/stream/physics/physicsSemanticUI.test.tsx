import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PhysicsSemanticDataTable } from "./physicsSemanticUI"

describe("PhysicsSemanticDataTable", () => {
  it("gives unnamed landmarks instance-local names", () => {
    const items = [{ id: "route", label: "Route", x: 40, y: 60 }]

    render(
      <>
        <PhysicsSemanticDataTable
          items={items}
          tableId="first-physics-table"
        />
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
