import React from "react"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  AccessibleDataTable,
  AccessibleTablePortal
} from "./AccessibleDataTable"
import NetworkAccessibleDataTable from "./NetworkAccessibleDataTable"
import { PhysicsSemanticDataTable } from "./physics/physicsSemanticUI"
import {
  DataSummaryProvider,
  useDataSummaryToggle
} from "../DataSummaryContext"

const rows = Array.from({ length: 7 }, (_, i) => ({
  id: `item-${i}`,
  value: i
}))
const cases = [
  {
    name: "scene",
    table: (
      <AccessibleDataTable
        scene={rows.map((datum) => ({ type: "point", datum }))}
        chartType="XY"
      />
    ),
    more: /more rows/
  },
  {
    name: "network nodes",
    table: (
      <NetworkAccessibleDataTable
        nodes={rows.map((datum) => ({ datum }))}
        edges={[]}
        chartType="Network"
      />
    ),
    more: /more nodes/
  },
  {
    name: "network edges",
    table: (
      <NetworkAccessibleDataTable
        nodes={[]}
        edges={rows.map((datum) => ({
          datum: { ...datum, source: "A", target: "B" }
        }))}
        chartType="Network"
      />
    ),
    more: /more edges/
  },
  {
    name: "physics",
    table: (
      <PhysicsSemanticDataTable
        items={rows.map((d) => ({ id: d.id, label: d.id, x: d.value, y: 0 }))}
        tableId="physics"
      />
    ),
    more: /more rows/
  }
]

function focusClick(element: HTMLElement) {
  act(() => element.focus())
  fireEvent.click(element)
}

describe.each(cases)("$name table focus", ({ table, more }) => {
  it("focuses revealed rows when the final paging button disappears and restores the trigger on close", async () => {
    render(table)
    focusClick(screen.getByRole("button", { name: /View data summary/ }))
    const region = screen.getByRole("region")
    expect(region).toContainElement(document.activeElement as HTMLElement)
    focusClick(await screen.findByRole("button", { name: more }))
    expect(document.activeElement).toBe(
      within(screen.getByRole("table")).getAllByRole("row")[6]
    )
    expect(screen.getByRole("status")).toHaveTextContent(/7 of 7/)
    focusClick(screen.getByRole("button", { name: "Close data summary" }))
    expect(
      screen.getByRole("button", { name: /View data summary/ })
    ).toHaveFocus()
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("does not steal focus back when the user leaves the table", () => {
    render(
      <>
        {table}
        <button>Outside</button>
      </>
    )
    focusClick(screen.getByRole("button", { name: /View data summary/ }))
    act(() => screen.getByRole("button", { name: "Outside" }).focus())
    expect(screen.getByRole("button", { name: "Outside" })).toHaveFocus()
    expect(screen.queryByRole("table")).toBeNull()
  })
})

function Toggle() {
  const toggle = useDataSummaryToggle()
  return <button onClick={() => toggle?.()}>Summary toolbar</button>
}

it("returns focus to the context toolbar that opened the summary", () => {
  render(
    <DataSummaryProvider>
      <Toggle />
      {cases[0].table}
    </DataSummaryProvider>
  )
  const toolbar = screen.getByRole("button", { name: "Summary toolbar" })
  focusClick(toolbar)
  focusClick(screen.getByRole("button", { name: "Close data summary" }))
  expect(toolbar).toHaveFocus()
})

it("reuses expanded rows on unrelated renders and refreshes a changed scene revision", async () => {
  let reads = 0
  let value = 12
  const scene = [
    {
      type: "point",
      datum: {
        get value() {
          reads++
          return value
        }
      }
    }
  ]
  const { rerender } = render(
    <AccessibleDataTable scene={scene} chartType="XY" sceneRevision={1} />
  )
  fireEvent.click(screen.getByRole("button", { name: /View data summary/ }))
  await screen.findByRole("table")
  reads = 0
  rerender(
    <AccessibleDataTable
      scene={scene}
      chartType="XY"
      chartTitle="New title"
      sceneRevision={1}
    />
  )
  rerender(
    <AccessibleDataTable
      scene={scene.map((node) => ({ ...node, x: 100 }))}
      chartType="XY"
      sceneRevision={1}
    />
  )
  expect(reads).toBe(0)
  value = 24
  rerender(
    <AccessibleDataTable scene={scene} chartType="XY" sceneRevision={2} />
  )
  expect(screen.getByRole("note")).toHaveTextContent("value: 24 to 24")
})

it("reuses network models across geometry changes but refreshes semantic revisions", async () => {
  let reads = 0
  let value = 12
  const datum = {
    id: "A",
    get value() {
      reads++
      return value
    }
  }
  const nodes = [{ datum }]
  const edges = [
    {
      datum: {
        source: "A",
        target: "B",
        get weight() {
          reads++
          return value
        }
      }
    }
  ]
  const { rerender } = render(
    <NetworkAccessibleDataTable
      nodes={nodes}
      edges={edges}
      chartType="Network"
      sceneRevision={1}
    />
  )
  fireEvent.click(screen.getByRole("button", { name: /View data summary/ }))
  await screen.findByRole("table", { name: "Node data and degree summary for Network" })
  reads = 0
  rerender(
    <NetworkAccessibleDataTable
      nodes={nodes.map((node) => ({ ...node, x: 100 }))}
      edges={[...edges]}
      chartType="Network"
      sceneRevision={1}
    />
  )
  expect(reads).toBe(0)
  value = 24
  rerender(
    <NetworkAccessibleDataTable
      nodes={nodes}
      edges={edges}
      chartType="Network"
      sceneRevision={2}
    />
  )
  expect(
    within(
      screen.getByRole("table", {
        name: "Node data and degree summary for Network"
      })
    ).getByRole("cell", { name: "24" })
  ).toBeVisible()
  expect(
    within(
      screen.getByRole("table", { name: "Edge data for Network" })
    ).getByRole("cell", { name: "24" })
  ).toBeVisible()
})

it("focuses the first new row for both intermediate and final pages", async () => {
  render(
    <AccessibleDataTable
      scene={Array.from({ length: 40 }, (_, id) => ({
        type: "point",
        datum: { id }
      }))}
      chartType="XY"
    />
  )
  focusClick(screen.getByRole("button", { name: /View data summary/ }))
  focusClick(await screen.findByRole("button", { name: /more rows/ }))
  expect(document.activeElement).toBe(screen.getAllByRole("row")[6])
  expect(screen.getByRole("status")).toHaveTextContent("30 of 40 rows")
  focusClick(screen.getByRole("button", { name: /more rows/ }))
  expect(document.activeElement).toBe(screen.getAllByRole("row")[31])
  expect(screen.getByRole("status")).toHaveTextContent("40 of 40 rows")
})

it("restores the toolbar opener when the table is portaled outside the chart", async () => {
  const target = document.createElement("div")
  document.body.appendChild(target)
  try {
    const { unmount } = render(
      <DataSummaryProvider>
        <Toggle />
        <AccessibleTablePortal accessibleTable={{ portalTarget: target }}>
          {cases[0].table}
        </AccessibleTablePortal>
      </DataSummaryProvider>
    )
    await screen.findByRole("button", { name: /View data summary/ })
    const toolbar = screen.getByRole("button", { name: "Summary toolbar" })
    focusClick(toolbar)
    expect(target).toContainElement(document.activeElement as HTMLElement)
    focusClick(screen.getByRole("button", { name: "Close data summary" }))
    expect(toolbar).toHaveFocus()
    unmount()
  } finally {
    target.remove()
  }
})
