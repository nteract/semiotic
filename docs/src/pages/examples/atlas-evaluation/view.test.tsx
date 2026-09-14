import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { LinkedCharts } from "semiotic/ai"
import { ThemeProvider } from "semiotic/themes/react"
import { PreparedOverview } from "../AtlasEvaluationExamplePage"
import { prepareAtlasEvaluation } from "./prepare"
import { measureAtlasSelections } from "./view"

describe("Atlas acceptance reader", () => {
  it("server-renders the actual inspector and accessible chart from a prepared worker result", () => {
    const result = prepareAtlasEvaluation({ size: 1000, witnessLimit: 2 }, 1)
    const html = renderToStaticMarkup(
      <ThemeProvider theme="dark">
        <LinkedCharts>
          <PreparedOverview result={result} theme="dark" />
        </LinkedCharts>
      </ThemeProvider>,
    )
    expect(html).toContain("Required predecessors")
    expect(html).toContain("None (exact)")
    expect(html).toContain("1 work item")
    expect(html).toContain("307 visible glyphs")
    expect(html).toContain("Atlas acceptance overview")
    expect(html).toContain("Selection response has not been measured")
    expect(html).not.toMatch(/NaN|Infinity/)
  })
})

describe("selection timing lifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it.each(["cancel", "hidden"])(
    "discards partial timing when %s between frames",
    async (action) => {
      const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false)
      vi.stubGlobal(
        "requestAnimationFrame",
        vi.fn(() => 42),
      )
      const cancelFrame = vi.fn()
      vi.stubGlobal("cancelAnimationFrame", cancelFrame)
      const abort = new AbortController()
      const select = vi.fn()
      const pending = measureAtlasSelections(select, ["r1.1", "r1.2"], abort.signal)
      if (action === "cancel") abort.abort()
      else {
        hidden.mockReturnValue(true)
        document.dispatchEvent(new Event("visibilitychange"))
      }
      await expect(pending).rejects.toThrow("cancelled")
      expect(select).toHaveBeenCalledTimes(1)
      expect(cancelFrame).toHaveBeenCalledWith(42)
    },
  )
})
