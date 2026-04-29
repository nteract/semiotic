import { describe, it, expect } from "vitest"
import { resolveRealtimeWindowSize } from "./resolveWindowSize"

describe("resolveRealtimeWindowSize", () => {
  it("returns the explicit user value when provided (small)", () => {
    expect(resolveRealtimeWindowSize(50, [])).toBe(50)
  })

  it("returns the explicit user value when provided (larger than data)", () => {
    expect(resolveRealtimeWindowSize(1000, new Array(50))).toBe(1000)
  })

  it("returns the explicit user value when provided (smaller than data — user opted into windowed view)", () => {
    // A consumer asking for windowSize=10 against a 100-point archive
    // is explicitly requesting "show the last 10". The helper must
    // not silently expand to fit — that's the user's choice to make.
    expect(resolveRealtimeWindowSize(10, new Array(100))).toBe(10)
  })

  it("falls back to 200 when neither windowSize nor data is provided (streaming default)", () => {
    expect(resolveRealtimeWindowSize(undefined, undefined)).toBe(200)
    expect(resolveRealtimeWindowSize(undefined, [])).toBe(200)
  })

  it("auto-fits to data.length when data is larger than the 200 floor", () => {
    // Closes the historical `windowSize={data.length}` workaround:
    // a 500-point bounded array now sizes the buffer to fit by default.
    expect(resolveRealtimeWindowSize(undefined, new Array(500))).toBe(500)
  })

  it("keeps the 200 floor when bounded data is smaller", () => {
    // A 50-point bounded array doesn't need a tiny buffer — keeping
    // 200 reserves headroom in case the user later starts pushing.
    expect(resolveRealtimeWindowSize(undefined, new Array(50))).toBe(200)
  })

  it("handles 0 explicitly (some consumers might pass 0 to opt out)", () => {
    // Passing windowSize=0 is unusual but treat as explicit user
    // intent; downstream pipeline / RingBuffer will handle.
    expect(resolveRealtimeWindowSize(0, new Array(500))).toBe(0)
  })
})
