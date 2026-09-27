import { describe, expect, it } from "vitest"
import {
  buildEnrichAnnotationData,
  resolveAnnotationAccessor
} from "./annotationAccessorResolver"
import type { Datum } from "../charts/shared/datumTypes"

describe("ordinal annotation accessor enrichment", () => {
  it("keeps raw rows unchanged and reuses already enriched annotation data", () => {
    const seen: Datum[] = []
    const data = [{ region: "A", amount: 20 }]
    const x = resolveAnnotationAccessor(
      (d: Datum) => {
        seen.push(d)
        return d.amount
      },
      undefined,
      "resolvedValue",
      ""
    )
    const y = resolveAnnotationAccessor(
      (d: Datum) => {
        seen.push(d)
        return d.region
      },
      undefined,
      "resolvedCategory",
      ""
    )
    const enrich = buildEnrichAnnotationData(x, y, true)
    const enriched = enrich(data)!
    expect(enriched[0][x.key!]).toBe(20)
    expect(enriched[0][y.key!]).toBe("A")
    expect(seen).toEqual([data[0], data[0]])
    expect(data).toEqual([{ region: "A", amount: 20 }])
    expect(enrich(enriched)).toBe(enriched)
    expect(seen).toHaveLength(2)
  })

  it("does not evaluate callbacks when annotations are absent", () => {
    const data = [{ region: "A", amount: 20 }]
    const fail = () => {
      throw new Error("Unexpected annotation evaluation")
    }
    const x = resolveAnnotationAccessor(fail, undefined, "resolvedValue", "")
    const y = resolveAnnotationAccessor(fail, undefined, "resolvedCategory", "")
    expect(buildEnrichAnnotationData(x, y, false)(data)).toBe(data)
  })
})
