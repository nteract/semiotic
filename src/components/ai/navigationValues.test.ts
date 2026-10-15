import { expect, it } from "vitest"
import { slug } from "./navigationValues"

it.each([
  [" -- Revenue (2026)... Q1 -- ", "revenue-2026-q1"],
  ["Été", "t"],
  ["東京", "unknown"],
  ["", "unknown"],
  [null, "unknown"],
  [123n, "123"],
  [Symbol("metric"), "symbol-metric"],
  [{ id: { name: "Nested / label" } }, "nested-label"]
])("retains navigation identifier spelling for %s", (value, expected) => {
  expect(slug(value)).toBe(expected)
})
