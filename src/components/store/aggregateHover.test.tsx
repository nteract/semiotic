import React from "react"
import { act, renderHook } from "@testing-library/react"
import { expect, it } from "vitest"
import { SelectionProvider } from "./SelectionStore"
import { useLinkedHover } from "./useSelection"
import { attachSelectionProvenance } from "./selectionProvenance"

it("publishes all source time keys in a bin and clears on a missing join field", () => {
  const { result } = renderHook(
    () => useLinkedHover({ name: "bins", fields: ["time"] }),
    {
      wrapper: ({ children }) => (
        <SelectionProvider>{children}</SelectionProvider>
      )
    }
  )
  const bin = attachSelectionProvenance({ binStart: 0, binEnd: 10, total: 6 }, [
    { time: 2, value: 3 },
    { time: 7, value: 3 }
  ])
  act(() => result.current.onHover(bin))
  expect(result.current.predicate({ time: 2 })).toBe(true)
  expect(result.current.predicate({ time: 7 })).toBe(true)
  expect(result.current.predicate({ time: 12 })).toBe(false)
  act(() => result.current.onHover({ category: "missing" }))
  expect(result.current.isActive).toBe(false)
})
