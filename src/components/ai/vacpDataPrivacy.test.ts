import { describe, expect, it } from "vitest"
import { createSemioticVACPBridge, SEMIOTIC_VACP_INSPECT_DATA_ACTION } from "./vacpAdapter"
import type { SemioticVACPDataAccess } from "./vacpAdapterTypes"
import { VACP_DATA_SCHEMA_ACTION } from "./vacpTypes"

function bridge(dataAccess?: SemioticVACPDataAccess) {
  return createSemioticVACPBridge({
    appId: "private-data",
    charts: [
      {
        chartId: "people",
        component: "BarChart",
        props: {
          data: Array.from({ length: 10 }, (_, index) => ({
            category: index < 5 ? "A" : "B",
            email: `person-${index}@example.com`,
            userId: index < 5 ? "account-one" : "account-two",
            value: index + 1
          })),
          categoryAccessor: "category",
          valueAccessor: "value"
        }
      }
    ],
    dataAccess
  })
}

describe("VACP data schema permissions", () => {
  it.each(["false", 1, {}])(
    "requires an explicit boolean opt-in for raw inspection, not %j",
    async (sample) => {
      const instance = bridge({ sample } as unknown as SemioticVACPDataAccess)
      expect(instance.getCapabilities().graph.actions.some(
        ({ name }) => name === SEMIOTIC_VACP_INSPECT_DATA_ACTION
      )).toBe(false)
      const inspected = await instance.execute({
        callId: "inspect",
        name: SEMIOTIC_VACP_INSPECT_DATA_ACTION,
        params: { handleRef: instance.refs.data("people") }
      })
      expect(inspected.ok).toBe(false)
      expect(JSON.stringify(inspected)).not.toContain("person-0@example.com")
    }
  )

  it.each([undefined, {}, { sample: false }, { maxSchemaRows: 10 }])(
    "keeps value-bearing schemas opt-in with %j",
    async (dataAccess) => {
      const instance = bridge(dataAccess)
      const descriptor = instance
        .getCapabilities()
        .graph.actions.find(({ name }) => name === VACP_DATA_SCHEMA_ACTION)
      expect(descriptor?.parameters).toMatchObject({
        properties: { detail: { enum: ["columns"] } }
      })
      const full = await instance.execute({
        callId: "full",
        name: VACP_DATA_SCHEMA_ACTION,
        params: { handleRef: instance.refs.data("people"), detail: "full" }
      })
      expect(full.ok).toBe(false)
      expect(JSON.stringify(full)).not.toContain("person-0@example.com")
      const columns = await instance.execute({
        callId: "columns",
        name: VACP_DATA_SCHEMA_ACTION,
        params: { handleRef: instance.refs.data("people") }
      })
      expect(columns).toMatchObject({
        ok: true,
        result: { detail: "columns", rowCount: 10, columns: expect.any(Array) }
      })
      expect(JSON.stringify(columns)).not.toContain("person-0@example.com")
    }
  )

  it.each([{ summaries: true }, { sample: true }])(
    "permits summaries with %j while suppressing identifiers and unique values",
    async (dataAccess) => {
      const instance = bridge(dataAccess)
      const full = await instance.execute({
        callId: "full",
        name: VACP_DATA_SCHEMA_ACTION,
        params: { handleRef: instance.refs.data("people"), detail: "full" }
      })
      expect(full).toMatchObject({
        ok: true,
        result: {
          detail: "full",
          numeric: { value: { min: 1, max: 10, avg: 5.5 } },
          categoricalTopValues: {
            category: [
              { value: "A", n: 5 },
              { value: "B", n: 5 }
            ]
          }
        }
      })
      if (!full.ok) throw new Error("Expected permitted schema summaries")
      expect(full.result).toHaveProperty("categoricalTopValues.category")
      expect(full.result).not.toHaveProperty("categoricalTopValues.email")
      expect(full.result).not.toHaveProperty("categoricalTopValues.userId")
    }
  )
})
