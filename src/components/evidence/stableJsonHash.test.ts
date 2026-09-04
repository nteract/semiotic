import { describe, expect, it } from "vitest"
import { sha256Text } from "./stableJsonHash"

describe("sha256Text", () => {
  it("matches the standard empty-string and abc vectors", () => {
    expect(sha256Text("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    )
    expect(sha256Text("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    )
  })
})
