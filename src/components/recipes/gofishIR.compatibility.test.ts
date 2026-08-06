import { describe, expectTypeOf, it } from "vitest"
import type { DisplayList } from "gofish-ir"
import type { GofishDisplayListDocument } from "./gofishIR"

describe("GoFish DisplayList structural mirror", () => {
  it("accepts the upstream document without exposing the dev dependency", () => {
    expectTypeOf<DisplayList.DisplayListDocument>()
      .toExtend<GofishDisplayListDocument>()
  })
})
