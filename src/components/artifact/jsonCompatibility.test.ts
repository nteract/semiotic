import { describe, expect, it, vi } from "vitest"
import { nonJsonValuePaths } from "./jsonCompatibility"
import { validateArtifactContract } from "./validation"
import {
  validateArtifactCollection,
  serializeArtifactCollection
} from "./collection"
import { createArtifactPacket, validateArtifactPacket } from "./inheritance"
import {
  serializeArtifactContract,
  migrateArtifactContract
} from "./serialization"
import { contractWithClaim } from "./artifactTestFixtures"

const fail = () => {
  throw new Error("private proxy error")
}
const hostileValues: Array<[string, () => object, string]> = [
  [
    "object descriptor",
    () => new Proxy({ row: 1 }, { getOwnPropertyDescriptor: fail }),
    "$.row"
  ],
  [
    "array descriptor",
    () =>
      new Proxy([1], {
        getOwnPropertyDescriptor(target, key) {
          if (key === "0") return fail()
          return Reflect.getOwnPropertyDescriptor(target, key)
        }
      }),
    "$[0]"
  ],
  [
    "array length descriptor",
    () => new Proxy([], { getOwnPropertyDescriptor: fail }),
    "$.length"
  ],
  ["prototype", () => new Proxy({}, { getPrototypeOf: fail }), "$"],
  ["own keys", () => new Proxy({}, { ownKeys: fail }), "$"],
  [
    "revoked proxy",
    () => {
      const { proxy, revoke } = Proxy.revocable({}, {})
      revoke()
      return proxy
    },
    "$"
  ]
]

describe("untrusted JSON inspection", () => {
  it.each(hostileValues)(
    "reports the affected path for a throwing %s",
    (_name, create, path) => {
      const value = create()
      const ancestors = new Set<object>()
      expect(nonJsonValuePaths(value, "$", ancestors)).toEqual([path])
      expect(ancestors.size).toBe(0)
      expect(nonJsonValuePaths({ nested: value })).toEqual([
        path.replace("$", "$.nested")
      ])
    }
  )

  it("does not read getters, array get/has traps, or mistake shared references for cycles", () => {
    const getter = vi.fn(() => 1)
    const accessor = Object.defineProperty({}, "row", {
      enumerable: true,
      get: getter
    })
    expect(nonJsonValuePaths(accessor)).toEqual(["$.row"])
    expect(getter).not.toHaveBeenCalled()
    const array = new Proxy([1], { get: fail, has: fail })
    expect(nonJsonValuePaths(array)).toEqual([])
    const shared = { row: 1 }
    expect(nonJsonValuePaths({ left: shared, right: shared })).toEqual([])
    const cycle: { self?: object } = {}
    cycle.self = cycle
    expect(nonJsonValuePaths(cycle)).toEqual(["$.self"])
  })

  it("continues to reject sparse arrays, dates, symbols and non-enumerable data", () => {
    expect(nonJsonValuePaths(new Array(1))).toEqual(["$[0]"])
    expect(nonJsonValuePaths(new Date())).toEqual(["$"])
    expect(nonJsonValuePaths({ [Symbol("row")]: 1 })).toEqual([
      "$[Symbol(row)]"
    ])
    expect(
      nonJsonValuePaths(Object.defineProperty({}, "row", { value: 1 }))
    ).toEqual(["$.row"])
  })

  it("rejects custom array prototypes without invoking inherited serialization hooks", () => {
    const toJSON = vi.fn(() => "different data")
    const array = Object.setPrototypeOf([1], { toJSON })
    expect(nonJsonValuePaths(array)).toEqual(["$"])
    expect(
      nonJsonValuePaths(Object.setPrototypeOf([], Date.prototype))
    ).toEqual(["$"])
    const contract = { ...contractWithClaim(), extensions: { array } }
    expect(validateArtifactContract(contract).valid).toBe(false)
    expect(serializeArtifactContract(contract).transfer.status).toBe("invalid")
    expect(toJSON).not.toHaveBeenCalled()
  })

  it.each(hostileValues)(
    "all payload boundaries reject a nested throwing %s without throwing",
    (_name, create, path) => {
      const contract = {
        ...contractWithClaim(),
        extensions: { unsafe: create() }
      }
      const collection = {
        collectionVersion: "0.1",
        id: "collection",
        artifacts: [],
        extensions: { unsafe: create() }
      }
      const packet = createArtifactPacket(contractWithClaim())
      const untrustedPacket = { ...packet, contract }
      const expected = path.replace("$", "$.extensions.unsafe")
      expect(validateArtifactContract(contract)).toMatchObject({
        valid: false,
        errors: [{ path: expected }]
      })
      expect(validateArtifactCollection(collection)).toMatchObject({
        valid: false,
        errors: [{ path: expected }]
      })
      const packetResult = validateArtifactPacket(untrustedPacket)
      expect(packetResult.valid).toBe(false)
      expect(packetResult.errors.join(" ")).toContain(
        expected.replace("$", "$.contract")
      )
      expect(serializeArtifactContract(contract).transfer).toMatchObject({
        status: "invalid",
        omittedPaths: [expected]
      })
      expect(serializeArtifactCollection(collection).transfer).toMatchObject({
        status: "invalid",
        omittedPaths: [expected]
      })
      expect(migrateArtifactContract(contract).status).toBe("invalid")
    }
  )

  it.each(hostileValues)(
    "all payload boundaries handle a hostile root %s",
    (_name, create) => {
      expect(validateArtifactContract(create()).valid).toBe(false)
      expect(validateArtifactCollection(create()).valid).toBe(false)
      expect(validateArtifactPacket(create()).valid).toBe(false)
      expect(serializeArtifactContract(create()).transfer.status).toBe(
        "invalid"
      )
      expect(serializeArtifactCollection(create()).transfer.status).toBe(
        "invalid"
      )
      expect(migrateArtifactContract(create()).status).toBe("invalid")
    }
  )

  it("catches get traps after successful reflection at each validation boundary", () => {
    const contract = contractWithClaim()
    const collection = {
      collectionVersion: "0.1",
      id: "collection",
      artifacts: [contract]
    }
    const packet = createArtifactPacket(contract)
    expect(
      validateArtifactContract(new Proxy(contract, { get: fail }))
    ).toMatchObject({ valid: false })
    expect(
      validateArtifactCollection(new Proxy(collection, { get: fail }))
    ).toMatchObject({ valid: false })
    expect(
      validateArtifactPacket(new Proxy(packet, { get: fail }))
    ).toMatchObject({ valid: false })
    // Migration reads the inspected clone's version, never the proxy again.
    expect(() =>
      migrateArtifactContract(new Proxy(contract, { get: fail }))
    ).not.toThrow()
  })

  it("still preserves ordinary contracts, collections, and packets", () => {
    const contract = contractWithClaim()
    const collection = {
      collectionVersion: "0.1",
      id: "collection",
      artifacts: [contract]
    }
    expect(validateArtifactContract(contract).valid).toBe(true)
    expect(validateArtifactCollection(collection).valid).toBe(true)
    expect(validateArtifactPacket(createArtifactPacket(contract)).valid).toBe(
      true
    )
    expect(serializeArtifactContract(contract).transfer.status).toBe(
      "preserved"
    )
    expect(serializeArtifactCollection(collection).transfer.status).toBe(
      "preserved"
    )
    expect(migrateArtifactContract(contract).status).toBe("current")
  })
})
