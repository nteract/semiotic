import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { processChrome } from "./processChrome"

describe("processChrome", () => {
  it("fits narrow stage labels inside their stage bands", () => {
    const { container } = render(
      processChrome({
        width: 240,
        height: 160,
        left: 12,
        right: 228,
        topY: 46,
        bottomY: 130,
        midY: 88,
        stages: [
          { id: "code", label: "Coding", x0: 12, x1: 54, x: 33, width: 42 },
          { id: "review", label: "Integration Review", x0: 54, x1: 96, x: 75, width: 42, capacity: 4 },
          { id: "done", label: "Merged", x0: 96, x1: 138, x: 117, width: 42, absorb: true },
        ],
      }),
    )

    const review = container.querySelector("[data-stage='review']")
    const labelBg = review?.querySelector(".semiotic-process-chrome__stage-label-bg")
    const label = review?.querySelector(".semiotic-process-chrome__stage-label")
    const renderedLabel = label?.childNodes[label.childNodes.length - 1]?.textContent

    expect(labelBg).toBeTruthy()
    expect(Number(labelBg?.getAttribute("width"))).toBeLessThanOrEqual(34)
    expect(renderedLabel).not.toBe("Integration Review")
    expect(renderedLabel).toBe("IR")
  })
})
