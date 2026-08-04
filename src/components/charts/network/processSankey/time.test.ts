import { describe, expect, it } from "vitest"
import { toProcessSankeyTime } from "./time"

describe("toProcessSankeyTime", () => {
  it("passes through finite numbers", () => {
    expect(toProcessSankeyTime(0)).toBe(0)
    expect(toProcessSankeyTime(1861.5)).toBe(1861.5)
  })

  it("converts Date to epoch ms", () => {
    const d = new Date("1970-01-01T00:00:00.000Z")
    expect(toProcessSankeyTime(d)).toBe(0)
  })

  it("parses ISO strings", () => {
    expect(toProcessSankeyTime("1970-01-01T00:00:00.000Z")).toBe(0)
  })

  it("returns NaN for nullish values", () => {
    expect(Number.isNaN(toProcessSankeyTime(null))).toBe(true)
    expect(Number.isNaN(toProcessSankeyTime(undefined))).toBe(true)
  })
})
