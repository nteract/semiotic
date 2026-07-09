import { describe, expect, it } from "vitest"
import type { Datum } from "../charts/shared/datumTypes"
import { partitionById, toIdSet, updateById } from "./pipelineIdentityOps"

describe("pipelineIdentityOps", () => {
  const getId = (d: Datum) => String(d.id)

  it("toIdSet accepts single or array ids", () => {
    expect([...toIdSet("a")]).toEqual(["a"])
    expect(toIdSet(["a", "b"]).has("b")).toBe(true)
  })

  it("partitionById preserves order and reports removed", () => {
    const data: Datum[] = [{ id: "a" }, { id: "b" }, { id: "c" }]
    const { kept, removed } = partitionById(data, toIdSet(["b"]), getId)
    expect(kept).toEqual([{ id: "a" }, { id: "c" }])
    expect(removed).toEqual([{ id: "b" }])
  })

  it("updateById applies updater only to matching rows", () => {
    const data: Datum[] = [
      { id: "a", v: 1 },
      { id: "b", v: 2 }
    ]
    const { next, updated } = updateById(data, toIdSet("b"), getId, (d) => ({
      ...d,
      v: 99
    }))
    expect(next).toEqual([
      { id: "a", v: 1 },
      { id: "b", v: 99 }
    ])
    expect(updated).toEqual([{ id: "b", v: 99 }])
  })
})
