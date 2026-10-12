import "../../test-utils/registerBuiltInXYPlugins"
import * as React from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"
import StreamXYFrame from "./StreamXYFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"

const dimensions = {
  size: [300, 200] as [number, number],
  margin: { left: 60, right: 50, top: 40, bottom: 70 },
  background: "#abcdef"
}

function surfaces() {
  return [
    <StreamXYFrame
      key="xy"
      {...dimensions}
      chartType="scatter"
      data={[
        { x: 0, y: 0 },
        { x: 2, y: 2 }
      ]}
      xAccessor="x"
      yAccessor="y"
      xExtent={[0, 1]}
      yExtent={[0, 1]}
    />,
    <StreamOrdinalFrame
      key="bar"
      {...dimensions}
      chartType="bar"
      data={[{ category: "A", value: 20 }]}
      rExtent={[0, 10]}
    />,
    <StreamOrdinalFrame
      key="pie"
      {...dimensions}
      chartType="pie"
      projection="radial"
      data={[{ category: "A", value: 20 }]}
    />
  ]
}

describe("hydration SVG plot surface", () => {
  it.each([0, 1, 2])(
    "paints the full chart and clips data marks for surface %s",
    (index) => {
      const host = document.createElement("div")
      host.innerHTML = renderToString(surfaces()[index])
      const background = host.querySelector('rect[fill="#abcdef"]')!
      expect(background.getAttribute("width")).toBe("300")
      expect(background.getAttribute("height")).toBe("200")
      const clip = host.querySelector("clipPath")!
      const rect = clip.querySelector("rect")!
      expect(rect.getAttribute("width")).toBe("190")
      expect(rect.getAttribute("height")).toBe("90")
      const marks = host.querySelector(`g[clip-path="url(#${clip.id})"]`)!
      expect(marks.querySelectorAll("circle,rect,path").length).toBeGreaterThan(
        0
      )
      expect(marks.contains(background)).toBe(false)
    }
  )

  it("namespaces clip IDs for multiple frames on one page", () => {
    const host = document.createElement("div")
    host.innerHTML = renderToString(<>{surfaces()}</>)
    const ids = [...host.querySelectorAll("clipPath")].map((clip) => clip.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("honors identifierPrefix when separate SSR roots share a page", () => {
    const host = document.createElement("div")
    host.innerHTML = ["first-chart-", "second-chart-"].map((identifierPrefix) =>
      renderToString(surfaces()[0], { identifierPrefix }),
    ).join("")
    const ids = [...host.querySelectorAll("clipPath")].map((clip) => clip.id)
    expect(ids[0]).toContain("first-chart-")
    expect(ids[1]).toContain("second-chart-")
    expect(new Set(ids).size).toBe(2)
  })
})
