import { describe, expect, it } from "vitest"
import type { ChartAccessor } from "./types"

interface TypedRow {
  timestamp: number
  amount: number
}

const typedAccessor: ChartAccessor<TypedRow, number> = (datum) => datum.amount

// @ts-expect-error — concrete datum generics must reject misspelled fields.
const misspelledAccessor: ChartAccessor<TypedRow, number> = (datum) => datum.amout

describe("ChartAccessor type contract", () => {
  it("keeps a typed callback callable through the public accessor type", () => {
    expect(typedAccessor({ timestamp: 1, amount: 42 })).toBe(42)
    expect(misspelledAccessor).toBeTypeOf("function")
  })
})
