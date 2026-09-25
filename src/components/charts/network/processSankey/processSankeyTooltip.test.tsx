import * as React from "react"
import { render, renderHook } from "@testing-library/react"
import { expect, it } from "vitest"
import {
  TooltipRoot,
  hasOwnTooltipChrome,
  markTooltipChrome
} from "../../../Tooltip/Tooltip"
import { useProcessSankeyTooltipContent } from "./processSankeyTooltip"

it("preserves renderer ownership through the band/ribbon adapter and resets for plain content", () => {
  const Wrapped = ({ label }: { label: string }) => (
    <TooltipRoot>{label}</TooltipRoot>
  )
  const owned = markTooltipChrome((datum: Record<string, unknown>) => (
    <Wrapped label={String(datum.label)} />
  ))
  const { result, rerender } = renderHook(
    ({ tooltip }) =>
      useProcessSankeyTooltipContent({
        tooltip,
        enableHover: true,
        layout: null,
        dateDomain: false,
        sourceAccessor: "source",
        targetAccessor: "target",
        valueAccessor: "value",
        startTimeAccessor: "start",
        endTimeAccessor: "end"
      }),
    {
      initialProps: {
        tooltip: owned as (datum: Record<string, unknown>) => React.ReactNode
      }
    }
  )

  expect(hasOwnTooltipChrome(result.current)).toBe(true)
  for (const kind of ["band", "ribbon"]) {
    const view = render(
      <>
        {result.current({
          x: 0,
          y: 0,
          data: { __kind: kind, id: "a", data: { label: kind } }
        })}
      </>
    )
    expect(view.container.textContent).toBe(kind)
    expect(view.container.querySelectorAll(".semiotic-tooltip")).toHaveLength(1)
  }
  rerender({ tooltip: () => "plain" })
  expect(hasOwnTooltipChrome(result.current)).toBe(false)
})
