import React, { useRef, useState } from "react"
import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { scaleLinear } from "d3-scale"
import { ScatterplotMatrixBrushOverlay } from "./scatterplotMatrixBrushOverlay"
import { dragD3Brush } from "../../../test-utils/d3BrushDrag"
import { BRUSH_ACCENT } from "../../stream/brushTheme"
import type { StreamXYFrameHandle } from "../../stream/types"

// A 108px cell has a 100x100 plot: x [0, 10] and y [10, 0] at 10px per unit.
const handle = {
  getScales: () => ({
    x: scaleLinear().domain([0, 10]).range([0, 100]),
    y: scaleLinear().domain([0, 10]).range([100, 0]),
  }),
} as unknown as StreamXYFrameHandle

// A parent that hands the overlay a new onBrush on every brush event.
function Harness({ onBrush }: { onBrush: (extent: [number, number][] | null) => void }) {
  const frameRef = useRef<StreamXYFrameHandle | null>(handle)
  const [, setCount] = useState(0)
  return (
    <ScatterplotMatrixBrushOverlay
      frameRef={frameRef}
      cellSize={108}
      onBrush={(extent) => {
        onBrush(extent)
        setCount((count) => count + 1)
      }}
    />
  )
}

describe("ScatterplotMatrixBrushOverlay", () => {
  it("keeps a drag alive when onBrush changes identity mid-gesture", async () => {
    const onBrush = vi.fn()
    const { container } = render(<Harness onBrush={onBrush} />)
    await dragD3Brush(container, ".brush-g .overlay", { clientX: 10, clientY: 10 }, [
      { clientX: 20, clientY: 20 },
      { clientX: 30, clientY: 30 },
      { clientX: 40, clientY: 40 },
    ])

    expect(onBrush.mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(onBrush).toHaveBeenLastCalledWith([[1, 9], [4, 6]])
  })

  it("draws the selection in the theme's selection color", () => {
    const { container } = render(<Harness onBrush={vi.fn()} />)
    const selection = container.querySelector(".brush-g .selection")!
    expect([selection.getAttribute("fill"), selection.getAttribute("stroke"), selection.getAttribute("fill-opacity")])
      .toEqual([BRUSH_ACCENT, BRUSH_ACCENT, "0.15"])
  })
})
