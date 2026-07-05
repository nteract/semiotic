import { describe, expect, it } from "vitest"
import type { GlyphSceneNode, PointSceneNode } from "../stream/types"
import { isotypeBusGlyph, isotypePersonGlyph, isotypeServerGlyph } from "./isotypeGlyphs"
import { generateTokens } from "./tokenEncoding"
import { tokenLayer } from "./tokenLayer"

describe("tokenLayer", () => {
  it("turns unitized glyph tokens into positioned glyph scene nodes", () => {
    const layer = tokenLayer({
      input: 3.6,
      encoding: {
        tokenType: "glyph",
        token: "server",
        tokenSemantics: "unitized-measure",
        countStrategy: "unitized",
        unitValue: 1,
        unitMeaning: "one server sign = one facility",
        layout: "row",
      },
      options: {
        x: 10,
        y: 20,
        tokenSize: 40,
        anchor: [0.5, 1],
        color: "#334155",
        accent: "#ffffff",
        ghostColor: "#cbd5e1",
        idPrefix: "server",
      },
    })

    expect(layer.positionedTokens.map((token) => [token.x, token.y])).toEqual([
      [30, 60],
      [72, 60],
      [114, 60],
      [156, 60],
    ])
    expect(layer.nodes).toHaveLength(4)
    const last = layer.nodes[3] as GlyphSceneNode
    expect(last).toMatchObject({
      type: "glyph",
      glyph: isotypeServerGlyph,
      ghostColor: "#cbd5e1",
      pointId: "server-3",
    })
    expect(last.fraction).toBeCloseTo(0.6)
  })

  it("renders fixed-denominator person icon arrays as highlighted glyph cases", () => {
    const layer = tokenLayer({
      input: { numerator: 2, denominator: 4 },
      encoding: {
        tokenType: "icon",
        icon: "person",
        tokenSemantics: "risk-case",
        countStrategy: "fixed-denominator",
        layout: "waffle",
        labelPolicy: "text-plus-icon",
      },
      options: {
        columns: 2,
        tokenSize: 18,
        color: "#b91c1c",
        inactiveColor: "#d1d5db",
      },
    })

    expect(layer.nodes.map((node) => node.type)).toEqual(["glyph", "glyph", "glyph", "glyph"])
    const colors = layer.nodes.map((node) => (node as GlyphSceneNode).color)
    expect(colors).toEqual(["#b91c1c", "#b91c1c", "#d1d5db", "#d1d5db"])
    expect((layer.nodes[0] as GlyphSceneNode).glyph).toBe(isotypePersonGlyph)
  })

  it("lays out quantile outcome tokens along a value strip", () => {
    const layer = tokenLayer({
      input: [0, 10, 20, 30],
      encoding: {
        tokenType: "dot",
        tokenSemantics: "possible-outcome",
        countStrategy: "quantile",
        tokenCount: 4,
        layout: "quantile-strip",
      },
      options: {
        y: 5,
        rows: 2,
        tokenSize: 10,
        valueToX: (value) => value * 2,
        color: "#2563eb",
      },
    })

    expect(layer.nodes.map((node) => (node as PointSceneNode).x)).toEqual([
      7.5,
      22.5,
      37.5,
      52.5,
    ])
    expect(layer.positionedTokens.map((token) => token.row)).toEqual([0, 1, 0, 1])
    expect(layer.nodes.map((node) => (node as PointSceneNode).y)).toEqual([5, 17, 5, 17])
  })

  it("stacks dotplot tokens into binned columns", () => {
    const layer = tokenLayer({
      input: [0, 1, 2, 3, 4, 5],
      encoding: {
        tokenType: "dot",
        tokenSemantics: "possible-outcome",
        countStrategy: "quantile",
        tokenCount: 6,
        layout: "dotplot",
      },
      options: {
        y: 10,
        cellWidth: 10,
        cellHeight: 8,
        valueToX: () => 24,
      },
    })

    expect(layer.positionedTokens.map((token) => [token.column, token.row])).toEqual([
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
      [2, 4],
      [2, 5],
    ])
    expect(layer.nodes.map((node) => (node as PointSceneNode).y)).toEqual([
      10,
      18,
      26,
      34,
      42,
      50,
    ])
  })

  it("places bar-segment tokens from start/end values when valueToX is supplied", () => {
    const layer = tokenLayer({
      input: 4,
      encoding: {
        tokenType: "icon",
        icon: "server",
        tokenSemantics: "unitized-measure",
        countStrategy: "unitized",
        unitValue: 2,
        layout: "bar-segment",
      },
      options: {
        y: 20,
        tokenSize: 10,
        valueToX: (value) => value * 5,
      },
    })

    expect(layer.positionedTokens.map((token) => token.x)).toEqual([5, 15])
    expect(layer.positionedTokens.map((token) => token.y)).toEqual([25, 25])
  })

  it("requires valueToX for bar-segment placement", () => {
    expect(() =>
      tokenLayer({
        input: 4,
        encoding: {
          tokenType: "icon",
          icon: "server",
          tokenSemantics: "unitized-measure",
          countStrategy: "unitized",
          unitValue: 2,
          layout: "bar-segment",
        },
      })
    ).toThrow(/requires valueToX/)
  })

  it("renders projected range tokens only when includeRange is enabled", () => {
    const layer = tokenLayer({
      input: { value: 1.5, rangeValue: 3 },
      encoding: {
        tokenType: "glyph",
        icon: "server",
        tokenSemantics: "unitized-measure",
        countStrategy: "unitized",
        unitValue: 1,
        unitMeaning: "one sign = one unit",
        layout: "row",
      },
      options: {
        includeRange: true,
        idPrefix: "scenario",
        tokenSize: 20,
        rangeColor: "#64748b",
      },
    })

    expect(layer.positionedTokens).toHaveLength(4)
    const rangeNode = layer.nodes[2] as GlyphSceneNode
    expect(rangeNode).toMatchObject({
      color: "#64748b",
      pointId: "scenario-range-1",
      fractionStart: 0.5,
    })
  })

  it("defaults fixed-denominator waffle arrays to ten columns", () => {
    const layer = tokenLayer({
      input: { numerator: 18, denominator: 100 },
      encoding: {
        tokenType: "icon",
        icon: "person",
        tokenSemantics: "risk-case",
        countStrategy: "fixed-denominator",
        layout: "waffle",
      },
      options: {
        tokenSize: 10,
        gutter: 0,
      },
    })

    expect(layer.positionedTokens[9]).toMatchObject({ row: 0, column: 9 })
    expect(layer.positionedTokens[10]).toMatchObject({ row: 1, column: 0 })
  })

  it("falls back to themed colors and resolves missing function values to fallback", () => {
    const layer = tokenLayer({
      input: { numerator: 1, denominator: 2 },
      encoding: {
        tokenType: "dot",
        tokenSemantics: "risk-case",
        countStrategy: "fixed-denominator",
      },
      options: {
        color: () => undefined,
        inactiveColor: () => undefined,
      },
    })

    expect((layer.nodes[0] as PointSceneNode).style.fill).toBe(
      "var(--semiotic-primary, #4e79a7)"
    )
    expect((layer.nodes[1] as PointSceneNode).style.fill).toBe(
      "var(--semiotic-border, #d1d5db)"
    )
  })

  it("uses valid icon names as symbol shapes when no builtin glyph exists", () => {
    const layer = tokenLayer({
      input: 1,
      encoding: {
        tokenType: "icon",
        icon: "triangle",
        tokenSemantics: "observed-unit",
        countStrategy: "actual",
      },
    })

    expect(layer.nodes[0]).toMatchObject({
      type: "symbol",
      symbolType: "triangle",
    })
  })

  it("uses the built-in bus glyph for bus icon tokens", () => {
    const layer = tokenLayer({
      input: 1,
      encoding: {
        tokenType: "glyph",
        icon: "bus",
        tokenSemantics: "observed-unit",
        countStrategy: "actual",
      },
    })

    expect(layer.nodes[0]).toMatchObject({
      type: "glyph",
      glyph: isotypeBusGlyph,
    })
  })

  it("accepts an existing TokenSet plus custom placement for scale-driven stacks", () => {
    const tokenSet = generateTokens(
      { data: [{ id: "a" }, { id: "b" }, { id: "c" }] },
      {
        tokenType: "glyph",
        token: "person",
        tokenSemantics: "observed-unit",
        countStrategy: "actual",
      },
    )

    const layer = tokenLayer({
      input: tokenSet,
      options: {
        tokenSize: 16,
        include: (token) => token.index !== 1,
        positionToken: (token) => ({
          x: 100,
          y: 200 - token.index * 20,
          row: token.index,
          column: 0,
        }),
        pointId: (token) => `person-${token.index}`,
      },
    })

    expect(layer.nodes).toHaveLength(2)
    expect(layer.positionedTokens.map((token) => [token.x, token.y])).toEqual([
      [100, 200],
      [100, 160],
    ])
    expect((layer.nodes[1] as GlyphSceneNode).pointId).toBe("person-2")
  })

  it("requires an encoding unless the input is already a TokenSet", () => {
    expect(() => tokenLayer({ input: 10 })).toThrow(/requires an encoding/)
  })

  it("does not silently degrade unsupported declared layouts", () => {
    expect(() =>
      tokenLayer({
        input: 3,
        encoding: {
          tokenType: "dot",
          tokenSemantics: "observed-unit",
          countStrategy: "actual",
          layout: "beeswarm",
        },
      })
    ).toThrow(/not implemented/)
  })
})
