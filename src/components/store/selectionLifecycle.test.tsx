import React, { StrictMode } from "react"
import { act, render, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SelectionProvider } from "./SelectionStore"
import {
  useBrushSelection,
  useLinkedHover,
  useSelection,
  useSelectionActions
} from "semiotic/ai"
import { useChartSelection } from "../charts/shared/hooks"
import { resolveMobileInteraction } from "../charts/shared/chartMode"

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <StrictMode>
    <SelectionProvider>{children}</SelectionProvider>
  </StrictMode>
)

describe("selection ownership", () => {
  it("releases brush intervals when the encoded fields change", () => {
    const { result, rerender } = renderHook(
      ({ xField }) => ({
        brush: useBrushSelection({ name: "brush", xField }),
        reader: useSelection({ name: "brush" })
      }),
      { wrapper, initialProps: { xField: "x" } }
    )
    act(() => result.current.brush.brushInteraction.end([1, 3]))
    expect(result.current.reader.predicate({ x: 2 })).toBe(true)
    expect(result.current.reader.predicate({ x: 4 })).toBe(false)
    rerender({ xField: "value" })
    expect(result.current.reader.isActive).toBe(false)
    act(() => result.current.brush.brushInteraction.end([5, 10]))
    expect(result.current.reader.predicate({ value: 7 })).toBe(true)
    expect(result.current.reader.predicate({ x: 2, value: 4 })).toBe(false)
  })

  it("does not leave hover state behind for a later root without a provider", () => {
    const source = renderHook(() =>
      useLinkedHover({ name: "lifecycle-root", fields: ["category"] })
    )
    const target = renderHook(() => useSelection({ name: "lifecycle-root" }))
    act(() => source.result.current.onHover({ category: "A" }))
    expect(target.result.current.isActive).toBe(true)
    source.unmount()
    expect(target.result.current.isActive).toBe(false)
    const later = renderHook(() => useSelection({ name: "lifecycle-root" }))
    expect(later.result.current.isActive).toBe(false)
  })

  it("releases a hover when its fields change or linking is disabled", () => {
    const { result, rerender } = renderHook(
      ({ field, enabled }) => ({
        chart: useChartSelection({
          linkedHover: enabled ? { name: "hovered", fields: [field] } : false
        }),
        reader: useSelection({ name: "hovered" })
      }),
      { wrapper, initialProps: { field: "category", enabled: true } }
    )
    const hover = () =>
      result.current.chart.customHoverBehavior({
        data: { category: "A", series: "B" }
      })
    act(hover)
    expect(result.current.reader.isActive).toBe(true)
    rerender({ field: "series", enabled: true })
    expect(result.current.reader.isActive).toBe(false)
    act(hover)
    expect(result.current.reader.predicate({ series: "B" })).toBe(true)
    expect(result.current.reader.predicate({ category: "A" })).toBe(false)
    rerender({ field: "series", enabled: false })
    expect(result.current.reader.isActive).toBe(false)
  })

  it.each(["selection", "actions", "hover", "brush"] as const)(
    "releases only the unmounted %s writer's clause",
    (kind) => {
      let write: () => void
      let reader: ReturnType<typeof useSelection>
      function Writer() {
        const selection = useSelection({
          name: "shared",
          clientId: "selection"
        })
        const actions = useSelectionActions("shared", "actions")
        const hover = useLinkedHover({ name: "shared", fields: ["category"] })
        const brush = useBrushSelection({ name: "shared", xField: "x" })
        write = () => {
          if (kind === "selection") selection.selectPoints({ category: ["A"] })
          if (kind === "actions") actions.selectPoints({ category: ["A"] })
          if (kind === "hover") hover.onHover({ category: "A" })
          if (kind === "brush") brush.brushInteraction.end([0, 2])
        }
        return null
      }
      function Reader() {
        reader = useSelection({ name: "shared", clientId: "reader" })
        return null
      }
      const tree = (visible: boolean) => (
        <SelectionProvider>
          {visible && <Writer />}
          <Reader />
        </SelectionProvider>
      )
      const { rerender } = render(tree(true))
      act(() => write())
      expect(reader!.predicate({ category: "A", x: 1 })).toBe(true)
      expect(reader!.predicate({ category: "B", x: 5 })).toBe(false)
      act(() => reader.selectPoints({ category: ["B"] }))
      rerender(tree(false))
      expect(reader!.isActive).toBe(true)
      expect(reader!.predicate({ category: "A", x: 1 })).toBe(false)
      expect(reader!.predicate({ category: "B", x: 5 })).toBe(true)
      act(() => reader.clear())
      expect(reader!.isActive).toBe(false)
    }
  )

  it.each(["selection", "actions"] as const)(
    "releases the old name and client ID for %s writers",
    (kind) => {
      const { result, rerender } = renderHook(
        ({ name, clientId }) => ({
          writer: useSelection({ name, clientId }),
          actions: useSelectionActions(name, `${clientId}-actions`),
          old: useSelection({ name: "old" }),
          next: useSelection({ name: "next" })
        }),
        { wrapper, initialProps: { name: "old", clientId: "writer" } }
      )
      const select = () =>
        (kind === "selection"
          ? result.current.writer
          : result.current.actions
        ).selectPoints({ category: ["A"] })
      act(select)
      expect(result.current.old.isActive).toBe(true)
      rerender({ name: "next", clientId: "writer" })
      expect(result.current.old.isActive).toBe(false)
      act(select)
      expect(result.current.next.isActive).toBe(true)
      rerender({ name: "next", clientId: "replacement" })
      expect(result.current.next.isActive).toBe(false)
    }
  )

  it("clears a disabled writer and ignores writes until enabled again", () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => ({
        writer: useSelection({ name: "shared", enabled }),
        reader: useSelection({ name: "shared" })
      }),
      { wrapper, initialProps: { enabled: true } }
    )
    act(() => result.current.writer.selectPoints({ category: ["A"] }))
    expect(result.current.reader.isActive).toBe(true)
    rerender({ enabled: false })
    expect(result.current.reader.isActive).toBe(false)
    act(() => result.current.writer.selectPoints({ category: ["B"] }))
    expect(result.current.reader.isActive).toBe(false)
    rerender({ enabled: true })
    act(() => result.current.writer.selectPoints({ category: ["C"] }))
    expect(result.current.reader.predicate({ category: "C" })).toBe(true)
    expect(result.current.reader.predicate({ category: "A" })).toBe(false)
  })
})

describe("selection stability", () => {
  it("retains hook results and callbacks across equivalent inline options", () => {
    const { result, rerender } = renderHook(
      ({ field }) => ({
        selection: useSelection({ name: "selected" }),
        actions: useSelectionActions("selected"),
        hover: useLinkedHover({ name: "hovered", fields: [field] }),
        chart: useChartSelection({
          selection: { name: "selected" },
          linkedHover: { name: "hovered", fields: [field] },
          fallbackFields: [field],
          mobileInteraction: resolveMobileInteraction(true)
        })
      }),
      { wrapper, initialProps: { field: "category" } }
    )
    const before = result.current
    rerender({ field: "category" })
    expect(result.current.selection).toBe(before.selection)
    expect(result.current.actions).toBe(before.actions)
    expect(result.current.hover).toBe(before.hover)
    expect(result.current.chart.activeSelectionHook).toBe(
      before.chart.activeSelectionHook
    )
    expect(result.current.chart.customHoverBehavior).toBe(
      before.chart.customHoverBehavior
    )
    expect(result.current.chart.customClickBehavior).toBe(
      before.chart.customClickBehavior
    )
    rerender({ field: "series" })
    act(() => result.current.hover.onHover({ category: "A", series: "B" }))
    expect(result.current.hover.predicate({ series: "B" })).toBe(true)
    expect(result.current.hover.predicate({ category: "A", series: "A" })).toBe(
      false
    )
  })

  it("does not rerender charts with linking disabled for unrelated hover writes", () => {
    let writes: ReturnType<typeof useSelectionActions>
    let renders = 0
    function Writer() {
      writes = useSelectionActions("hover")
      return null
    }
    function UnlinkedChart() {
      renders++
      useChartSelection({})
      return null
    }
    render(
      <SelectionProvider>
        <Writer />
        <UnlinkedChart />
      </SelectionProvider>
    )
    const before = renders
    for (const category of ["A", "B", "C"]) {
      act(() => writes.selectPoints({ category: [category] }))
    }
    expect(renders).toBe(before)
  })
})

describe("touch selection", () => {
  it.each(["pointer", "keyboard", "touch"] as const)(
    "handles %s activation in a narrow chart without inventing touch locks",
    (inputType) => {
      const { result, rerender } = renderHook(
        () => ({
          chart: useChartSelection({
            linkedHover: { name: "hovered", fields: ["category"] },
            selection: { name: "selected" },
            fallbackFields: ["category"],
            mobileInteraction: resolveMobileInteraction(undefined, {
              width: 300
            })
          }),
          hovered: useSelection({ name: "hovered" }),
          selected: useSelection({ name: "selected" })
        }),
        { wrapper }
      )
      act(() => {
        result.current.chart.customHoverBehavior({ data: { category: "A" } })
        result.current.chart.customClickBehavior(
          { data: { category: "A" } },
          { type: "activate", inputType }
        )
      })
      rerender()
      act(() => result.current.chart.customHoverBehavior(null))
      expect(result.current.hovered.isActive).toBe(inputType === "touch")
      expect(result.current.selected.isActive).toBe(inputType === "touch")
      if (inputType === "touch") {
        expect(result.current.selected.predicate({ category: "B" })).toBe(false)
        act(() =>
          result.current.chart.customClickBehavior(null, {
            type: "activate",
            inputType
          })
        )
        expect(result.current.hovered.isActive).toBe(false)
        expect(result.current.selected.isActive).toBe(false)
      }
    }
  )
})
