import * as React from "react"
import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { CircularBrush } from "../CircularBrush"
import { DirectManipulationControl } from "../DirectManipulationControl"
import { SentenceFilter } from "./SentenceFilter"
import { auditVisualizationControls } from "./controlAudit"
import type { VisualizationControlDefinition } from "./controlContract"

const declaration: VisualizationControlDefinition = {
  id: "amount",
  type: "value",
  target: "amount",
  label: "Amount",
  domain: [0, 100],
  keyboard: "slider",
  valueText: "{value}",
  minimumTargetSize: 44
}

function measure(element: Element, width: number, height: number) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: height,
    right: width,
    width,
    height,
    toJSON: () => ({})
  })
}

describe("mounted visualization control audit", () => {
  it("fails small mounted targets even when declarations claim 44px", () => {
    const view = render(
      <svg>
        <DirectManipulationControl
          controlId="amount"
          value={10}
          min={0}
          max={100}
          label="Amount"
          pointToValue={(point) => point.x}
          x={0}
          y={0}
          onChange={() => {}}
        />
      </svg>
    )
    const target = view.getByRole("slider")
    measure(target, 44, 12)
    expect(auditVisualizationControls({ controls: [declaration] }).ok).toBe(
      true
    )
    const audit = auditVisualizationControls({
      controls: [declaration],
      element: view.container
    })
    expect(audit.ok).toBe(false)
    expect(audit.findings).toContainEqual(
      expect.objectContaining({
        controlId: "amount",
        status: "fail",
        message: expect.stringContaining("44px × 12px")
      })
    )
  })

  it("audits all CircularBrush handles and SentenceFilter triggers without declarations", () => {
    const view = render(
      <>
        <CircularBrush
          controlId="cycle"
          value={{ start: 0, end: 1 }}
          period={24}
          onChange={() => {}}
        />
        <SentenceFilter
          sentence="At least {amount}"
          definitions={{
            amount: { type: "number", label: "Amount", min: 0, max: 100 }
          }}
          filters={{ amount: 10 }}
          onChange={() => {}}
        />
      </>
    )
    const targets = view.container.querySelectorAll('[role="slider"],button')
    for (const target of targets) measure(target, 30, 30)
    const audit = auditVisualizationControls({ element: view.container })
    expect(audit.ok).toBe(true)
    expect(audit.findings).toHaveLength(4)
    expect(audit.findings.map((entry) => entry.controlId)).toEqual([
      "cycle",
      "cycle",
      "cycle",
      "amount"
    ])
    expect(audit.findings.every((entry) => entry.status === "pass")).toBe(true)
  })

  it("includes the supplied root target and reports unmeasurable boxes honestly", () => {
    const target = document.createElement("button")
    measure(target, 0, 0)
    const audit = auditVisualizationControls({ element: target })
    expect(audit.findings).toContainEqual(
      expect.objectContaining({
        status: "warn",
        message: "Mounted target has no measurable layout box."
      })
    )
  })

  it("skips hidden and disabled targets and scopes measurements to the supplied element", () => {
    const view = render(
      <div>
        <button disabled>Disabled</button>
        <div hidden>
          <button>Hidden</button>
        </div>
      </div>
    )
    const audit = auditVisualizationControls({ element: view.container })
    expect(audit.findings).toEqual([
      expect.objectContaining({
        id: "controls.mounted-targets",
        status: "warn"
      })
    ])
  })
})
