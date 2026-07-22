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
