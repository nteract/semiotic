import { describe, expect, it } from "vitest"
import { isInteractiveKeyboardTarget } from "./semanticInteractions"

describe("isInteractiveKeyboardTarget", () => {
  it("lets native controls inside a Stream Frame own their keyboard events", () => {
    const frame = document.createElement("div")
    const annotation = document.createElement("div")
    const button = document.createElement("button")
    annotation.append(button)
    frame.append(annotation)

    expect(
      isInteractiveKeyboardTarget({ target: button, currentTarget: frame } as never),
    ).toBe(true)
    expect(
      isInteractiveKeyboardTarget({ target: annotation, currentTarget: frame } as never),
    ).toBe(false)
    expect(
      isInteractiveKeyboardTarget({ target: frame, currentTarget: frame } as never),
    ).toBe(false)
  })

  it("recognizes semantic controls that are not native buttons", () => {
    const frame = document.createElement("div")
    const control = document.createElement("div")
    control.setAttribute("role", "switch")
    frame.append(control)

    expect(
      isInteractiveKeyboardTarget({ target: control, currentTarget: frame } as never),
    ).toBe(true)
  })
})
