import * as React from "react"
import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { createDefaultAnnotationRules } from "./annotationRules"
import type { AnnotationContext } from "../../realtime/types"

const context: AnnotationContext = {
  scales: null,
  width: 100,
  height: 100,
  frameType: "xy"
}

describe("widget annotation activation", () => {
  it("observes a descendant control without replacing its behavior", () => {
    const childClick = vi.fn()
    const onAnnotationActivate = vi.fn()
    const onObservation = vi.fn()
    const annotation = {
      id: "daemon-console",
      type: "widget",
      px: 40,
      py: 50,
      content: <button onClick={childClick}>Open console</button>
    }
    const rule = createDefaultAnnotationRules("xy", {
      onAnnotationActivate,
      onObservation,
      chartId: "server",
      chartType: "StreamNetworkFrame"
    })

    const { getByRole, container } = render(
      <svg>{rule(annotation, 0, context)}</svg>
    )
    fireEvent.click(getByRole("button"), { detail: 1 })

    expect(childClick).toHaveBeenCalledTimes(1)
    expect(onAnnotationActivate).toHaveBeenCalledWith({
      annotation,
      annotationId: "daemon-console",
      chartId: "server",
      inputType: "pointer"
    })
    expect(onObservation).toHaveBeenCalledWith(expect.objectContaining({
      type: "annotation-activate",
      annotationId: "daemon-console",
      inputType: "pointer",
      chartId: "server"
    }))
    expect(
      container.querySelector("[data-semiotic-annotation-id='daemon-console']")
    ).toBeTruthy()
  })

  it("resolves provenance stableId and recognizes keyboard-generated clicks", () => {
    const onObservation = vi.fn()
    const annotation = {
      type: "widget",
      px: 20,
      py: 20,
      provenance: { stableId: "agent-note" },
      content: <button>Inspect</button>
    }
    const rule = createDefaultAnnotationRules("xy", { onObservation })
    const { getByRole } = render(<svg>{rule(annotation, 0, context)}</svg>)

    fireEvent.click(getByRole("button"), { detail: 0 })

    expect(onObservation).toHaveBeenCalledWith(expect.objectContaining({
      type: "annotation-activate",
      annotationId: "agent-note",
      inputType: "keyboard"
    }))
  })

  it("calls the frame callback but omits normalized observation when no stable id exists", () => {
    const onAnnotationActivate = vi.fn()
    const onObservation = vi.fn()
    const annotation = {
      type: "widget",
      px: 20,
      py: 20,
      content: <button>Unidentified note</button>
    }
    const rule = createDefaultAnnotationRules("xy", {
      onAnnotationActivate,
      onObservation
    })
    const { getByRole } = render(<svg>{rule(annotation, 0, context)}</svg>)

    fireEvent.click(getByRole("button"), { detail: 1 })

    expect(onAnnotationActivate).toHaveBeenCalledWith(expect.objectContaining({
      annotation,
      annotationId: undefined
    }))
    expect(onObservation).not.toHaveBeenCalled()
  })
})
