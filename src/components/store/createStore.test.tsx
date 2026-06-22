import React from "react"
import { renderHook, act } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { createStore } from "./createStore"

describe("createStore", () => {
  it("ignores updater objects with only inherited enumerable keys", () => {
    type State = { count: number }
    let setState: ((updater: (current: State) => Partial<State>) => void) | undefined

    const [Provider, useStore] = createStore<State>((set) => {
      setState = set
      return { count: 0 }
    })
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    )
    let renders = 0

    const { result } = renderHook(
      () => {
        renders++
        return useStore((state) => state)
      },
      { wrapper }
    )

    const initialRenders = renders
    const inheritedUpdate = Object.create({ count: 1 }) as Partial<State>

    act(() => {
      setState?.(() => inheritedUpdate)
    })

    expect(result.current.count).toBe(0)
    expect(renders).toBe(initialRenders)
  })
})
