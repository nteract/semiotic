import React from "react"
import { act, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RealtimeHistogram, TemporalHistogram } from "./RealtimeHistogram"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { getSourceRows } from "../../store/selectionProvenance"
import type { Datum } from "../shared/datumTypes"

const data = [
  { time: 2, value: 3, category: "North" },
  { time: 4, value: 1, category: "South" },
  { time: 6, value: 2, category: "North" },
]

describe.each([RealtimeHistogram, TemporalHistogram])("%s multi tooltip", (Histogram) => {
  let restore: () => void
  beforeEach(() => { restore = setupCanvasMock() })
  afterEach(() => restore())

  // 300x100 over [0, 30] x [0, 10]: the first bin's column centers at x 50,
  // its North segment spans y 100..50, and y 20 is above the stack.
  async function hoverFirstBin(
    tooltip: React.ComponentProps<typeof RealtimeHistogram>["tooltip"],
    { clientY = 20, onHover }: { clientY?: number; onHover?: (hover: Datum | null) => void } = {}
  ) {
    const view = render(
      <Histogram
        data={data}
        binSize={10}
        timeAccessor="time"
        valueAccessor="value"
        categoryAccessor="category"
        colors={{ North: "#f00", South: "#00f" }}
        tooltip={tooltip}
        timeExtent={[0, 30]}
        valueExtent={[0, 10]}
        width={300}
        height={100}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        showAxes={false}
        showLegend={false}
        onHover={onHover}
      />
    )
    await act(async () => { await Promise.resolve() })
    fireEvent.mouseMove(view.container.querySelector(".stream-xy-frame > div[role='img']")!, { clientX: 50, clientY })
    await act(async () => { await Promise.resolve() })
    return view.container.querySelector(".stream-frame-tooltip")
  }

  it("lists every stacked category in the hovered bin", async () => {
    const tooltip = await hoverFirstBin("multi")
    const lines = Array.from(tooltip?.querySelectorAll(".semiotic-tooltip > div") ?? []).map(line => line.textContent)
    expect(lines).toEqual(["range:0–10", "North:5", "South:1", "count:6"])
  })

  it("gives custom multi content the ordered rows and the bin's source rows", async () => {
    const seen: Datum[] = []
    const tooltip = await hoverFirstBin({
      mode: "multi",
      content: (datum: Datum) => {
        seen.push(datum)
        return <span>{datum.allSeries.map((row: Datum) => row.group).join(",")}</span>
      },
    })
    expect(tooltip?.textContent).toBe("North,South")
    expect(getSourceRows(seen.at(-1))).toEqual(data)
  })

  it("renders nothing with tooltip={false} while hover still reports the segment", async () => {
    const onHover = vi.fn()
    expect(await hoverFirstBin(false, { clientY: 80, onHover })).toBeNull()
    expect(onHover.mock.calls.at(-1)?.[0]?.data).toMatchObject({ binStart: 0, category: "North" })
  })
})
