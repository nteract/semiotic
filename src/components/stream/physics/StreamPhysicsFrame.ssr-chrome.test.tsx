// @vitest-environment node

import * as React from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"
import StreamPhysicsFrame from "./StreamPhysicsFrame"

const quietKernel = {
  gravity: { x: 0, y: 0 },
  velocityDamping: 1,
  sleepSpeed: 100,
  sleepAfter: 0.01
}

describe("StreamPhysicsFrame settled SSR chrome", () => {
  it("keeps visible title, legend, and pixel/body/barrier annotations", () => {
    const html = renderToString(
      <StreamPhysicsFrame
        size={[240, 140]}
        title="Physics chrome"
        summary="Settled summary"
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[
          {
            id: "packet",
            x: 40,
            y: 60,
            mass: 1,
            shape: { type: "circle", radius: 5 }
          }
        ]}
        legend={{
          legendGroups: [
            {
              label: "Kinds",
              type: "fill",
              styleFn: (item) => ({ fill: item.color }),
              items: [{ label: "Packet", color: "#4e79a7" }]
            }
          ]
        }}
        annotations={[
          { id: "pixel", type: "label", x: 80, y: 30, label: "Pixel note" },
          { id: "body", type: "label", bodyId: "packet", label: "Body note" },
          {
            id: "wall",
            type: "x-threshold",
            x: 120,
            y1: 0,
            y2: 140,
            label: "Barrier note",
            physics: "barrier",
            axis: "x"
          }
        ]}
      />
    )

    expect(html).toContain("semiotic-chart-title")
    expect(html).toContain("Physics chrome")
    expect(html).toContain("Packet")
    expect(html).toContain("Pixel note")
    expect(html).toContain("Body note")
    expect(html).toContain("Barrier note")
    expect(html).toContain("Settled summary")
    expect(html).toMatch(
      /<clipPath id="physics-[^"]+-plot-clip"><rect width="127" height="140"><\/rect><\/clipPath>/
    )
    expect(html).not.toContain("<table")
    expect(html).not.toContain("aria-live")
  })
})
