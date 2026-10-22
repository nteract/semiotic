import { expect, it } from "vitest"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"

it("isolates default, authored, patched, saved, restored and returned cameras", () => {
  const first = new PhysicsPipelineStore()
  const other = new PhysicsPipelineStore()
  first.snapshot().config.viewTransform!.x = 100
  expect(first.viewTransform()).toEqual({ x: 0, y: 0 })
  expect(other.viewTransform()).toEqual({ x: 0, y: 0 })
  const camera = { x: 10, y: 20 }
  const authored = new PhysicsPipelineStore({ viewTransform: camera })
  camera.x = 30
  expect(authored.viewTransform()).toEqual({ x: 10, y: 20 })
  authored.updateConfig({ viewTransform: camera })
  camera.x = 40
  expect(authored.viewTransform()).toEqual({ x: 30, y: 20 })
  const saved = authored.snapshot()
  first.restore(saved)
  saved.config.viewTransform!.x = 50
  first.viewTransform().x = 60
  expect(first.viewTransform()).toEqual({ x: 30, y: 20 })
  expect(authored.viewTransform()).toEqual({ x: 30, y: 20 })
  expect(other.viewTransform()).toEqual({ x: 0, y: 0 })
  // Caller mutation must still be detected by the retained config comparator.
  const result = authored.updateConfigWithResult({ viewTransform: camera })
  expect(result.changed.has("scene-geometry")).toBe(true)
  expect(authored.viewTransform().x).toBe(40)
})
