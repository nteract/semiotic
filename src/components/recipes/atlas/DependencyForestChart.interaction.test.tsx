import * as React from "react"
import { fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { DependencyForestChart } from "./DependencyForestChart"
import { supplierStory } from "../../../../scripts/network-atlas/stories/supplierStory"

describe("Dependency Forest node activation", () => {
  let cleanupCanvas: () => void

  beforeEach(() => {
    cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
  })

  afterEach(() => cleanupCanvas())

  it.each(["organize", "required-paths"] as const)(
    "selects the canonical node from the chart callback in the %s reading",
    (reading) => {
      const forest = supplierStory().projection
      const onSelectNode = vi.fn()
      const { container } = render(
        <DependencyForestChart
          forest={forest}
          reading={reading}
          onSelectNode={onSelectNode}
        />
      )
      const frame = container.querySelector(".stream-network-frame")!
      fireEvent.keyDown(frame, { key: "Home" })
      expect(onSelectNode).not.toHaveBeenCalled()
      fireEvent.keyDown(frame, { key: " " })
      expect(onSelectNode).toHaveBeenCalledExactlyOnceWith("world")
    }
  )
})
