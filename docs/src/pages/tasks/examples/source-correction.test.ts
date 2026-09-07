import { createElement } from "react"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { prepareArtifactRevision, validateArtifactPacket } from "semiotic/artifact"
import { renderChartWithEvidence } from "semiotic/server"
import SourceCorrectionExample from "./SourceCorrectionExample"
import {
  correctedRows,
  inspectSourceHandoff,
  originalRows,
  originalSourceArtifact,
  reviseSourceArtifact,
  sourceChartProps,
  sourceCorrectionOptions,
  sourceCorrectionSidecar,
} from "./source-correction"

afterEach(cleanup)

describe("correct a published chart", () => {
  it("rejects changed data when either affected conclusion is left stale", () => {
    expect(() => reviseSourceArtifact(false)).toThrow(
      /explicit claim transition for: regional-total-v1, regional-largest-v1/,
    )
    const original = originalSourceArtifact()
    const options = sourceCorrectionOptions(original.contract)
    expect(() =>
      prepareArtifactRevision("BarChart", original.props, original.contract, {
        ...options,
        claimTransitions: options.claimTransitions?.slice(0, 1),
      }),
    ).toThrow(/explicit claim transition for: regional-largest-v1/)
  })

  it("revises the values and both conclusions while preserving original evidence", () => {
    const original = originalSourceArtifact()
    const before = structuredClone(original)
    const result = prepareArtifactRevision(
      "BarChart",
      original.props,
      original.contract,
      sourceCorrectionOptions(original.contract),
    )
    expect(original).toEqual(before)
    expect(originalRows).toEqual([
      { region: "North", total: 12 },
      { region: "South", total: 30 },
      { region: "West", total: 18 },
    ])
    expect(result.props.data).toEqual([
      { region: "North", total: 12 },
      { region: "South", total: 30 },
      { region: "West", total: 36 },
    ])
    expect(correctedRows.reduce((sum, row) => sum + row.total, 0)).toBe(78)
    expect(result.props.summary).toBe(
      "West has the largest total: 36 units. All regions total 78 units.",
    )
    expect(
      result.contract.claims.map(({ id, status, supersedes }) => ({ id, status, supersedes })),
    ).toEqual([
      { id: "regional-total-v1", status: "superseded", supersedes: undefined },
      { id: "regional-largest-v1", status: "superseded", supersedes: undefined },
      { id: "regional-total-v2", status: "supported", supersedes: ["regional-total-v1"] },
      { id: "regional-largest-v2", status: "supported", supersedes: ["regional-largest-v1"] },
    ])
    expect(result.contract.evidence[0]).toEqual(original.contract.evidence[0])
    expect(result.contract.evidence[1].fingerprint).not.toBe(
      result.contract.evidence[0].fingerprint,
    )
    expect(result.contract.artifact.dataFingerprint).not.toBe(
      original.contract.artifact.dataFingerprint,
    )
    expect(result.contract.contestability?.corrections).toHaveLength(2)
    expect(result.evaluation.validation.artifact.valid).toBe(true)
    expect(result.evaluation.status).toBe("conditional")
    expect(result.publishable).toBe(false)
    expect(result.contract.accountability?.reviews).toEqual([
      { id: "editorial-review", status: "pending" },
    ])
  })

  it("renders three corrected data marks and preserves the independent value route", () => {
    const result = reviseSourceArtifact()
    const rendered = renderChartWithEvidence("BarChart", result.props)
    expect(rendered.evidence.markCount).toBe(3)
    expect(rendered.evidence.categories).toEqual(["North", "South", "West"])
    const document = new DOMParser().parseFromString(rendered.svg, "image/svg+xml")
    expect(document.querySelector("desc")?.textContent).toBe(
      "Corrected synthetic regional totals; West changed from 18 to 36 units.",
    )
    const bars = Array.from(document.querySelectorAll("#data-area rect"))
    expect(bars).toHaveLength(3)
    const heights = bars.map((bar) => Number(bar.getAttribute("height")))
    expect(heights[0] / heights[1]).toBeCloseTo(12 / 30, 5)
    expect(heights[2] / heights[1]).toBeCloseTo(36 / 30, 5)
    const grounding = result.grounding.agent
    expect(grounding?.claims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "regional-total-v2",
          text: "The total is 78 units.",
          status: "supported",
        }),
        expect.objectContaining({
          id: "regional-largest-v2",
          text: "West has the largest total: 36 units.",
          status: "supported",
        }),
      ]),
    )
  })

  it("transfers correction context only with a valid sidecar matching the chart", () => {
    const original = originalSourceArtifact()
    const revised = reviseSourceArtifact()
    const props = revised.props as ReturnType<typeof sourceChartProps>
    const sidecar = sourceCorrectionSidecar(revised.contract)
    const packet = JSON.parse(sidecar.content)
    expect(validateArtifactPacket(packet).valid).toBe(true)
    expect(inspectSourceHandoff(props, packet)).toMatchObject({
      status: "available",
      contract: {
        artifact: { revision: "2" },
        claims: expect.arrayContaining([
          expect.objectContaining({ id: "regional-total-v1", status: "superseded" }),
        ]),
      },
    })
    expect(inspectSourceHandoff(original.props, packet).status).toBe("refused")
    packet.contract.claims[0].text = "A replacement claim not recorded in the packet identity."
    expect(inspectSourceHandoff(props, packet).status).toBe("refused")
    expect(inspectSourceHandoff(props)).toMatchObject({
      status: "unavailable",
      message: expect.stringContaining("were not transferred"),
    })
  })

  it("keeps the old chart after refusal and makes correction and handoff loss visible", () => {
    render(createElement(SourceCorrectionExample))
    fireEvent.click(screen.getByRole("button", { name: "Try changing data only" }))
    expect(screen.getByTestId("source-correction-status").textContent).toContain(
      "Correction refused",
    )
    const history = screen.getByRole("list", { name: "Claim history" })
    expect(within(history).getByText(/The total is 60 units/)).toBeTruthy()
    expect(within(history).queryByText(/The total is 78 units/)).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Correct data and both claims" }))
    expect(screen.getByTestId("source-correction-status").textContent).toContain(
      "total 78; West leads with 36",
    )
    expect(within(history).getByText(/The total is 78 units/).textContent).toContain("supported")
    expect(within(history).getByText(/The total is 60 units/).textContent).toContain("superseded")
    fireEvent.click(screen.getByText("Optional handoff: see what another reader receives"))
    expect(screen.getByTestId("source-handoff-status").textContent).toContain("matches this chart")
    fireEvent.click(screen.getByRole("checkbox", { name: "Include correction sidecar" }))
    expect(screen.getByTestId("source-handoff-status").textContent).toContain(
      "Correction context unavailable",
    )
    expect(screen.getByRole("button", { name: "Download chart configuration" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Download correction sidecar" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Reset example" }))
    expect(screen.getByTestId("source-correction-status").textContent).toContain(
      "total 60; South leads with 30",
    )
    expect(within(history).queryByText(/The total is 78 units/)).toBeNull()
  })
})
