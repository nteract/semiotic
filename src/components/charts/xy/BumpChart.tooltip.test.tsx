import * as React from "react"
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { BumpChart } from "./BumpChart"
import {
  TooltipRoot,
  hasOwnTooltipChrome,
  markTooltipChrome,
  type TooltipProp
} from "../../Tooltip/Tooltip"
import { FlippingTooltip } from "../../Tooltip/FlippingTooltip"
import type { HoverData, StreamXYFrameProps } from "../../stream/types"
import type { Datum } from "../shared/datumTypes"

let capturedProps: StreamXYFrameProps | undefined

// Keep BumpChart -> XYCustomChart -> tooltip normalization real. Mock only the
// frame so the test can supply a precise single/multi hover payload.
vi.mock("../../stream/StreamXYFrame", () => ({
  default: React.forwardRef((props: StreamXYFrameProps, _ref) => {
    capturedProps = props
    return <div />
  })
}))

const data = [
  { year: 2022, team: "Alpha", score: 90 },
  { year: 2022, team: "Bravo", score: 70 },
  { year: 2023, team: "Alpha", score: 40 },
  { year: 2023, team: "Bravo", score: 95 }
]
const position = {
  x: 50,
  y: 50,
  containerWidth: 400,
  containerHeight: 300,
  margin: { left: 0, top: 0, right: 0, bottom: 0 }
}

function chart(tooltip: TooltipProp) {
  return (
    <BumpChart
      data={data}
      xAccessor="year"
      yAccessor="score"
      lineBy="team"
      showLabels={false}
      tooltip={tooltip}
    />
  )
}

function renderedTooltip(multi: boolean) {
  const rows = (capturedProps!.data as Datum[]).filter((row) => row.x === 0)
  const hover: HoverData = {
    __semioticHoverData: true,
    data: rows[0],
    x: 50,
    y: 50,
    ...(multi && {
      xValue: 0,
      allSeries: rows.map((row) => ({
        group: row.__bumpSeries,
        value: row.y,
        color: "navy",
        datum: row
      }))
    })
  }
  const renderer = capturedProps!.tooltipContent!
  return render(
    <FlippingTooltip
      {...position}
      contentOwnsChrome={hasOwnTooltipChrome(renderer)}
    >
      {renderer(hover)}
    </FlippingTooltip>
  )
}

beforeEach(() => {
  capturedProps = undefined
})

describe.each([false, true])(
  "BumpChart tooltip adapter (multi=%s)",
  (multi) => {
    const prop = (content: (datum: Datum) => React.ReactNode): TooltipProp =>
      multi ? { mode: "multi", content } : content

    it("preserves renderer ownership through XYCustomChart and resets for plain content", () => {
      const Wrapped = ({ label }: { label: string }) => (
        <TooltipRoot style={{ background: "navy" }}>{label}</TooltipRoot>
      )
      const content = markTooltipChrome(
        vi.fn((datum: Datum) => (
          <Wrapped label={`${datum.team}: ${datum.score}`} />
        ))
      )
      const view = render(chart(prop(content)))
      const tooltip = renderedTooltip(multi)
      expect(tooltip.container.textContent).toBe("Alpha: 90")
      expect(
        tooltip.container.querySelectorAll(".semiotic-tooltip")
      ).toHaveLength(1)
      expect(
        tooltip.container.querySelector<HTMLElement>(".stream-frame-tooltip")!
          .style.background
      ).toBe("")
      expect(content).toHaveBeenCalledTimes(1)
      expect(content.mock.calls[0][0]).toMatchObject(data[0])
      expect(content.mock.calls[0][0]).not.toHaveProperty("__bumpRaw")
      if (multi) {
        expect(content.mock.calls[0][0]).toMatchObject({
          xValue: 2022,
          allSeries: [
            { group: "Alpha", value: 90, rank: 1, datum: data[0] },
            { group: "Bravo", value: 70, rank: 2, datum: data[1] }
          ]
        })
      }
      tooltip.unmount()
      view.rerender(chart(prop((datum) => `${datum.team}: ${datum.score}`)))
      const plain = renderedTooltip(multi)
      expect(plain.container.textContent).toBe("Alpha: 90")
      expect(
        plain.container.querySelectorAll(".semiotic-tooltip")
      ).toHaveLength(1)
      expect(
        plain.container.querySelector<HTMLElement>(".semiotic-tooltip")!.style
          .background
      ).toContain("--semiotic-tooltip-bg")
    })

    it.each([null, false, " ", [], <></>])(
      "suppresses empty marked content (%s)",
      (result) => {
        render(chart(prop(markTooltipChrome(() => result))))
        expect(renderedTooltip(multi).container.firstChild).toBeNull()
      }
    )
  }
)
