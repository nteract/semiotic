import { describe, expect, it } from "vitest"
import { inventoryAtTime, type InventoryEdge } from "./inventoryAtTime"

const edges: InventoryEdge[] = [
  // 3 units arrive at A at t=10
  { source: "SRC", target: "A", value: 3, startTime: 0, endTime: 10 },
  // 1 unit leaves A for B at t=20
  { source: "A", target: "B", value: 1, startTime: 20, endTime: 30 },
  // lifecycle exit of 1 unit still on B at t=40
  {
    source: "SRC2",
    target: "B",
    value: 1,
    startTime: 5,
    endTime: 15,
    systemOutTime: 40,
  },
]

describe("inventoryAtTime", () => {
  it("returns zero before any events for a node with no opening stock", () => {
    expect(inventoryAtTime("A", -1, edges)).toBe(0)
  })

  it("counts arrivals at endTime and departures at startTime", () => {
    expect(inventoryAtTime("A", 10, edges)).toBe(3)
    expect(inventoryAtTime("A", 20, edges)).toBe(2)
    expect(inventoryAtTime("A", 100, edges)).toBe(2)
  })

  it("applies systemOutTime as a departure from the target", () => {
    // B receives 1 from A at t=30 and 1 from SRC2 at t=15; loses 1 at t=40
    expect(inventoryAtTime("B", 15, edges)).toBe(1)
    expect(inventoryAtTime("B", 30, edges)).toBe(2)
    expect(inventoryAtTime("B", 40, edges)).toBe(1)
  })

  it("infers opening stock so source-like nodes do not report negative inventory", () => {
    // SRC only has outbound events; without lift the balance would be negative.
    expect(inventoryAtTime("SRC", 100, edges)).toBe(0)
    expect(inventoryAtTime("SRC", 100, edges, { inferOpeningStock: false })).toBe(-3)
  })
})
