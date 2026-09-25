import * as React from "react"
import { TooltipRoot, markTooltipChrome } from "../../Tooltip/Tooltip"
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

  it("honors renderer ownership for its grid-level tooltip", () => {
    const Wrapped = ({ label }: { label: string }) => <TooltipRoot>{label}</TooltipRoot>
    const tooltip = markTooltipChrome((datum: Record<string, unknown>) => <Wrapped label={String(datum.label)} />)
    render(<ScatterplotMatrix data={data} fields={["a", "b"]} tooltip={tooltip} />)
    hoverFirstCell()
    expect(screen.getByText("First")).toBeInTheDocument()
    expect(document.querySelectorAll(".semiotic-tooltip")).toHaveLength(1)
    expect(document.querySelector<HTMLElement>(".scatterplot-matrix-tooltip")!.style.background).toBe("")
  })

  it("keeps numeric zero as visible content", () => {
    render(<ScatterplotMatrix data={data} fields={["a", "b"]} tooltip={markTooltipChrome(() => 0)} />)
    hoverFirstCell()
    expect(document.querySelector(".scatterplot-matrix-tooltip")?.textContent).toBe("0")
  })

  it("honors tooltip={false}", () => {
    render(<ScatterplotMatrix data={data} fields={["a", "b"]} tooltip={false} />)
    hoverFirstCell()
    expect(document.querySelector(".scatterplot-matrix-tooltip")).toBeNull()
  })
})
