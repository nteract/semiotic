import * as React from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { NetworkSSRFrame } from "../NetworkSSRFrame"
import { NetworkPipelineStore } from "../NetworkPipelineStore"
import { renderNetworkFrame } from "../../server/staticNetwork"

describe("network camera server rendering", () => {
  it("applies the same camera in standalone SVG exports, including empty scene decoration", () => {
    const viewTransform = { x: -30, y: 20, k: 2 }
    for (const empty of [false, true]) {
      const svg = renderNetworkFrame({
        chartType: "force",
        nodes: empty ? [] : [{ id: "a" }],
        edges: [],
        size: [440, 340],
        margin: { left: 20, top: 20, right: 20, bottom: 20 },
        viewTransform,
        backgroundGraphics: (
          <rect
            data-testid="background"
            x={10}
            y={20}
            width={100}
            height={60}
          />
        ),
        ...(empty
          ? {}
          : {
              customNetworkLayout: () => ({
                labels: [{ x: 60, y: 40, text: "Only once" }],
                sceneNodes: [
                  {
                    type: "rect" as const,
                    x: 10,
                    y: 20,
                    w: 100,
                    h: 60,
                    style: { fill: "blue" },
                    datum: {}
                  }
                ]
              })
            })
      })
      const doc = new DOMParser().parseFromString(svg, "text/html")
      expect(
        doc.querySelector("[data-network-view] > g")?.getAttribute("transform")
      ).toBe("translate(-30,20) scale(2)")
      expect(
        doc.querySelector('[data-network-view] [data-testid="background"]')
      ).not.toBeNull()
      expect(
        [...doc.querySelectorAll("text")].filter(
          (node) => node.textContent === "Only once"
        )
      ).toHaveLength(empty ? 0 : 1)
    }
  })
  it.each([undefined, { x: -30, y: 20, k: 2 }])(
    "renders labels once and keeps scene/HTML camera parity for %j",
    (viewTransform) => {
      const store = new NetworkPipelineStore({ chartType: "force" })
      store.labels = [{ x: 60, y: 40, text: "Only once" }]
      store.sceneNodes = [
        {
          type: "rect",
          x: 10,
          y: 20,
          w: 100,
          h: 60,
          style: { fill: "blue" },
          datum: {}
        }
      ]
      store.customLayoutHtmlMarks = [
        {
          id: "near",
          x: 10,
          y: 20,
          width: 100,
          height: 60,
          content: <input aria-label="Draft" />
        },
        {
          id: "far",
          x: 3000,
          y: 3000,
          width: 100,
          height: 60,
          content: "Far card"
        }
      ]
      const report = vi.fn()
      const markup = renderToString(
        <NetworkSSRFrame
          props={{
            chartType: "force",
            viewTransform,
            onViewportChange: report
          }}
          store={store}
          responsiveRef={null}
          size={[440, 340]}
          margin={{ left: 20, top: 20, right: 20, bottom: 20 }}
          adjustedWidth={400}
          adjustedHeight={300}
          surfaceBackground={null}
          resolvedBackground={null}
          resolvedForeground={null}
        />
      )
      const doc = new DOMParser().parseFromString(markup, "text/html")
      expect(
        [...doc.querySelectorAll("text")].filter(
          (node) => node.textContent === "Only once"
        )
      ).toHaveLength(1)
      expect(doc.querySelectorAll("[data-mark-id]")).toHaveLength(
        viewTransform ? 1 : 2
      )
      expect(
        doc.querySelector('input[aria-label="Draft"]')!.closest('[role="img"]')
      ).toBeNull()
      if (viewTransform) {
        expect(
          doc
            .querySelector("[data-network-view] > g")
            ?.getAttribute("transform")
        ).toBe("translate(-30,20) scale(2)")
        expect(
          doc.querySelector<HTMLElement>(".semiotic-network-html-marks > div")
            ?.style.transform
        ).toBe("translate(-30px, 20px) scale(2)")
      }
      expect(report).not.toHaveBeenCalled()
    }
  )
})
