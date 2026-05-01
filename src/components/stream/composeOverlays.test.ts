import { describe, it, expect } from "vitest"
import * as React from "react"
import { composeOverlays } from "./composeOverlays"

describe("composeOverlays", () => {
  it("returns null when every source is null/undefined", () => {
    expect(composeOverlays()).toBeNull()
    expect(composeOverlays(null, undefined)).toBeNull()
  })

  it("returns the single source unwrapped (no fragment) when only one is present", () => {
    const node = React.createElement("g", { key: "a" })
    expect(composeOverlays(null, node, undefined)).toBe(node)
  })

  it("wraps multiple sources in a single fragment, in order", () => {
    const a = React.createElement("g", { key: "a" })
    const b = React.createElement("g", { key: "b" })
    const result = composeOverlays(a, null, b) as React.ReactElement<{ children: React.ReactNode[] }>
    expect(result.type).toBe(React.Fragment)
    // React clones children passed via createElement spreads, so identity
    // doesn't survive — compare on the keys we set instead.
    const childKeys = (result.props.children as React.ReactElement[]).map((c) => c.key)
    expect(childKeys).toEqual(["a", "b"])
  })

  it("drops null/undefined gaps between real sources (so a future overlay can opt out cleanly)", () => {
    const a = React.createElement("g", { key: "a" })
    const c = React.createElement("g", { key: "c" })
    const result = composeOverlays(a, undefined, null, c) as React.ReactElement<{ children: React.ReactNode[] }>
    const childKeys = (result.props.children as React.ReactElement[]).map((ch) => ch.key)
    expect(childKeys).toEqual(["a", "c"])
  })
})
