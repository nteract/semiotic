import { afterEach, beforeEach, expect, it, vi } from "vitest"
const { sprite } = vi.hoisted(() => ({ sprite: vi.fn() }))
vi.mock("d3-cloud", () => ({
  default: class {
    canvas() {
      return this
    }
    size() {
      return this
    }
    overflow() {
      return this
    }
    strategy() {
      return this
    }
    random() {
      return this
    }
    getSprite(text: string) {
      sprite(text)
      return {}
    }
    place() {
      return { x: 0, y: 0, x0: -2, y0: -2, x1: 2, y1: 2 }
    }
  }
}))
import { prepareWordCloudLayout } from "./prepareWordCloudLayout"

beforeEach(() => {
  // Model costly rasterization deterministically instead of relying on how
  // quickly the mock engine happens to run on a particular machine.
  let elapsed = 0
  vi.spyOn(performance, "now").mockImplementation(() => elapsed++)
})

afterEach(() => {
  vi.restoreAllMocks()
  sprite.mockClear()
})
const options = {
  data: Array.from({ length: 100 }, (_, i) => ({
    text: `word${i}`,
    value: 100 - i
  }))
}

it("allows another browser task to run before completing placement, without changing its result", async () => {
  let yielded = false
  let placedAtYield = 0
  const heartbeat = new Promise<void>((resolve) =>
    setTimeout(() => {
      yielded = true
      placedAtYield = sprite.mock.calls.length
      resolve()
    }, 0)
  )
  const result = await prepareWordCloudLayout(options)
  await heartbeat
  expect(yielded).toBe(true)
  expect(placedAtYield).toBeLessThan(options.data.length)
  expect(result.words).toHaveLength(100)
  expect(result).toEqual(await prepareWordCloudLayout(options))
})

it("stops obsolete work at the next batch and preserves the abort reason", async () => {
  const controller = new AbortController()
  const reason = new Error("Replaced by a newer viewport")
  setTimeout(() => controller.abort(reason), 0)
  await expect(
    prepareWordCloudLayout(options, {}, controller.signal)
  ).rejects.toBe(reason)
  const count = sprite.mock.calls.length
  expect(count).toBeLessThan(options.data.length)
  await new Promise((resolve) => setTimeout(resolve, 10))
  expect(sprite).toHaveBeenCalledTimes(count)
  await expect(
    prepareWordCloudLayout(options, {}, controller.signal)
  ).rejects.toBe(reason)
  expect(sprite).toHaveBeenCalledTimes(count)
})
