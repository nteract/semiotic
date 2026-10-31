import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import { usePhysicsSemanticNavigation } from "./usePhysicsSemanticNavigation"

function options() {
  const store = new PhysicsPipelineStore()
  store.enqueue([
    { id: "a", x: 20, y: 30, shape: { type: "circle", radius: 5 } }
  ])
  store.materializeDueSpawns()
  const config: Parameters<typeof usePhysicsSemanticNavigation>[0] = {
    allSemanticItems: [],
    bodySemanticItemLimit: 10,
    bodySemanticItems: false,
    bodySemanticUpdateMs: 0,
    emitObservation: vi.fn(),
    enableHover: true,
    hoverRadius: 16,
    logicalClockRef: { current: () => 1000 },
    onBodyHover: undefined,
    onBodyPointerDown: undefined,
    onClick: undefined,
    onSemanticItemActivate: undefined,
    onSemanticItemFocus: undefined,
    setBodySemanticItemsSnapshot: vi.fn(),
    storeRef: { current: store }
  }
  return { config, store }
}

describe("physics body semantic publication", () => {
  it("does not schedule state updates when body semantics are disabled", () => {
    const { config, store } = options()
    const { result } = renderHook(() => usePhysicsSemanticNavigation(config))
    act(() => {
      for (let index = 0; index < 5; index++)
        result.current.syncBodySemanticItems(
          store.readBodies(),
          store.runtimeState().simulationState,
          true
        )
    })
    expect(config.setBodySemanticItemsSnapshot).not.toHaveBeenCalled()
  })

  it("publishes changed geometry and clears disabled semantics exactly once", () => {
    const { config, store } = options()
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        usePhysicsSemanticNavigation({ ...config, bodySemanticItems: enabled }),
      { initialProps: { enabled: true } }
    )
    const state = store.runtimeState().simulationState
    const body = store.readBodies()[0]
    act(() => {
      result.current.syncBodySemanticItems([body], state, true)
      result.current.syncBodySemanticItems([body], state, true)
    })
    expect(config.setBodySemanticItemsSnapshot).toHaveBeenCalledTimes(1)
    expect(config.setBodySemanticItemsSnapshot).toHaveBeenLastCalledWith([
      expect.objectContaining({ bodyId: "a", x: 20, y: 30 })
    ])
    act(() =>
      result.current.syncBodySemanticItems([{ ...body, x: 40 }], state, true)
    )
    expect(config.setBodySemanticItemsSnapshot).toHaveBeenCalledTimes(2)
    rerender({ enabled: false })
    act(() => {
      result.current.syncBodySemanticItems([], state, true)
      result.current.syncBodySemanticItems([], state, true)
    })
    expect(config.setBodySemanticItemsSnapshot).toHaveBeenCalledTimes(3)
    expect(config.setBodySemanticItemsSnapshot).toHaveBeenLastCalledWith([])
  })
})
