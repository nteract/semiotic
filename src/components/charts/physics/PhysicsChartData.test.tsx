import * as React from "react"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import type { PhysicsPipelineSnapshot } from "../../stream/physics/PhysicsPipelineStore"
import { CollisionSwarmChart } from "./CollisionSwarmChart"
import { GaltonBoardChart } from "./GaltonBoardChart"
import { PhysicsPileChart, UnitPileChart } from "./UnitPileChart"
import type { PhysicsFrameHandle } from "./physicsHocHandle"

function scene(ref: React.RefObject<PhysicsFrameHandle | null>) {
  const snapshot = ref.current!.getCustomLayout!() as PhysicsPipelineSnapshot
  return {
    ...snapshot,
    bodies: [...snapshot.world.bodies, ...snapshot.queue]
  }
}

describe("physics chart source updates", () => {
  let cleanupCanvas: () => void
  beforeEach(() => {
    cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => cleanupCanvas())

  it("reserves authored IDs before assigning anonymous IDs in a push batch", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    const { getByText } = render(
      <UnitPileChart ref={ref} valueAccessor="value" unitValue={100} />
    )
    act(() =>
      ref.current!.pushMany([
        { category: "A", value: 49 },
        { id: "pile-0", category: "A", value: 49 }
      ])
    )
    expect(getByText("98")).toBeTruthy()
    expect(ref.current!.getData().map((row) => row.id)).toEqual([
      "pile-1",
      "pile-0"
    ])
    expect(scene(ref).bodies).toHaveLength(2)
  })

  it("upserts stable IDs without leaving duplicate quantity behind", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    const { getByText } = render(
      <UnitPileChart ref={ref} valueAccessor="value" unitValue={100} />
    )
    act(() =>
      ref.current!.pushMany([
        { id: "a", category: "A", value: 49 },
        { id: "b", category: "A", value: 49 }
      ])
    )
    act(() => ref.current!.push({ id: "a", category: "A", value: 102 }))
    expect(getByText("151")).toBeTruthy()
    act(() => {
      ref.current!.update("a", (row) => ({ ...row, id: "b" }))
    })
    expect(getByText("102")).toBeTruthy()
    expect(ref.current!.getData()).toHaveLength(1)
    expect(scene(ref).bodies).toHaveLength(2)
  })

  it("cancels a pending seeded replay when new data starts moving", () => {
    vi.useFakeTimers()
    try {
      const ref = React.createRef<PhysicsFrameHandle>()
      const { container } = render(
        <GaltonBoardChart
          ref={ref}
          data={[{ id: "seed", value: 1 }]}
          rerunMS={1000}
        />
      )
      const canvas = container.querySelector("canvas")
      act(() => ref.current!.clear())
      act(() => vi.advanceTimersByTime(500))
      act(() => ref.current!.push({ id: "live", value: 2 }))
      act(() => vi.advanceTimersByTime(1000))
      expect(container.querySelector("canvas")).toBe(canvas)
      expect(scene(ref).bodies.map((body) => body.id)).toEqual(["live"])
    } finally {
      vi.useRealTimers()
    }
  })

  it("keeps pile quantities, category walls, and labels together while paused", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    const { container, getByText, queryByText } = render(
      <UnitPileChart ref={ref} valueAccessor="value" unitValue={100} paused />
    )
    const canvas = container.querySelector("canvas")
    act(() =>
      ref.current!.pushMany([
        { id: "a", category: "A", value: 49 },
        { id: "b", category: "A", value: 49 }
      ])
    )
    expect(getByText("98")).toBeTruthy()
    act(() => ref.current!.push({ id: "c", category: "B", value: 100 }))
    expect(getByText("B")).toBeTruthy()
    const bodies = scene(ref).bodies
    expect(bodies).toHaveLength(3)
    expect(bodies.find((body) => body.id === "a-0")!.x).toBeLessThan(350)
    expect(bodies.find((body) => body.id === "c-0")!.x).toBeGreaterThan(350)

    act(() => {
      ref.current!.update("c", (row) => ({ ...row, category: "A", value: 49 }))
    })
    expect(getByText("147")).toBeTruthy()
    expect(queryByText("B")).toBeNull()
    act(() => {
      ref.current!.remove("b")
    })
    expect(getByText("98")).toBeTruthy()
    expect(ref.current!.getData().map((row) => row.id)).toEqual(["a", "c"])
    expect(scene(ref).bodies).toHaveLength(2)
    expect(container.querySelector("canvas")).toBe(canvas)
  })

  it("updates same-ID data and unitValue without remounting, including the legacy alias", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    const first = [{ id: "row", category: "A", value: 49 }]
    const second = [{ id: "row", category: "A", value: 102 }]
    const chart = (data: typeof first, unitValue: number) => (
      <PhysicsPileChart
        ref={ref}
        data={data}
        valueAccessor="value"
        unitValue={unitValue}
      />
    )
    const { container, rerender, getByText } = render(chart(first, 100))
    const canvas = container.querySelector("canvas")
    rerender(chart(second, 100))
    expect(getByText("102")).toBeTruthy()
    expect(scene(ref).bodies).toHaveLength(2)
    rerender(chart(second, 50))
    expect(scene(ref).bodies).toHaveLength(3)
    expect(ref.current!.getData()).toEqual(second)
    expect(container.querySelector("canvas")).toBe(canvas)
  })

  it("keeps unique source rows, including queued records, and does not resurrect cleared rows", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    const data = [
      { category: "A", value: 300 },
      { id: "pile-0", category: "B", value: 0 }
    ]
    const chart = (title: string) => (
      <UnitPileChart
        ref={ref}
        data={data}
        valueAccessor="value"
        title={title}
      />
    )
    const { rerender } = render(chart("Before"))
    expect(scene(ref).queue.length).toBeGreaterThan(0)
    expect(ref.current!.getData()).toEqual([
      { id: "pile-1", category: "A", value: 300 },
      data[1]
    ])
    act(() => ref.current!.clear())
    rerender(chart("After"))
    expect(ref.current!.getData()).toEqual([])
    expect(scene(ref).bodies).toEqual([])
    act(() => ref.current!.push({ category: "C", value: 1 }))
    expect(ref.current!.getData()).toEqual([
      { id: "pile-2", category: "C", value: 1 }
    ])
    expect(scene(ref).bodies).toHaveLength(1)
  })

  it("rebins all Galton records when a pushed value expands the inferred domain", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    const chart = (bins: number) => <GaltonBoardChart ref={ref} bins={bins} />
    const { rerender, container, getAllByTestId } = render(chart(5))
    const canvas = container.querySelector("canvas")
    act(() =>
      ref.current!.pushMany([
        { id: "a", value: 0 },
        { id: "b", value: 10 }
      ])
    )
    expect(
      scene(ref).bodies.find((body) => body.id === "b")!.datum
    ).toMatchObject({ bin: 4 })
    act(() => ref.current!.push({ id: "c", value: 100 }))
    expect(
      scene(ref).bodies.find((body) => body.id === "b")!.datum
    ).toMatchObject({ bin: 0 })
    expect(
      scene(ref).bodies.find((body) => body.id === "c")!.datum
    ).toMatchObject({ bin: 4 })
    expect(ref.current!.getData()).toHaveLength(3)
    rerender(chart(2))
    expect(getAllByTestId("galton-board-bin-wall")).toHaveLength(3)
    expect(
      scene(ref).bodies.find((body) => body.id === "c")!.datum
    ).toMatchObject({ bin: 1 })
    expect(container.querySelector("canvas")).toBe(canvas)
    act(() => ref.current!.push({ id: "invalid", value: NaN }))
    expect(scene(ref).bodies).toHaveLength(3)
  })

  it("recomputes swarm scales and lanes from every source row", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    const { getByText } = render(
      <CollisionSwarmChart ref={ref} groupAccessor="group" />
    )
    act(() =>
      ref.current!.pushMany([
        { id: "a", x: 0, group: "A" },
        { id: "b", x: 10, group: "A" }
      ])
    )
    const before = scene(ref).bodies.find((body) => body.id === "b")!.datum as {
      targetX: number
    }
    act(() => ref.current!.push({ id: "c", x: 100, group: "B" }))
    const after = scene(ref).bodies.find((body) => body.id === "b")!.datum as {
      targetX: number
      targetY: number
    }
    const added = scene(ref).bodies.find((body) => body.id === "c")!.datum as {
      targetY: number
    }
    expect(after.targetX).toBeLessThan(before.targetX)
    expect(after.targetY).toBeLessThan(added.targetY)
    expect(getByText("B")).toBeTruthy()
    act(() => {
      ref.current!.remove("c")
    })
    expect(ref.current!.getData()).toHaveLength(2)
    expect(
      scene(ref).bodies.find((body) => body.id === "b")!.datum
    ).toMatchObject({ targetX: before.targetX })
  })

  it("treats replacement data as authoritative after imperative edits", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    const { rerender } = render(
      <GaltonBoardChart ref={ref} data={[{ id: "old", value: 1 }]} />
    )
    act(() => ref.current!.push({ id: "pushed", value: 2 }))
    rerender(<GaltonBoardChart ref={ref} data={[{ id: "new", value: 3 }]} />)
    expect(ref.current!.getData()).toEqual([{ id: "new", value: 3 }])
    expect(scene(ref).bodies.map((body) => body.id)).toEqual(["new"])
    expect(ref.current!.remove("old")).toEqual([])
  })

  it("retains arrival pacing when declarative data is replaced", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    const { rerender } = render(
      <GaltonBoardChart ref={ref} data={[{ id: "old", value: 1 }]} />
    )
    const data = Array.from({ length: 40 }, (_, index) => ({
      id: `new-${index}`,
      value: index
    }))
    rerender(<GaltonBoardChart ref={ref} data={data} />)
    expect(ref.current!.getData()).toHaveLength(40)
    expect(scene(ref).queue.length).toBeGreaterThan(0)
    expect(scene(ref).world.bodies.length).toBeLessThan(40)
    expect(scene(ref).bodies).toHaveLength(40)
  })
})
