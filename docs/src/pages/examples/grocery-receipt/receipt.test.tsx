import React from "react"
import { describe, expect, it, vi } from "vitest"
import { renderToString } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { fireEvent, render, screen } from "@testing-library/react"
import { renderChartWithEvidence } from "semiotic/server"
import { fingerprintValue } from "semiotic/artifact"
import GroceryBillExamplePage from "../GroceryBillExamplePage"
import rawSnapshot from "./snapshot.json"
import { prepareBasket } from "./prepare"
import { defaultState, readReceiptSearch, receiptSearch } from "./state"
import { receiptValues, renderReceiptHTML, renderReceiptSVG } from "./exports"
import {
  buildReceiptPacket,
  evaluateNumericalBindings,
  numericalBindings,
  verifyReceiptPacket,
} from "./packet"
import { contributionChartProps, historySeries } from "./chart-config"
import { money, signedMoney } from "./format"
import type { BasketState, GrocerySnapshot } from "./types"

vi.mock("../ExamplePageLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}))
vi.mock("./GroceryCharts", () => ({
  ContributionChart: () => <div>Contribution chart enhancement</div>,
  HistoryCharts: () => <div>History chart enhancement</div>,
}))
const snapshot = rawSnapshot as GrocerySnapshot
const initial = defaultState(snapshot)
function changedQuantity(itemId: string, quantity: number): BasketState {
  return {
    ...initial,
    quantities: initial.quantities.map((row) =>
      row.itemId === itemId ? { ...row, quantity } : { ...row },
    ),
  }
}
function deepFreeze(value: unknown) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

describe("E01 exact basket arithmetic and source scope", () => {
  it("rounds exact accounting-unit ties to the nearest displayed cent", () => {
    expect(money(3.775)).toBe("$3.78")
    expect(signedMoney(0.975)).toBe("+$0.98")
    expect(signedMoney(-0.975)).toBe("-$0.98")
  })
  it("matches independently calculated default line costs and differences", () => {
    const result = prepareBasket(snapshot, initial)
    expect(result.rows.map((row) => row.beforeUSD)).toEqual([
      1.148, 2.56, 1.203, 3.054, 6.36, 3.951,
    ])
    expect(result.rows.map((row) => row.afterUSD)).toEqual([
      1.308, 3.728, 3.775, 4.029, 8.344, 6.103,
    ])
    expect(result.rows.map((row) => row.contributionUSD)).toEqual([
      0.16, 1.168, 2.572, 0.975, 1.984, 2.152,
    ])
    expect(result.beforeUSD).toBe(18.276)
    expect(result.afterUSD).toBe(27.287)
    expect(result.differenceUSD).toBe(9.011)
    expect(result.percentageChange).toBeCloseTo((9011 / 18276) * 100, 12)
    expect(result.largestContributionIds).toEqual(["eggs"])
    expect(result.rows.reduce((sum, row) => sum + Math.round(row.contributionUSD! * 4000), 0)).toBe(
      36044,
    )
  })
  it("handles changed quantities, an empty basket, and a zero baseline", () => {
    const highEgg = prepareBasket(snapshot, changedQuantity("eggs", 4))
    expect([highEgg.beforeUSD, highEgg.afterUSD, highEgg.differenceUSD]).toEqual([
      21.885, 38.612, 16.727,
    ])
    const state = {
      ...initial,
      quantities: initial.quantities.map((row) => ({ ...row, quantity: 0 })),
    }
    const empty = prepareBasket(snapshot, state)
    expect([empty.beforeUSD, empty.afterUSD, empty.differenceUSD]).toEqual([0, 0, 0])
    expect(empty.percentageChange).toBeNull()
    expect(empty.rows.every((row) => row.contributionUSD === 0)).toBe(true)
    expect(
      evaluateNumericalBindings(snapshot, state, numericalBindings(empty)).find(
        (check) => check.id === "receipt:percentageChange",
      )?.status,
    ).toBe("unknown")
  })
  it("retains real missing prices and holds comparable-subset membership fixed", () => {
    const missing = prepareBasket(snapshot, { ...initial, after: "2020-05" })
    expect(missing.status).toBe("unavailable")
    expect([
      missing.beforeUSD,
      missing.afterUSD,
      missing.differenceUSD,
      missing.percentageChange,
    ]).toEqual([null, null, null, null])
    const subset = prepareBasket(snapshot, { ...missing.state, mode: "comparable-subset" })
    expect(subset.status).toBe("available")
    expect(subset.excludedItemIds).toEqual(["chicken"])
    expect(subset.beforeUSD).toBe(11.916)
    expect(subset.rows.find((row) => row.itemId === "chicken")?.beforeUSD).toBeNull()
    expect(subset.scope).toContain("Excluded from both dates: Fresh whole chicken")
    expect(subset.stateId).not.toBe(missing.stateId)
    expect(subset.history.find((row) => row.month === "2019-06")?.costUSD).toBe(11.916)
    expect(subset.history.find((row) => row.month === "2020-05")?.costUSD).not.toBeNull()
    const noSubset = prepareBasket(snapshot, {
      ...initial,
      after: "2025-10",
      mode: "comparable-subset",
    })
    expect(noSubset.status).toBe("unavailable")
    expect(noSubset.afterUSD).toBeNull()
  })
  it("never bridges missing-price or missing-denominator history gaps", () => {
    const receipt = prepareBasket(snapshot, initial)
    expect(receipt.history.find((row) => row.month === "2020-05")?.costUSD).toBeNull()
    expect(receipt.history.find((row) => row.month === "2021-05")?.yearChangePct).toBeNull()
    expect(receipt.history.find((row) => row.month === "2025-10")?.costUSD).toBeNull()
    const series = historySeries(receipt, "costUSD")
    expect(series.find((row) => row.month === "2020-04")?.segment).not.toBe(
      series.find((row) => row.month === "2020-06")?.segment,
    )
    expect(
      prepareBasket(snapshot, changedQuantity("chicken", 0)).history.find(
        (row) => row.month === "2020-05",
      )?.costUSD,
    ).not.toBeNull()
  })
  it("does not mutate frozen inputs and preserves identity under source-row reordering", () => {
    const frozen = structuredClone(snapshot)
    deepFreeze(frozen)
    const state = structuredClone(initial)
    deepFreeze(state)
    const before = fingerprintValue(frozen).fingerprint
    const first = prepareBasket(frozen, state)
    expect(prepareBasket(frozen, state)).toEqual(first)
    expect(prepareBasket({ ...frozen, rows: [...frozen.rows].reverse() }, state)).toEqual(first)
    expect(fingerprintValue(frozen).fingerprint).toBe(before)
  })
  it.each(["unit", "edition", "duplicate", "price", "definition"])(
    "refuses a source %s mismatch",
    (kind) => {
      const broken = structuredClone(snapshot)
      if (kind === "unit") broken.rows[0].quantityUnit = "gallon"
      if (kind === "edition") broken.rows[0].snapshotId = "another-edition"
      if (kind === "duplicate") broken.rows.push({ ...broken.rows[0] })
      if (kind === "price") broken.rows[0].priceUSD = Number.NaN
      if (kind === "definition") broken.items[0].sourceTitle = "Another definition"
      expect(() => prepareBasket(broken, initial)).toThrow()
    },
  )
})

describe("E01 portable state, numerical bindings, and receipt representations", () => {
  it("reopens quantities and dates and explicitly rejects future, unknown, or wrong-unit state", () => {
    const state = changedQuantity("eggs", 4)
    expect(readReceiptSearch(receiptSearch(state), snapshot)).toEqual(state)
    expect(() => readReceiptSearch("?receipt=%7B", snapshot)).toThrow("could not be read")
    expect(() =>
      prepareBasket(snapshot, { ...state, version: 2 } as unknown as BasketState),
    ).toThrow("unsupported")
    expect(() => prepareBasket(snapshot, { ...state, editionId: "different" })).toThrow(
      "another edition",
    )
    expect(() => prepareBasket(snapshot, changedQuantity("eggs", 0.3))).toThrow("quarter-unit")
    const bad = structuredClone(state)
    bad.quantities[0].quantityUnit = "gallon"
    expect(() => prepareBasket(snapshot, bad)).toThrow("unit")
  })
  it("fails wrong arithmetic despite intact source references and rejects changed baselines", () => {
    const receipt = prepareBasket(snapshot, initial)
    const bindings = numericalBindings(receipt)
    expect(
      evaluateNumericalBindings(snapshot, initial, bindings).every(
        (check) => check.status === "pass",
      ),
    ).toBe(true)
    bindings[0].expected = 999
    expect(evaluateNumericalBindings(snapshot, initial, bindings)[0].status).toBe("fail")
    expect(
      evaluateNumericalBindings(
        snapshot,
        { ...initial, before: "2019-07" },
        numericalBindings(receipt),
      ).every((check) => check.status === "fail"),
    ).toBe(true)
  })
  const states: [string, BasketState][] = [
    ["default", initial],
    [
      "meat-free",
      {
        ...initial,
        quantities: initial.quantities.map((row) => ({
          ...row,
          quantity: ["chicken", "chuck"].includes(row.itemId) ? 0 : row.quantity,
        })),
      },
    ],
    ["high-egg", changedQuantity("eggs", 4)],
    ["missing-price", { ...initial, after: "2020-05" }],
    ["comparable-subset", { ...initial, after: "2020-05", mode: "comparable-subset" }],
  ]
  it.each(states)("preserves exact %s values in SVG, HTML, and packet", (_name, state) => {
    const receipt = prepareBasket(snapshot, state)
    const expected = receiptValues(receipt)
    for (const size of ["phone", "print"] as const) {
      const svg = new DOMParser().parseFromString(
        renderReceiptSVG(receipt, snapshot, size),
        "image/svg+xml",
      )
      expect(svg.querySelector("parsererror")).toBeNull()
      expect(JSON.parse(svg.querySelector("metadata")!.textContent!)).toEqual(expected)
      expect(svg.documentElement.textContent).toContain(snapshot.editionId)
      expect(svg.documentElement.textContent).toContain(
        "Illustrative basket using national average prices",
      )
    }
    const html = new DOMParser().parseFromString(renderReceiptHTML(receipt, snapshot), "text/html")
    expect(JSON.parse(html.querySelector("#receipt-values")!.textContent!)).toEqual(expected)
    expect(html.querySelectorAll("tbody tr")).toHaveLength(6)
    const packet = buildReceiptPacket(snapshot, state)
    expect(packet.receipt).toEqual(expected)
    expect(packet.artifact.transfer.status).toBe("preserved")
    expect(verifyReceiptPacket(JSON.parse(JSON.stringify(packet))).state).toEqual(state)
    const tampered = structuredClone(packet)
    tampered.receipt.afterUSD = 999
    expect(() => verifyReceiptPacket(tampered)).toThrow("differ")
  })
  it("passes prepared contributions to server rendering and distinguishes changed geometry", () => {
    const receipt = prepareBasket(snapshot, initial)
    const props = contributionChartProps(receipt)
    const first = renderChartWithEvidence("BarChart", props)
    const second = renderChartWithEvidence("BarChart", {
      ...props,
      data: [...props.data].reverse(),
    })
    expect(first.svg).toContain("What changed the receipt")
    expect(first.evidence.sceneHash).not.toBe(second.evidence.sceneHash)
    expect(first.evidence.sceneHashVersion).toBe(2)
  })
})

describe("E01 ordinary reading and native controls", () => {
  it("renders a meaningful opening and the exact authored receipts on the server", () => {
    const html = renderToString(
      <MemoryRouter>
        <GroceryBillExamplePage />
      </MemoryRouter>,
    )
    expect(html).toContain("has a")
    expect(html).toContain("$18.28")
    expect(html).toContain("$27.29")
    expect(html).toContain("Illustrative basket using national average prices")
  })
  it("updates both receipts through quantity controls and exposes missing-price scope", () => {
    render(
      <MemoryRouter>
        <GroceryBillExamplePage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Four dozen eggs" }))
    expect(screen.getByTestId("before-total").textContent).toBe("$21.89")
    expect(screen.getByTestId("after-total").textContent).toBe("$38.61")
    const link = screen.getByRole("link", { name: "Open a link to this exact comparison" })
    expect(
      readReceiptSearch(
        new URL(link.getAttribute("href")!, "https://example.test").search,
        snapshot,
      ).quantities.find((row) => row.itemId === "eggs")?.quantity,
    ).toBe(4)
    fireEvent.click(screen.getByRole("button", { name: "A month with missing chicken prices" }))
    expect(screen.getByTestId("after-total").textContent).toBe("Unavailable")
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Use an explicitly labeled comparable subset" }),
    )
    expect(screen.getByTestId("before-total").textContent).toBe("$11.92")
  })
})
