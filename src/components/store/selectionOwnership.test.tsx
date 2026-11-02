import React, { StrictMode } from "react"
import { act, render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  LinkedCharts,
  useSelection,
  useSelectionActions,
  useLinkedHover,
  useBrushSelection
} from "semiotic/ai"
import {
  useSelectionSelector,
  type SelectionClause,
  type SelectionStoreState
} from "./SelectionStore"

describe("selection clause ownership", () => {
  it.each(["selection", "actions"] as const)(
    "%s cleanup preserves a sibling's clause, including equal-value ownership transfers",
    (kind) => {
      const writers = new Map<string, ReturnType<typeof useSelectionActions>>()
      let reader: ReturnType<typeof useSelection>
      let readerRenders = 0
      function Writer({ id, name }: { id: string; name: string }) {
        const selection = useSelection({ name, clientId: "shared-selection" })
        const actions = useSelectionActions(name, "shared-actions")
        writers.set(id, kind === "selection" ? selection : actions)
        return null
      }
      function Reader() {
        readerRenders++
        reader = useSelection({ name: "hover" })
        return null
      }
      const tree = (ids: string[], name = "hover") => (
        <StrictMode>
          <LinkedCharts showLegend={false}>
            {ids.map((id) => (
              <Writer key={id} id={id} name={name} />
            ))}
            <Reader />
          </LinkedCharts>
        </StrictMode>
      )
      const { rerender } = render(tree(["a", "b", "c"]))
      const write = (id: string, value: string) =>
        act(() => writers.get(id)!.selectPoints({ category: [value] }))
      write("a", "A")
      // An instance that never wrote the shared clause cannot release it.
      rerender(tree(["a", "b"]))
      expect(reader!.isActive).toBe(true)
      expect(reader!.predicate({ category: "B" })).toBe(false)
      write("b", "B")
      // Replaced writers cannot remove a newer value either.
      rerender(tree(["b"]))
      expect(reader!.predicate({ category: "B" })).toBe(true)
      expect(reader!.predicate({ category: "A" })).toBe(false)
      rerender(tree(["a", "b"]))
      const rendersBeforeTransfer = readerRenders
      write("a", "B")
      expect(readerRenders).toBe(rendersBeforeTransfer)
      // Identical values must still transfer ownership to the latest writer.
      rerender(tree(["a"]))
      expect(reader!.isActive).toBe(true)
      expect(reader!.predicate({ category: "B" })).toBe(true)
      rerender(tree(["a"], "renamed"))
      expect(reader!.isActive).toBe(false)
      write("a", "C")
      rerender(tree([]))
      rerender(tree(["a"]))
      write("a", "A")
      rerender(tree([]))
      expect(reader!.isActive).toBe(false)
    }
  )

  it.each(["actions", "hover", "brush"] as const)(
    "%s does not release a clause replaced by a direct store write",
    (kind) => {
      let write: () => void
      let reader: ReturnType<typeof useSelection>
      let setClause: SelectionStoreState["setClause"]
      let clause: SelectionClause | undefined
      function Writer() {
        const actions = useSelectionActions("hover", "shared")
        const hover = useLinkedHover({ name: "hover", fields: ["category"] })
        const brush = useBrushSelection({ name: "hover", xField: "x" })
        write = () => {
          if (kind === "actions") actions.selectPoints({ category: ["A"] })
          if (kind === "hover") hover.onHover({ category: "A" })
          if (kind === "brush") brush.brushInteraction.end([1, 3])
        }
        return null
      }
      function Reader() {
        reader = useSelection({ name: "hover" })
        setClause = useSelectionSelector((state) => state.setClause)
        clause = useSelectionSelector(
          (state) =>
            state.selections.get("hover")?.clauses.values().next().value
        )
        return null
      }
      const tree = (visible: boolean) => (
        <LinkedCharts showLegend={false}>
          {visible && <Writer />}
          <Reader />
        </LinkedCharts>
      )
      const { rerender } = render(tree(true))
      act(() => write())
      act(() => setClause("hover", clause!))
      rerender(tree(false))
      expect(reader!.isActive).toBe(true)
      expect(reader!.predicate({ category: "A", x: 2 })).toBe(true)
      expect(reader!.predicate({ category: "B", x: 4 })).toBe(false)
    }
  )
})
