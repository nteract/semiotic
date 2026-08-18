// @vitest-environment node

import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import { describe, expect, it } from "vitest"
import StreamGeoFrame from "../stream/StreamGeoFrame"
import StreamNetworkFrame from "../stream/StreamNetworkFrame"
import StreamOrdinalFrame from "../stream/StreamOrdinalFrame"
import StreamXYFrame from "../stream/StreamXYFrame"
import {
  renderGeoToStaticSVG,
  renderNetworkToStaticSVG,
  renderOrdinalToStaticSVG,
  renderXYToStaticSVG,
} from "./renderToStaticSVG"

function expectMarkupLayerOrder(html: string, mark: string): void {
  const solidIndex = html.indexOf('fill="#badbad"')
  const graphicsIndex = html.indexOf('id="custom-background"')
  const markIndex = html.indexOf(mark, graphicsIndex)
  expect(solidIndex).toBeGreaterThan(-1)
  expect(graphicsIndex).toBeGreaterThan(solidIndex)
  expect(markIndex).toBeGreaterThan(graphicsIndex)
}

describe("direct Stream Frame SSR runtime parity", () => {
  it("uses chrome-safe defaults for direct frame APIs", () => {
    const xy = ReactDOMServer.renderToStaticMarkup(
      <StreamXYFrame
        chartType="line"
        data={[{ x: 1, y: 2 }, { x: 2, y: 4 }]}
        xAccessor="x"
        yAccessor="y"
        xLabel="Month"
        yLabel="Revenue"
        size={[500, 320]}
      />
    )
    const ordinal = ReactDOMServer.renderToStaticMarkup(
      <StreamOrdinalFrame
        chartType="bar"
        data={[{ category: "A", value: 2 }]}
        oAccessor="category"
        rAccessor="value"
        oLabel="Department"
        rLabel="Headcount"
        size={[500, 320]}
      />
    )
    const sankey = ReactDOMServer.renderToStaticMarkup(
      <StreamNetworkFrame
        chartType="sankey"
        edges={[{ source: "Revenue", target: "COGS", value: 10 }]}
        size={[500, 320]}
      />
    )
    const force = ReactDOMServer.renderToStaticMarkup(
      <StreamNetworkFrame
        chartType="force"
        nodes={[{ id: "A" }, { id: "B" }]}
        edges={[{ source: "A", target: "B", value: 1 }]}
        size={[500, 320]}
      />
    )

    for (const svg of [xy, ordinal]) {
      expect(svg).toContain('transform="translate(70,50)"')
    }
    expect(sankey).toContain('transform="translate(80,20)"')
    expect(force).toContain('transform="translate(40,40)"')
  })

  it("keeps direct static and live side-legend axis title clearance aligned", () => {
    const legend = {
      legendGroups: [{
        label: "",
        type: "fill" as const,
        styleFn: () => ({ fill: "#f00" }),
        items: [{ label: "Key" }],
      }],
    }
    const xyProps = {
      chartType: "line" as const,
      data: [{ x: 0, y: 1 }, { x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      size: [500, 300] as [number, number],
      yLabel: "Long value axis",
      legend,
      legendPosition: "left" as const,
    }
    const ordinalProps = {
      chartType: "bar" as const,
      data: [{ category: "A", value: 1 }],
      oAccessor: "category",
      rAccessor: "value",
      size: [500, 300] as [number, number],
      rLabel: "Long value axis",
      legend,
      legendPosition: "left" as const,
    }

    const outputs = [
      ReactDOMServer.renderToStaticMarkup(<StreamXYFrame {...xyProps} />),
      renderXYToStaticSVG(xyProps),
      ReactDOMServer.renderToStaticMarkup(<StreamOrdinalFrame {...ordinalProps} />),
      renderOrdinalToStaticSVG(ordinalProps),
    ]

    for (const svg of outputs) {
      // Legend occupies x=3..103; the vertical axis title belongs in the
      // shared 70px inner gutter at global x=128, not through that legend.
      expect(svg).toContain('translate(183,50)')
      expect(svg).toMatch(/<text x="-55"[^>]*>Long value axis<\/text>/)
    }
    expect(outputs[0]).toContain('transform="translate(3, 50)"')
    expect(outputs[1]).toContain('transform="translate(3,50)"')
    expect(outputs[2]).toContain('transform="translate(3, 50)"')
    expect(outputs[3]).toContain('transform="translate(3,50)"')
  })

  it("shares the minimum top raw-legend inset across direct and static network and geo frames", () => {
    const rawLegend = <g data-testid="raw-top-legend"><text>Raw</text></g>
    const networkProps = {
      chartType: "sankey" as const,
      size: [500, 300] as [number, number],
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [{ source: "a", target: "b", value: 1 }],
      nodeIDAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
      valueAccessor: "value",
      legendPosition: "top" as const,
      legend: rawLegend,
    }
    const geoProps = {
      chartType: "geo" as const,
      projection: "equalEarth" as const,
      size: [500, 300] as [number, number],
      points: [{ lon: 0, lat: 0 }],
      xAccessor: "lon",
      yAccessor: "lat",
      legendPosition: "top" as const,
      legend: rawLegend,
    }

    const network = [
      ReactDOMServer.renderToStaticMarkup(<StreamNetworkFrame {...networkProps} />),
      renderNetworkToStaticSVG(networkProps),
    ]
    const geo = [
      ReactDOMServer.renderToStaticMarkup(<StreamGeoFrame {...geoProps} />),
      renderGeoToStaticSVG(geoProps),
    ]

    for (const svg of network) {
      expect(svg).toContain('translate(80,34)')
      expect(svg).toMatch(/transform="translate\(80,\s*4\)"/)
    }
    for (const svg of geo) {
      expect(svg).toContain('translate(10,34)')
      expect(svg).toMatch(/transform="translate\(10,\s*4\)"/)
    }
  })

  it("reserves the rotated axis-title band before placing a bottom legend", () => {
    const legend = {
      legendGroups: [{
        label: "",
        type: "fill" as const,
        styleFn: () => ({ fill: "#f00" }),
        items: [
          { label: "Long legend item one" },
          { label: "Long legend item two" },
          { label: "Long legend item three" },
          { label: "Long legend item four" },
        ],
      }],
    }
    const props = {
      chartType: "line" as const,
      data: [{ x: 0, y: 1 }, { x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      size: [280, 300] as [number, number],
      xLabel: "Time",
      legend,
      legendPosition: "bottom" as const,
      axes: [{
        orient: "bottom" as const,
        autoRotate: true,
        tickValues: [0, 1],
        tickFormat: (value: number) => `A deliberately long tick label ${value}`,
      }],
    }
    const live = ReactDOMServer.renderToStaticMarkup(<StreamXYFrame {...props} />)
    const staticSvg = renderXYToStaticSVG(props)

    for (const svg of [live, staticSvg]) {
      // `autoRotate` reserves the 58px title offset before rendering. The
      // legend begins below it at y=212 rather than through the title at 196.
      expect(svg).toMatch(/<text x="85" y="146"[^>]*>Time<\/text>/)
      expect(svg).toMatch(/transform="translate\(70,\s*212\)"/)
    }
  })

  it("normalizes grouped lineDataAccessor records into separate series", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <StreamXYFrame
        chartType="line"
        data={[
          {
            label: "alpha",
            coordinates: [
              { t: 0, v: 1 },
              { t: 1, v: 3 }
            ]
          },
          {
            label: "beta",
            coordinates: [
              { t: 0, v: 3 },
              { t: 1, v: 1 }
            ]
          }
        ]}
        lineDataAccessor="coordinates"
        xAccessor="t"
        yAccessor="v"
        size={[300, 200]}
      />
    )

    expect(html.match(/<path /g)).toHaveLength(2)
  })

  it("layers a solid background, custom background graphics, then marks", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <StreamXYFrame
        chartType="scatter"
        data={[{ x: 1, y: 1 }]}
        xAccessor="x"
        yAccessor="y"
        background="#badbad"
        backgroundGraphics={
          <rect id="custom-background" width={20} height={20} />
        }
        size={[300, 200]}
      />
    )

    expectMarkupLayerOrder(html, "<circle")
  })

  it("does not center radial ordinal background graphics with the marks", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <StreamOrdinalFrame
        chartType="pie"
        projection="radial"
        data={[{ category: "A", value: 1 }]}
        oAccessor="category"
        rAccessor="value"
        background="#badbad"
        backgroundGraphics={
          <rect
            id="custom-background"
            data-testid="radial-background"
            width={20}
            height={20}
          />
        }
        size={[300, 240]}
      />
    )

    expect(html).toContain(
      '<g transform="translate(70,50)"><rect x="0" y="0" width="190" height="130" fill="#badbad"></rect><rect id="custom-background"'
    )
    expect(html).toContain('<g transform="translate(165,115)"><path')
  })

  it("composes geo solid background, graphics, then marks", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <StreamGeoFrame
        projection="equalEarth"
        points={[{ lon: 0, lat: 0 }]}
        xAccessor="lon"
        yAccessor="lat"
        background="#badbad"
        backgroundGraphics={
          <rect id="custom-background" width={20} height={20} />
        }
        size={[300, 200]}
      />
    )
    expectMarkupLayerOrder(html, "<circle")
  })

  it("resolves direct Geo frame graphics with the computed SSR scales", () => {
    const seenScales: unknown[] = []
    const graphics = ({ scales }: { scales: unknown }) => {
      seenScales.push(scales)
      return <rect id="scale-aware-geo-graphics" width={10} height={10} />
    }
    const html = ReactDOMServer.renderToStaticMarkup(
      <StreamGeoFrame
        projection="equalEarth"
        points={[{ lon: 0, lat: 0 }]}
        xAccessor="lon"
        yAccessor="lat"
        backgroundGraphics={graphics}
        foregroundGraphics={graphics}
        size={[300, 200]}
      />
    )

    expect(seenScales).toHaveLength(2)
    expect(seenScales.every(Boolean)).toBe(true)
    expect(html.match(/scale-aware-geo-graphics/g)).toHaveLength(2)
  })

  it("composes network solid background, graphics, then marks", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <StreamNetworkFrame
        chartType="force"
        nodes={[{ id: "a" }]}
        edges={[]}
        nodeIDAccessor="id"
        background="#badbad"
        backgroundGraphics={
          <rect id="custom-background" width={20} height={20} />
        }
        size={[300, 200]}
      />
    )
    expectMarkupLayerOrder(html, "<circle")
  })

  it("preserves an authored network node cursor in direct SVG output", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <StreamNetworkFrame
        chartType="force"
        nodes={[{ id: "a" }]}
        edges={[]}
        nodeIDAccessor="id"
        nodeStyle={() => ({ cursor: "pointer" })}
        animate={false}
        size={[300, 200]}
      />
    )

    expect(html).toContain('data-semiotic-mark-cursor="pointer"')
    expect(html).toContain('style="cursor:pointer"')
    expect(html.indexOf("<circle")).toBeGreaterThan(
      html.indexOf('data-semiotic-mark-cursor="pointer"')
    )
  })

  it("honors an authored area cursor hit radius in direct SVG output", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <StreamXYFrame
        chartType="area"
        data={[{ x: 0, y: 10 }, { x: 1, y: 20 }]}
        xAccessor="x"
        yAccessor="y"
        lineStyle={() => ({ cursor: "pointer" })}
        hoverRadius={7}
        showAxes={false}
        size={[300, 200]}
      />
    )
    const target = html.match(
      /<path[^>]*data-semiotic-cursor-hit-target="area-top-path"[^>]*>/
    )?.[0]

    expect(target).toContain('stroke-width="14"')
  })

  it("renders grouped ordinal connector fills in direct SVG output", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <StreamOrdinalFrame
        chartType="bar"
        data={[{ category: "A", value: 1 }]}
        customLayout={() => ({
          nodes: [
            {
              type: "connector", x1: 10, y1: 10, x2: 90, y2: 10,
              style: { fill: "#c44", cursor: "pointer" }, datum: { id: "a" }, group: "flow"
            },
            {
              type: "connector", x1: 90, y1: 10, x2: 50, y2: 80,
              style: { fill: "#c44", cursor: "pointer" }, datum: { id: "b" }, group: "flow"
            }
          ]
        })}
        showAxes={false}
        size={[200, 160]}
      />
    )

    expect(html).toContain('data-semiotic-connector-fill="flow"')
    expect(html).toContain('points="10,10 90,10 50,80"')
    expect(html).toContain('data-semiotic-mark-cursor="pointer"')
  })

  it("preserves authored XY, ordinal, and Geo mark cursors in direct SVG output", () => {
    const xy = ReactDOMServer.renderToStaticMarkup(
      <StreamXYFrame
        chartType="scatter"
        data={[{ x: 1, y: 1 }]}
        xAccessor="x"
        yAccessor="y"
        pointStyle={() => ({ cursor: "crosshair" })}
        size={[300, 200]}
      />
    )
    const ordinal = ReactDOMServer.renderToStaticMarkup(
      <StreamOrdinalFrame
        chartType="bar"
        data={[{ category: "A", value: 1 }]}
        oAccessor="category"
        rAccessor="value"
        pieceStyle={() => ({ cursor: "grab" })}
        size={[300, 200]}
      />
    )
    const geo = ReactDOMServer.renderToStaticMarkup(
      <StreamGeoFrame
        points={[{ lon: 0, lat: 0 }]}
        projection="mercator"
        xAccessor="lon"
        yAccessor="lat"
        pointStyle={() => ({ cursor: "zoom-in" })}
        size={[300, 200]}
      />
    )

    expect(xy).toContain('data-semiotic-mark-cursor="crosshair"')
    expect(ordinal).toContain('data-semiotic-mark-cursor="grab"')
    expect(geo).toContain('data-semiotic-mark-cursor="zoom-in"')
  })

  it("preserves a specialized candlestick cursor in direct SVG output", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <StreamXYFrame
        chartType="candlestick"
        data={[{ x: 1, open: 4, high: 6, low: 2, close: 5 }]}
        xAccessor="x"
        openAccessor="open"
        highAccessor="high"
        lowAccessor="low"
        closeAccessor="close"
        candlestickStyle={{ cursor: "pointer" }}
        size={[300, 200]}
      />
    )

    expect(html).toContain('data-semiotic-mark-cursor="pointer"')
    expect(html).toContain('style="cursor:pointer"')
  })
})
