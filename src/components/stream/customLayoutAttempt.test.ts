import { runCustomLayoutAttempt } from "./customLayoutAttempt"

describe("runCustomLayoutAttempt", () => {
  it("returns the layout result on success", () => {
    const outcome = runCustomLayoutAttempt({
      family: "xy",
      logLabel: "customLayout",
      revision: 3,
      hasPreviousResult: false,
      run: () => ({ nodes: [] }),
    })
    expect(outcome).toEqual({ kind: "success", result: { nodes: [] } })
  })

  it("preserves last-good-scene when a later layout throws", () => {
    const onLayoutError = vi.fn()
    const outcome = runCustomLayoutAttempt({
      family: "ordinal",
      logLabel: "ordinal customLayout",
      revision: 8,
      hasPreviousResult: true,
      onLayoutError,
      run: () => {
        throw new Error("layout exploded")
      },
    })
    expect(outcome.kind).toBe("failure")
    if (outcome.kind !== "failure") return
    expect(outcome.preservedLastGoodScene).toBe(true)
    expect(outcome.diagnostic.code).toBe("CUSTOM_LAYOUT_ERROR")
    expect(outcome.diagnostic.component).toBe("ordinal")
    expect(onLayoutError).toHaveBeenCalledWith(outcome.diagnostic)
  })

  it("swallows onLayoutError exceptions", () => {
    const outcome = runCustomLayoutAttempt({
      family: "geo",
      logLabel: "geo customLayout",
      revision: 1,
      hasPreviousResult: false,
      onLayoutError: () => {
        throw new Error("callback exploded")
      },
      run: () => {
        throw new Error("layout exploded")
      },
    })
    expect(outcome.kind).toBe("failure")
    if (outcome.kind !== "failure") return
    expect(outcome.preservedLastGoodScene).toBe(false)
  })
})
