import { candlestickRenderer } from "./candlestickRenderer"

describe("renderer stubs", () => {
  it("exports candlestickRenderer", () => {
    expect(typeof candlestickRenderer).toBe("function")
    expect(() => candlestickRenderer(null as any, [], null as any, null as any, {}, null as any)).toThrow("Not yet implemented")
  })
})
