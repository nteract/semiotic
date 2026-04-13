import { spreadDatum, buildHoverData } from "./hoverUtils"

describe("spreadDatum", () => {
  it("spreads plain object properties", () => {
    expect(spreadDatum({ x: 1, y: 2 })).toEqual({ x: 1, y: 2 })
  })

  it("returns empty object for arrays", () => {
    expect(spreadDatum([1, 2, 3])).toEqual({})
  })

  it("returns empty object for null", () => {
    expect(spreadDatum(null)).toEqual({})
  })

  it("returns empty object for undefined", () => {
    expect(spreadDatum(undefined)).toEqual({})
  })

  it("returns empty object for primitives", () => {
    expect(spreadDatum(42)).toEqual({})
    expect(spreadDatum("hello")).toEqual({})
    expect(spreadDatum(true)).toEqual({})
  })

  it("includes class instances (Date, etc.)", () => {
    const d = new Date()
    const result = spreadDatum(d)
    expect(typeof result).toBe("object")
  })
})

describe("buildHoverData", () => {
  it("builds HoverData with datum spread + coordinates", () => {
    const hover = buildHoverData({ category: "A", value: 10 }, 100, 200)
    expect(hover.data).toEqual({ category: "A", value: 10 })
    expect(hover.category).toBe("A")
    expect(hover.x).toBe(100)
    expect(hover.y).toBe(200)
    expect(hover.time).toBe(100)
    expect(hover.value).toBe(200)
  })

  it("applies extra properties", () => {
    const hover = buildHoverData({ id: "n1" }, 50, 60, { nodeOrEdge: "node" })
    expect(hover.nodeOrEdge).toBe("node")
    expect(hover.data.id).toBe("n1")
  })

  it("extra properties override datum fields", () => {
    const hover = buildHoverData({ value: 999 }, 10, 20, { value: 20 } as any)
    // extra.value (20) should override datum's value field
    expect(hover.value).toBe(20)
  })

  it("handles array datum without spreading", () => {
    const arr = [{ x: 1 }, { x: 2 }]
    const hover = buildHoverData(arr, 10, 20)
    expect(hover.data).toBe(arr)
    // Array properties should NOT be spread onto hover
    expect(hover[0]).toBeUndefined()
  })

  it("handles null datum", () => {
    const hover = buildHoverData(null, 0, 0)
    expect(hover.data).toBeNull()
    expect(hover.x).toBe(0)
  })
})
