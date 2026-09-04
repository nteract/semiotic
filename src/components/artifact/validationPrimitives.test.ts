import { describe, expect, it } from "vitest"
import {
  validateStringFields,
  type ValidationIssue
} from "./validationPrimitives"

describe("closed string records", () => {
  const fields = {
    id: { required: true },
    label: {},
    status: { required: true, values: ["known", "unknown"] },
    mode: { values: ["live", "historical"] }
  }

  it("accepts absent optional fields and preserves ordered required findings", () => {
    const errors: ValidationIssue[] = []
    validateStringFields({}, fields, "$.record", errors)
    expect(errors).toEqual([
      { path: "$.record.id", message: "Expected a non-empty string." },
      { path: "$.record.status", message: "Expected one of: known, unknown." }
    ])
  })

  it("checks every supplied field and rejects unknown keys", () => {
    const errors: ValidationIssue[] = []
    validateStringFields(
      { id: "", label: 1, status: "invalid", mode: "invalid", extra: true },
      fields,
      "$.record",
      errors
    )
    expect(errors).toEqual([
      { path: "$.record.extra", message: "Unexpected property." },
      { path: "$.record.id", message: "Expected a non-empty string." },
      { path: "$.record.label", message: "Expected a string." },
      { path: "$.record.status", message: "Expected one of: known, unknown." },
      { path: "$.record.mode", message: "Expected one of: live, historical." }
    ])
  })

  it.each([
    { id: "source", status: "known" },
    { id: "source", label: "", status: "unknown", mode: "historical" }
  ])("accepts a valid record without mutating it", (record) => {
    const errors: ValidationIssue[] = []
    validateStringFields(Object.freeze(record), fields, "$.record", errors)
    expect(errors).toEqual([])
  })
})
