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
import { prepareNetworkResolution } from "./prepare"
import { resolutionRowOrder } from "./project"

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

  it("binds section order to both the worker identity and the prepared analysis", () => {
    const input = atlasFor(["a", "b"], [["ab", "a", "b"]])
    input.source.nodes[0].sectionId = "left"
    input.source.nodes[1].sectionId = "right"
    input.sections.sectionIds = ["left", "right"]
    const request = createResolutionRequest(input, spec, bindings, "order", 1)
    const first = handleResolutionRequest(request).result
    request.atlas.sections.sectionIds.reverse()
    expect(input.sections.sectionIds).toEqual(["left", "right"])
    expect(() => handleResolutionRequest(request)).toThrow("Incoherent")
    const reordered = createResolutionRequest(
      request.atlas,
      spec,
      bindings,
      "order",
      1
    )
    expect(reordered.inputHash).not.toBe(request.inputHash)
    const second = handleResolutionRequest(reordered).result
    if (!first.ok || !second.ok) throw new Error("preparation failed")
    expect(second.value.analysisRevision).not.toBe(first.value.analysisRevision)
    expect(second.value.sourceFingerprint).toBe(first.value.sourceFingerprint)
    expect(resolutionRowOrder(first.value)).toEqual(["a", "b"])
    expect(resolutionRowOrder(second.value)).toEqual(["b", "a"])
    expect(prepareNetworkResolution(reordered.atlas, spec, bindings)).toEqual(
      second
    )
    const store: ResolutionPublication = { generation: -1 }
    beginResolutionRequest(store, reordered)
    expect(
      publishResolutionResponse(store, {
        ...request,
        kind: "prepared-resolution/v1",
        result: first
      })
    ).toBe(false)
    expect(
      publishResolutionResponse(store, handleResolutionRequest(reordered))
    ).toBe(true)
  })

  it("also binds atlas contract validation inputs to the snapshot", () => {
    const request = createResolutionRequest(
      atlas,
      spec,
      bindings,
      "contract",
      1
    )
    request.atlas.provenance.evidencePolicyId = "changed"
    expect(() => handleResolutionRequest(request)).toThrow("Incoherent")
  })
})
