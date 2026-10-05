import * as React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import {
  RealtimeHistogram,
  TemporalHistogram
} from "../charts/realtime/RealtimeHistogram"
import { renderChartWithEvidence } from "./renderToStaticSVG"

const props = {
  data: [0, 10, 20].map((time) => ({ time, value: 2 })),
  binSize: 10,
  binAlign: "center" as const,
  gap: 0,
  width: 300,
  height: 100,
  margin: 0,
  showAxes: false,
  showLegend: false,
  valueExtent: [0, 5] as [number, number],
  fill: "#123456"
}

function barWidths(markup: string) {
  return [
    ...new DOMParser()
      .parseFromString(markup, "text/html")
      .querySelectorAll('rect[fill="#123456"]')
  ].map((bar) => Number(bar.getAttribute("width")))
}

describe.each(["RealtimeHistogram", "TemporalHistogram"] as const)(
  "%s centered SSR",
  (name) => {
    it("includes every edge bin in component SSR and the registry/evidence renderer", () => {
      const Component =
        name === "RealtimeHistogram" ? RealtimeHistogram : TemporalHistogram
      const rendered = renderChartWithEvidence(name, props)
      expect(rendered.evidence.markCount).toBe(3)
      expect(rendered.evidence.empty).toBe(false)
      for (const markup of [
        rendered.svg,
        renderToStaticMarkup(<Component {...props} />)
      ]) {
        expect(barWidths(markup)).toEqual([100, 100, 100])
      }
    })
    it("clips centered bins only when an explicit time extent requests it", () => {
      const rendered = renderChartWithEvidence(name, {
        ...props,
        timeExtent: [0, 20]
      })
      expect(rendered.evidence.markCount).toBe(3)
      expect(barWidths(rendered.svg)).toEqual([75, 150, 75])
    })
  }
)
