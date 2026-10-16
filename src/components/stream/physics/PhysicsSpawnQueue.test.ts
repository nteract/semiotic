import { expect, it } from "vitest"
import { PhysicsSpawnQueue } from "./PhysicsSpawnQueue"

it("admits out-of-order arrivals with stable ties through removals and restoration", () => {
  const queue = new PhysicsSpawnQueue()
  const source = Array.from({ length: 4000 }, (_, sequence) => ({
    id: String(sequence), sequence, spawnAt: (sequence * 7919) % 97,
    x: 0, y: 0, shape: { type: "circle" as const, radius: 1 }
  }))
  source.forEach((spawn) => queue.push(spawn))
  const removed = new Set(source.filter(({ sequence }) => sequence % 7 === 0).map(({ id }) => id))
  expect(queue.remove(removed)).toEqual(removed)
  const expected = source.filter(({ id }) => !removed.has(id)).sort((a, b) => a.spawnAt - b.spawnAt || a.sequence - b.sequence)
  expect(queue.sorted()).toEqual(expected)
  const restored = new PhysicsSpawnQueue()
  restored.restore(queue.sorted())
  for (const spawn of expected) {
    expect(restored.firstArrival()).toBe(spawn.spawnAt)
    expect(restored.lastArrival()).toBe(expected.at(-1)!.spawnAt)
    expect(restored.shift()).toEqual(spawn)
  }
  expect(restored.length).toBe(0)
  expect(restored.firstArrival()).toBeUndefined()
  expect(restored.lastArrival()).toBeUndefined()
  expect(restored.shift()).toBeUndefined()
})
