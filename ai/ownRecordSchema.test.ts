import { describe, expect, it } from "vitest"
import { z } from "zod"
import { ownRecordSchema } from "./ownRecordSchema"

describe("MCP own record schemas", () => {
  it("preserves own prototype-named columns without changing the prototype", () => {
    const data = JSON.parse(
      '{"__proto__":"A","constructor":"B","toString":"C"}'
    )
    const parsed = ownRecordSchema(z.string()).parse(data)
    expect(Object.keys(parsed)).toEqual([
      "__proto__",
      "constructor",
      "toString"
    ])
    expect(parsed.__proto__).toBe("A")
    expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype)
  })

  it("validates every own value and rejects nonobjects", () => {
    const schema = ownRecordSchema(z.enum(["category", "measure"]))
    for (const value of [
      null,
      [],
      2,
      "rows",
      JSON.parse('{"__proto__":"invalid"}')
    ]) {
      expect(schema.safeParse(value).success).toBe(false)
    }
    const result = schema.safeParse(JSON.parse('{"__proto__":"invalid"}'))
    expect(result.error?.issues[0].path).toEqual(["__proto__"])
    expect(schema.parse(Object.create({ inherited: "invalid" }))).toEqual({})
  })

  it("publishes the same input JSON schema as a string-keyed record", () => {
    const value = z.union([z.string(), z.array(z.string())])
    expect(z.toJSONSchema(ownRecordSchema(value), { io: "input" })).toEqual(
      z.toJSONSchema(z.record(z.string(), value), { io: "input" })
    )
  })
})
