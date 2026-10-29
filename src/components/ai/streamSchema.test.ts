import { describe, it, expect } from "vitest"
import type { StreamSchema } from "./streamingTypes"
import {
  hasCategoryField,
  isDeltaLikeFieldName,
  isIdLikeFieldName,
  isSingleValueStream,
  normalizeStreamSchema,
  pickCategoryField,
  pickSeriesField,
  pickSplitField,
  pickTimeField,
  pickValueField,
  resolveStreamShape,
  streamBufferProps,
  streamKeyFields,
  streamMeasureAdditivity,
  streamThroughputBand
} from "./streamSchema"

describe("streamSchema helpers", () => {
  it("does not mistake a numeric timestamp or another encoding for the measure", () => {
    expect(
      pickValueField({
        fields: [
          { name: "timestamp", kind: "numeric", role: "x" },
          { name: "region", kind: "numeric", role: "category" },
          { name: "latency", kind: "numeric" }
        ]
      })?.name
    ).toBe("latency")
  })

  it("rejects incompatible kinds even when they carry axis/value roles", () => {
    const schema: StreamSchema = {
      fields: [
        { name: "region", kind: "categorical", role: "x" },
        { name: "label", kind: "categorical", role: "value" },
        { name: "flag", kind: "boolean", role: "y" }
      ]
    }
    expect(pickTimeField(schema)).toBeUndefined()
    expect(pickValueField(schema)).toBeUndefined()
  })
  it("treats explicit shape as authoritative", () => {
    const schema: StreamSchema = {
      fields: [{ name: "brand", kind: "categorical", role: "key" }],
      shape: "append"
    }
    expect(resolveStreamShape(schema)).toBe("append")
  })

  it("infers keyed from role:key or keyFields", () => {
    expect(
      resolveStreamShape({
        fields: [{ name: "brand", kind: "categorical", role: "key" }]
      })
    ).toBe("keyed")
    expect(
      resolveStreamShape({
        fields: [{ name: "brand", kind: "categorical" }],
        keyFields: ["brand"]
      })
    ).toBe("keyed")
    expect(
      streamKeyFields({
        fields: [{ name: "id", kind: "numeric", role: "key" }],
        keyFields: ["brand"]
      }).sort()
    ).toEqual(["brand", "id"])
  })

  it("defaults to append when there is no identity", () => {
    expect(
      resolveStreamShape({
        fields: [
          { name: "ts", kind: "date" },
          { name: "latency_ms", kind: "numeric" }
        ]
      })
    ).toBe("append")
  })

  it("bands numeric throughput with default 1 / 100 thresholds", () => {
    const fields = [{ name: "v", kind: "numeric" as const }]
    expect(streamThroughputBand({ fields, throughput: 0.5 })).toBe("low")
    expect(streamThroughputBand({ fields, throughput: 1 })).toBe("medium")
    expect(streamThroughputBand({ fields, throughput: 250 })).toBe("high")
    expect(streamThroughputBand({ fields, throughput: "high" })).toBe("high")
    expect(streamThroughputBand({ fields, throughput: 50 }, { high: 40 })).toBe(
      "high"
    )
  })

  it("prefers value roles and skips id-like names", () => {
    expect(isIdLikeFieldName("order_id")).toBe(true)
    expect(isIdLikeFieldName("orderId")).toBe(true)
    expect(isIdLikeFieldName("latency_ms")).toBe(false)

    const firehose: StreamSchema = {
      fields: [
        { name: "order_id", kind: "numeric" },
        { name: "latency_ms", kind: "numeric", role: "value" }
      ]
    }
    expect(pickValueField(firehose)?.name).toBe("latency_ms")

    const noRoles: StreamSchema = {
      fields: [
        { name: "order_id", kind: "numeric" },
        { name: "latency_ms", kind: "numeric" }
      ]
    }
    expect(pickValueField(noRoles)?.name).toBe("latency_ms")
  })

  it("does not plot a key as a category", () => {
    const schema: StreamSchema = {
      fields: [
        { name: "brand_id", kind: "numeric", role: "key" },
        { name: "brand", kind: "categorical", role: "category" },
        { name: "revenue", kind: "numeric", role: "value" }
      ],
      shape: "keyed"
    }
    expect(pickCategoryField(schema)?.name).toBe("brand")
    expect(hasCategoryField(schema)).toBe(true)
    expect(pickValueField(schema)?.name).toBe("revenue")
    expect(pickTimeField(schema)).toBeUndefined()
  })
})

describe("stream field selection", () => {
  it("uses a categorical key as the category of a keyed table", () => {
    const schema: StreamSchema = {
      fields: [
        { name: "brand", kind: "categorical" },
        { name: "revenue", kind: "numeric" }
      ],
      shape: "keyed",
      keyFields: ["brand"]
    }
    expect(pickCategoryField(schema)?.name).toBe("brand")
    expect(pickValueField(schema)?.name).toBe("revenue")
  })

  it("does not promote id-like or time keys to categories", () => {
    const schema: StreamSchema = {
      fields: [
        { name: "window_start", kind: "date", role: "x" },
        { name: "order_id", kind: "categorical", role: "key" },
        { name: "price", kind: "numeric" }
      ],
      keyFields: ["window_start"]
    }
    expect(pickCategoryField(schema)).toBeUndefined()
  })

  it("splits time charts by the series role, else the primary category", () => {
    const fields = [
      { name: "ts", kind: "date" as const },
      { name: "v", kind: "numeric" as const },
      { name: "a", kind: "categorical" as const },
      { name: "b", kind: "categorical" as const }
    ]
    expect(pickSplitField({ fields })?.name).toBe("a")
    expect(pickSeriesField({ fields })?.name).toBe("b")
    expect(
      pickSplitField({ fields: [...fields.slice(0, 3), { ...fields[3], role: "series" }] })?.name
    ).toBe("b")
  })

  it("reads additivity from the hint, then from count and delta names", () => {
    expect(streamMeasureAdditivity({ name: "price", kind: "numeric" })).toBeUndefined()
    expect(streamMeasureAdditivity({ name: "cnt", kind: "numeric" })).toBe(true)
    expect(streamMeasureAdditivity({ name: "netFlow", kind: "numeric" })).toBe(true)
    expect(streamMeasureAdditivity({ name: "cnt", kind: "numeric", additive: false })).toBe(false)
    expect(isDeltaLikeFieldName("price_delta")).toBe(true)
    expect(isDeltaLikeFieldName("cnt")).toBe(false)
  })

  it("treats only measure-without-time-or-category streams as single values", () => {
    expect(isSingleValueStream({ fields: [{ name: "total", kind: "numeric" }] })).toBe(true)
    expect(
      isSingleValueStream({
        fields: [{ name: "total", kind: "numeric" }, { name: "id", kind: "numeric", role: "key" }]
      })
    ).toBe(false)
  })

  it("sizes the retention buffer for 30 seconds at the event rate", () => {
    const fields = [{ name: "v", kind: "numeric" as const }]
    expect(streamBufferProps({ fields, throughput: 260 }, 5000)).toEqual({ windowSize: 5000 })
    expect(streamBufferProps({ fields, throughput: 50 }, 5000)).toEqual({ windowSize: 1500 })
    expect(streamBufferProps({ fields, throughput: 2 }, 5000)).toEqual({})
    expect(streamBufferProps({ fields, retention: "cumulative" }, 5000)).toEqual({ windowMode: "growing" })
  })

  it("keeps unknown keys for custom capabilities while warning about them", () => {
    const { schema, warnings } = normalizeStreamSchema({
      fields: [{ name: "v", kind: "numeric" }],
      myHint: 3
    } as StreamSchema)
    expect((schema as unknown as Record<string, unknown>).myHint).toBe(3)
    expect(warnings).toEqual(['unknown schema key "myHint" was ignored'])
  })
})
