import * as React from "react"
import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { WordCloud } from "../charts/wordcloud/WordCloud"
import type { WordCloudLayoutOptions, WordCloudLayoutResult } from "./types"
import { renderChartWithEvidence } from "../server/renderToStaticSVG"
import { wordCloudGroupHulls } from "./wordCloudGroupHulls"
import type { NetworkRectNode } from "../stream/networkTypes"
import fixture from "./wordCloud.fixture.json"

const config = {
  ...(fixture.options as unknown as WordCloudLayoutOptions),
  layout: fixture.layout as unknown as WordCloudLayoutResult
}
const groups = [
  {
    id: "pair",
    label: "Care and trust",
    ids: ["care", "trust"],
    color: "#906024"
  },
  { id: "single", ids: ["care", "care", "missing"] },
  { id: "empty", ids: ["omitted"] }
]

describe("WordCloud network group hulls", () => {
  it("shares hull geometry between React SSR and server output, behind native words", () => {
    const { svg, evidence } = renderChartWithEvidence("WordCloud", {
      ...config,
      groupHulls: groups,
      width: 350,
      height: 230,
      margin: 15
    })
    const react = renderToStaticMarkup(
      <WordCloud
        {...config}
        groupHulls={groups}
        width={350}
        height={230}
        margin={15}
      />
    )
    const paths = (markup: string) =>
      [...markup.matchAll(/<path\b[^>]*data-wordcloud-hull[^>]*>/g)].map(
        ([path]) => path
      )
    expect(paths(svg)).toEqual(paths(react))
    expect(paths(svg)).toHaveLength(2)
    expect(svg).toContain('aria-label="Care and trust: 2 placed terms"')
    expect(svg).toContain('aria-label="single: 1 placed terms"')
    expect(svg.indexOf("data-wordcloud-hull")).toBeLessThan(
      svg.indexOf("data-word-id")
    )
    expect(evidence.frameType).toBe("network")
    expect(evidence.markCountByType).toEqual({ "node:rect": 3 })
    expect(svg).toContain('transform="translate(15,15)"')
  })

  it("encloses the full occupied bounds, including a vertical word, without mutating nodes", () => {
    const nodes: NetworkRectNode[] = [
      {
        type: "rect",
        id: "vertical",
        datum: { text: "vertical", value: 1 },
        x: 40,
        y: 20,
        w: 12,
        h: 90,
        style: { fill: "black" }
      }
    ]
    const original = structuredClone(nodes)
    const svg = renderToStaticMarkup(
      <>
        {wordCloudGroupHulls(nodes, [
          { id: "vertical", ids: ["vertical"], padding: 0 }
        ])}
      </>
    )
    expect(svg).toContain('d="M40,20 L52,20 L52,110 L40,110 Z"')
    expect(nodes).toEqual(original)
    const forced = renderToStaticMarkup(
      <>
        {wordCloudGroupHulls(
          nodes,
          [{ id: "vertical", ids: ["vertical"], padding: Infinity }],
          true
        )}
      </>
    )
    expect(forced).toContain('fill="none"')
    expect(forced).toContain('stroke="CanvasText"')
    expect(forced).not.toMatch(/NaN|Infinity/)
    expect(wordCloudGroupHulls(nodes, [])).toBeNull()
  })
})
