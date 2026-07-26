import { describe, expect, it } from "vitest"
import type { Selection } from "../store/SelectionStore"
import {
  deserializeSelections,
  serializeSelections,
} from "./selectionSerializer"

describe("selection serialization", () => {
  it("round-trips reserved-looking selection and field names as own keys", () => {
    const fields = Object.create(null)
    fields.__proto__ = {
      type: "point" as const,
      values: new Set(["West"]),
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
            fields,
          },
        ],
      ]),
    }

    const serialized = serializeSelections(
      new Map([["__proto__", selection]])
    )
    expect(
      Object.prototype.hasOwnProperty.call(serialized, "__proto__")
    ).toBe(true)
    expect(serialized.__proto__.clauses[0].fields.__proto__).toEqual({
      type: "point",
      values: ["West"],
    })

    const restored = deserializeSelections(serialized).get("__proto__")
    expect(restored?.clauses.get("agent")?.fields.__proto__).toMatchObject({
      type: "point",
    })
    const restoredField = restored?.clauses.get("agent")?.fields.__proto__
    expect(
      restoredField?.type === "point"
        ? Array.from(restoredField.values)
        : undefined
    ).toEqual(["West"])
  })
})
