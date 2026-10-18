import * as React from "react"
import { renderToString } from "react-dom/server"
import sharp from "sharp"
import { describe, expect, it, vi } from "vitest"
import { exportNetworkViewSVG } from "./exportNetworkViewSVG"
import {
  renderChart,
  renderChartWithEvidence,
  renderNetworkToStaticSVG
} from "./renderToStaticSVG"
import type { NetworkLayoutResult } from "../stream/networkCustomLayout"
import StreamNetworkFrame from "../stream/StreamNetworkFrame"

function scene(): NetworkLayoutResult {
  return {
    backgrounds: (
      <rect data-layer="background" width={3000} height={600} fill="#eeeeee" />
    ),
    sceneNodes: [
      {
        type: "rect",
        x: 0,
        y: 0,
        w: 200,
        h: 100,
        style: { fill: "#ff0000" },
        datum: { id: "start" }
      },
      {
        type: "rect",
        x: 2800,
        y: 500,
        w: 200,
        h: 100,
        style: { fill: "#0000ff" },
        datum: { id: "end" }
      }
    ],
    sceneEdges: [
      {
        type: "curved",
        pathD: "M200,50 L2800,550",
        style: { stroke: "#008000", strokeWidth: 20, fill: "none" },
        datum: { source: "start", target: "end" }
      }
    ],
    labels: [
      { x: 100, y: 50, text: "Source" },
      { x: 2900, y: 550, text: "Destination" }
    ],
    overlays: (
      <circle data-layer="card-icon" cx={150} cy={50} r={10} fill="#ffff00" />
    ),
    htmlMarks: [
      {
        id: "html",
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        content: <div>HTML-only editor</div>
      }
    ]
  }
}

function parse(svg: string) {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
  expect(doc.querySelector("parsererror")).toBeNull()
  return doc
}

async function pixels(svg: string) {
  return sharp(Buffer.from(svg))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
}

describe("exportNetworkViewSVG", () => {
  it.each([
    { padding: 0, k: 0.4, x: 0, y: 80 },
    { padding: undefined, k: 0.384, x: 24, y: 84.8 }
  ])("fits all node extents with padding $padding", ({ padding, k, x, y }) => {
    const result = scene()
    const svg = exportNetworkViewSVG(result, {
      width: 1200,
      height: 400,
      padding
    })
    const doc = parse(svg)
    expect(doc.documentElement.getAttribute("viewBox")).toBe("0 0 1200 400")
    expect(
      doc.querySelector("[data-network-view] > g")?.getAttribute("transform")
    ).toBe(`translate(${x},${y}) scale(${k})`)
    expect(doc.querySelectorAll("[data-network-view] rect[fill]")).toHaveLength(
      3
    )
    for (const node of result.sceneNodes!) {
      if (node.type !== "rect") throw new Error("Expected card rectangle")
      expect(node.x * k + x).toBeGreaterThanOrEqual(padding ?? 24)
      expect(node.y * k + y).toBeGreaterThanOrEqual(padding ?? 24)
      expect((node.x + node.w) * k + x).toBeLessThanOrEqual(
        1200 - (padding ?? 24)
      )
      expect((node.y + node.h) * k + y).toBeLessThanOrEqual(
        400 - (padding ?? 24)
      )
    }
    expect(svg).toContain("Source")
    expect(svg).toContain("Destination")
    expect(svg).not.toContain("HTML-only editor")
    expect(doc.querySelector("foreignObject")).toBeNull()
  })

  it("rasterizes both distant cards, SVG chrome, background and the connecting edge", async () => {
    const svg = exportNetworkViewSVG(scene(), {
      width: 1200,
      height: 400,
      padding: 0
    })
    const { data, info } = await pixels(svg)
    expect([info.width, info.height]).toEqual([1200, 400])
    const at = (x: number, y: number) => [
      ...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)
    ]
    expect(at(10, 90)).toEqual([255, 0, 0, 255])
    expect(at(1190, 310)).toEqual([0, 0, 255, 255])
    expect(at(60, 100)).toEqual([255, 255, 0, 255])
    expect(at(600, 100)).toEqual([238, 238, 238, 255])
    expect(at(600, 200)).toEqual([0, 128, 0, 255])
    expect(at(600, 10)).toEqual([255, 255, 255, 255])
  })

  it.each(["identity", { x: -1400, y: -200, k: 0.8 }] as const)(
    "is pixel-equivalent to renderChart for view %j",
    async (view) => {
      const result = scene()
      const width = view === "identity" ? 3000 : 1200
      const height = view === "identity" ? 600 : 400
      const actual = exportNetworkViewSVG(result, { width, height, view })
      const expected = renderChart("NetworkCustomChart", {
        nodes: [{ id: "start" }, { id: "end" }],
        edges: [],
        layout: () => result,
        width,
        height,
        margin: 0,
        frameProps: { viewTransform: view === "identity" ? undefined : view }
      })
      expect(
        (await pixels(actual)).data.equals((await pixels(expected)).data)
      ).toBe(true)
    }
  )

  it("fits beyond interactive zoom limits and includes negative layout coordinates", () => {
    for (const width of [60, 30000]) {
      const result: NetworkLayoutResult = {
        sceneNodes: [
          {
            type: "rect",
            x: -2000,
            y: -400,
            w: 3000,
            h: 600,
            style: { fill: "red" },
            datum: {}
          }
        ]
      }
      const svg = exportNetworkViewSVG(result, {
        width,
        height: width,
        padding: 0
      })
      const k = width / 3000
      expect(
        parse(svg)
          .querySelector("[data-network-view] > g")
          ?.getAttribute("transform")
      ).toBe(
        `translate(${width / 2 + 500 * k},${width / 2 + 100 * k}) scale(${k})`
      )
    }
  })

  it("accepts explicit bounds for SVG-only scenes and edge excursions", () => {
    const result: NetworkLayoutResult = {
      overlays: <rect width={3000} height={600} fill="red" />
    }
    const svg = exportNetworkViewSVG(result, {
      width: 1200,
      height: 400,
      padding: 0,
      bounds: { x: -100, y: -100, width: 3200, height: 800 }
    })
    expect(
      parse(svg)
        .querySelector("[data-network-view] > g")
        ?.getAttribute("transform")
    ).toBe("translate(37.5,87.5) scale(0.375)")
    expect(svg).toContain('fill="red"')
  })

  it("keeps retained styles without calling restylers or mutating the scene", () => {
    const result = scene()
    result.restyle = vi.fn(() => ({ fill: "black" }))
    result.restyleEdge = vi.fn(() => ({ stroke: "black" }))
    for (const mark of [...result.sceneNodes!, ...result.sceneEdges!]) {
      Object.freeze(mark.style)
      Object.freeze(mark)
    }
    Object.freeze(result.sceneNodes)
    Object.freeze(result.sceneEdges)
    Object.freeze(result)
    const svg = exportNetworkViewSVG(result, { width: 1200, height: 400 })
    expect(svg).toContain('fill="#ff0000"')
    expect(svg).toContain('stroke="#008000"')
    expect(result.restyle).not.toHaveBeenCalled()
    expect(result.restyleEdge).not.toHaveBeenCalled()
  })

  it("uses HTML card bounds for fitting without serializing their content", () => {
    const result = { htmlMarks: scene().htmlMarks }
    const svg = exportNetworkViewSVG(result, {
      width: 400,
      height: 300,
      padding: 0
    })
    expect(
      parse(svg)
        .querySelector("[data-network-view] > g")
        ?.getAttribute("transform")
    ).toBe("translate(0,50) scale(2)")
    expect(svg).not.toContain("HTML-only editor")
  })

  it("returns a valid empty SVG and preserves decoration-only scenes without synthetic marks", () => {
    expect(
      parse(
        exportNetworkViewSVG({}, { width: 400, height: 300 })
      ).querySelector("[data-network-view]")
    ).toBeNull()
    const result = {
      backgrounds: (
        <rect data-layer="empty-background" width={100} height={50} />
      )
    }
    const props = {
      nodes: [],
      edges: [],
      layout: () => result,
      width: 400,
      height: 300
    }
    const { svg, evidence } = renderChartWithEvidence(
      "NetworkCustomChart",
      props
    )
    expect(svg).toContain('data-layer="empty-background"')
    expect(evidence.markCount).toBe(0)
    expect(evidence.empty).toBe(true)
    expect(
      renderNetworkToStaticSVG({
        chartType: "force",
        nodes: [],
        edges: [],
        customNetworkLayout: () => result,
        size: [400, 300]
      })
    ).toContain('data-layer="empty-background"')
    expect(
      renderToString(
        <StreamNetworkFrame
          chartType="force"
          nodes={[]}
          edges={[]}
          customNetworkLayout={() => result}
          size={[400, 300]}
        />
      )
    ).toContain('data-layer="empty-background"')
  })

  it.each([0, -1, NaN, Infinity])(
    "rejects invalid output dimensions %s",
    (value) => {
      expect(() =>
        exportNetworkViewSVG({}, { width: value, height: 400 })
      ).toThrow(/width and height/)
      expect(() =>
        exportNetworkViewSVG({}, { width: 400, height: value })
      ).toThrow(/width and height/)
    }
  )

  it("rejects invalid explicit fit bounds", () => {
    expect(() =>
      exportNetworkViewSVG(
        {},
        {
          width: 400,
          height: 300,
          bounds: { x: NaN, y: 0, width: 100, height: 100 }
        }
      )
    ).toThrow(/bounds/)
  })
})
