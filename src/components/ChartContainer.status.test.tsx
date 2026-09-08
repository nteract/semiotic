import * as React from "react"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ChartContainer, type ChartContainerProps } from "./ChartContainer"

describe("ChartContainer status", () => {
  // JavaScript and deserialized callers can bypass the TypeScript union.
  const unknownStatus = "preview" as ChartContainerProps["status"]

  it("keeps the chart and status readable for an unsupported runtime value", () => {
    const { container, getByText } = render(
      <ChartContainer title="Release" status={unknownStatus}>
        <div>Dependency chart</div>
      </ChartContainer>
    )

    expect(getByText("Dependency chart")).toBeVisible()
    expect(container.querySelector(".semiotic-chart-status")).toHaveStyle({
      background: "#6b7280",
      color: "#fff"
    })
    expect(getByText("preview")).toBeVisible()
  })

  it("also tolerates unsupported statuses during server rendering", () => {
    const html = renderToStaticMarkup(
      <ChartContainer title="Release" status={unknownStatus}>
        <div>Dependency chart</div>
      </ChartContainer>
    )
    expect(html).toContain("Dependency chart")
    expect(html).toContain("preview")
  })
})
