import { describe, expect, it } from "vitest"
import { compilePhysicsEncoding } from "./physicsEncoding"

const data = [
  { id: "a", x: 10, y: 20, arrival: 100, hue: "#f00", team: "alpha", weight: 3, note: "n1" },
  { id: "b", x: 30, y: 40, arrival: 200, hue: "#0f0", team: "beta", weight: 5, note: "n2" }
]

describe("compilePhysicsEncoding", () => {
  it("composes the neutral motion channels and layers physics on top", () => {
    const { rows, byId, spawns, semanticItems, bodyStyle } = compilePhysicsEncoding({
      data,
      encoding: {
        id: "id",
        placement: { x: "x", y: "y" },
        time: { arrival: "arrival" },
        appearance: { color: "hue", size: { constant: 8 } },
        dynamics: { mass: "weight" },
        process: { group: "team" },
        evidence: { note: "note" }
      }
    })

    expect(rows).toHaveLength(2)
    const a = byId.get("a")!
    // Physics-only channels.
    expect(a.appearance.color).toBe("#f00")
    expect(a.appearance.size).toBe(8)
    expect(a.dynamics.mass).toBe(3)
    // Inherited neutral channels (resolved by compileMotionEncoding).
    expect(a.process.group).toBe("alpha")
    expect(a.evidence.note).toBe("n1")
    // accessible.group falls back to process.group via the shared compiler.
    expect(a.accessible.group).toBe("alpha")
    expect(a.accessible.label).toBe("a")

    // Spawn + style + semantic item derived from the row.
    expect(spawns[0]).toMatchObject({ id: "a", x: 10, y: 20, mass: 3 })
    expect(bodyStyle({ id: "a" } as never)).toMatchObject({ fill: "#f00" })
    expect(semanticItems[0]).toMatchObject({ id: "a", bodyId: "a", label: "a", group: "alpha" })
  })

  it("applies scales and placement defaults", () => {
    // No placement accessors → x/y resolve from defaults, then through the scale.
    const { spawns } = compilePhysicsEncoding({
      data: [{ id: "a" }],
      encoding: { id: "id" },
      defaults: { x: 7, y: 9 },
      scales: { x: (v) => v * 2, y: (v) => v + 1 }
    })
    expect(spawns[0]).toMatchObject({ x: 14, y: 10 })
  })

  it("falls the spawn time back to arrival when spawnAt is absent", () => {
    const { byId } = compilePhysicsEncoding({
      data,
      encoding: { id: "id", time: { arrival: "arrival" } }
    })
    const a = byId.get("a")!
    expect(a.time.spawnAt).toBe(100)
    expect(a.time.arrival).toBe(100)
    expect(a.time.basis).toBe("simulation")
  })

  it("inherits id validation from the shared motion compiler", () => {
    expect(() =>
      compilePhysicsEncoding({
        data: [{ id: "x" }, { id: "x" }],
        encoding: { id: "id" }
      })
    ).toThrow(/Duplicate/)
  })
})
