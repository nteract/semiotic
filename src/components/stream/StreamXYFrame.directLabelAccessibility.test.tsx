import "../../test-utils/registerBuiltInXYPlugins"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { act, render, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { LineChart } from "../charts/xy/LineChart"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { createFrameScheduler } from "./test-utils/frameScheduler"

const data = Array.from({ length: 6 }, (_, i) => [
  { x: 0, y: i, series: `Series ${i}` },
  { x: 1, y: i + 1, series: `Series ${i}` }
]).flat()

describe("direct label accessible descriptions", () => {
  let restoreCanvas: () => void
  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => restoreCanvas())

  it.each(["server", "client"])("exposes omitted endpoints on the single %s image", (mode) => {
    const scheduler = createFrameScheduler()
    const chart = (
      <LineChart
        data={data}
        lineBy="series"
        colorBy="series"
        directLabel
        width={300}
        height={80}
        margin={{ top: 10, bottom: 10, left: 30, right: 90 }}
        description="Product endpoints"
        accessibleTable={false}
        animate={false}
        frameProps={{ frameScheduler: scheduler.scheduler }}
      />
    )
    const container = mode === "server"
      ? render(<div dangerouslySetInnerHTML={{ __html: renderToStaticMarkup(chart) }} />).container
      : render(chart).container
    if (mode === "client") act(() => scheduler.flush())

    const images = within(container).getAllByRole("img")
    expect(images).toHaveLength(1)
    expect(images[0]).toHaveAccessibleName("Product endpoints")
    expect(images[0]).toHaveAccessibleDescription(/Series 0: x 1, y 1/)
    expect(images[0]).toHaveAccessibleDescription(/Series 5: x 1, y 6/)
    const layout = container.querySelector("[data-label-layout]")!
    expect(JSON.parse(layout.getAttribute("data-label-layout")!).omitted).toBeGreaterThan(0)
  })
})
