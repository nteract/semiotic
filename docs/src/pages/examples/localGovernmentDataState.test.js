import { describe, expect, it } from "vitest"
import {
  createLocalGovernmentSourceProvenance,
  createLocalGovernmentSourceStates,
  localGovernmentDataKindForStatus,
  localGovernmentSourceStatuses,
  transitionLocalGovernmentSourceStates,
} from "./localGovernmentDataState"

function begin(states, source, requestId) {
  return transitionLocalGovernmentSourceStates(states, {
    type: "begin-load",
    source,
    requestId,
    message: "Loading.",
  })
}

function settle(states, source, requestId, status, forceUpdate = false) {
  return transitionLocalGovernmentSourceStates(states, {
    type: "set-result",
    source,
    requestId,
    forceUpdate,
    kind: localGovernmentDataKindForStatus(status),
    message: "Settled.",
    provenance: createLocalGovernmentSourceProvenance(source, { status }),
  })
}

describe("local government composite source state", () => {
  it("keeps no-match and unavailable outcomes distinct from transport errors", () => {
    let states = createLocalGovernmentSourceStates()
    states = begin(states, "locus", 4)
    states = settle(states, "locus", 4, "no-match")
    states = settle(states, "legistar", 0, "unavailable", true)
    states = begin(states, "fema", 4)
    states = settle(states, "fema", 4, "error")

    expect(localGovernmentSourceStatuses(states)).toMatchObject({
      locus: "no-match",
      legistar: "unavailable",
      fema: "error",
    })
    expect(states.locus.data.kind).toBe("live")
    expect(states.legistar.data.provenance[0].availability).toBe("unavailable")
  })

  it("rejects a stale source completion after a new ZIP request begins", () => {
    const initial = begin(createLocalGovernmentSourceStates(), "civic", 7)
    const nextRequest = begin(initial, "civic", 8)
    const stale = settle(nextRequest, "civic", 7, "live")

    expect(stale).toBe(nextRequest)
    expect(localGovernmentSourceStatuses(stale).civic).toBe("loading")
  })
})
