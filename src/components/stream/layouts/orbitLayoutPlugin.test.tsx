import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { networkSceneEdgeToSVG } from "../SceneToSVGNetwork"
import type {
  NetworkPipelineConfig,
  RealtimeEdge,
  RealtimeNode
} from "../networkTypes"
import { orbitLayoutPlugin } from "./orbitLayoutPlugin"

function node(id: string, x: number, y: number): RealtimeNode {
  return {
    id,
    x,
    y,
    x0: x,
    x1: x,
    y0: y,
    y1: y,
    width: 0,
    height: 0,
    value: 1,
    data: { id }
  }
}

describe("orbitLayoutPlugin scene styles", () => {
  it("applies edgeStyle, including cursor, to data edges but not decorative rings", () => {
    const source = node("source", 20, 20)
    const target = node("target", 80, 60)
    const edge = {
      source,
      target,
      value: 1,
      y0: 0,
      y1: 0,
      sankeyWidth: 1,
      data: { source: "source", target: "target" }
    } satisfies RealtimeEdge
    const config = {
      chartType: "orbit",
      orbitShowRings: false,
      edgeStyle: () => ({
        stroke: "#123456",
        strokeWidth: 3,
        opacity: 0.4,
        cursor: "pointer"
      })
    } satisfies NetworkPipelineConfig

    const result = orbitLayoutPlugin.buildScene(
      [source, target],
      [edge],
      config,
      [200, 120]
    )
    expect(result.sceneEdges).toHaveLength(1)
    expect(result.sceneEdges[0]?.style).toMatchObject({
      stroke: "#123456",
      strokeWidth: 3,
      opacity: 0.4,
      cursor: "pointer"
    })

    const html = renderToStaticMarkup(
      <svg>{networkSceneEdgeToSVG(result.sceneEdges[0]!, 0)}</svg>
    )
    expect(html).toContain('data-semiotic-mark-cursor="pointer"')
  })
})
