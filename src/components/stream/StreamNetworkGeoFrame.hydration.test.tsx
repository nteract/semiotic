import * as React from "react"
import { act } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { DARK_THEME, ThemeProvider } from "../ThemeProvider"
import StreamGeoFrame from "./StreamGeoFrame"
import StreamNetworkFrame from "./StreamNetworkFrame"

describe("Network and Geo themed-surface hydration", () => {
  let container: HTMLDivElement
  let restoreCanvas: () => void

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  })

  afterEach(() => {
    restoreCanvas()
    container.remove()
  })

  const cases: Array<{
    name: string
    frameClass: string
    chart: () => React.ReactElement
  }> = [
    {
      name: "Network",
      frameClass: "stream-network-frame",
      chart: () => (
        <ThemeProvider theme="dark">
          <StreamNetworkFrame
            chartType="sankey"
            nodes={[{ id: "a" }, { id: "b" }]}
            edges={[{ source: "a", target: "b", value: 1 }]}
            size={[240, 140]}
            accessibleTable={false}
          />
        </ThemeProvider>
      )
    },
    {
      name: "Geo",
      frameClass: "stream-geo-frame",
      chart: () => (
        <ThemeProvider theme="dark">
          <StreamGeoFrame
            projection="mercator"
            points={[]}
            size={[240, 140]}
            accessibleTable={false}
          />
        </ThemeProvider>
      )
    }
  ]

  it.each(cases)(
    "$name keeps its themed surface through the SVG-to-canvas handoff",
    ({ chart, frameClass }) => {
      const expectedFill = `var(--semiotic-bg, ${DARK_THEME.colors.background})`
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      container.innerHTML = renderToString(chart())

      const serverSurface = container.querySelector(
        `.${frameClass} .stream-frame-background__backdrop`
      )
      expect(serverSurface).toHaveAttribute("fill", expectedFill)
      expect(container.querySelector("canvas")).toBeNull()

      const rootBox: { current: ReturnType<typeof hydrateRoot> | null } = {
        current: null
      }
      act(() => {
        rootBox.current = hydrateRoot(container, chart())
      })

      const mismatchWarnings = errorSpy.mock.calls.filter((call) =>
        /did not match|hydration failed|hydration error/i.test(
          String(call[0] ?? "")
        )
      )
      expect(mismatchWarnings).toEqual([])
      expect(
        container.querySelector(
          `.${frameClass} .stream-frame-background__backdrop`
        )
      ).toHaveAttribute("fill", expectedFill)
      expect(container.querySelector(`.${frameClass} canvas`)).not.toBeNull()

      rootBox.current?.unmount()
      errorSpy.mockRestore()
    }
  )
})
