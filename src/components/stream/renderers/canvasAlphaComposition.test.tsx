import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { scaleBand, scaleLinear } from "d3-scale"
import { renderToStaticMarkup } from "react-dom/server"
import { createMockCanvasContext } from "../../../test-utils/canvasMock"
import type { SceneNode, StreamScales, Style } from "../types"
import type { NetworkSceneNode, NetworkSceneEdge } from "../networkTypes"
import type { GeoSceneNode, GeoScales } from "../geoTypes"
import {
  xySceneNodeToSVG,
  networkSceneNodeToSVG,
  networkSceneEdgeToSVG,
  geoSceneNodeToSVG,
  ordinalSceneNodeToSVG
} from "../SceneToSVG"
import { wrapStyleWithSelection } from "../../charts/shared/selectionUtils"
import { candlestickCanvasRenderer } from "./candlestickCanvasRenderer"
import { pointCanvasRenderer } from "./pointCanvasRenderer"
import { lineCanvasRenderer } from "./lineCanvasRenderer"
import { areaCanvasRenderer } from "./areaCanvasRenderer"
import { barCanvasRenderer } from "./barCanvasRenderer"
import { heatmapCanvasRenderer } from "./heatmapCanvasRenderer"
import { networkCircleRenderer } from "./networkCircleRenderer"
import { networkRectRenderer } from "./networkRectRenderer"
import { networkArcRenderer } from "./networkArcRenderer"
import { networkEdgeRenderer } from "./networkEdgeRenderer"
import { geoCanvasRenderer } from "./geoCanvasRenderer"
import type { OrdinalSceneNode, OrdinalScales } from "../ordinalTypes"
import { wedgeCanvasRenderer } from "./wedgeCanvasRenderer"
import { boxplotCanvasRenderer } from "./boxplotCanvasRenderer"
import { violinCanvasRenderer } from "./violinCanvasRenderer"
import { connectorCanvasRenderer } from "./connectorCanvasRenderer"
import { trapezoidCanvasRenderer } from "./trapezoidCanvasRenderer"
import {
  symbolCanvasRenderer,
  networkSymbolRenderer
} from "./symbolCanvasRenderer"
import type { StreamRendererFn } from "./types"

const scales: StreamScales = { x: scaleLinear(), y: scaleLinear() }
const layout = { width: 100, height: 100 }
const style: Style = {
  fill: "#336699",
  stroke: "#112233",
  opacity: 0.5,
  fillOpacity: 0.4,
  strokeOpacity: 0.6
}
const path = "M10 10L30 10L30 30Z"

// Model save/restore and record actual paint state, including the rectangle
// operations that don't go through fill()/stroke().
function recordingContext(alpha: number) {
  const mock = createMockCanvasContext()
  const stack: number[] = []
  mock.globalAlpha = alpha
  mock.save = () => stack.push(Number(mock.globalAlpha))
  mock.restore = () => {
    mock.globalAlpha = stack.pop()!
  }
  const fills: number[] = [],
    strokes: number[] = []
  for (const method of ["fill", "fillRect", "drawImage"])
    mock[method] = () => fills.push(Number(mock.globalAlpha))
  for (const method of ["stroke", "strokeRect"])
    mock[method] = () => strokes.push(Number(mock.globalAlpha))
  return {
    ctx: mock as unknown as CanvasRenderingContext2D,
    fills,
    strokes,
    depth: () => stack.length
  }
}

beforeEach(() => vi.stubGlobal("Path2D", class {}))
afterEach(() => vi.unstubAllGlobals())

const xyCases: Array<[string, StreamRendererFn, SceneNode]> = [
  [
    "point",
    pointCanvasRenderer,
    { type: "point", x: 20, y: 20, r: 5, style, datum: {} }
  ],
  [
    "line",
    lineCanvasRenderer,
    {
      type: "line",
      path: [
        [10, 10],
        [30, 30]
      ],
      style: { ...style, fill: "none" },
      datum: []
    }
  ],
  [
    "area",
    areaCanvasRenderer,
    {
      type: "area",
      topPath: [
        [10, 10],
        [30, 20]
      ],
      bottomPath: [
        [10, 40],
        [30, 40]
      ],
      style,
      datum: []
    }
  ],
  [
    "bar",
    barCanvasRenderer,
    { type: "rect", x: 10, y: 10, w: 20, h: 30, style, datum: {} }
  ],
  [
    "heatmap",
    heatmapCanvasRenderer,
    {
      type: "heatcell",
      x: 10,
      y: 10,
      w: 20,
      h: 30,
      fill: "#336699",
      style,
      datum: {}
    }
  ]
]
xyCases.push([
  "candlestick",
  candlestickCanvasRenderer,
  {
    type: "candlestick",
    x: 20,
    openY: 15,
    closeY: 25,
    highY: 10,
    lowY: 30,
    bodyWidth: 10,
    upColor: "#336699",
    downColor: "#336699",
    wickColor: "#112233",
    wickWidth: 1,
    isUp: true,
    style,
    datum: {}
  }
])
const networkCases: Array<
  [string, typeof networkCircleRenderer, NetworkSceneNode]
> = [
  [
    "network circle",
    networkCircleRenderer,
    { type: "circle", cx: 20, cy: 20, r: 5, style, datum: {} }
  ],
  [
    "network rect",
    networkRectRenderer,
    { type: "rect", x: 10, y: 10, w: 20, h: 30, style, datum: {} }
  ],
  [
    "network arc",
    networkArcRenderer,
    {
      type: "arc",
      cx: 20,
      cy: 20,
      innerR: 3,
      outerR: 10,
      startAngle: 0,
      endAngle: Math.PI,
      style,
      datum: {}
    }
  ]
]
const edgeCases: Array<[string, NetworkSceneEdge]> = [
  ["bezier", { type: "bezier", pathD: path, style, datum: {} }],
  ["ribbon", { type: "ribbon", pathD: path, style, datum: {} }],
  ["curved", { type: "curved", pathD: path, style, datum: {} }],
  [
    "line edge",
    { type: "line", x1: 10, y1: 10, x2: 30, y2: 30, style, datum: {} }
  ]
]
edgeCases.push([
  "gradient bezier",
  {
    type: "bezier",
    pathD: path,
    style,
    datum: {},
    _gradient: { x0: 0, x1: 100, from: 1, to: 0 }
  }
])
const geo: GeoSceneNode = {
  type: "geoarea",
  pathData: path,
  centroid: [20, 20],
  bounds: [
    [10, 10],
    [30, 30]
  ],
  screenArea: 200,
  style,
  datum: {}
}
const ordinalScales: OrdinalScales = {
  o: scaleBand(),
  r: scaleLinear(),
  projection: "vertical"
}
const wedge = {
  type: "wedge",
  cx: 20,
  cy: 20,
  innerRadius: 3,
  outerRadius: 10,
  startAngle: 0,
  endAngle: Math.PI,
  style,
  datum: {}
} as const
const ordinalCases: Array<
  [string, typeof wedgeCanvasRenderer, OrdinalSceneNode]
> = [
  ["wedge", wedgeCanvasRenderer, wedge],
  ["rounded wedge", wedgeCanvasRenderer, { ...wedge, cornerRadius: 2 }],
  [
    "end-rounded wedge",
    wedgeCanvasRenderer,
    { ...wedge, cornerRadius: 2, roundedEnds: { start: true } }
  ],
  [
    "gradient wedge",
    wedgeCanvasRenderer,
    { ...wedge, _gradientBand: { colors: ["#336699", "#336699"] } }
  ],
  [
    "boxplot",
    boxplotCanvasRenderer,
    {
      type: "boxplot",
      x: 20,
      y: 20,
      columnWidth: 10,
      minPos: 5,
      q1Pos: 10,
      medianPos: 20,
      q3Pos: 30,
      maxPos: 35,
      projection: "vertical",
      stats: { n: 5, min: 1, q1: 2, median: 3, q3: 4, max: 5, mean: 3 },
      style,
      datum: {}
    }
  ],
  [
    "violin",
    violinCanvasRenderer,
    {
      type: "violin",
      pathString: path,
      translateX: 0,
      translateY: 0,
      style,
      datum: {}
    }
  ],
  [
    "connector",
    connectorCanvasRenderer,
    {
      type: "connector",
      x1: 10,
      y1: 10,
      x2: 30,
      y2: 30,
      style: { ...style, fill: "none" },
      datum: {}
    }
  ],
  [
    "trapezoid",
    trapezoidCanvasRenderer,
    {
      type: "trapezoid",
      points: [
        [10, 10],
        [30, 10],
        [25, 30],
        [15, 30]
      ],
      style,
      datum: {}
    }
  ]
]
xyCases.push([
  "symbol",
  symbolCanvasRenderer,
  { type: "symbol", x: 20, y: 20, size: 25, style, datum: {} }
])
networkCases.push([
  "network symbol",
  networkSymbolRenderer,
  { type: "symbol", cx: 20, cy: 20, size: 25, style, datum: {} }
])
const cases = [
  ...ordinalCases.map(([name, paint, node]) => ({
    name,
    filled: name !== "connector",
    paint: (ctx: CanvasRenderingContext2D) =>
      paint(ctx, [node, node], ordinalScales, layout),
    svg: () => ordinalSceneNodeToSVG(node, 0)
  })),
  ...xyCases.map(([name, paint, node]) => ({
    name,
    filled: name !== "line",
    paint: (ctx: CanvasRenderingContext2D) =>
      paint(ctx, [node, node], scales, layout),
    svg: () => xySceneNodeToSVG(node, 0)
  })),
  ...networkCases.map(([name, paint, node]) => ({
    name,
    filled: true,
    paint: (ctx: CanvasRenderingContext2D) => paint(ctx, [node, node]),
    svg: () => networkSceneNodeToSVG(node, 0)
  })),
  ...edgeCases.map(([name, node]) => ({
    name,
    filled: name !== "line edge",
    paint: (ctx: CanvasRenderingContext2D) =>
      networkEdgeRenderer(ctx, [node, node]),
    svg: () => networkSceneEdgeToSVG(node, 0)
  })),
  {
    name: "geo area",
    filled: true,
    paint: (ctx: CanvasRenderingContext2D) =>
      geoCanvasRenderer(ctx, [geo, geo], {} as GeoScales, layout),
    svg: () => geoSceneNodeToSVG(geo, 0)
  }
]

describe.each(cases)(
  "$name opacity composition",
  ({ name, paint, filled, svg }) => {
    it.each([0, 0.3, 1])(
      "multiplies the incoming alpha %s for every mark and restores it",
      (alpha) => {
        const { ctx, fills, strokes } = recordingContext(alpha)
        paint(ctx)
        if (filled) {
          expect(fills.length).toBeGreaterThan(0)
          for (const value of fills)
            expect(value).toBeCloseTo(alpha * 0.5 * 0.4)
        }
        expect(strokes.length).toBeGreaterThan(0)
        for (const value of strokes)
          expect(value).toBeCloseTo(
            alpha *
              0.5 *
              0.6 *
              (name.includes("bezier") ? 0.5 : name === "ribbon" ? 0.3 : 1)
          )
        expect(ctx.globalAlpha).toBe(alpha)
      }
    )

    it("keeps independent fill and stroke alpha in SVG", () => {
      const html = renderToStaticMarkup(<svg>{svg()}</svg>)
      const doc = new DOMParser().parseFromString(html, "image/svg+xml")
      const marks = Array.from(
        doc.querySelectorAll("path,rect,circle,line,polygon")
      )
      const attribute = (element: Element, name: string) => {
        const css = document.createElement("div").style
        css.cssText = element.getAttribute("style") ?? ""
        return css.getPropertyValue(name) || element.getAttribute(name)
      }
      const effective = (mark: Element, channel: "fill" | "stroke") => {
        let channelNode: Element | null = mark
        while (
          channelNode &&
          attribute(channelNode, `${channel}-opacity`) === null
        )
          channelNode = channelNode.parentElement
        let alpha = Number(
          channelNode ? attribute(channelNode, `${channel}-opacity`) : 1
        )
        for (
          let current: Element | null = mark;
          current;
          current = current.parentElement
        )
          alpha *= Number(attribute(current, "opacity") ?? 1)
        return alpha
      }
      if (filled)
        expect(
          marks
            .filter((m) => m.getAttribute("fill") === "#336699")
            .map((m) => effective(m, "fill"))
        ).toContainEqual(0.2)
      expect(
        marks
          .filter((m) => m.getAttribute("stroke") === "#112233")
          .map((m) => effective(m, "stroke"))
      ).toContainEqual(
        0.3 * (name.includes("bezier") ? 0.5 : name === "ribbon" ? 0.3 : 1)
      )
    })
  }
)

it("dims authored opacity once without replacing channel alpha or mutating the style", () => {
  const original = { ...style }
  const wrapped = wrapStyleWithSelection(
    () => original,
    { isActive: true, predicate: () => false },
    { unselectedOpacity: 0.25 }
  )
  expect(wrapped({})).toEqual({ ...style, opacity: 0.125 })
  expect(original).toEqual(style)
})

it("keeps heatmap value labels independent of cell opacity while inheriting frame alpha", () => {
  const { ctx } = recordingContext(0.3)
  const textAlpha: number[] = []
  ctx.fillText = () => {
    textAlpha.push(ctx.globalAlpha)
  }
  heatmapCanvasRenderer(
    ctx,
    [
      {
        type: "heatcell",
        x: 0,
        y: 0,
        w: 30,
        h: 30,
        fill: "#336699",
        style,
        value: 12,
        showValues: true,
        datum: {}
      }
    ],
    scales,
    layout
  )
  expect(textAlpha).toEqual([0.3])
})

it("keeps violin median fill independent of stroke opacity", () => {
  const { ctx, fills, strokes } = recordingContext(0.3)
  violinCanvasRenderer(
    ctx,
    [
      {
        type: "violin",
        pathString: path,
        translateX: 0,
        translateY: 0,
        style,
        datum: {},
        iqrLine: {
          centerPos: 20,
          q1Pos: 10,
          medianPos: 20,
          q3Pos: 30,
          isVertical: true
        }
      }
    ],
    ordinalScales,
    layout
  )
  expect(fills).toEqual([0.3 * 0.5 * 0.4, 0.3 * 0.5 * 0.8])
  expect(strokes).toEqual([
    0.3 * 0.5 * 0.6,
    0.3 * 0.5 * 0.6 * 0.8,
    0.3 * 0.5 * 0.6 * 0.8
  ])
  expect(ctx.globalAlpha).toBe(0.3)
})

for (const [name, renderer, node] of xyCases.filter(([name]) =>
  ["point", "symbol"].includes(name)
)) {
  it(`${name} composes separate decay with frame and style alpha`, () => {
    const { ctx, fills, strokes } = recordingContext(0.3)
    renderer(
      ctx,
      [{ ...node, _decayOpacity: 0.25 } as SceneNode],
      scales,
      layout
    )
    expect(fills).toEqual([0.3 * 0.5 * 0.25 * 0.4])
    expect(strokes).toEqual([0.3 * 0.5 * 0.25 * 0.6])
  })
}

it("keeps overlapping points separate when the frame is translucent", () => {
  const { ctx, fills } = recordingContext(0.3)
  const node: SceneNode = {
    type: "point",
    x: 20,
    y: 20,
    r: 5,
    style: { fill: "red" },
    datum: {}
  }
  pointCanvasRenderer(ctx, [node, node], scales, layout)
  expect(fills).toEqual([0.3, 0.3])
})

it("dims independent pulse overlays by the frame alpha", () => {
  const { ctx, fills } = recordingContext(0.3)
  barCanvasRenderer(
    ctx,
    [
      {
        type: "rect",
        x: 10,
        y: 10,
        w: 20,
        h: 20,
        style: { fill: "red", opacity: 0 },
        _pulseIntensity: 1,
        datum: {}
      }
    ],
    scales,
    layout
  )
  expect(fills).toEqual([0, 0.3 * 0.3])
  expect(ctx.globalAlpha).toBe(0.3)
})

for (const [name, renderer, node] of xyCases.filter(([name]) =>
  ["point", "bar", "area", "heatmap"].includes(name)
)) {
  it(`${name} restores frame alpha across consecutive pulsing marks`, () => {
    const { ctx, fills, strokes } = recordingContext(0.3)
    const pulsing = { ...node, _pulseIntensity: 1 } as SceneNode
    renderer(ctx, [pulsing, pulsing], scales, layout)
    const alpha = 0.3 * (name === "point" ? 0.6 : name === "area" ? 0.35 : 0.3)
    const paints = name === "point" ? strokes : fills
    expect(
      paints.filter((value) => Math.abs(value - alpha) < 1e-9)
    ).toHaveLength(2)
    expect(ctx.globalAlpha).toBe(0.3)
  })
}

it("composes area decay and releases both clips before the next mark", () => {
  const { ctx, fills, strokes, depth } = recordingContext(0.3)
  areaCanvasRenderer(
    ctx,
    [
      {
        type: "area",
        topPath: [
          [10, 10],
          [30, 20]
        ],
        bottomPath: [
          [10, 40],
          [30, 40]
        ],
        style,
        datum: [],
        _decayOpacities: [0.2, 0.6],
        _introClipFraction: 0.5,
        clipRect: { x: 0, y: 0, width: 50, height: 50 }
      }
    ],
    scales,
    layout
  )
  expect(fills[0]).toBeCloseTo(0.3 * 0.5 * 0.4 * 0.4)
  expect(strokes[0]).toBeCloseTo(0.3 * 0.5 * 0.6 * 0.4)
  expect(depth()).toBe(0)
  expect(ctx.globalAlpha).toBe(0.3)
})

it("restores the frame after an edge-faded line with an intro clip", () => {
  const { ctx, strokes, depth } = recordingContext(0.3)
  lineCanvasRenderer(
    ctx,
    [
      {
        type: "line",
        path: [
          [10, 10],
          [30, 30]
        ],
        style: { ...style, _edgeFade: true },
        datum: [],
        _introClipFraction: 0.5
      }
    ],
    scales,
    layout
  )
  expect(strokes[0]).toBeCloseTo(0.3 * 0.5 * 0.6)
  expect(depth()).toBe(0)
  expect(ctx.globalAlpha).toBe(0.3)
})
