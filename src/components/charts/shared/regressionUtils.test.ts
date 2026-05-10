import { describe, it, expect } from "vitest"
import { buildRegressionAnnotation } from "./regressionUtils"

describe("buildRegressionAnnotation", () => {
  it("returns undefined for falsy props", () => {
    expect(buildRegressionAnnotation(undefined)).toBeUndefined()
    expect(buildRegressionAnnotation(false)).toBeUndefined()
  })

  it("turns `true` into a default linear trend annotation", () => {
    const ann = buildRegressionAnnotation(true)
    expect(ann).toEqual({ type: "trend", method: "linear" })
  })

  it("turns a method-string into a trend annotation with that method", () => {
    expect(buildRegressionAnnotation("loess")).toEqual({ type: "trend", method: "loess" })
    expect(buildRegressionAnnotation("polynomial")).toEqual({ type: "trend", method: "polynomial" })
    expect(buildRegressionAnnotation("linear")).toEqual({ type: "trend", method: "linear" })
  })

  it("forwards full config (method + styling) through", () => {
    const ann = buildRegressionAnnotation({
      method: "loess",
      bandwidth: 0.5,
      color: "#ff0000",
      strokeWidth: 3,
      strokeDasharray: "4,4",
      label: "Trend",
    })
    expect(ann).toEqual({
      type: "trend",
      method: "loess",
      bandwidth: 0.5,
      color: "#ff0000",
      strokeWidth: 3,
      strokeDasharray: "4,4",
      label: "Trend",
    })
  })

  it("defaults method to linear when only styling is supplied", () => {
    const ann = buildRegressionAnnotation({ color: "#000", label: "L" })
    expect(ann).toEqual({ type: "trend", method: "linear", color: "#000", label: "L" })
  })

  it("forwards order for polynomial", () => {
    const ann = buildRegressionAnnotation({ method: "polynomial", order: 3 })
    expect(ann).toEqual({ type: "trend", method: "polynomial", order: 3 })
  })

  it("omits unset config keys (no nullish leakage)", () => {
    const ann = buildRegressionAnnotation({ method: "linear" })
    expect(ann).toEqual({ type: "trend", method: "linear" })
    expect(Object.keys(ann!)).toEqual(["type", "method"])
  })
})
