import { describe, expect, it } from "vitest"
import {
  buildPredicate,
  type Selection,
  type SelectionClause
} from "../store/SelectionStore"
import {
  deserializeSelections,
  serializeSelections
} from "./selectionSerializer"

describe("selection serialization", () => {
  it.each([NaN, Infinity, undefined, BigInt(1), new Date(NaN), () => 1])(
    "rejects unsupported point values rather than changing their membership (%s)",
    (value) => {
      const selection: Selection = {
        name: "points",
        resolution: "union",
        clauses: new Map([
          [
            "writer",
            {
              clientId: "writer",
              type: "point",
              fields: {
                x: { type: "point", values: new Set([value]) }
              }
            }
          ]
        ])
      }
      expect(() =>
        serializeSelections(new Map([["points", selection]]))
      ).toThrow("unsupported JSON values")
    }
  )

  it("copies finite interval bounds and rejects non-finite ranges", () => {
    const range: [number, number] = [0, 10]
    const selection: Selection = {
      name: "range",
      resolution: "union",
      clauses: new Map([
        [
          "writer",
          {
            clientId: "writer",
            type: "interval",
            fields: { x: { type: "interval", range } }
          }
        ]
      ])
    }
    const serialized = serializeSelections(new Map([["range", selection]]))
    range[0] = 3
    expect(serialized.range.clauses[0].fields.x).toEqual({
      type: "interval",
      range: [0, 10]
    })
    range[1] = Infinity
    expect(() => serializeSelections(new Map([["range", selection]]))).toThrow(
      "unsupported JSON values"
    )
  })

  it("retains crossfilter intersection and missing-value exclusion after JSON round-trip", () => {
    const selection: Selection = {
      name: "dashboard",
      resolution: "crossfilter",
      clauses: new Map<string, SelectionClause>([
        [
          "range",
          {
            clientId: "range",
            type: "interval",
            fields: {
              value: { type: "interval", range: [-5, 5] }
            }
          }
        ],
        [
          "category",
          {
            clientId: "category",
            type: "point",
            fields: {
              category: { type: "point", values: new Set(["A"]) }
            }
          }
        ]
      ])
    }
    const restored = deserializeSelections(
      JSON.parse(
        JSON.stringify(
          serializeSelections(new Map([[selection.name, selection]]))
        )
      )
    ).get(selection.name)!
    const rows = [
      { value: 0, category: "A" },
      { value: 10, category: "A" },
      { value: 0, category: "B" },
      { value: null, category: "A" }
    ]
    expect(rows.filter(buildPredicate(restored, "observer"))).toEqual([rows[0]])
    expect(rows.filter(buildPredicate(restored, "range"))).toEqual([
      rows[0],
      rows[1],
      rows[3]
    ])
  })

  it("round-trips reserved-looking selection and field names as own keys", () => {
    const fields = Object.create(null)
    fields.__proto__ = {
      type: "point" as const,
      values: new Set(["West"])
    }
    const selection: Selection = {
      name: "__proto__",
      resolution: "union",
      clauses: new Map([
        [
          "agent",
          {
            clientId: "agent",
            type: "point",
            fields
          }
        ]
      ])
    }

    const serialized = serializeSelections(new Map([["__proto__", selection]]))
    expect(Object.prototype.hasOwnProperty.call(serialized, "__proto__")).toBe(
      true
    )
    expect(serialized.__proto__.clauses[0].fields.__proto__).toEqual({
      type: "point",
      values: ["West"]
    })

    const restored = deserializeSelections(serialized).get("__proto__")
    expect(restored?.clauses.get("agent")?.fields.__proto__).toMatchObject({
      type: "point"
    })
    const restoredField = restored?.clauses.get("agent")?.fields.__proto__
    expect(
      restoredField?.type === "point"
        ? Array.from(restoredField.values)
        : undefined
    ).toEqual(["West"])
  })
})
