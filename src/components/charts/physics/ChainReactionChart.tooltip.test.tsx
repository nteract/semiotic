import * as React from "react"
import { act, render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type {
  PhysicsHoverData,
  StreamPhysicsFrameHandle,
  StreamPhysicsFrameProps
} from "../../stream/physics/StreamPhysicsFrame"
import type { Datum } from "../shared/datumTypes"
import {
  ChainReactionChart,
  type ChainReactionChartHandle
} from "./ChainReactionChart"

let capturedProps: StreamPhysicsFrameProps | null = null
const pushedSpawns: Array<{ datum?: Datum }> = []

vi.mock("../../stream/physics/StreamPhysicsFrame", () => ({
  default: React.forwardRef((props: StreamPhysicsFrameProps, ref) => {
    capturedProps = props
    React.useImperativeHandle(ref, () => ({
      clear: () => undefined,
      pushMany: (spawns: Array<{ datum?: Datum }>) => {
        pushedSpawns.push(...spawns)
      },
      settle: () => undefined,
    }) as unknown as StreamPhysicsFrameHandle)
    return <div data-testid="stream-physics-frame" />
  }),
}))

type Row = { id: string; label: string; lane: string; deps: string[] }

const data: Row[] = [
  { id: "a", label: "Alpha", lane: "Planning", deps: [] },
  { id: "b", label: "Bravo", lane: "Delivery", deps: ["a"] },
]

const accessors = {
  taskIDAccessor: "id",
  labelAccessor: "label",
  laneAccessor: "lane",
  dependencyAccessor: "deps",
} as const

function physicsHover(): PhysicsHoverData {
  const internal = {
    kind: "dependency-ball",
    edgeID: "a->b",
    sourceID: "a",
    targetID: "b",
    route: [],
    sourceDatum: data[0],
  }
  return {
    __semioticHoverData: true,
    body: { id: "dependency-ball:a->b", datum: internal },
    data: internal,
    id: "dependency-ball:a->b",
    type: "body",
    x: 100,
    y: 80,
  } as unknown as PhysicsHoverData
}

function renderChart(tooltip?: React.ComponentProps<typeof ChainReactionChart>["tooltip"]) {
  return render(
    <ChainReactionChart
      data={data}
      {...accessors}
      mode="snapshot"
      width={400}
      height={300}
      tooltip={tooltip}
    />,
  )
}

describe("ChainReactionChart tooltip contract", () => {
  beforeEach(() => {
    capturedProps = null
    pushedSpawns.length = 0
  })

  it("provides its chart-specific default for omitted and true tooltips", () => {
    const view = renderChart()
    let content = capturedProps?.tooltipContent?.(physicsHover())
    expect(render(<>{content}</>).container.textContent).toContain("Alpha → Bravo")
    expect(capturedProps?.enableHover).toBe(true)

    view.rerender(
      <ChainReactionChart
        data={data}
        {...accessors}
        mode="snapshot"
        width={400}
        height={300}
        tooltip
      />,
    )
    content = capturedProps?.tooltipContent?.(physicsHover())
    expect(render(<>{content}</>).container.textContent).toContain("Dependency in flight")
  })

  it("normalizes declarative configs against the authored source row", () => {
    renderChart({ title: "label", fields: ["lane"] })
    const content = capturedProps?.tooltipContent?.(physicsHover())
    const tooltip = render(<>{content}</>)

    expect(tooltip.container.textContent).toContain("Alpha")
    expect(tooltip.container.textContent).toContain("Planning")
    expect(tooltip.container.textContent).not.toContain("sourceID")
  })

  it("passes the authored source row to custom callbacks with one chrome root", () => {
    const custom = vi.fn((datum: Datum) => <div>{String(datum.label)}</div>)
    renderChart(custom)
    const tooltip = render(<>{capturedProps?.tooltipContent?.(physicsHover())}</>)

    expect(custom).toHaveBeenCalledWith(data[0])
    expect(tooltip.container.textContent).toBe("Alpha")
    expect(tooltip.container.querySelectorAll(".semiotic-tooltip")).toHaveLength(1)
  })

  it("preserves the authored source row on emitted dependency bodies", () => {
    const ref = React.createRef<ChainReactionChartHandle>()
    render(
      <ChainReactionChart
        ref={ref}
        data={data}
        {...accessors}
        mode="snapshot"
        width={400}
        height={300}
      />,
    )
    act(() => ref.current?.completeTask("a"))

    expect(pushedSpawns).toHaveLength(1)
    expect(pushedSpawns[0].datum).toMatchObject({
      sourceID: "a",
      targetID: "b",
      sourceDatum: data[0],
    })
  })

  it("disables hover and content for tooltip={false}", () => {
    renderChart(false)
    expect(capturedProps?.enableHover).toBe(false)
    expect(capturedProps?.tooltipContent).toBeUndefined()
  })

  it("degrades a multi request to a useful single authored datum", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    try {
      renderChart("multi")
      const tooltip = render(<>{capturedProps?.tooltipContent?.(physicsHover())}</>)
      expect(tooltip.container.textContent).toContain("Alpha")
      expect(tooltip.container.textContent).toContain("Planning")
    } finally {
      warn.mockRestore()
    }
  })
})
