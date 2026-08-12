import { describe, expect, it } from "vitest"
import {
  MAX_RETAINED_CATEGORY_ASSIGNMENTS,
  resolveBoundedCategoryIndex
} from "../shared/boundedCategoryRegistry"

describe("realtime category registry", () => {
  it("keeps discovery order below the cap and hashes without retaining above it", () => {
    const registry = new Map<string, number>()
    for (let index = 0; index < MAX_RETAINED_CATEGORY_ASSIGNMENTS; index++) {
      expect(resolveBoundedCategoryIndex(registry, `category-${index}`)).toBe(
        index
      )
    }
    expect(registry.size).toBe(MAX_RETAINED_CATEGORY_ASSIGNMENTS)

    const overflowCategory = "category-beyond-the-retained-limit"
    const overflowIndex = resolveBoundedCategoryIndex(
      registry,
      overflowCategory
    )
    for (let index = 0; index < 1000; index++) {
      resolveBoundedCategoryIndex(registry, `overflow-${index}`)
    }

    expect(registry.size).toBe(MAX_RETAINED_CATEGORY_ASSIGNMENTS)
    expect(resolveBoundedCategoryIndex(registry, overflowCategory)).toBe(
      overflowIndex
    )
  })
})
