// @vitest-environment node
import { describe, expect, it } from "vitest"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  CirclePack,
  OrbitDiagram,
  TreeDiagram,
  Treemap
} from "semiotic/network"
import { renderChartWithEvidence } from "semiotic/server"
import type { Datum } from "../charts/shared/datumTypes"

const components = { Treemap, CirclePack, TreeDiagram, OrbitDiagram }
const cases = [
  ["Treemap", "treemap"],
  ["CirclePack", "circlepack"],
  ["TreeDiagram", "tree"],
  ["TreeDiagram", "cluster"],
  ["TreeDiagram", "treemap"],
  ["TreeDiagram", "circlepack"],
  ["TreeDiagram", "partition"]
] as const

const data: Datum = {
  key: "root",
  color: "#555555",
  children: [
    {
      key: "A",
      color: "#666666",
      children: [
        { key: "Other", amount: 4, color: "#111111" },
        { key: "zero", amount: 0, color: "#222222" }
      ]
    },
    {
      key: "B",
      color: "#777777",
      children: [
        { key: "Other", amount: 2, color: "#333333" },
        { key: "Other__1", amount: 3, color: "#444444" }
      ]
    }
  ]
}

function geometry(svg: string) {
  return (svg.match(/<(?:rect|circle)\b[^>]*>/g) ?? [])
    .filter((tag) => /fill="#[1-7]{6}"/.test(tag))
    .map((tag) => {
      const number = (name: string) =>
        Number(tag.match(new RegExp(` ${name}="([^"]+)"`))?.[1] ?? 0)
      return {
        color: tag.match(/fill="([^"]+)"/)![1],
        x: number("x") || number("cx"),
        y: number("y") || number("cy"),
        width: number("width"),
        height: number("height"),
        r: number("r")
      }
    })
    .sort((a, b) => a.color.localeCompare(b.color))
}

describe("hierarchy values and public renderer parity (#1322)", () => {
  it.each([false, true])(
    "preserves Orbit root and depth colors (depth=%s)",
    (colorByDepth) => {
      const props = {
        data: { name: "root", children: [{ name: "a" }, { name: "b" }] },
        colorScheme: ["#123456"],
        colorByDepth,
        showLegend: false,
        showLabels: false,
        animated: false
      }
      for (const svg of [
        renderChartWithEvidence("OrbitDiagram", props).svg,
        renderToStaticMarkup(<OrbitDiagram {...props} />)
      ]) {
        expect(svg.match(/fill="#123456"/g)).toHaveLength(colorByDepth ? 1 : 3)
        if (colorByDepth) expect(svg.match(/fill="#b5d4ea"/g)).toHaveLength(2)
      }
    }
  )
  it.each([...cases, ["OrbitDiagram", "orbit"]] as const)(
    "%s %s preserves category fills with string and callback accessors",
    (component, layout) => {
      for (const [colorScheme, childColors] of [
        [
          { root: "#555555", a: "#135790", b: "#246801" },
          ["#135790", "#246801"]
        ],
        [
          ["#555555", "#135790", "#246801"],
          ["#135790", "#246801"]
        ],
        ["category10", ["#ff7f0e", "#2ca02c"]]
      ] satisfies [string | string[] | Record<string, string>, string[]][]) {
        for (const childrenAccessor of [
          undefined,
          "items",
          (d: Datum) => d.items
        ]) {
          for (const colorBy of ["group", (d: Datum) => d.group]) {
            const props = {
              layout,
              data: {
                name: "root",
                group: "root",
                [childrenAccessor === undefined ? "children" : "items"]: [
                  { name: "a", group: "a", value: 4 },
                  { name: "b", group: "b", value: 2 }
                ]
              },
              colorBy,
              childrenAccessor,
              colorScheme,
              showLabels: false,
              showLegend: false
            }
            for (const svg of [
              renderChartWithEvidence(component, props).svg,
              renderToStaticMarkup(
                component === "OrbitDiagram" ? (
                  <OrbitDiagram {...props} />
                ) : (
                  React.createElement(components[component], props)
                )
              )
            ]) {
              for (const color of childColors) {
                expect(
                  svg.match(new RegExp(`fill="${color}"`, "g"))
                ).toHaveLength(1)
              }
            }
          }
        }
      }
    }
  )
  it.each(cases)(
    "%s %s preserves zero, repeated labels, and exact proportions",
    (component, layout) => {
      const props = {
        data,
        layout,
        width: 420,
        height: 320,
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        showLabels: false,
        showLegend: false,
        colorByDepth: false,
        nodeIdAccessor: "key",
        valueAccessor: "amount",
        padding: 0,
        paddingTop: 0,
        frameProps: {
          padding: 0,
          nodeStyle: (d: Datum) => ({ fill: d.data.color })
        }
      }
      const rendered = renderChartWithEvidence(component, props)
      const hoc = renderToStaticMarkup(
        React.createElement(components[component], props)
      )
      const serverMarks = geometry(rendered.svg)
      const hocMarks = geometry(hoc)
      expect(hocMarks).toEqual(serverMarks)
      const isTree = layout === "tree" || layout === "cluster"
      expect(serverMarks).toHaveLength(isTree ? 7 : 6)
      expect(
        rendered.evidence.markCountByType[
          layout === "circlepack" || isTree ? "node:circle" : "node:rect"
        ]
      ).toBe(isTree ? 7 : 6)
      expect(rendered.svg).not.toMatch(/NaN|Infinity/)
      if (!isTree) {
        expect(
          serverMarks.find((mark) => mark.color === "#222222")
        ).toBeUndefined()
        const area = (color: string) => {
          const mark = serverMarks.find((item) => item.color === color)!
          return mark.r ? Math.PI * mark.r ** 2 : mark.width * mark.height
        }
        expect(area("#111111") / area("#333333")).toBeCloseTo(2, 8)
        expect(area("#444444") / area("#333333")).toBeCloseTo(1.5, 8)
        if (layout === "treemap") {
          expect(
            area("#111111") + area("#333333") + area("#444444")
          ).toBeCloseTo(400 * 300, 8)
        }
      }
    }
  )

  it.each([Treemap, CirclePack, TreeDiagram])(
    "shares string and callback value/ID/children accessors in %s",
    (Component) => {
      const props = {
        data,
        valueAccessor: "amount",
        nodeIdAccessor: "key",
        childrenAccessor: "children",
        showLabels: true,
        showLegend: false,
        colorByDepth: false,
        frameProps: { nodeStyle: (d: Datum) => ({ fill: d.data.color }) }
      }
      const strings = renderToStaticMarkup(<Component {...props} />)
      const callbacks = renderToStaticMarkup(
        <Component
          {...props}
          valueAccessor={(d: Datum) => d.amount}
          nodeIdAccessor={(d: Datum) => d.key}
          childrenAccessor={(d: Datum) => d.children}
        />
      )
      expect(geometry(callbacks)).toEqual(geometry(strings))
      expect(geometry(callbacks)).toHaveLength(
        Component === TreeDiagram ? 7 : 6
      )
      expect(callbacks).toContain("Other")
    }
  )
})
