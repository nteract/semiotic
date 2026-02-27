import { swarmRenderer } from "./swarmRenderer"
import { candlestickRenderer } from "./candlestickRenderer"
import { waterfallRenderer } from "./waterfallRenderer"

describe("renderer stubs", () => {
  it("exports swarmRenderer", () => {
    expect(typeof swarmRenderer).toBe("function")
    expect(() => swarmRenderer(null as any, [], null as any, null as any, {}, null as any)).toThrow("Not yet implemented")
  })

  it("exports candlestickRenderer", () => {
    expect(typeof candlestickRenderer).toBe("function")
    expect(() => candlestickRenderer(null as any, [], null as any, null as any, {}, null as any)).toThrow("Not yet implemented")
  })

  it("exports waterfallRenderer", () => {
    expect(typeof waterfallRenderer).toBe("function")
    expect(() => waterfallRenderer(null as any, [], null as any, null as any, {}, null as any)).toThrow("Not yet implemented")
  })
})
