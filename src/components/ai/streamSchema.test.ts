import { describe, it, expect } from "vitest"
import type { StreamSchema } from "./streamingTypes"
import {
  hasCategoryField,
  isIdLikeFieldName,
  pickCategoryField,
  pickTimeField,
  pickValueField,
  resolveStreamShape,
  streamKeyFields,
  streamThroughputBand,
} from "./streamSchema"

describe("streamSchema helpers", () => {
  it("treats explicit shape as authoritative", () => {
    const schema: StreamSchema = {
      fields: [{ name: "brand", kind: "categorical", role: "key" }],
      shape: "append",
    }
    expect(resolveStreamShape(schema)).toBe("append")
  })

  it("infers keyed from role:key or keyFields", () => {
    expect(
      resolveStreamShape({
        fields: [{ name: "brand", kind: "categorical", role: "key" }],
      }),
    ).toBe("keyed")
    expect(
      resolveStreamShape({
        fields: [{ name: "brand", kind: "categorical" }],
        keyFields: ["brand"],
      }),
    ).toBe("keyed")
    expect(
      streamKeyFields({
        fields: [{ name: "id", kind: "numeric", role: "key" }],
        keyFields: ["brand"],
      }).sort(),
    ).toEqual(["brand", "id"])
  })

  it("defaults to append when there is no identity", () => {
    expect(
      resolveStreamShape({
        fields: [
          { name: "ts", kind: "date" },
          { name: "latency_ms", kind: "numeric" },
        ],
      }),
    ).toBe("append")
  })

  it("bands numeric throughput with default 1 / 100 thresholds", () => {
    const fields = [{ name: "v", kind: "numeric" as const }]
    expect(streamThroughputBand({ fields, throughput: 0.5 })).toBe("low")
    expect(streamThroughputBand({ fields, throughput: 1 })).toBe("medium")
    expect(streamThroughputBand({ fields, throughput: 250 })).toBe("high")
    expect(streamThroughputBand({ fields, throughput: "high" })).toBe("high")
    expect(streamThroughputBand({ fields, throughput: 50, }, { high: 40 })).toBe("high")
  })

  it("prefers value roles and skips id-like names", () => {
    expect(isIdLikeFieldName("order_id")).toBe(true)
    expect(isIdLikeFieldName("orderId")).toBe(true)
    expect(isIdLikeFieldName("latency_ms")).toBe(false)

    const firehose: StreamSchema = {
      fields: [
        { name: "order_id", kind: "numeric" },
        { name: "latency_ms", kind: "numeric", role: "value" },
      ],
    }
    expect(pickValueField(firehose)?.name).toBe("latency_ms")

    const noRoles: StreamSchema = {
      fields: [
        { name: "order_id", kind: "numeric" },
        { name: "latency_ms", kind: "numeric" },
      ],
    }
    expect(pickValueField(noRoles)?.name).toBe("latency_ms")
  })

  it("does not plot a key as a category", () => {
    const schema: StreamSchema = {
      fields: [
        { name: "brand_id", kind: "numeric", role: "key" },
        { name: "brand", kind: "categorical", role: "category" },
        { name: "revenue", kind: "numeric", role: "value" },
      ],
      shape: "keyed",
    }
    expect(pickCategoryField(schema)?.name).toBe("brand")
    expect(hasCategoryField(schema)).toBe(true)
    expect(pickValueField(schema)?.name).toBe("revenue")
    expect(pickTimeField(schema)).toBeUndefined()
  })
})
