import * as React from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { NetworkCustomChart } from "semiotic/network"
import type { NetworkCustomLayout } from "semiotic/network"
import {
  compositionalPath,
  emitCompositionalScene
} from "semiotic/recipes/core"
import { exportNetworkViewSVG, renderChartWithEvidence } from "semiotic/server"
import { makeCompositionalParityCases } from "../../../integration-tests/compositional-parity-fixtures"

const cases = makeCompositionalParityCases()
const edgeKeys = ["account", "quantity", "price", "account-audit"].map((id) =>
  JSON.stringify(["id", id])
)

describe.each(cases)("compositional server paths: $variant", (fixture) => {
  it("preserves ports, parallel IDs and accepted geometry through static, React and saved SVG rendering", () => {
    const { props, solved, expectedNodeCount } = fixture
    const normalized: string[][] = []
    const layout: NetworkCustomLayout<typeof props.layoutConfig> = (
      context
    ) => {
      normalized.push(context.edges.map((edge) => edge._edgeKey!))
      return props.layout(context)
    }
    const result = renderChartWithEvidence("NetworkCustomChart", {
      ...props,
      layout
    })
    const initialReact = renderToString(
      <NetworkCustomChart {...props} layout={layout} />
    )
    expect(normalized).toHaveLength(2)
    normalized.forEach((keys) => expect(keys).toEqual(edgeKeys))
    expect(result.evidence).toMatchObject({
      status: "ok",
      empty: false,
      nodeCount: expectedNodeCount,
      edgeCount: 4,
      markCount: expectedNodeCount + 4,
      markCountByType: { "node:rect": expectedNodeCount, "edge:curved": 4 }
    })
    const saved = exportNetworkViewSVG(
      emitCompositionalScene(props.layoutConfig),
      {
        width: props.width,
        height: props.height,
        view: props.frameProps.viewTransform
      }
    )
    const expectedPaths = solved.edges.map((edge) =>
      edge.sections.map(compositionalPath).join(" ")
    )
    expect(new Set(expectedPaths).size).toBe(4)
    const snapshots = [result.svg, initialReact, saved].map((markup) => {
      const doc = new DOMParser().parseFromString(markup, "text/html")
      const routes = [...doc.querySelectorAll('path[stroke="#176b83"]')]
      const boxes = [
        ...doc.querySelectorAll('rect[fill="#edf2f7"], rect[fill="#c9dce8"]')
      ]
      expect(routes.map((path) => path.getAttribute("d"))).toEqual(
        expectedPaths
      )
      expect(boxes).toHaveLength(expectedNodeCount)
      for (const mark of [...routes, ...boxes])
        expect(
          mark.closest("[data-network-view] > g")?.getAttribute("transform")
        ).toBe("translate(6,8) scale(1.05)")
      return boxes.map((box) =>
        ["x", "y", "width", "height", "fill"].map((key) =>
          box.getAttribute(key)
        )
      )
    })
    expect(snapshots[1]).toEqual(snapshots[0])
    expect(snapshots[2]).toEqual(snapshots[0])
    if (expectedNodeCount === 8)
      expect(snapshots[0].filter((box) => box[3] === "40")).toHaveLength(2)
    for (const markup of [result.svg, initialReact]) {
      expect(markup).toContain(props.title)
      expect(markup).toContain(props.description)
    }
    const duplicate = solved.edges.find(
      (edge) => edge.edgeId === "account-audit"
    )!
    const original = solved.edges.find((edge) => edge.edgeId === "account")!
    expect(duplicate.source.semantic).toEqual(original.source.semantic)
    expect(duplicate.target.semantic).toEqual(original.target.semantic)
    expect(duplicate.source.semantic.endpoint).toEqual({
      kind: "part",
      partId: "account",
      portId: "out"
    })
  })
})

it("compares meaningfully different representations of the same semantic graph", () => {
  const get = (variant: string) =>
    cases.find((fixture) => fixture.variant === variant)!.solved
  expect(get("fixed").metrics.crossings).toBeGreaterThan(0)
  expect(get("optimized").metrics.crossings).toBeLessThan(
    get("fixed").metrics.crossings
  )
  expect(get("wires").edges).toEqual(get("fixed").edges)
  expect(
    get("summary").edges.every(
      (edge) => edge.source.exposureId && edge.target.exposureId
    )
  ).toBe(true)
  expect(
    get("exploded").nodes.filter(
      (node) => node.semantic.endpoint.kind === "part"
    )
  ).toHaveLength(6)
  expect(
    get("smooth").edges.some((edge) =>
      edge.sections.some((section) => compositionalPath(section).includes("C"))
    )
  ).toBe(true)
})
