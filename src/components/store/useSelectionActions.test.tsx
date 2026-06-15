import { describe, it, expect } from "vitest"
import React from "react"
import { render, act, waitFor } from "@testing-library/react"
import { SelectionProvider } from "./SelectionStore"
import { useSelection, useSelectionActions } from "./useSelection"

describe("useSelectionActions — write without subscribing", () => {
  it("writes a clause the consumer reads, without re-rendering the writer", async () => {
    let writerRenders = 0
    let readerRenders = 0
    let capturedSelect: ((fv: Record<string, unknown[]>) => void) | null = null
    let readerActive = false
    let readerPredicate: ((d: { id: string }) => boolean) | null = null

    function Writer() {
      writerRenders++
      const { selectPoints } = useSelectionActions("s")
      capturedSelect = selectPoints
      return null
    }
    function Reader() {
      readerRenders++
      const { isActive, predicate } = useSelection({ name: "s" })
      readerActive = isActive
      readerPredicate = predicate as (d: { id: string }) => boolean
      return null
    }

    render(
      <SelectionProvider>
        <Writer />
        <Reader />
      </SelectionProvider>
    )

    const writerRendersBefore = writerRenders
    const readerRendersBefore = readerRenders
    expect(readerActive).toBe(false)

    act(() => {
      capturedSelect!({ id: ["a"] })
    })

    // The consumer re-renders and now matches; the writer does NOT re-render.
    await waitFor(() => expect(readerActive).toBe(true))
    expect(readerPredicate!({ id: "a" })).toBe(true)
    expect(readerPredicate!({ id: "b" })).toBe(false)
    expect(readerRenders).toBeGreaterThan(readerRendersBefore)
    expect(writerRenders).toBe(writerRendersBefore) // writer never re-rendered
  })
})
