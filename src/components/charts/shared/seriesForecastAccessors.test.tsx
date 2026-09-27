import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { render, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AreaChart } from "../xy/AreaChart"
import { Scatterplot } from "../xy/Scatterplot"
import { ConnectedScatterplot } from "../xy/ConnectedScatterplot"
import type { CapturedXYFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamXYFrameHandle } from "../../stream/types"
import type { Datum } from "./datumTypes"

let frame: CapturedXYFrameProps
vi.mock("../../stream/StreamXYFrame", () => ({
  default: React.forwardRef<Partial<StreamXYFrameHandle>, CapturedXYFrameProps>(
    (props, _ref) => {
      frame = props
      return <div />
    }
  )
}))

const rows = Array.from({ length: 5 }, (_, t) => ({ t, value: 10 + 5 * t }))
const props = {
  data: rows,
  xAccessor: (d: Datum) => d.t as number,
  yAccessor: (d: Datum) => d.value as number,
  forecast: { trainEnd: 3, steps: 2 }
}

describe("forecast callback accessors across XY wrappers", () => {
  it.each([
    ["AreaChart", <AreaChart key="area" {...props} />],
    ["Scatterplot", <Scatterplot key="scatter" {...props} />],
    [
      "ConnectedScatterplot",
      <ConnectedScatterplot key="connected" {...props} />
    ]
  ] as const)(
    "%s forwards synthetic forecast coordinates to its frame",
    async (_name, chart) => {
      const { container } = render(chart)
      await waitFor(() => expect(frame.xAccessor).toBe("__semiotic_resolvedX"))
      expect(frame.yAccessor).toBe("__semiotic_resolvedY")
      expect(container.querySelector('[role="alert"]')).toBeNull()
      const forecast = (frame.data as Datum[]).filter(
        (d) => d.__forecastUpper != null
      )
      const tooltip = frame.tooltipContent as (d: Datum) => React.ReactNode
      const markup = renderToStaticMarkup(<>{tooltip({ data: forecast[0] })}</>)
      expect(markup).not.toContain("__semiotic_")
      expect(markup).toContain(">35<")
      expect(markup).toContain(">5<")
      expect(
        forecast.map((d) => [d.__semiotic_resolvedX, d.__semiotic_resolvedY])
      ).toEqual([
        [5, 35],
        [6, 40]
      ])
    }
  )
})
