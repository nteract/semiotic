import { describe, expect, it } from "vitest"
import {
  atlasFor,
  spec
} from "../../../../../scripts/network-resolution/fixtures"
import {
  beginResolutionRequest,
  cancelResolutionRequest,
  createResolutionRequest,
  handleResolutionRequest,
  publishResolutionResponse,
  type ResolutionPublication
} from "./worker"

describe("resolution worker publication", () => {
  const atlas = atlasFor(["a", "b"], [["ab", "a", "b"]]),
    bindings = { edgeSemantics: [], authoredHierarchies: [] }
  it("publishes only the current complete identity and preserves the last coherent value on cancellation", () => {
    const store: ResolutionPublication = { generation: -1 }
    const one = createResolutionRequest(atlas, spec, bindings, "one", 1),
      two = createResolutionRequest(atlas, spec, bindings, "two", 2)
    expect(beginResolutionRequest(store, one)).toBe(true)
    expect(beginResolutionRequest(store, two)).toBe(true)
    expect(publishResolutionResponse(store, handleResolutionRequest(one))).toBe(
      false
    )
    const response = handleResolutionRequest(two)
    expect(
      publishResolutionResponse(store, { ...response, specHash: "wrong" })
    ).toBe(false)
    expect(publishResolutionResponse(store, response)).toBe(true)
    const value = store.value
    const three = createResolutionRequest(atlas, spec, bindings, "three", 3)
    beginResolutionRequest(store, three)
    cancelResolutionRequest(store, "three")
    expect(
      publishResolutionResponse(store, handleResolutionRequest(three))
    ).toBe(false)
    expect(store.value).toBe(value)
    expect(beginResolutionRequest(store, one)).toBe(false)
  })
  it("snapshots request inputs and rejects tampering or mismatched base revisions", () => {
    const request = createResolutionRequest(atlas, spec, bindings, "frozen", 1)
    request.spec.limits.maxPages = 100
    expect(spec.limits.maxPages).toBe(12)
    expect(() => handleResolutionRequest(request)).toThrow("Incoherent")
    const newer = createResolutionRequest(atlas, spec, bindings, "newer", 2)
    expect(() =>
      handleResolutionRequest({ ...newer, baseRevision: "stale" })
    ).toThrow("Incoherent")
  })
})
