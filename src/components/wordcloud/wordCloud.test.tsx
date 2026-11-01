import * as React from "react"
import { describe, it, expect, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { render, fireEvent, screen } from "@testing-library/react"
import { normalizeWordCloudInput } from "./normalizeWordCloudInput"
import { validateWordCloudLayout } from "./validateWordCloudLayout"
import { prepareWordCloudLayout } from "./prepareWordCloudLayout"
import type { WordCloudLayoutOptions, WordCloudLayoutResult } from "./types"
import fixture from "./wordCloud.fixture.json"
import { WordCloud } from "../charts/wordcloud/WordCloud"
import {
  renderChart,
  renderChartWithEvidence,
  renderToImage
} from "../server/renderToStaticSVG"
import {
  renderCanvasText,
  textSceneNodeToSVG,
  type TextSceneNode
} from "../stream/textScene"
import { findNearestNetworkNode } from "../stream/NetworkCanvasHitTester"
import { wordCloudNetworkLayout } from "./wordCloudNetworkLayout"
import { extractNetworkNavPoints } from "../stream/networkKeyboardNav"
import { act } from "@testing-library/react"
import { wordCloudTableScene } from "./wordCloudTable"
import { countDataRows, extractAllRows } from "../stream/accessibleDataRows"

const options = fixture.options as unknown as WordCloudLayoutOptions
const layout = fixture.layout as unknown as WordCloudLayoutResult
const config = { ...options, layout }

describe("WordCloud normalization and portable layouts", () => {
  it("rejects oversized raster requests and invalid configuration before preparation", () => {
    for (const patch of [
      { width: 2048 },
      { height: 0 },
      { seed: Infinity },
      { maskThreshold: 0 },
      { fontSizeRange: [40, 12] },
      { padding: -1 }
    ]) {
      expect(() =>
        normalizeWordCloudInput({
          ...options,
          ...patch
        } as WordCloudLayoutOptions)
      ).toThrow()
    }
    const normalized = normalizeWordCloudInput({
      data: [
        { text: "bad", value: NaN },
        { text: "zero", value: 0 }
      ]
    })
    expect(normalized.words).toEqual([])
    expect(normalized.omitted).toHaveLength(2)
  })
  it("keeps omitted high-weight terms in ranked accessible values", () => {
    const next = structuredClone(layout)
    const word = next.words.shift()!
    next.omitted.push({
      id: word.id,
      sourceIndex: word.sourceIndex,
      reason: "no-space"
    })
    const rows = extractAllRows(wordCloudTableScene(options, next))
    expect(rows.map((row) => row.values.value)).toEqual([12, 8, 3])
    expect(rows[0].values).toMatchObject({
      term: "care",
      placement: "no-space"
    })
  })
  it("accounts for sparse, invalid and duplicate inputs without calling accessors on them", () => {
    const data = [
      null,
      undefined,
      { term: "beta", count: 2 },
      { term: "alpha", count: 2 },
      { term: "alpha", count: 4 },
      { term: "zero", count: 0 },
      { term: "infinite", count: Infinity },
      { term: "bool", count: true }
    ]
    delete data[1] // Exercise a real sparse slot without an array-literal elision.
    const accessor = vi.fn((row) => row.term)
    const result = normalizeWordCloudInput({
      data,
      textAccessor: accessor,
      valueAccessor: "count",
      maxWords: 1
    } as unknown as WordCloudLayoutOptions)
    expect(result.words.map((word) => word.id)).toEqual(["alpha"])
    expect(result.omitted.map((word) => word.reason)).toEqual([
      "invalid-row",
      "invalid-row",
      "duplicate-id",
      "invalid-value",
      "invalid-value",
      "invalid-value",
      "max-words"
    ])
    expect(accessor).toHaveBeenCalledTimes(6)
    expect(result.words.length + result.omitted.length).toBe(data.length)
  })
  it("uses deterministic tie order and seed-dependent rotations without mutating inputs", () => {
    const data = Object.freeze(
      Array.from({ length: 30 }, (_, i) =>
        Object.freeze({ text: `word${i}`, value: 1 })
      )
    )
    const input = { data, seed: 1, rotate: "orthogonal" as const }
    expect(normalizeWordCloudInput(input)).toEqual(
      normalizeWordCloudInput(input)
    )
    expect(normalizeWordCloudInput(input).words.map((word) => word.id)).toEqual(
      data.map((row) => row.text).sort()
    )
    expect(
      normalizeWordCloudInput(input).words.map((word) => word.rotate)
    ).not.toEqual(
      normalizeWordCloudInput({ ...input, seed: 2 }).words.map(
        (word) => word.rotate
      )
    )
  })
  it("rejects stale dimensions, data, font, seed, geometry and outcome accounting", () => {
    expect(() => validateWordCloudLayout(options, layout)).not.toThrow()
    for (const change of [
      { width: 400 },
      { seed: 3 },
      { fontFamily: "serif" },
      { data: [] }
    ]) {
      expect(() =>
        validateWordCloudLayout({ ...options, ...change }, layout)
      ).toThrow(/does not match/)
    }
    for (const mutate of [
      (next: WordCloudLayoutResult) => {
        next.words[0].x = Infinity
      },
      (next: WordCloudLayoutResult) => {
        next.words.pop()
      },
      (next: WordCloudLayoutResult) => {
        next.words.push(next.words[0])
      },
      (next: WordCloudLayoutResult) => {
        next.bounds![0].x = -1000
      },
      (next: WordCloudLayoutResult) => {
        next.maskResolution = [1, 1]
      }
    ]) {
      const next = structuredClone(layout)
      mutate(next)
      expect(() => validateWordCloudLayout(options, next)).toThrow()
    }
  })
  it("requires a raster environment for preparation, but not empty input or saved placements", async () => {
    const empty = await prepareWordCloudLayout({ data: [] })
    expect(empty.words).toEqual([])
    expect(Object.isFrozen(empty.omitted)).toBe(true)
    await expect(
      prepareWordCloudLayout(options, {
        canvas: () => ({ width: 1, height: 1, getContext: () => null })
      })
    ).rejects.toMatchObject({ code: "CANVAS_REQUIRED" })
    expect(() => renderChart("WordCloud", options)).toThrow(
      /requires a prepared layout/
    )
    expect(() => renderChart("WordCloud", config)).not.toThrow()
  })
})

describe("native retained text across renderers", () => {
  const node: TextSceneNode = {
    ...layout.words[0],
    type: "text",
    x: 100,
    y: 80,
    rotate: 90,
    style: { fill: "#345", opacity: 0.5 },
    datum: options.data[0]
  }
  it("uses the same anchor, rotation, font and alphabetic baseline on Canvas and SVG", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillText: vi.fn(),
      globalAlpha: 1
    } as unknown as CanvasRenderingContext2D
    renderCanvasText(ctx, [node])
    expect(ctx.translate).toHaveBeenCalledWith(100, 80)
    expect(ctx.rotate).toHaveBeenCalledWith(Math.PI / 2)
    expect(ctx.fillText).toHaveBeenCalledWith("care", 0, 0)
    expect(ctx.textBaseline).toBe("alphabetic")
    expect(ctx.textAlign).toBe("center")
    expect(ctx.font).toBe("normal normal 36px Crimson Text")
    expect(ctx.globalAlpha).toBe(0.5)
    const svg = renderToStaticMarkup(textSceneNodeToSVG(node))
    expect(svg).toContain('transform="translate(100,80) rotate(90)"')
    expect(svg).toContain('dominant-baseline="alphabetic"')
    expect(svg).toContain('font-size="36"')
    vi.mocked(ctx.fillText).mockClear()
    renderCanvasText(ctx, [{ ...node, style: { fill: "none" } }])
    expect(ctx.fillText).not.toHaveBeenCalled()
  })
  it("hit-tests stored bounds and excludes decorative text from interaction and accessible rows", () => {
    const scene = wordCloudNetworkLayout({
      nodes: [],
      edges: [],
      dimensions: {
        width: 320,
        height: 200,
        plot: { x: 0, y: 0, width: 320, height: 200 }
      },
      theme: { semantic: {}, categorical: [] },
      resolveColor: () => "#333",
      config
    }).sceneNodes!
    const first = scene[0]
    expect(first.type).toBe("rect")
    if (first.type !== "rect") throw new Error("Expected network bounds")
    expect(
      findNearestNetworkNode(
        scene,
        [],
        first.x + first.w / 2,
        first.y + first.h / 2
      )?.datum
    ).toBe(options.data[0])
    expect(findNearestNetworkNode(scene, [], -100, -100)).toBeNull()
    expect(
      findNearestNetworkNode([{ ...first, datum: null }], [], first.x, first.y)
    ).toBeNull()
    expect(extractNetworkNavPoints(scene).map((point) => point.datum)).toEqual(
      expect.arrayContaining([...options.data])
    )
    expect(countDataRows([node, { ...node, datum: null }])).toBe(1)
    expect(extractAllRows([node])[0]).toMatchObject({
      values: { text: "care", value: 12 }
    })
  })
  it("renders original data through the shared network keyboard and tooltip lifecycle", async () => {
    const tooltip = vi.fn((row) => (
      <span>
        {row.text}: {row.value} original
      </span>
    ))
    const onClick = vi.fn()
    const { container } = render(
      <WordCloud
        {...config}
        renderAs="svg"
        tooltip={tooltip}
        onClick={onClick}
        accessibleTable={false}
      />
    )
    const frame = container.querySelector(".stream-network-frame")!
    expect(container.querySelector(".stream-wordcloud-frame")).toBeNull()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    fireEvent.focus(frame)
    fireEvent.keyDown(frame, { key: "Home" })
    const original = tooltip.mock.calls.at(-1)?.[0]
    expect(options.data).toContain(original)
    expect(
      screen.getByText(`${original.text}: ${original.value} original`)
    ).toBeTruthy()
    fireEvent.keyDown(frame, { key: "Enter" })
    expect(onClick.mock.calls[0][0]).toBe(original)
    fireEvent.keyDown(frame, { key: "Escape" })
    expect(
      screen.queryByText(`${original.text}: ${original.value} original`)
    ).toBeNull()
  })
  it("exports identical placements and reports marks and omissions without a mask mark", async () => {
    const { svg, evidence } = renderChartWithEvidence("WordCloud", config)
    expect(evidence).toMatchObject({
      frameType: "network",
      markCount: 3,
      markCountByType: { "node:rect": 3 },
      wordCloud: { inputCount: 3, placedCount: 3, omitted: [] },
      margin: { top: 0, left: 0, bottom: 0, right: 0 }
    })
    const client = renderToStaticMarkup(
      <WordCloud {...config} renderAs="svg" accessibleTable={false} />
    )
    for (const word of layout.words) {
      const transform = `translate(${word.x + 160},${word.y + 100}) rotate(${word.rotate})`
      expect(svg).toContain(transform)
      expect(client).toContain(transform)
    }
    expect(svg).toContain('class="stream-network-frame"')
    expect(svg).toContain('data-word-id="care"')
    const png = await renderToImage("WordCloud", config)
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
    expect(png.readUInt32BE(16)).toBe(320)
    expect(png.readUInt32BE(20)).toBe(200)
  })
})
