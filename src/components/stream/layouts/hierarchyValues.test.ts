import { describe, expect, it } from "vitest"
import { NetworkPipelineStore } from "../NetworkPipelineStore"
import type { Datum } from "../../charts/shared/datumTypes"
import "./hierarchyLayoutPlugin"

describe("hierarchy measure resolution", () => {
  it.each(["amount", (d: Datum) => d.amount])(
    "sums only finite nonnegative own contributions with %s",
    (hierarchySum) => {
      const data = {
        name: "root",
        amount: 2,
        children: [
          {
            name: "branch",
            children: [
              { name: "four", amount: "4" },
              { name: "zero", amount: 0 },
              { name: "missing" },
              { name: "negative", amount: -2 },
              { name: "infinite", amount: Infinity },
              { name: "nan", amount: NaN },
              { name: "invalid", amount: "no" },
              { name: "null", amount: null },
              { name: "boolean", amount: true },
              { name: "object", amount: { valueOf: () => 9 } }
            ]
          }
        ]
      }
      const store = new NetworkPipelineStore({
        chartType: "treemap",
        hierarchySum,
        padding: 0
      })
      store.ingestHierarchy(data, [400, 300])
      const values = Object.fromEntries(
        store.getLayoutData().nodes.map((node) => [node.id, node.value])
      )
      expect(values).toEqual({
        root: 6,
        branch: 4,
        four: 4,
        zero: 0,
        missing: 0,
        negative: 0,
        infinite: 0,
        nan: 0,
        invalid: 0,
        null: 0,
        boolean: 0,
        object: 0
      })
      const four = store
        .getLayoutData()
        .nodes.find((node) => node.id === "four")!
      // This branch is the sole child, so its nonzero leaf fills the rectangle.
      expect(four.width * four.height).toBeCloseTo(400 * 300)
    }
  )

  it.each(
    (["treemap", "partition", "circlepack"] as const).flatMap((chartType) =>
      [0, 4].map((padding) => ({ chartType, padding }))
    )
  )(
    "$chartType has finite zero/missing leaf geometry with padding $padding",
    ({ chartType, padding }) => {
      for (const value of [undefined, 0, 10]) {
        const store = new NetworkPipelineStore({ chartType, padding })
        store.ingestHierarchy(
          {
            name: "root",
            value,
            children: [{ name: "zero", value: 0 }, { name: "missing" }]
          },
          [400, 300]
        )
        expect(store.getLayoutData().nodes).toHaveLength(3)
        for (const node of store.getLayoutData().nodes) {
          expect(
            [node.x, node.y, node.width, node.height].every(Number.isFinite)
          ).toBe(true)
          if (chartType === "circlepack") expect(node.__radius).toBe(0)
          else if (node.value === 0) expect(node.width * node.height).toBe(0)
        }
      }
    }
  )
})
