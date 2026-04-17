import { describe, it, expect } from "vitest"
import { ParticlePool } from "./ParticlePool"
import type { RealtimeEdge, BezierCache } from "./networkTypes"

const STRAIGHT: BezierCache = {
  circular: false,
  points: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 200, y: 0 },
    { x: 300, y: 0 }
  ],
  halfWidth: 0
}

function makeEdges(n: number): RealtimeEdge[] {
  const out: RealtimeEdge[] = []
  for (let i = 0; i < n; i++) {
    out.push({
      source: "a", target: "b", value: 1, bezier: STRAIGHT
    } as unknown as RealtimeEdge)
  }
  return out
}

describe("ParticlePool", () => {
  it("spawns until capacity is exhausted then returns null", () => {
    const pool = new ParticlePool(3)
    expect(pool.spawn(0)).not.toBeNull()
    expect(pool.spawn(0)).not.toBeNull()
    expect(pool.spawn(0)).not.toBeNull()
    expect(pool.spawn(0)).toBeNull()
  })

  it("recycles slots when particles expire (free-list reuse)", () => {
    const pool = new ParticlePool(2)
    const a = pool.spawn(0)!
    const b = pool.spawn(0)!
    expect(pool.spawn(0)).toBeNull()

    // Step until both particles complete (t reaches 1.0)
    pool.step(2.0, 1, makeEdges(1))
    expect(a.active).toBe(false)
    expect(b.active).toBe(false)

    // Both slots should be reusable now
    expect(pool.spawn(0)).not.toBeNull()
    expect(pool.spawn(0)).not.toBeNull()
    expect(pool.spawn(0)).toBeNull()
  })

  it("recycles slots when an edge becomes invalid mid-flight", () => {
    const pool = new ParticlePool(1)
    pool.spawn(5)
    // Step with no edge at index 5 — particle should deactivate and free its slot
    pool.step(0.1, 1, [])
    expect(pool.spawn(0)).not.toBeNull()
  })

  it("clear() restores all slots to free", () => {
    const pool = new ParticlePool(3)
    pool.spawn(0); pool.spawn(0); pool.spawn(0)
    pool.clear()
    expect(pool.spawn(0)).not.toBeNull()
    expect(pool.spawn(0)).not.toBeNull()
    expect(pool.spawn(0)).not.toBeNull()
    expect(pool.spawn(0)).toBeNull()
  })

  it("resize() exposes new slots without losing active ones", () => {
    const pool = new ParticlePool(2)
    const a = pool.spawn(0)!
    a.t = 0.5
    pool.resize(4)
    // Existing particle is preserved
    expect(pool.particles[0]).toBe(a)
    expect(pool.particles[0].active).toBe(true)
    expect(pool.particles[0].t).toBe(0.5)
    // Three more spawns (1 existing free + 2 new) succeed
    expect(pool.spawn(0)).not.toBeNull()
    expect(pool.spawn(0)).not.toBeNull()
    expect(pool.spawn(0)).not.toBeNull()
    expect(pool.spawn(0)).toBeNull()
  })

  it("step() writes bezier position into the particle without allocating", () => {
    const pool = new ParticlePool(1)
    const p = pool.spawn(0)!
    pool.step(0.5, 1, makeEdges(1))
    // Half-traversal of the straight bezier from 0→300 should land near x=150
    expect(p.x).toBeGreaterThan(120)
    expect(p.x).toBeLessThan(180)
    expect(p.y).toBe(0)
  })

  it("countForEdge counts only matching active particles", () => {
    const pool = new ParticlePool(5)
    pool.spawn(0); pool.spawn(0); pool.spawn(1)
    expect(pool.countForEdge(0)).toBe(2)
    expect(pool.countForEdge(1)).toBe(1)
    expect(pool.countForEdge(2)).toBe(0)
  })
})
