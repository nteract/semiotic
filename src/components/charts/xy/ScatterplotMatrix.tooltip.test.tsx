import * as React from "react"
import { act, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StreamXYFrameProps } from "../../stream/types"
import { ScatterplotMatrix } from "./ScatterplotMatrix"

const capturedFrames: StreamXYFrameProps[] = []

vi.mock("../../stream/StreamXYFrame", () => ({
  default: React.forwardRef((props: StreamXYFrameProps, _ref) => {
    capturedFrames.push(props)
    return <div data-testid="stream-xy-frame" />
  }),
}))

const data = [
  { a: 1, b: 2, label: "First" },
  { a: 4, b: 5, label: "Second" },
]

function hoverFirstCell() {
  const frame = capturedFrames[0]
  const indexed = (frame.data as Array<Record<string, unknown>>)[0]
  act(() => {
    frame.customHoverBehavior?.({
      __semioticHoverData: true,
      data: indexed,
      x: 12,
      y: 18,
    })
  })
}

describe("ScatterplotMatrix tooltips", () => {
  beforeEach(() => {
    capturedFrames.length = 0
  })

  it("renders the matrix default tooltip at the grid level", () => {
    render(<ScatterplotMatrix data={data} fields={["a", "b"]} idAccessor="label" />)
    hoverFirstCell()

    expect(screen.getByText("First")).toBeInTheDocument()
    expect(screen.getByText(/b: 2\.0/)).toBeInTheDocument()
    expect(screen.getByText(/a: 1\.0/)).toBeInTheDocument()
    const root = document.querySelector(".scatterplot-matrix-tooltip") as HTMLElement
    expect(Number.parseFloat(root.style.left)).toBeGreaterThanOrEqual(0)
    expect(Number.parseFloat(root.style.top)).toBeGreaterThanOrEqual(0)
  })

  it("honors custom content with the unmodified source datum", () => {
    const tooltip = vi.fn((datum: Record<string, unknown>) => (
      <div>custom {String(datum.label)}</div>
    ))
    render(<ScatterplotMatrix data={data} fields={["a", "b"]} tooltip={tooltip} />)
    hoverFirstCell()

    expect(screen.getByText("custom First")).toBeInTheDocument()
    expect(tooltip.mock.calls[0][0]).toEqual(data[0])
    expect(document.querySelectorAll(".semiotic-tooltip")).toHaveLength(1)
  })

  it("honors tooltip={false}", () => {
    render(<ScatterplotMatrix data={data} fields={["a", "b"]} tooltip={false} />)
    hoverFirstCell()
    expect(document.querySelector(".scatterplot-matrix-tooltip")).toBeNull()
  })
})
