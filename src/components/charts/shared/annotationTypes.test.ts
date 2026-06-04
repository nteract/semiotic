import { describe, expect, it } from "vitest"
import {
  annotationDisablesConnector,
  annotationDrawsConnector,
  isNoteAnnotation,
} from "./annotationTypes"

describe("annotation type taxonomy", () => {
  it("classifies every note-like annotation consistently", () => {
    for (const type of ["label", "callout", "callout-circle", "callout-rect", "text", "widget"]) {
      expect(isNoteAnnotation({ type })).toBe(true)
    }
    expect(isNoteAnnotation({ type: "trend" })).toBe(false)
  })

  it("recognizes default connectors and an explicit connector disable", () => {
    expect(annotationDrawsConnector({ type: "callout-circle" })).toBe(true)
    expect(annotationDrawsConnector({ type: "text" })).toBe(false)
    expect(annotationDisablesConnector({ type: "callout", disable: ["connector"] })).toBe(true)
    expect(annotationDrawsConnector({ type: "callout", disable: ["connector"] })).toBe(false)
  })
})
