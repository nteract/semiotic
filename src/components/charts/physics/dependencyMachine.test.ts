import { describe, expect, it } from "vitest"
import {
  calculateBlockerAmplification,
  compileDependencyMachine,
  routeDependencyTracks,
} from "./dependencyMachine"

// Rows: a task depends on the ids in `deps`, so each dep is drawn as a
// dependency edge dep → task.
type Row = { id: string; label: string; lane: string; deps: string[] }

const accessors = {
  taskIDAccessor: "id",
  labelAccessor: "label",
  laneAccessor: "lane",
  dependencyAccessor: "deps"
} as const

function machineFrom(data: Row[]) {
  return compileDependencyMachine<Row>({ data, ...accessors })
}

describe("compileDependencyMachine", () => {
  it("layers a DAG by longest path and reports it valid", () => {
    const machine = machineFrom([
      { id: "a", label: "A", lane: "L1", deps: [] },
      { id: "b", label: "B", lane: "L1", deps: ["a"] },
      { id: "c", label: "C", lane: "L2", deps: ["b", "a"] }
    ])
    expect(machine.valid).toBe(true)
    expect(machine.diagnostics).toHaveLength(0)
    expect(machine.byID.get("a")!.level).toBe(0)
    expect(machine.byID.get("b")!.level).toBe(1)
    // c depends on both a and b → longest path wins (b + 1), not a + 1.
    expect(machine.byID.get("c")!.level).toBe(2)
    expect(machine.maxLevel).toBe(2)
    // Edges point dependency → dependent.
    expect(machine.outgoing.get("a")!.map((e) => e.targetID).sort()).toEqual(["b", "c"])
  })

  it("flags a dependency cycle", () => {
    const machine = machineFrom([
      { id: "a", label: "A", lane: "L", deps: ["c"] },
      { id: "b", label: "B", lane: "L", deps: ["a"] },
      { id: "c", label: "C", lane: "L", deps: ["b"] }
    ])
    expect(machine.valid).toBe(false)
    expect(machine.diagnostics.some((d) => d.code === "cycle")).toBe(true)
  })
})

describe("calculateBlockerAmplification", () => {
  const machine = machineFrom([
    { id: "a", label: "A", lane: "L1", deps: [] },
    { id: "b", label: "B", lane: "L1", deps: ["a"] },
    { id: "c", label: "C", lane: "L2", deps: ["b"] }
  ])

  it("reaches every unfinished descendant of the blocker", () => {
    const amp = calculateBlockerAmplification(machine, "a")
    expect(amp.downstreamTaskIDs).toEqual(["b", "c"])
    expect(amp.downstreamTaskCount).toBe(2)
    expect(amp.affectedLanes.sort()).toEqual(["L1", "L2"])
    expect(amp.affectedLaneCount).toBe(2)
  })

  it("excludes completed tasks but still traverses through them", () => {
    // b is complete, yet c (reached only through b) must still be counted.
    const amp = calculateBlockerAmplification(machine, "a", { completedTaskIDs: ["b"] })
    expect(amp.downstreamTaskIDs).toEqual(["c"])
    expect(amp.downstreamTaskCount).toBe(1)
    expect(amp.affectedLanes).toEqual(["L2"])
  })

  it("reports no amplification for a leaf blocker", () => {
    expect(calculateBlockerAmplification(machine, "c").downstreamTaskCount).toBe(0)
  })
})

describe("routeDependencyTracks", () => {
  it("does not stack co-located tasks on top of each other", () => {
    // Three tasks in the same lane at different depths plus two siblings that
    // share a lane+level after a join — the old slotOffset of ~15px put cards
    // on top of one another.
    const machine = machineFrom([
      { id: "a", label: "A", lane: "L1", deps: [] },
      { id: "b1", label: "B1", lane: "L1", deps: ["a"] },
      { id: "b2", label: "B2", lane: "L1", deps: ["a"] },
      { id: "c", label: "C", lane: "L2", deps: ["b1", "b2"] },
    ])
    const layout = routeDependencyTracks(machine, { width: 800, height: 700 })
    const rects = layout.tasks.map((t) => ({
      id: t.taskID,
      top: t.y - t.height / 2,
      bottom: t.y + t.height / 2,
      left: t.x - t.width / 2,
      right: t.x + t.width / 2,
    }))
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i]
        const b = rects[j]
        const overlapX = a.left < b.right && a.right > b.left
        const overlapY = a.top < b.bottom && a.bottom > b.top
        expect(
          overlapX && overlapY,
          `${a.id} overlaps ${b.id}`,
        ).toBe(false)
      }
    }
    // Sibling b1/b2 share a lane and level — must be vertically separated by a gap.
    const b1 = layout.taskByID.get("b1")!
    const b2 = layout.taskByID.get("b2")!
    expect(Math.abs(b1.y - b2.y)).toBeGreaterThanOrEqual(b1.height)
  })
})
