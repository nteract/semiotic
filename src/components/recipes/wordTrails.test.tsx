import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { scaleBand, scaleLinear } from "d3-scale"
import { describe, expect, it } from "vitest"
import type { Datum } from "../charts/shared/datumTypes"
import type {
  OrdinalLayoutContext,
  OrdinalLayoutResult
} from "../stream/ordinalCustomLayout"
import type { RectSceneNode } from "../stream/types"
import { OrdinalCustomChart } from "../charts/custom/OrdinalCustomChart"
import { wordTrailsLayout, wordTrailsProgressiveReveal } from "./wordTrails"
import type { WordTrailsConfig, WordTrailsWordInfo } from "./wordTrails"

const DATA = [
  { word: "methodologies", weight: 9, topic: "Topic I", iteration: 4 },
  { word: "evidence", weight: 1, topic: "Topic I", iteration: 4 }
]

const BASE_CONFIG: WordTrailsConfig = {
  textAccessor: "word",
  weightAccessor: "weight",
  columnAccessor: "topic",
  segmentAccessor: "iteration",
  segmentDomain: [0, 8],
  minFontSize: 18,
  maxFontSize: 38,
  showColumnLabels: false,
  showSegmentAxis: false
}

function makeCtx(
  data: Datum[],
  config: WordTrailsConfig
): OrdinalLayoutContext<WordTrailsConfig> {
  return {
    data,
    scales: {
      o: scaleBand<string>().domain(["Topic I"]).range([0, 260]),
      r: scaleLinear().domain([0, 9]).range([220, 0]),
      projection: "vertical"
    },
    dimensions: {
      width: 260,
      height: 220,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      plot: { x: 0, y: 0, width: 260, height: 220 }
    },
    theme: {
      semantic: {
        textSecondary: "#666"
      } as OrdinalLayoutContext["theme"]["semantic"],
      categorical: ["#336699"]
    },
    resolveColor: () => "#336699",
    config,
    selection: null
  }
}

function nodeFor(
  result: OrdinalLayoutResult,
  word: string
): RectSceneNode | undefined {
  return (result.nodes as RectSceneNode[] | undefined)?.find(
    (node) => node.datum?.word === word
  )
}

describe("wordTrailsLayout wordOpacity", () => {
  it("reserves hidden rows in placement while omitting their glyph and hit target", () => {
    const allVisible = wordTrailsLayout(makeCtx(DATA, BASE_CONFIG))
    const seen: WordTrailsWordInfo[] = []
    const colorSeen: WordTrailsWordInfo[] = []
    const hidden = wordTrailsLayout(
      makeCtx(DATA, {
        ...BASE_CONFIG,
        wordColor: (info) => {
          colorSeen.push(info)
          return info.resolvedColumnColor
        },
        wordOpacity: (info) => {
          seen.push(info)
          return info.word === "methodologies" ? 0 : 1
        }
      })
    )

    expect(seen).toHaveLength(2)
    expect(colorSeen).toHaveLength(2)
    expect(seen[0]).toMatchObject({
      word: "methodologies",
      column: "Topic I",
      weight: 9,
      segment: 4,
      dataIndex: 0,
      columnIndex: 0,
      resolvedColumnColor: "#336699"
    })
    expect(seen[0].datum).toBe(DATA[0])
    expect(seen[1]).toMatchObject({
      word: "evidence",
      column: "Topic I",
      weight: 1,
      segment: 4,
      dataIndex: 1,
      columnIndex: 0,
      resolvedColumnColor: "#336699"
    })
    expect(seen[1].datum).toBe(DATA[1])
    expect(colorSeen).toEqual(seen)
    expect(nodeFor(hidden, "methodologies")).toBeUndefined()
    expect(nodeFor(hidden, "evidence")).toMatchObject(
      nodeFor(allVisible, "evidence")!
    )

    const markup = renderToStaticMarkup(<>{hidden.overlays}</>)
    expect(markup).toContain(">evidence</text>")
    expect(markup).not.toContain(">methodologies</text>")
    expect(markup).toBe(renderToStaticMarkup(<>{hidden.overlays}</>))
  })

  it("preserves source fields safely while canonical layout aliases win", () => {
    const source = Object.create(null) as Datum
    source.token = "evidence"
    source.magnitude = 4
    source.topic = "Topic I"
    source.iteration = 3
    source.word = "authored-but-not-canonical"
    source.weight = 999
    source.column = "authored-column"
    source.segment = 999
    source.note = "retained source metadata"
    source["constructor"] = "retained constructor"
    source["__proto__"] = "retained proto key"

    const result = wordTrailsLayout(
      makeCtx([source], {
        ...BASE_CONFIG,
        textAccessor: "token",
        weightAccessor: "magnitude",
        columnAccessor: "topic",
        segmentAccessor: "iteration"
      })
    )
    const datum = nodeFor(result, "evidence")?.datum

    expect(datum).toBeDefined()
    expect(Object.getPrototypeOf(datum!)).toBeNull()
    expect(datum).toMatchObject({
      word: "evidence",
      weight: 4,
      column: "Topic I",
      segment: 3,
      token: "evidence",
      magnitude: 4,
      topic: "Topic I",
      iteration: 3,
      note: "retained source metadata",
      constructor: "retained constructor"
    })
    expect(datum?.["__proto__"]).toBe("retained proto key")
  })

  it("reports data indices and the final authored column order", () => {
    const rows = [
      { word: "alpha", weight: 2, topic: "Topic A", iteration: 1 },
      { word: "beta", weight: 3, topic: "Topic B", iteration: 2 }
    ]
    const seen: WordTrailsWordInfo[] = []
    const colorCalls: string[] = []
    wordTrailsLayout(
      makeCtx(rows, {
        ...BASE_CONFIG,
        columnOrder: ["Topic B", "Topic A"],
        columnColor: (column) => {
          colorCalls.push(column)
          return column === "Topic B" ? "#bb0000" : "#0000aa"
        },
        wordOpacity: (info) => {
          seen.push(info)
          return 1
        }
      })
    )

    expect(colorCalls).toEqual(["Topic B", "Topic A"])
    expect(seen).toHaveLength(2)
    expect(seen[0]).toMatchObject({
      word: "beta",
      dataIndex: 1,
      columnIndex: 0,
      resolvedColumnColor: "#bb0000"
    })
    expect(seen[1]).toMatchObject({
      word: "alpha",
      dataIndex: 0,
      columnIndex: 1,
      resolvedColumnColor: "#0000aa"
    })
  })

  it("retains the peak source row and resolves callbacks once after duplicate merging", () => {
    const rows = [
      {
        word: "evidence",
        weight: 1,
        topic: "Topic I",
        iteration: 2,
        note: "low"
      },
      {
        word: "evidence",
        weight: 8,
        topic: "Topic I",
        iteration: 7,
        note: "peak"
      }
    ]
    const colorSeen: WordTrailsWordInfo[] = []
    const opacitySeen: WordTrailsWordInfo[] = []
    const result = wordTrailsLayout(
      makeCtx(rows, {
        ...BASE_CONFIG,
        wordColor: (info) => {
          colorSeen.push(info)
          return "#123456"
        },
        wordOpacity: (info) => {
          opacitySeen.push(info)
          return 1
        }
      })
    )

    expect(colorSeen).toHaveLength(1)
    expect(opacitySeen).toHaveLength(1)
    expect(colorSeen[0].datum).toBe(rows[1])
    expect(colorSeen[0].dataIndex).toBe(1)
    expect(opacitySeen[0]).toBe(colorSeen[0])
    expect(nodeFor(result, "evidence")?.datum).toMatchObject({
      note: "peak",
      weight: 8,
      segment: 7
    })
  })

  it("multiplies a visible callback opacity by the built-in strength opacity", () => {
    const result = wordTrailsLayout(
      makeCtx(DATA, {
        ...BASE_CONFIG,
        wordOpacity: ({ word }) => (word === "evidence" ? 0.4 : 1)
      })
    )

    expect(result.nodes).toHaveLength(2)
    const markup = renderToStaticMarkup(<>{result.overlays}</>)
    // The minimum-weight word has built-in strength 0.5: 0.5 × 0.4 = 0.2.
    expect(markup).toMatch(/<text[^>]*opacity="0\.2"[^>]*>evidence<\/text>/)
  })

  it("uses wordOpacity as the exact rendered opacity when weightOpacity is false", () => {
    const result = wordTrailsLayout(
      makeCtx(DATA, {
        ...BASE_CONFIG,
        weightOpacity: false,
        wordOpacity: ({ word }) => (word === "evidence" ? 0.25 : 1)
      })
    )

    const markup = renderToStaticMarkup(<>{result.overlays}</>)
    expect(markup).toMatch(/<text[^>]*opacity="0\.25"[^>]*>evidence<\/text>/)
    expect(markup).toMatch(/<text[^>]*opacity="1"[^>]*>methodologies<\/text>/)
  })
})

describe("wordTrailsProgressiveReveal", () => {
  const infoAt = (segment: number): WordTrailsWordInfo => ({
    word: "evidence",
    column: "Topic I",
    weight: 1,
    segment,
    datum: { segment },
    dataIndex: 0,
    columnIndex: 0,
    resolvedColumnColor: "#336699"
  })

  it("fades reached segments linearly and hides future segments", () => {
    const reveal = wordTrailsProgressiveReveal({
      currentSegment: 7,
      segmentDomain: [0, 7]
    })

    expect(reveal.weightOpacity).toBe(false)
    expect(reveal.wordOpacity!(infoAt(7))).toBe(1)
    expect(reveal.wordOpacity!(infoAt(0))).toBe(0.25)
    expect(reveal.wordOpacity!(infoAt(3))).toBeCloseTo(0.571428, 5)
    expect(reveal.wordOpacity!(infoAt(8))).toBe(0)
  })

  it("treats the first reached segment as current and can retain weight opacity", () => {
    const reveal = wordTrailsProgressiveReveal({
      currentSegment: 0,
      segmentDomain: [0, 7],
      combineWeightOpacity: true
    })

    expect(reveal.weightOpacity).toBe(true)
    expect(reveal.wordOpacity!(infoAt(0))).toBe(1)
    expect(reveal.wordOpacity!(infoAt(1))).toBe(0)
  })

  it("hides future glyphs and hit targets without moving reached words", () => {
    const trace = [
      { word: "future", weight: 9, topic: "Topic I", iteration: 8 },
      { word: "current", weight: 1, topic: "Topic I", iteration: 0 }
    ]
    const allVisible = wordTrailsLayout(makeCtx(trace, BASE_CONFIG))
    const progressive = wordTrailsLayout(
      makeCtx(trace, {
        ...BASE_CONFIG,
        ...wordTrailsProgressiveReveal({
          currentSegment: 0,
          segmentDomain: [0, 8]
        })
      })
    )

    expect(nodeFor(progressive, "current")).toMatchObject(
      nodeFor(allVisible, "current")!
    )
    expect(nodeFor(progressive, "future")).toBeUndefined()
    expect(renderToStaticMarkup(<>{progressive.overlays}</>)).not.toContain(
      ">future</text>"
    )
  })

  it("clamps authored opacities and supports descending segment domains", () => {
    const reveal = wordTrailsProgressiveReveal({
      currentSegment: 4,
      segmentDomain: [8, 0],
      oldestOpacity: -1,
      currentOpacity: 0.8,
      futureOpacity: 2
    })

    expect(reveal.wordOpacity!(infoAt(8))).toBe(0)
    expect(reveal.wordOpacity!(infoAt(6))).toBeCloseTo(0.4)
    expect(reveal.wordOpacity!(infoAt(4))).toBe(0.8)
    expect(reveal.wordOpacity!(infoAt(3))).toBe(1)
  })
})

function sizedCtx(
  data: Datum[],
  config: Partial<WordTrailsConfig>,
  plot = { width: 600, height: 600 }
): OrdinalLayoutContext<WordTrailsConfig> {
  const ctx = makeCtx(data, { ...BASE_CONFIG, ...config })
  return {
    ...ctx,
    dimensions: {
      ...ctx.dimensions,
      width: plot.width,
      height: plot.height,
      plot: { x: 0, y: 0, ...plot }
    }
  }
}

function fontSizes(result: OrdinalLayoutResult): Map<string, number> {
  const markup = renderToStaticMarkup(result.overlays as React.ReactElement)
  const sizes = new Map<string, number>()
  for (const [, size, word] of markup.matchAll(
    /font-size="([\d.]+)"[^>]*>([^<]+)<\/text>/g
  )) {
    sizes.set(word, Number(size))
  }
  return sizes
}

function intersects(a: RectSceneNode, b: RectSceneNode): boolean {
  return (
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
  )
}

function expectNoOverlaps(nodes: RectSceneNode[]): void {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      expect(intersects(nodes[i], nodes[j])).toBe(false)
    }
  }
}

function denseData(count: number): Datum[] {
  return Array.from({ length: count }, (_, i) => ({
    word: `word${i}`,
    weight: 1 + (i % 7),
    topic: "Topic I",
    iteration: i % 9
  }))
}

describe("wordTrailsLayout size encoding", () => {
  it("makes font area proportional to weight", () => {
    const data = [1, 2, 4].map((weight) => ({
      word: `w${weight}`,
      weight,
      topic: "Topic I",
      iteration: weight
    }))
    const sizes = fontSizes(
      wordTrailsLayout(
        sizedCtx(data, { minFontSize: 1, maxFontSize: 40, scaleToFit: false })
      )
    )
    const area = (word: string) => sizes.get(word)! ** 2
    expect(area("w2") / area("w1")).toBeCloseTo(2, 5)
    expect(area("w4") / area("w1")).toBeCloseTo(4, 5)
  })

  it("raises sizes below minFontSize to the floor and reports them", () => {
    const data = [
      { word: "rare", weight: 1, topic: "Topic I", iteration: 1 },
      { word: "common", weight: 100, topic: "Topic I", iteration: 5 }
    ]
    const result = wordTrailsLayout(
      sizedCtx(data, { minFontSize: 11, maxFontSize: 40, scaleToFit: false })
    )
    const sizes = fontSizes(result)
    expect(sizes.get("common")).toBe(40)
    expect(sizes.get("rare")).toBe(11) // √(1/100)·40 = 4px, floored
    expect(result.sizeFloored.map((info) => info.word)).toEqual(["rare"])
  })

  it("measures capitals wider than lowercase", () => {
    const data = [
      { word: "word", weight: 5, topic: "Topic I", iteration: 1 },
      { word: "WORD", weight: 5, topic: "Topic I", iteration: 7 }
    ]
    const result = wordTrailsLayout(sizedCtx(data, { scaleToFit: false }))
    expect(nodeFor(result, "WORD")!.w).toBeGreaterThan(
      nodeFor(result, "word")!.w * 1.15
    )
  })
})

describe("wordTrailsLayout placement", () => {
  it("leaves out and reports words with no free spot instead of overlapping them", () => {
    const result = wordTrailsLayout(
      sizedCtx(
        denseData(120),
        { scaleToFit: false, minFontSize: 14, maxFontSize: 30 },
        { width: 200, height: 160 }
      )
    )
    const nodes = result.nodes as RectSceneNode[]
    expect(result.unplaced.length).toBeGreaterThan(0)
    expect(nodes.length + result.unplaced.length).toBe(120)
    const drawn = new Set(nodes.map((node) => node.datum?.word))
    for (const info of result.unplaced) expect(drawn.has(info.word)).toBe(false)
    expectNoOverlaps(nodes)
    const markup = renderToStaticMarkup(result.overlays as React.ReactElement)
    expect(markup).toContain(`data-unplaced-count="${result.unplaced.length}"`)
  })

  it("keeps rotated words apart by their rotated bounds", () => {
    const result = wordTrailsLayout(
      sizedCtx(
        denseData(60),
        { rotate: 45, collisionPadding: 0 },
        { width: 320, height: 320 }
      )
    )
    const nodes = result.nodes as RectSceneNode[]
    expect(nodes.length).toBeGreaterThan(0)
    expectNoOverlaps(nodes)
    // Rotated hit targets cover the tilted glyph, so some are much taller than
    // a horizontal line of text.
    expect(nodes.some((node) => node.h > node.w * 0.5)).toBe(true)
  })

  it("supplies restyle and reuses placement across color/opacity-only changes", () => {
    const data = denseData(40)
    const first = wordTrailsLayout(sizedCtx(data, {}))
    const recolored = wordTrailsLayout(
      sizedCtx(data, { wordColor: () => "#ff0000", wordOpacity: () => 0.5 })
    )
    expect(typeof first.restyle).toBe("function")
    const geometry = (r: OrdinalLayoutResult) =>
      (r.nodes as RectSceneNode[]).map((node) => [
        node.datum?.word,
        node.x,
        node.y,
        node.w,
        node.h
      ])
    expect(geometry(recolored)).toEqual(geometry(first))
  })

  it("renders area-proportional words in server-rendered markup", () => {
    const data = [1, 4].map((weight) => ({
      word: `w${weight}`,
      weight,
      topic: "Topic I",
      iteration: weight
    }))
    const markup = renderToStaticMarkup(
      <OrdinalCustomChart
        data={data}
        layout={wordTrailsLayout}
        layoutConfig={{
          ...BASE_CONFIG,
          minFontSize: 1,
          maxFontSize: 40,
          scaleToFit: false
        }}
        width={400}
        height={300}
      />
    )
    const size = (word: string) =>
      Number(markup.match(new RegExp(`font-size="([\\d.]+)"[^>]*>${word}<`))?.[1])
    expect(size("w4")).toBe(40)
    expect(size("w1")).toBe(20)
  })
})
